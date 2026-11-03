"use strict";
const AUTO_CONFIRM_DAYS=7;
function createSocial({db,auth,sendPush,genRowId,toClientProduct,PRODUCT_COLS,effectivePrice,reviewLimiter}){
  const A=auth.authMiddleware;
  const reviewLimited = reviewLimiter ? [reviewLimiter] : [];
  const cleanReviewText = (value) => String(value ?? '').trim().slice(0, 2000);
  const cleanRating = (value) => Number(value);
  const REVIEW_CURSOR_PREFIX = 'rv1.';
  const encodeReviewCursor = (row) => REVIEW_CURSOR_PREFIX + Buffer.from(JSON.stringify({createdAt:String(row?.createdAt||''),id:String(row?.id||'')}),'utf8').toString('base64url');
  const decodeReviewCursor = (value) => { const raw=String(value||'').trim(); if(!raw)return null; if(!raw.startsWith(REVIEW_CURSOR_PREFIX))throw new Error('Invalid review cursor.'); let parsed; try{parsed=JSON.parse(Buffer.from(raw.slice(REVIEW_CURSOR_PREFIX.length),'base64url').toString('utf8'));}catch(_){throw new Error('Invalid review cursor.');} if(!parsed||typeof parsed.createdAt!=='string'||!parsed.createdAt||typeof parsed.id!=='string'||!parsed.id)return null; return {createdAt:parsed.createdAt,id:parsed.id}; };
  function eligibleReviewItem(orderItemId, userId) {
    return db.prepare(`SELECT i.id,i.orderId,i.productId,i.vendorId,i.status,i.paid,i.deliveredAt,i.receivedAt,o.userId
      FROM mall_order_items i JOIN mall_orders o ON o.id=i.orderId
      WHERE i.id=? AND o.userId=? AND i.status='delivered' AND i.deliveredAt IS NOT NULL AND i.paid=1`).get(orderItemId,userId);
  }
  function publicReview(row) {
    return { id:row.id, rating:row.rating, comment:row.comment || '', createdAt:row.createdAt, updatedAt:row.updatedAt,
      sellerReply:row.sellerReply || null, sellerRepliedAt:row.sellerRepliedAt || null, reviewerName:row.name || 'NEXA member' };
  }
  function snapshotProducts(ids){ if(!ids?.length)return []; return db.prepare(`SELECT id,name,price,salePrice,saleEndsAt,stock,currency FROM mall_products WHERE id IN (${ids.map(()=>'?').join(',')})`).all(...ids); }
  function notifyProductChanges(before){ for(const b of before||[]){ const p=db.prepare('SELECT * FROM mall_products WHERE id=?').get(b.id); if(!p)continue; const price=effectivePrice(p); if(price < effectivePrice(b)|| (b.stock<=0&&p.stock>0)){ const watches=db.prepare('SELECT * FROM mall_watches WHERE productId=?').all(b.id); for(const w of watches){ db.prepare('INSERT INTO mall_alerts(id,userId,productId,kind,title,body,price,createdAt) VALUES(?,?,?,?,?,?,?,?)').run(genRowId('alert'),w.userId,b.id,'product_update','Price/stock update',`${p.name} has an update.`,price,new Date().toISOString()); } } } }
  function receiptOf(r){ return {orderId:r.orderId,orderItemId:r.id,status:r.status,paid:!!r.paid,deliveredAt:r.deliveredAt||null,receivedAt:r.receivedAt||null,disputedAt:r.disputedAt||null}; }
  function summarize(kind,id){ if(kind==='vendorId') { const row=db.prepare("SELECT ROUND(AVG(r.rating),1) ratingAvg, COUNT(*) ratingCount FROM mall_reviews r WHERE r.vendorId=? AND r.moderationStatus='published'").get(id); const ratingAvg=row?.ratingAvg==null?null:Number(row.ratingAvg); const ratingCount=Number(row?.ratingCount||0); return {ratingAvg,ratingCount,badge:ratingCount>=5 && ratingAvg!=null && ratingAvg>=4 ? 'reviewed_seller' : null}; } return {ratingAvg:null,ratingCount:0,badge:null}; }
  function findMallSellers(text,base){ const q=String(text||'').toLowerCase().split(/\W+/).filter(Boolean).slice(0,6); if(!q.length)return []; const rows=db.prepare(`SELECT p.id,p.name,p.vendorId,v.shopName,p.price,p.currency FROM mall_products p JOIN vendors v ON v.id=p.vendorId WHERE p.active=1 AND (${q.map(()=>'(LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(v.shopName) LIKE ?)').join(' OR ')}) LIMIT 8`).all(...q.flatMap(x=>[`%${x}%`,`%${x}%`,`%${x}%`])); return rows.map(r=>({vendorId:r.vendorId,shopName:r.shopName,productId:r.id,name:r.name,price:r.price,currency:r.currency})); }
  function describeMallSellers(rows){ if(!rows?.length)return ''; return `Dream Marketplace matches: ${rows.slice(0,5).map(r=>`${r.name} from ${r.shopName} (${r.currency} ${r.price})`).join('; ')}`; }
  function register(app){
    app.get('/api/mall/reviews/product/:productId',A,(req,res)=>{
      const limit=Math.min(Math.max(Number(req.query?.limit)||20,1),50);
      let cursor=null; try{cursor=decodeReviewCursor(req.query?.cursor);}catch(_){return res.status(400).json({error:'Invalid review cursor.'});}
      const whereCursor=cursor ? 'AND (r.createdAt < ? OR (r.createdAt = ? AND r.id < ?))' : '';
      const params=cursor ? [req.params.productId,cursor.createdAt,cursor.createdAt,cursor.id,limit+1] : [req.params.productId,limit+1];
      const rows=db.prepare(`SELECT r.id,r.rating,r.comment,r.createdAt,r.updatedAt,r.sellerReply,r.sellerRepliedAt,u.name
        FROM mall_reviews r JOIN users u ON u.id=r.userId
        WHERE r.productId=? AND r.moderationStatus='published' ${whereCursor}
        ORDER BY r.createdAt DESC,r.id DESC LIMIT ?`).all(...params);
      const hasMore=rows.length>limit; const page=rows.slice(0,limit);
      const summary=db.prepare(`SELECT ROUND(AVG(r.rating),1) ratingAvg,COUNT(*) ratingCount FROM mall_reviews r
        WHERE r.productId=? AND r.moderationStatus='published'`).get(req.params.productId);
      res.json({reviews:page.map(publicReview),summary:{ratingAvg:summary?.ratingAvg==null?null:Number(summary.ratingAvg),ratingCount:Number(summary?.ratingCount||0)},hasMore,nextCursor:hasMore&&page.length?encodeReviewCursor(page[page.length-1]):null});
    });
    app.post('/api/mall/reviews',A,...reviewLimited,(req,res)=>{
      const orderItemId=String(req.body?.orderItemId||'').trim();
      const rating=cleanRating(req.body?.rating); const comment=cleanReviewText(req.body?.comment);
      if(!orderItemId||!Number.isInteger(rating)||rating<1||rating>5) return res.status(400).json({error:'Choose a rating from 1 to 5 and a valid purchased item.'});
      const item=eligibleReviewItem(orderItemId,req.user.id); if(!item) return res.status(409).json({error:'This item is not yet eligible for a review.'});
      const existing=db.prepare('SELECT id FROM mall_reviews WHERE orderItemId=?').get(orderItemId); if(existing) return res.status(409).json({error:'You have already reviewed this purchase.',reviewId:existing.id});
      const id=genRowId('review'),t=new Date().toISOString();
      try {
        db.prepare(`INSERT INTO mall_reviews(id,orderItemId,orderId,productId,vendorId,userId,rating,comment,createdAt,updatedAt,moderationStatus)
          VALUES(?,?,?,?,?,?,?,?,?,?, 'published')`).run(id,item.id,item.orderId,item.productId,item.vendorId,req.user.id,rating,comment,t,t);
      } catch(e) {
        if(String(e.message||'').toLowerCase().includes('unique')) return res.status(409).json({error:'You have already reviewed this purchase.'});
        throw e;
      }
      try { require('./aamiEconomy').awardActivity(db,req.user.id,'marketplace_review',id,{orderItemId:item.id,productId:item.productId}); } catch (_) {}
      res.status(201).json({review:publicReview(db.prepare(`SELECT r.*,u.name FROM mall_reviews r JOIN users u ON u.id=r.userId WHERE r.id=?`).get(id))});
    });
    app.patch('/api/mall/reviews/:reviewId',A,...reviewLimited,(req,res)=>{
      const rating=cleanRating(req.body?.rating); const comment=cleanReviewText(req.body?.comment);
      if(!Number.isInteger(rating)||rating<1||rating>5) return res.status(400).json({error:'Choose a rating from 1 to 5.'});
      const row=db.prepare('SELECT * FROM mall_reviews WHERE id=? AND userId=?').get(req.params.reviewId,req.user.id);
      if(!row) return res.status(404).json({error:'Review not found.'});
      const updatedAt=new Date().toISOString();
      db.prepare('UPDATE mall_reviews SET rating=?,comment=?,updatedAt=? WHERE id=? AND userId=?').run(rating,comment,updatedAt,row.id,req.user.id);
      res.json({review:publicReview(db.prepare(`SELECT r.*,u.name FROM mall_reviews r JOIN users u ON u.id=r.userId WHERE r.id=?`).get(row.id))});
    });
    app.post('/api/mall/reviews/:reviewId/reply',A,...reviewLimited,(req,res)=>{
      const reply=cleanReviewText(req.body?.reply); if(!reply) return res.status(400).json({error:'Seller reply cannot be empty.'});
      const row=db.prepare("SELECT * FROM mall_reviews WHERE id=? AND moderationStatus='published'").get(req.params.reviewId);
      if(!row) return res.status(404).json({error:'Review not found.'});
      const seller=db.prepare('SELECT id FROM vendors WHERE id=? AND userId=?').get(row.vendorId,req.user.id);
      if(!seller) return res.status(403).json({error:'Only the listing seller can reply to this review.'});
      if(row.sellerReply) return res.status(409).json({error:'This review already has a seller reply.'});
      const t=new Date().toISOString();
      const changed=db.prepare('UPDATE mall_reviews SET sellerReply=?,sellerRepliedAt=?,updatedAt=? WHERE id=? AND vendorId=? AND sellerReply IS NULL').run(reply,t,t,row.id,row.vendorId);
      if(!changed.changes) return res.status(409).json({error:'This review changed before the reply was saved.'});
      res.json({review:publicReview(db.prepare(`SELECT r.*,u.name FROM mall_reviews r JOIN users u ON u.id=r.userId WHERE r.id=?`).get(row.id))});
    });
    app.post('/api/mall/reviews/:reviewId/report',A,...reviewLimited,(req,res)=>{
      const reason=String(req.body?.reason||'').trim().toLowerCase(); const rawDetails=String(req.body?.details||'').trim(); if(rawDetails.length>1000) return res.status(400).json({error:'Report details are too long.'}); const details=cleanReviewText(rawDetails);
      const allowed=new Set(['spam','fraud','harassment','unsafe','false_information','other']); if(!allowed.has(reason)) return res.status(400).json({error:'Choose a valid review-report reason.'});
      const review=db.prepare("SELECT id,userId,productId,vendorId FROM mall_reviews WHERE id=? AND moderationStatus='published'").get(req.params.reviewId); if(!review) return res.status(404).json({error:'Review not found.'});
      if(review.userId===req.user.id) return res.status(400).json({error:'You cannot report your own review.'});
      try {
        const result=db.transaction(()=>{
          const existing=db.prepare("SELECT id,status FROM mall_interaction_reports WHERE reporterId=? AND targetType='review' AND targetId=? AND status='open' LIMIT 1").get(req.user.id,review.id);
          if(existing) return {duplicate:true,id:existing.id};
          const id=genRowId('mir'),t=new Date().toISOString();
          db.prepare(`INSERT INTO mall_interaction_reports(id,reporterId,targetType,targetId,reason,details,createdAt,status) VALUES(?,?,?,?,?,?,?,?)`).run(id,req.user.id,'review',review.id,reason,details||null,t,'open');
          return {duplicate:false,id};
        })();
        return res.status(result.duplicate?200:201).json({report:{id:result.id,status:'open',duplicate:result.duplicate}});
      } catch(e) {
        return res.status(409).json({error:'This review report could not be created safely. Please retry.'});
      }
    });
    app.post('/api/mall/watches',A,(req,res)=>{ const productId=String(req.body?.productId||''); const p=db.prepare('SELECT * FROM mall_products WHERE id=? AND active=1').get(productId); if(!p)return res.status(404).json({error:'Product not found.'}); const id=genRowId('watch'); db.prepare(`INSERT INTO mall_watches(id,userId,productId,targetPrice,priceAtWatch,createdAt) VALUES(?,?,?,?,?,?) ON CONFLICT(userId,productId) DO UPDATE SET targetPrice=excluded.targetPrice,priceAtWatch=excluded.priceAtWatch`).run(id,req.user.id,productId,req.body?.targetPrice==null?null:Number(req.body.targetPrice),effectivePrice(p),new Date().toISOString()); res.json({ok:true}); });
    app.get('/api/mall/alerts',A,(req,res)=>res.json({alerts:db.prepare('SELECT * FROM mall_alerts WHERE userId=? ORDER BY createdAt DESC LIMIT 50').all(req.user.id)}));
  }
  return {register,snapshotProducts,notifyProductChanges,receiptOf,summarize,findMallSellers,describeMallSellers};
}
module.exports={createSocial,AUTO_CONFIRM_DAYS};

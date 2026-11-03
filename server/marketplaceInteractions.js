"use strict";
function createMarketplaceInteractions({db,auth,genRowId}) {
  const A=auth.authMiddleware;
  const now=()=>new Date().toISOString();
  const blocked=(a,b)=>!!db.prepare("SELECT 1 FROM blocks WHERE (blockerId=? AND blockedId=?) OR (blockerId=? AND blockedId=?) LIMIT 1").get(a,b,b,a);
  const getInquiry=(id)=>db.prepare(`SELECT i.*, p.name AS productName, p.active AS productActive, v.userId AS sellerUserId, v.shopName
    FROM mall_inquiries i JOIN mall_products p ON p.id=i.productId JOIN vendors v ON v.id=p.vendorId WHERE i.id=?`).get(id);
  const participant=(i,uid)=>i && (i.buyerId===uid || i.sellerId===uid);
  function register(app) {
    app.get('/api/marketplace/favorites',A,(req,res)=>{
      const rows=db.prepare(`SELECT p.id,p.name,p.description,p.price,p.currency,p.category,p.stock,p.imageEmoji,p.imageColor,p.active,f.createdAt AS favoritedAt FROM mall_favorites f JOIN mall_products p ON p.id=f.productId WHERE f.userId=? ORDER BY f.createdAt DESC LIMIT 300`).all(req.user.id);
      res.json({favorites:rows});
    });
    app.post('/api/marketplace/favorites/:productId',A,(req,res)=>{
      const p=db.prepare('SELECT id,active FROM mall_products WHERE id=?').get(req.params.productId);
      if(!p || !p.active) return res.status(404).json({error:'Listing not found.'});
      db.prepare('INSERT OR IGNORE INTO mall_favorites(userId,productId,createdAt) VALUES(?,?,?)').run(req.user.id,p.id,now());
      res.json({ok:true,favorited:true});
    });
    app.delete('/api/marketplace/favorites/:productId',A,(req,res)=>{
      db.prepare('DELETE FROM mall_favorites WHERE userId=? AND productId=?').run(req.user.id,req.params.productId);
      res.json({ok:true,favorited:false});
    });
    app.post('/api/marketplace/inquiries',A,(req,res)=>{
      const productId=String(req.body?.productId||'').trim();
      const body=String(req.body?.message||'').trim();
      const requestKey=String(req.body?.clientRequestId||'').trim();
      if(!productId || body.length<1 || body.length>2000 || !/^[A-Za-z0-9._:-]{8,120}$/.test(requestKey)) return res.status(400).json({error:'Provide a listing, message (1–2000 characters), and valid clientRequestId.'});
      let result;
      try {
        result=db.transaction(()=>{
          const prior=db.prepare('SELECT inquiryId FROM mall_inquiry_requests WHERE buyerId=? AND requestKey=?').get(req.user.id,requestKey);
          if(prior) return {duplicate:true,inquiry:getInquiry(prior.inquiryId)};
          const p=db.prepare('SELECT p.id,p.active,v.userId AS sellerId FROM mall_products p JOIN vendors v ON v.id=p.vendorId WHERE p.id=?').get(productId);
          if(!p || !p.active) return {error:{status:404,message:'Listing is unavailable.'}};
          if(p.sellerId===req.user.id) return {error:{status:400,message:'You cannot inquire about your own listing.'}};
          if(blocked(req.user.id,p.sellerId)) return {error:{status:403,message:'This interaction is unavailable.'}};
          let inquiry=db.prepare('SELECT * FROM mall_inquiries WHERE productId=? AND buyerId=?').get(productId,req.user.id);
          if(inquiry && inquiry.status==='closed') return {error:{status:409,message:'This inquiry is closed.'}};
          if(!inquiry){
            const id=genRowId('inq'); const t=now();
            db.prepare('INSERT INTO mall_inquiries(id,productId,buyerId,sellerId,status,createdAt,updatedAt) VALUES(?,?,?,? ,\'open\',?,?)').run(id,productId,req.user.id,p.sellerId,t,t);
            inquiry=db.prepare('SELECT * FROM mall_inquiries WHERE id=?').get(id);
          }
          const claimed=db.prepare('INSERT OR IGNORE INTO mall_inquiry_requests(buyerId,requestKey,inquiryId,createdAt) VALUES(?,?,?,?)').run(req.user.id,requestKey,inquiry.id,now());
          if(!claimed.changes){
            const existing=db.prepare('SELECT inquiryId FROM mall_inquiry_requests WHERE buyerId=? AND requestKey=?').get(req.user.id,requestKey);
            return {duplicate:true,inquiry:getInquiry(existing.inquiryId)};
          }
          const messageId=genRowId('imsg'); const t=now();
          db.prepare('INSERT INTO mall_inquiry_messages(id,inquiryId,senderId,body,createdAt) VALUES(?,?,?,?,?)').run(messageId,inquiry.id,req.user.id,body,t);
          db.prepare('UPDATE mall_inquiries SET updatedAt=? WHERE id=?').run(t,inquiry.id);
          return {inquiry:getInquiry(inquiry.id),messageId,duplicate:false,sellerId:p.sellerId};
        })();
      } catch(e) {
        console.error('[marketplace-inquiries]',e.message);
        return res.status(500).json({error:'Unable to create the inquiry.'});
      }
      if(result.error) return res.status(result.error.status).json({error:result.error.message});
      if(result.duplicate) return res.json({inquiry:result.inquiry,duplicate:true});
      res.status(201).json({inquiry:result.inquiry,messageId:result.messageId});
    });
    app.get('/api/marketplace/inquiries',A,(req,res)=>{
      const rows=db.prepare(`SELECT i.id,i.productId,i.buyerId,i.sellerId,i.status,i.createdAt,i.updatedAt,p.name AS productName,v.shopName FROM mall_inquiries i JOIN mall_products p ON p.id=i.productId JOIN vendors v ON v.id=p.vendorId WHERE i.buyerId=? OR i.sellerId=? ORDER BY i.updatedAt DESC LIMIT 300`).all(req.user.id,req.user.id);
      res.json({inquiries:rows});
    });
    app.get('/api/marketplace/inquiries/:id/messages',A,(req,res)=>{
      const i=getInquiry(req.params.id); if(!participant(i,req.user.id)) return res.status(404).json({error:'Inquiry not found.'});
      if(blocked(i.buyerId,i.sellerId)) return res.status(403).json({error:'This interaction is unavailable.'});
      const messages=db.prepare('SELECT id,inquiryId,senderId,body,createdAt FROM mall_inquiry_messages WHERE inquiryId=? ORDER BY createdAt ASC,id ASC LIMIT 500').all(i.id);
      res.json({inquiry:{id:i.id,productId:i.productId,productName:i.productName,status:i.status,buyerId:i.buyerId,sellerId:i.sellerId},messages});
    });
    app.post('/api/marketplace/inquiries/:id/messages',A,(req,res)=>{
      const body=String(req.body?.message||'').trim(); if(!body||body.length>2000) return res.status(400).json({error:'Message must be 1–2000 characters.'});
      let result;
      try {
        result=db.transaction(()=>{
          const i=getInquiry(req.params.id);
          if(!participant(i,req.user.id)) return {error:{status:404,message:'Inquiry not found.'}};
          if(i.status!=='open') return {error:{status:409,message:'Inquiry is closed.'}};
          if(blocked(i.buyerId,i.sellerId)) return {error:{status:403,message:'This interaction is unavailable.'}};
          const id=genRowId('imsg'), t=now();
          const changed=db.prepare('UPDATE mall_inquiries SET updatedAt=? WHERE id=? AND status=\'open\'').run(t,i.id);
          if(!changed.changes) return {error:{status:409,message:'Inquiry changed concurrently; refresh and try again.'}};
          db.prepare('INSERT INTO mall_inquiry_messages(id,inquiryId,senderId,body,createdAt) VALUES(?,?,?,?,?)').run(id,i.id,req.user.id,body,t);
          return {message:{id,inquiryId:i.id,senderId:req.user.id,body,createdAt:t}};
        })();
      } catch(e) {
        console.error('[marketplace-inquiry-message]',e.message);
        return res.status(500).json({error:'Unable to send the message.'});
      }
      if(result.error) return res.status(result.error.status).json({error:result.error.message});
      res.status(201).json(result);
    });
    app.patch('/api/marketplace/inquiries/:id/status',A,(req,res)=>{
      const requested=String(req.body?.status||''); if(!['open','closed'].includes(requested)) return res.status(400).json({error:'Status must be open or closed.'});
      let changed=false;
      const run=db.transaction(()=>{
        const i=getInquiry(req.params.id); if(!i || i.sellerId!==req.user.id) return {error:{status:404,message:'Inquiry not found.'}};
        const result=db.prepare('UPDATE mall_inquiries SET status=?,updatedAt=? WHERE id=? AND sellerId=? AND status=?').run(requested,now(),i.id,req.user.id,i.status);
        if(!result.changes) return {error:{status:409,message:'Inquiry changed concurrently; refresh and try again.'}};
        changed=true; return {status:requested};
      })();
      if(run.error) return res.status(run.error.status).json({error:run.error.message});
      res.json({ok:true,status:run.status});
    });
    app.post('/api/marketplace/reports',A,(req,res)=>{
      const type=String(req.body?.targetType||''); const targetId=String(req.body?.targetId||'').trim();
      const reason=String(req.body?.reason||'').trim(); const details=String(req.body?.details||'').trim().slice(0,1500);
      if(!['listing','inquiry_message','seller'].includes(type)||!targetId||reason.length<3||reason.length>120) return res.status(400).json({error:'Invalid report target or reason.'});
      if(type==='listing' && !db.prepare('SELECT 1 FROM mall_products WHERE id=?').get(targetId)) return res.status(404).json({error:'Listing not found.'});
      if(type==='inquiry_message' && !db.prepare('SELECT 1 FROM mall_inquiry_messages WHERE id=? AND inquiryId IN (SELECT id FROM mall_inquiries WHERE buyerId=? OR sellerId=?)').get(targetId,req.user.id,req.user.id)) return res.status(404).json({error:'Message not found.'});
      if(type==='seller' && !db.prepare('SELECT 1 FROM vendors WHERE userId=?').get(targetId)) return res.status(404).json({error:'Seller not found.'});
      const id=genRowId('mrep'); db.prepare('INSERT INTO mall_interaction_reports(id,reporterId,targetType,targetId,reason,details,createdAt) VALUES(?,?,?,?,?,?,?)').run(id,req.user.id,type,targetId,reason,details||null,now());
      res.status(201).json({ok:true,reportId:id});
    });
  }
  return {register};
}
module.exports={createMarketplaceInteractions};

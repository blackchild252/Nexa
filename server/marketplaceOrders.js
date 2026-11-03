"use strict";

const productStock = require("./productStock");

const CURSOR_PREFIX = "v2.";
const ORDER_TRANSITIONS = Object.freeze({ placed: ["accepted", "rejected", "cancelled"], pending: ["accepted", "rejected", "cancelled"], accepted: ["fulfilled", "cancelled"], fulfilled: ["completed"] });
function canTransition(from, to) { return (ORDER_TRANSITIONS[String(from)] || []).includes(String(to)); }
// Payment-provider references and fee bookkeeping belong to the buyer and the platform.
// A seller sees the order, never the buyer's payment reference.
const BUYER_ONLY_ORDER_FIELDS = Object.freeze(["paymentRef", "feeChargeId", "feePreviewId", "feeStatus", "providerVerified"]);
function orderForViewer(order, viewerId) {
  if (!order || typeof order !== "object") return order;
  if (order.userId === viewerId) return order;
  const safe = { ...order };
  for (const k of BUYER_ONLY_ORDER_FIELDS) delete safe[k];
  return safe;
}
function encodeOrderCursor(cursor) {
 const raw = JSON.stringify({ createdAt: String(cursor?.createdAt || ""), id: String(cursor?.id || "") });
 return CURSOR_PREFIX + Buffer.from(raw, "utf8").toString("base64url");
}
function decodeOrderCursor(value) {
 const raw = String(value || "").trim();
 if (!raw) return null;
 if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return { createdAt: raw, id: "" }; // V3.76 legacy cursor
 if (!raw.startsWith(CURSOR_PREFIX)) throw new Error("Invalid order cursor.");
 let parsed;
 try { parsed = JSON.parse(Buffer.from(raw.slice(CURSOR_PREFIX.length), "base64url").toString("utf8")); } catch (_) { throw new Error("Invalid order cursor."); }
 if (!parsed || typeof parsed.createdAt !== "string" || !parsed.createdAt || typeof parsed.id !== "string" || !parsed.id) throw new Error("Invalid order cursor.");
 return { createdAt: parsed.createdAt, id: parsed.id };
}

function createMarketplaceOrders({db,auth,genRowId}) {
 const A=auth.authMiddleware, now=()=>new Date().toISOString();
 const getOrder=(id)=>db.prepare(`SELECT o.* FROM mall_orders o WHERE o.id=?`).get(id);
 const isSeller=(id,uid)=>!!db.prepare(`SELECT 1 FROM mall_order_items i JOIN vendors v ON v.id=i.vendorId WHERE i.orderId=? AND v.userId=? LIMIT 1`).get(id,uid);
 const canView=(id,uid)=>{const o=getOrder(id);return !!o&&(o.userId===uid||isSeller(id,uid));};
 const transitions=ORDER_TRANSITIONS; const integrity=require("./v5_62_0_financial_integrity");
 const {normalizeOrderStatus,clampOrderLimit,boundRows,normalizeOrderEvent}=require("./marketplaceOperations");
 function register(app){
  app.post('/api/marketplace/orders',A,(req,res)=>{
   const key=String(req.body?.clientRequestId||'').trim(); const items=Array.isArray(req.body?.items)?req.body.items:[];
   if(!/^[A-Za-z0-9._:-]{8,120}$/.test(key)||items.length<1||items.length>30) return res.status(400).json({error:'Provide a valid clientRequestId and 1–30 items.'});
   const prior=db.prepare('SELECT orderId FROM mall_order_idempotency WHERE buyerId=? AND requestKey=?').get(req.user.id,key);
   if(prior) return res.json({order:getOrder(prior.orderId),duplicate:true});
   const clean=new Map(); for(const x of items){const pid=String(x?.productId||'').trim(),vid=String(x?.variantId||'').trim(),q=Number(x?.quantity);if(!pid||!Number.isSafeInteger(q)||q<1||q>1000)return res.status(400).json({error:'Each item needs a productId and integer quantity from 1 to 1000.'});const ck=pid+'\u0000'+vid;clean.set(ck,(clean.get(ck)||0)+q);}
   if([...clean.values()].some(q=>q>1000))return res.status(400).json({error:'Quantity limit exceeded.'});
   try {
    const create=db.transaction(()=>{
     const rows=[...clean].map(([ck,q])=>{const [pid,vid]=ck.split('\u0000');const r=db.prepare(`SELECT p.*,v.id AS shopId,v.userId AS sellerId,v.shopName FROM mall_products p JOIN vendors v ON v.id=p.vendorId WHERE p.id=?`).get(pid);if(!r||!r.active||String(r.status||'active').toLowerCase()!=='active'||r.stock<q)throw Object.assign(new Error('A listing is unavailable or has insufficient stock.'),{status:409});if(r.sellerId===req.user.id)throw Object.assign(new Error('You cannot order your own listing.'),{status:400});return {...r,quantity:q,variantId:vid||null};});
     if(new Set(rows.map(r=>r.currency)).size!==1)throw Object.assign(new Error('All items must use the same currency.'),{status:400});
     if(new Set(rows.map(r=>r.sellerId)).size!==1)throw Object.assign(new Error('Orders must contain listings from one seller.'),{status:400});
     const total=rows.reduce((n,r)=>n+Number(r.price)*r.quantity,0);if(!Number.isFinite(total)||total<=0)throw Object.assign(new Error('Invalid order total.'),{status:400});
     const id=genRowId('ord'),t=now();db.prepare(`INSERT INTO mall_orders(id,userId,total,currency,status,deliveryAddress,note,createdAt) VALUES(?,?,?,?,?,?,?,?,?)`.replace('?,?,?,?,?,?,?,?,?','?,?,?,?,?,?,?,?')).run(id,req.user.id,total,rows[0].currency,'placed',String(req.body?.deliveryAddress||'').slice(0,1500)||null,String(req.body?.note||'').slice(0,1000)||null,t);
     for(const r of rows){const taken=productStock.reserve(db,{productId:r.id,variantId:r.variantId,qty:r.quantity,now:t});if(!taken.ok)throw Object.assign(new Error(taken.code==='insufficient'||taken.code==='unavailable'?'Stock changed; please retry.':taken.message),{status:409});db.prepare(`INSERT INTO mall_order_items(id,orderId,productId,vendorId,vendorName,name,price,quantity,imageEmoji,imageColor,status,variantId,variantLabel) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(genRowId('oi'),id,r.id,r.vendorId,r.shopName,r.name,r.price,r.quantity,r.imageEmoji,r.imageColor,'placed',taken.variantId,taken.variantLabel);}
     db.prepare('INSERT INTO mall_order_events(id,orderId,actorId,fromStatus,toStatus,note,createdAt) VALUES(?,?,?,?,?,?,?)').run(genRowId('oe'),id,req.user.id,null,'placed','Order created',t);
     db.prepare('INSERT INTO mall_order_idempotency(buyerId,requestKey,orderId,createdAt) VALUES(?,?,?,?)').run(req.user.id,key,id,t);return getOrder(id);
    }); const order=create();return res.status(201).json({order});
   } catch(e){if(e.status)return res.status(e.status).json({error:e.message});if(String(e.code||'').includes('CONSTRAINT')){const prior2=db.prepare('SELECT orderId FROM mall_order_idempotency WHERE buyerId=? AND requestKey=?').get(req.user.id,key);if(prior2)return res.json({order:getOrder(prior2.orderId),duplicate:true});}console.error('[marketplace-orders]',e.message);return res.status(500).json({error:'Unable to create order.'});}
  });
  app.get('/api/marketplace/orders',A,(req,res)=>{
   const limit=clampOrderLimit(req.query.limit);
   let cursor=null;
   try { cursor=decodeOrderCursor(req.query.cursor); } catch (_) { return res.status(400).json({error:'Invalid order cursor.'}); }
   const status=normalizeOrderStatus(req.query.status); if(req.query.status&&status===null)return res.status(400).json({error:'Invalid order status filter.'});
   const whereCursor=cursor ? (cursor.id ? 'AND (o.createdAt < ? OR (o.createdAt = ? AND o.id < ?))' : 'AND o.createdAt < ?') : '';
   const params=cursor ? (cursor.id ? [req.user.id,req.user.id,cursor.createdAt,cursor.createdAt,cursor.id] : [req.user.id,req.user.id,cursor.createdAt]) : [req.user.id,req.user.id];
   const statusSql=status ? 'AND o.status=?' : '';
   if(status) params.push(status);
   params.push(limit);
   const rows=db.prepare(`SELECT DISTINCT o.* FROM mall_orders o LEFT JOIN mall_order_items i ON i.orderId=o.id LEFT JOIN vendors v ON v.id=i.vendorId WHERE (o.userId=? OR v.userId=?) ${whereCursor} ${statusSql} ORDER BY o.createdAt DESC,o.id DESC LIMIT ?`).all(...params);
   const last=rows[rows.length-1];
   res.json({orders:rows.map((r)=>orderForViewer(r,req.user.id)),nextCursor:rows.length===limit?encodeOrderCursor(last):null});
  });
  app.get('/api/marketplace/orders/:id',A,(req,res)=>{if(!canView(req.params.id,req.user.id))return res.status(404).json({error:'Order not found.'});const order=orderForViewer(getOrder(req.params.id),req.user.id);order.items=boundRows(db.prepare('SELECT * FROM mall_order_items WHERE orderId=? ORDER BY id LIMIT 100').all(order.id),100);order.events=boundRows(db.prepare('SELECT id,actorId,fromStatus,toStatus,note,createdAt FROM mall_order_events WHERE orderId=? ORDER BY createdAt,id LIMIT 100').all(order.id),100).map(normalizeOrderEvent);res.json({order});});
  app.patch('/api/marketplace/orders/:id/status',A,(req,res)=>{const id=req.params.id,o=getOrder(id);if(!o||!canView(id,req.user.id))return res.status(404).json({error:'Order not found.'});const seller=isSeller(id,req.user.id),buyer=o.userId===req.user.id,to=String(req.body?.status||'');const allowed=transitions[o.status]||[];if(!canTransition(o.status,to))return res.status(409).json({error:'Invalid order status transition.'});if((['accepted','rejected','fulfilled'].includes(to)&&!seller)||(['cancelled','completed'].includes(to)&&!buyer))return res.status(403).json({error:'You are not allowed to make this order transition.'}); if(to==='cancelled'&&o.status!=='accepted'&&o.status!=='placed'&&o.status!=='pending')return res.status(409).json({error:'This order cannot be cancelled from its current state.'});if(to==='cancelled'&&o.status==='accepted')return res.status(409).json({error:'Accepted orders cannot be cancelled through this endpoint.'});const t=now();const run=db.transaction(()=>{const result=db.prepare('UPDATE mall_orders SET status=? WHERE id=? AND status=?').run(to,id,o.status);if(!result.changes)throw new Error('CONCURRENT');db.prepare('UPDATE mall_order_items SET status=? WHERE orderId=?').run(to,id);db.prepare('INSERT INTO mall_order_events(id,orderId,actorId,fromStatus,toStatus,note,createdAt) VALUES(?,?,?,?,?,?,?)').run(genRowId('oe'),id,req.user.id,o.status,to,String(req.body?.note||'').slice(0,500)||null,t);if(to==='rejected'||to==='cancelled'){for(const row of db.prepare('SELECT productId,variantId,quantity,inventoryReleasedAt,paid FROM mall_order_items WHERE orderId=?').all(id)){if(!integrity.paidItemCancellationAllowed(row.paid,to)) throw Object.assign(new Error('PAID_ITEM_CANNOT_CANCEL'),{status:409}); if(integrity.inventoryReleaseOnce(row.inventoryReleasedAt)){productStock.release(db,{productId:row.productId,variantId:row.variantId,qty:row.quantity,now:t});db.prepare('UPDATE mall_order_items SET inventoryReleasedAt=? WHERE orderId=? AND productId=? AND inventoryReleasedAt IS NULL').run(t,id,row.productId);}}}});try{run();res.json({order:orderForViewer(getOrder(id),req.user.id)});}catch(e){res.status(409).json({error:'Order changed concurrently; refresh and retry.'});}});
 }
 return {register};
}
module.exports={createMarketplaceOrders,encodeOrderCursor,decodeOrderCursor,ORDER_TRANSITIONS,canTransition,orderForViewer,BUYER_ONLY_ORDER_FIELDS};

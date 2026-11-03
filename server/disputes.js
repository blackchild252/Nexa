"use strict";
function createDisputes({db,auth,sendPush,genRowId}){
  const A=auth.authMiddleware;
  function register(app){
    app.get('/api/mall/disputes',A,(req,res)=>{ const rows=db.prepare(`SELECT t.*, i.name, i.price, i.currency FROM mall_dispute_threads t JOIN mall_order_items i ON i.id=t.orderItemId WHERE t.buyerId=? ORDER BY t.updatedAt DESC`).all(req.user.id); res.json({disputes:rows}); });
  }
  return {register};
}
module.exports={createDisputes};

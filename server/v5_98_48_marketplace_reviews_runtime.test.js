const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./httpTestHarness');

test('B196 runtime — buyer can review only an eligible delivered paid item, seller can reply once, and reports do not alter the review', async () => {
  const srv = await startServer();
  let d;
  try {
    const buyer = await srv.signup('buyer');
    const seller = await srv.signup('seller');
    const other = await srv.signup('other');
    d = srv.openDb();
    const now = new Date().toISOString();
    d.prepare("INSERT INTO vendors(id,userId,shopName,createdAt) VALUES(?,?,?,?)").run('ven-b196',seller.userId,'B196 Shop',now);
    d.prepare("INSERT INTO mall_products(id,vendorId,name,description,price,currency,category,stock,active,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run('prod-b196','ven-b196','B196 Product','Trust test',100,'NGN','other',10,1,now,now);
    d.prepare("INSERT INTO mall_orders(id,userId,total,currency,status,createdAt) VALUES(?,?,?,?,?,?)").run('ord-b196',buyer.userId,100,'NGN','delivered',now);
    d.prepare("INSERT INTO mall_order_items(id,orderId,productId,vendorId,vendorName,name,price,quantity,status,paid,paidAt,deliveredAt,receivedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run('oi-b196','ord-b196','prod-b196','ven-b196','B196 Shop','B196 Product',100,1,'delivered',1,now,now,now);
    const review = await srv.request('POST','/api/mall/reviews',{token:buyer.token,body:{orderItemId:'oi-b196',rating:5,comment:'Arrived safely.'}});
    assert.equal(review.status,201,review.text);
    const reviewId=review.json.review.id;
    const dup=await srv.request('POST','/api/mall/reviews',{token:buyer.token,body:{orderItemId:'oi-b196',rating:4,comment:'duplicate'}});
    assert.equal(dup.status,409);
    const editOther=await srv.request('PATCH',`/api/mall/reviews/${reviewId}`,{token:other.token,body:{rating:1,comment:'not mine'}});
    assert.equal(editOther.status,404);
    const reply=await srv.request('POST',`/api/mall/reviews/${reviewId}/reply`,{token:seller.token,body:{reply:'Thank you for your order.'}});
    assert.equal(reply.status,200,reply.text);
    const replyAgain=await srv.request('POST',`/api/mall/reviews/${reviewId}/reply`,{token:seller.token,body:{reply:'second'}});
    assert.equal(replyAgain.status,409);
    const report=await srv.request('POST',`/api/mall/reviews/${reviewId}/report`,{token:other.token,body:{reason:'spam',details:'Test report'}});
    assert.equal(report.status,201,report.text);
    const stored=d.prepare('SELECT rating,moderationStatus,sellerReply FROM mall_reviews WHERE id=?').get(reviewId);
    assert.deepEqual(stored,{rating:5,moderationStatus:'published',sellerReply:'Thank you for your order.'});
    d.prepare("UPDATE mall_reviews SET moderationStatus='removed' WHERE id=?").run(reviewId);
    const list=await srv.request('GET','/api/mall/reviews/product/prod-b196',{token:other.token});
    assert.equal(list.status,200,list.text);
    assert.equal(list.json.reviews.length,0);
    assert.equal(list.json.summary.ratingCount,0);
  } finally { try{d&&d.close();}catch(_){} await srv.stop(); }
});

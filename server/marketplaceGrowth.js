"use strict";
function vendorGrowth(db, userId) {
  const vendor = db.prepare("SELECT id,shopName FROM vendors WHERE userId=?").get(userId);
  if (!vendor) return { vendor: null, products: [], summary: { listings: 0, activeListings: 0, stockUnits: 0, favorites: 0, inquiries: 0 } };
  const products = db.prepare(`SELECT p.id,p.name,p.category,p.price,p.stock,p.active,
    (SELECT COUNT(*) FROM mall_favorites f WHERE f.productId=p.id) AS favorites,
    (SELECT COUNT(*) FROM mall_inquiries i WHERE i.productId=p.id) AS inquiries
    FROM mall_products p WHERE p.vendorId=? ORDER BY p.updatedAt DESC LIMIT 200`).all(vendor.id);
  return { vendor, products, summary: {
    listings: products.length,
    activeListings: products.filter(p=>!!p.active).length,
    stockUnits: products.reduce((n,p)=>n+Number(p.stock||0),0),
    favorites: products.reduce((n,p)=>n+Number(p.favorites||0),0),
    inquiries: products.reduce((n,p)=>n+Number(p.inquiries||0),0)
  }};
}
function personalized(db, userId, limit=12) {
  const safe=Math.min(Math.max(Number(limit)||12,1),30);
  const rows=db.prepare(`SELECT p.id,p.name,p.price,p.salePrice,p.currency,p.category,p.stock,p.imageUrl,p.imageEmoji,p.imageColor,v.shopName AS vendorName,
    (SELECT COUNT(*) FROM mall_favorites f WHERE f.productId=p.id AND f.userId=?) AS favorited
    FROM mall_products p JOIN vendors v ON v.id=p.vendorId
    WHERE p.active=1 AND p.stock>0
    ORDER BY favorited DESC, p.updatedAt DESC LIMIT ?`).all(userId,safe);
  return rows;
}
module.exports={vendorGrowth,personalized};

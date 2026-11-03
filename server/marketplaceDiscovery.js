"use strict";
const DEFAULT_CATEGORIES = ['electronics','phones & tablets','computers','fashion','jewelry & accessories','beauty','home & living','groceries','health & wellness','baby & kids','sports & fitness','automotive','books & media','services','other'];
function discovery(db,{limit=8}={}) {
  const safe=Math.min(Math.max(Number(limit)||8,1),20);
  const categories=db.prepare("SELECT category, COUNT(*) AS productCount, MIN(COALESCE(salePrice,price)) AS fromPrice FROM mall_products WHERE active=1 GROUP BY category ORDER BY productCount DESC, category ASC LIMIT 30").all();
  const featured=db.prepare(`SELECT p.id,p.name,p.price,p.salePrice,p.currency,p.category,p.imageUrl,p.imageEmoji,p.imageColor,v.shopName AS vendorName,
    (SELECT ROUND(AVG(r.rating),1) FROM mall_reviews r WHERE r.vendorId=p.vendorId AND r.moderationStatus='published') AS vendorRatingAvg,
    (SELECT COUNT(*) FROM mall_reviews r WHERE r.vendorId=p.vendorId AND r.moderationStatus='published') AS vendorRatingCount
    FROM mall_products p JOIN vendors v ON v.id=p.vendorId
    WHERE p.active=1 AND p.stock>0 AND COALESCE(v.status,'active')='active'
    ORDER BY CASE WHEN p.salePrice IS NOT NULL THEN 0 ELSE 1 END,p.updatedAt DESC LIMIT ?`).all(safe);
  const mapFeatured=(p)=>({ ...p, vendorRatingAvg:p.vendorRatingAvg==null?null:Number(p.vendorRatingAvg), vendorRatingCount:Number(p.vendorRatingCount||0), sellerBadge:Number(p.vendorRatingCount||0)>=5 && p.vendorRatingAvg!=null && Number(p.vendorRatingAvg)>=4 ? 'reviewed_seller' : null });
  const vendors=db.prepare(`SELECT v.id,v.shopName,COUNT(DISTINCT p.id) AS productCount,
    (SELECT ROUND(AVG(r.rating),1) FROM mall_reviews r WHERE r.vendorId=v.id AND r.moderationStatus='published') AS ratingAvg,
    (SELECT COUNT(*) FROM mall_reviews r WHERE r.vendorId=v.id AND r.moderationStatus='published') AS ratingCount
    FROM vendors v JOIN mall_products p ON p.vendorId=v.id AND p.active=1
    WHERE COALESCE(v.status,'active')='active' GROUP BY v.id ORDER BY productCount DESC,v.shopName ASC LIMIT 8`).all().map(v=>({ ...v, productCount:Number(v.productCount||0), ratingAvg:v.ratingAvg==null?null:Number(v.ratingAvg), ratingCount:Number(v.ratingCount||0), sellerBadge:Number(v.ratingCount||0)>=5 && v.ratingAvg!=null && Number(v.ratingAvg)>=4 ? 'reviewed_seller' : null }));
  return {categories:DEFAULT_CATEGORIES.map(category=>{ const row=categories.find(x=>x.category===category); return {category,productCount:Number(row?.productCount||0),fromPrice:row?.fromPrice==null?null:Number(row.fromPrice)}; }),featured:featured.map(mapFeatured),vendors};
}
module.exports={DEFAULT_CATEGORIES,discovery};

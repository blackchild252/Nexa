"use strict";
const crypto = require("crypto");

const REFERRAL_RATE = 0.025;
const QUALIFYING_STATUSES = new Set(["paid", "preparing", "ready", "completed"]);
const MENU = Object.freeze([
  { key: "yam_slices", name: "Yam Slices" },
  { key: "fried_egg", name: "Fried Egg" },
  { key: "potato_fries", name: "Potato Fries" },
  { key: "doughnuts", name: "Doughnuts" },
  { key: "burger", name: "Burger" },
  { key: "shawarma", name: "Shawarma" },
  { key: "puff_puff", name: "Puff Puff" },
  { key: "egg_roll", name: "Egg Roll" }
]);
function id(prefix){ return `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`; }
function referralCode(){ return crypto.randomBytes(7).toString("base64url").replace(/[-_]/g, "").slice(0,10).toUpperCase(); }
function normalizeItems(items){
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) throw new Error("At least one Kitchen item is required.");
  return items.map((item) => {
    const key=String(item?.key||"").trim(); const found=MENU.find(x=>x.key===key); const quantity=Math.floor(Number(item?.quantity));
    if(!found || !Number.isInteger(quantity) || quantity<1 || quantity>50) throw new Error("Invalid Kitchen order item.");
    return {key:found.key,name:found.name,quantity};
  });
}
function orderTotal(items, prices){ return items.reduce((sum,item)=>sum + Number(prices[item.key]||0)*item.quantity,0); }
function ensureReferralCode(db,userId,now=new Date().toISOString()){
  const existing=db.prepare("SELECT code FROM kitchen_referrals WHERE ownerId=?").get(userId);
  if(existing) return existing.code;
  let code; for(let i=0;i<8;i++){ const candidate=referralCode(); if(!db.prepare("SELECT 1 FROM kitchen_referrals WHERE code=?").get(candidate)){code=candidate;break;} }
  if(!code) throw new Error("Could not create a referral code.");
  db.prepare("INSERT INTO kitchen_referrals(id,ownerId,code,createdAt,updatedAt) VALUES(?,?,?,?,?)").run(id("kr"),userId,code,now,now); return code;
}
function qualifyingOrder(db, originalUserId, originalTotal, currency, referralCodeValue, orderId){
  const referral=db.prepare("SELECT ownerId FROM kitchen_referrals WHERE code=?").get(referralCodeValue);
  if(!referral) return {ok:false,error:"Referral code not found."};
  if(referral.ownerId===originalUserId) return {ok:false,error:"You cannot refer yourself."};
  const order=db.prepare("SELECT id,userId,total,currency,status FROM kitchen_orders WHERE id=?").get(orderId);
  if(!order || order.userId!==originalUserId) return {ok:false,error:"Order not found."};
  if(order.status!=="paid") return {ok:false,error:"Referral requires a verified paid order."};
  if(String(order.currency).toUpperCase()!==String(currency).toUpperCase()) return {ok:false,error:"Referral currency mismatch."};
  if(Number(order.total)<Number(originalTotal)) return {ok:false,error:"Referral order does not meet the original paid-order minimum."};
  return {ok:true,referral};
}
function cashbackMinor(total){ return Math.floor(Number(total)*REFERRAL_RATE*100)/100; }
module.exports={MENU,REFERRAL_RATE,QUALIFYING_STATUSES,id,normalizeItems,orderTotal,ensureReferralCode,qualifyingOrder,cashbackMinor};

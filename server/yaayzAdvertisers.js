"use strict";
const crypto = require("crypto");

const STATUSES = new Set(["pending", "approved", "rejected", "taken_down"]);
const MAX = { advertiserName: 120, title: 160, body: 1200, imageUrl: 2000, targetUrl: 2000, hub: 40 };
const MAX_PAGE = 100;
const MAX_IMAGE_DATA = 1_500_000;
const TRANSITIONS = { pending: new Set(["approved", "rejected"]), approved: new Set(["taken_down"]), rejected: new Set(["approved"]), taken_down: new Set(["approved"]) };

function id() { return crypto.randomUUID(); }
function text(v, max) { return String(v ?? "").trim().slice(0, max); }
function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS yaayz_ads (
      id TEXT PRIMARY KEY,
      advertiserName TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      imageUrl TEXT,
      targetUrl TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);
  const cols = db.prepare("PRAGMA table_info(yaayz_ads)").all().map(c => c.name);
  const add = (sql) => { try { db.exec(sql); } catch (_) {} };
  if (!cols.includes("vendorId")) add("ALTER TABLE yaayz_ads ADD COLUMN vendorId TEXT");
  if (!cols.includes("hub")) add("ALTER TABLE yaayz_ads ADD COLUMN hub TEXT NOT NULL DEFAULT 'yaayz'");
  if (!cols.includes("status")) add("ALTER TABLE yaayz_ads ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'");
  if (!cols.includes("reviewReason")) add("ALTER TABLE yaayz_ads ADD COLUMN reviewReason TEXT");
  if (!cols.includes("reviewedBy")) add("ALTER TABLE yaayz_ads ADD COLUMN reviewedBy TEXT");
  if (!cols.includes("reviewedAt")) add("ALTER TABLE yaayz_ads ADD COLUMN reviewedAt TEXT");
  db.exec("CREATE INDEX IF NOT EXISTS idx_yaayz_ads_vendor_status ON yaayz_ads(vendorId,status,createdAt)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_yaayz_ads_status ON yaayz_ads(status,active,createdAt)");
}
function pageArgs(limit=50, offset=0) {
  const l=Number(limit), o=Number(offset);
  return { limit:Number.isInteger(l)?Math.min(MAX_PAGE,Math.max(1,l)):50, offset:Number.isInteger(o)?Math.max(0,o):0 };
}
function normalise(input={}) {
  const advertiserName=text(input.advertiserName,MAX.advertiserName);
  const title=text(input.title,MAX.title);
  const body=text(input.body,MAX.body);
  const imageUrl=text(input.imageUrl,MAX.imageUrl) || null;
  const targetUrl=text(input.targetUrl,MAX.targetUrl) || null;
  const hub=text(input.hub || "yaayz",MAX.hub).toLowerCase();
  if (!advertiserName) return {error:"Advertiser name is required."};
  if (!title) return {error:"Advert title is required."};
  if (title.length < 3) return {error:"Advert title is too short."};
  if (!body) return {error:"Advert body is required."};
  if (body.length < 10) return {error:"Advert body is too short."};
  if (targetUrl && !/^https:\/\//i.test(targetUrl)) return {error:"Advert destination must use HTTPS."};
  if (targetUrl && targetUrl.length > MAX.targetUrl) return {error:"Advert destination is too long."};
  if (imageUrl && !/^(https:\/\/|data:image\/)/i.test(imageUrl)) return {error:"Advert image must use HTTPS or an image data URL."};
  if (imageUrl && /^data:image\//i.test(imageUrl) && imageUrl.length > MAX_IMAGE_DATA) return {error:"Advert image data is too large."};
  if (hub !== "yaayz") return {error:"Advert hub is not supported."};
  return {value:{advertiserName,title,body,imageUrl,targetUrl,hub}};
}
function create(db,{vendorId,input,now=new Date().toISOString()}) {
  const n=normalise(input); if(n.error) return n;
  const ad={id:id(),...n.value,vendorId,status:"pending",active:0,reviewReason:null,reviewedBy:null,reviewedAt:null,createdAt:now,updatedAt:now};
  db.prepare(`INSERT INTO yaayz_ads(id,advertiserName,title,body,imageUrl,targetUrl,active,createdAt,updatedAt,vendorId,hub,status,reviewReason,reviewedBy,reviewedAt)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(ad.id,ad.advertiserName,ad.title,ad.body,ad.imageUrl,ad.targetUrl,ad.active,ad.createdAt,ad.updatedAt,ad.vendorId,ad.hub,ad.status,null,null,null);
  return {value:ad};
}
function ownerList(db,vendorId,{limit=50,offset=0}={}) {
  const page=pageArgs(limit,offset);
  return db.prepare(`SELECT id,advertiserName,title,body,imageUrl,targetUrl,active,createdAt,updatedAt,vendorId,hub,status,reviewReason,reviewedAt
    FROM yaayz_ads WHERE vendorId=? ORDER BY createdAt DESC,id DESC LIMIT ? OFFSET ?`).all(vendorId,page.limit,page.offset);
}
function adminList(db,{status="all",limit=100,offset=0}={}) {
  const page=pageArgs(limit,offset);
  const where=status!=="all" ? "a.status=?" : "1=1";
  const args=status!=="all"?[status,page.limit,page.offset]:[page.limit,page.offset];
  return db.prepare(`SELECT a.id,a.advertiserName,a.title,a.body,a.imageUrl,a.targetUrl,a.active,a.createdAt,a.updatedAt,a.vendorId,a.hub,a.status,a.reviewReason,a.reviewedAt,
    v.shopName,u.name AS ownerName,u.email AS ownerEmail FROM yaayz_ads a LEFT JOIN vendors v ON v.id=a.vendorId LEFT JOIN users u ON u.id=v.userId
    WHERE ${where} ORDER BY a.updatedAt DESC,a.id DESC LIMIT ? OFFSET ?`).all(...args);
}
function decide(db,{id:adId,decision,reason,adminId,now=new Date().toISOString()}) {
  if(!STATUSES.has(decision)) return {error:"Invalid advert decision."};
  const row=db.prepare("SELECT id,status,active FROM yaayz_ads WHERE id=?").get(adId);
  if(!row) return {error:"Advert not found.",status:404};
  if(!TRANSITIONS[row.status]?.has(decision)) return {error:`Advert cannot move from ${row.status} to ${decision}.`,status:409};
  const nextActive=decision==="approved"?1:0;
  db.prepare("UPDATE yaayz_ads SET status=?,active=?,reviewReason=?,reviewedBy=?,reviewedAt=?,updatedAt=? WHERE id=?").run(decision,nextActive,reason?text(reason,300):null,adminId,now,now,adId);
  return {value:{id:adId,status:decision,active:Boolean(nextActive)}};
}
module.exports={STATUSES,ensureSchema,normalise,create,ownerList,adminList,decide};

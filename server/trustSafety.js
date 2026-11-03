"use strict";
const crypto = require("crypto");
function id(prefix="ts"){return `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;}
function now(){return new Date().toISOString();}
function ensureSchema(db){db.exec(`
CREATE TABLE IF NOT EXISTS moderation_content_reports (
 id TEXT PRIMARY KEY, reporterId TEXT NOT NULL, targetType TEXT NOT NULL, targetId TEXT NOT NULL, targetUserId TEXT NOT NULL,
 reason TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open', createdAt TEXT NOT NULL,
 reviewedAt TEXT, reviewerId TEXT
);
CREATE INDEX IF NOT EXISTS idx_mcr_status_created ON moderation_content_reports(status,createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_mcr_target ON moderation_content_reports(targetType,targetId,createdAt DESC);
CREATE TABLE IF NOT EXISTS moderation_feedback (
 id TEXT PRIMARY KEY, userId TEXT NOT NULL, reportId TEXT, targetType TEXT NOT NULL, targetId TEXT NOT NULL,
 reason TEXT NOT NULL, strikeNumber INTEGER NOT NULL, createdAt TEXT NOT NULL, valid INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_mf_user_created ON moderation_feedback(userId,createdAt DESC);
`);}
function report(db,{reporterId,targetType,targetId,targetUserId,reason,details=""}){ensureSchema(db);const existing=db.prepare("SELECT * FROM moderation_content_reports WHERE reporterId=? AND targetType=? AND targetId=? AND status='open'").get(reporterId,targetType,targetId);if(existing)return {...existing,duplicate:true};const row={id:id("mr"),reporterId,targetType,targetId,targetUserId,reason:String(reason||"other").slice(0,80),details:String(details||"").slice(0,1000),status:"open",createdAt:now()};db.prepare("INSERT INTO moderation_content_reports(id,reporterId,targetType,targetId,targetUserId,reason,details,status,createdAt) VALUES(?,?,?,?,?,?,?,?,?)").run(row.id,row.reporterId,row.targetType,row.targetId,row.targetUserId,row.reason,row.details,row.status,row.createdAt);return row;}
function addFeedback(db,{userId,reportId,targetType,targetId,reason,notify,closeAccount}){ensureSchema(db);const work=()=>{const count=Number(db.prepare("SELECT COUNT(*) AS n FROM moderation_feedback WHERE userId=? AND valid=1").get(userId).n||0);const strikeNumber=count+1;const row={id:id("fb"),userId,reportId:reportId||null,targetType,targetId,reason:String(reason||"Community-guideline violation confirmed by NEXA Admin.").slice(0,500),strikeNumber,createdAt:now(),valid:1};db.prepare("INSERT INTO moderation_feedback(id,userId,reportId,targetType,targetId,reason,strikeNumber,createdAt,valid) VALUES(?,?,?,?,?,?,?,?,1)").run(row.id,row.userId,row.reportId,row.targetType,row.targetId,row.reason,row.strikeNumber,row.createdAt);let deleted=false;if(strikeNumber>=3){try{if(typeof closeAccount==="function"){closeAccount(userId);deleted=true;}else{db.prepare("UPDATE users SET accountStatus='closed' WHERE id=? AND accountStatus!='closed'").run(userId);deleted=true;}}catch(error){deleted=false;}}if(typeof notify==='function'){Promise.resolve(notify(userId,deleted?"NEXA account closed":"NEXA moderation feedback",deleted?"Your NEXA account reached 3 confirmed policy violations and has been closed.":`A NEXA Admin confirmed a policy violation. This is strike ${strikeNumber} of 3.`,{screen:"notifications",type:"system",moderation:true,reportId:reportId||null,strikeNumber,accountClosed:deleted})).catch(()=>{});}return {...row,deleted};};return typeof db.transaction==='function'?db.transaction(work)():work();}
function openReports(db,{targetType="all",limit=100,offset=0}={}){ensureSchema(db);const args=[];let where="status='open'";if(targetType!=="all"){where+=" AND targetType=?";args.push(targetType);}args.push(Math.min(Math.max(Number(limit)||100,1),100),Math.max(Number(offset)||0,0));return db.prepare(`SELECT r.*,u.name AS targetName,u.email AS targetEmail FROM moderation_content_reports r LEFT JOIN users u ON u.id=r.targetUserId WHERE ${where} ORDER BY r.createdAt ASC LIMIT ? OFFSET ?`).all(...args);}
module.exports={ensureSchema,report,addFeedback,openReports};

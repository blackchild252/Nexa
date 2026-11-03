"use strict";
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("./db");
const { purgeExpiredSessions } = require("./sessionMaintenance");
const lifecycleMaturity = require("./v5_93_0_account_privacy_maturity");
const policy = require("./v5_72_0_session_integrity");
const { assignSignupUsername } = require("./signupUsername");
const authLifecycle = require("./authLifecycle");
const SESSION_DAYS = 30;
const MIN_BCRYPT_COST = 12;
const SESSION_CAP = policy.SESSION_CAP;
const SESSION_TOUCH_MS = policy.SESSION_TOUCH_MS;
const SESSION_ROTATION_MS = policy.SESSION_ROTATION_MS;
function cleanEmail(v){ const e=String(v||"").trim().toLowerCase(); if(!/^\S+@\S+\.\S+$/.test(e)) throw new Error("Enter a valid email."); return e; }
function cleanPassword(v){ const p=String(v||""); if(p.length<8) throw new Error("Password must be at least 8 characters."); return p; }
function cleanSignupPassword(v){ const p=cleanPassword(v); if(!/[a-z]/.test(p)||!/[A-Z]/.test(p)||!/[0-9]/.test(p)||!/[^A-Za-z0-9]/.test(p)) throw new Error("Password must include a lowercase letter, uppercase letter, special character and number."); return p; }
function requireAdultConfirmation(value){ if(value !== true) throw Object.assign(new Error("NEXA is available only to users aged 18 and above. Children and anyone under 18 are not permitted."),{status:403,code:"AGE_RESTRICTION"}); }
function publicUser(u){ return {id:u.id,email:u.email,name:u.name||"NEXA user",username:u.username||null}; }
async function signup(email,password,name,context={}){ requireAdultConfirmation(context.ageConfirmed); email=cleanEmail(email); password=cleanSignupPassword(password); name=String(name||"").trim().slice(0,80)||"NEXA user"; if(db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) throw new Error("Unable to create that account. Please use a different email or sign in."); const id="u_"+crypto.randomBytes(12).toString("hex"); const hash=await bcrypt.hash(password,MIN_BCRYPT_COST); db.prepare("INSERT INTO users(id,email,passwordHash,name,createdAt,adultConfirmedAt) VALUES(?,?,?,?,?,?)").run(id,email,hash,name,new Date().toISOString(),new Date().toISOString()); assignSignupUsername(db,id,name); return createSession(id,context); }
async function login(email,password,context={},options={}){ requireAdultConfirmation(context.ageConfirmed); email=cleanEmail(email); const u=db.prepare("SELECT * FROM users WHERE email=?").get(email); const valid=!!u && !(u.accountStatus === "closed") && u.accountStatus === "active" && await bcrypt.compare(String(password||""),u.passwordHash); authLifecycle.recordLoginAttempt({email,userId:u?.id||null,success:valid,ip:context.ip,userAgent:context.userAgent}); if(!valid) throw new Error("Email or password is incorrect.");
  if(!u.adultConfirmedAt) db.prepare("UPDATE users SET adultConfirmedAt=? WHERE id=?").run(new Date().toISOString(),u.id); if(typeof bcrypt.getRounds === "function" && bcrypt.getRounds(u.passwordHash) < MIN_BCRYPT_COST){ const upgraded=await bcrypt.hash(String(password||""),MIN_BCRYPT_COST); db.prepare("UPDATE users SET passwordHash=? WHERE id=?").run(upgraded,u.id); } if(typeof options.beforeSession === "function"){ const challenge=await options.beforeSession(u,context); if(challenge) return challenge; } return createSession(u.id,context); }
async function hashPassword(password){ return bcrypt.hash(cleanPassword(password),MIN_BCRYPT_COST); }
function hashPasswordSync(password){ return bcrypt.hashSync(cleanPassword(password),MIN_BCRYPT_COST); }
function verifyPassword(userId, password){ const u=db.prepare("SELECT passwordHash, accountStatus FROM users WHERE id=?").get(userId); if(!u || u.accountStatus !== "active") return false; return bcrypt.compareSync(String(password||""), u.passwordHash); }
function hashToken(t){ return policy.hash(t); }
function createSessionForProvider(userId,context={}){ return createSession(userId,context); }
function sessionContext(context={}){ return {deviceId:policy.normalizeDeviceId(context.deviceId),deviceLabel:policy.normalizeDeviceLabel(context.deviceLabel),deviceMetadata:JSON.stringify(policy.normalizeDeviceMetadata(context.deviceMetadata)),ipHash:policy.hashIp(context.ip),userAgentHash:policy.hashUserAgent(context.userAgent)}; }
function createSession(userId,context={},options={}){
  const account=db.prepare("SELECT accountStatus FROM users WHERE id=?").get(userId);
  if(account?.accountStatus === "suspended") throw Object.assign(new Error("This NEXA account is suspended. Please contact NEXA support."),{status:403,code:"ACCOUNT_SUSPENDED"});
  if(!account || account.accountStatus !== "active") throw Object.assign(new Error("This NEXA account is not available for sign-in."),{status:403,code:account?.accountStatus === "closed" ? "ACCOUNT_CLOSED" : "ACCOUNT_UNAVAILABLE"});
  lifecycleMaturity.assertAccountActive(account);
  const token=policy.newToken(); const tokenHash=hashToken(token); const sessionId=policy.newSessionId(); const now=new Date(); const life=policy.sessionLifetime(now); const c=sessionContext(context);
  const run=db.transaction(()=>{
    db.prepare(`INSERT INTO sessions(token,userId,createdAt,expiresAt,sessionId,idleExpiresAt,lastSeenAt,deviceIdHash,deviceLabel,deviceMetadata,ipHash,userAgentHash,revokedAt,revocationReason,rotatedFromHash,adminVerifiedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(tokenHash,userId,now.toISOString(),life.absoluteExpiresAt,sessionId,life.idleExpiresAt,now.toISOString(),c.deviceId?hashToken(c.deviceId):null,c.deviceLabel,c.deviceMetadata,c.ipHash,c.userAgentHash,null,null,null,options&&options.adminVerified===true?now.toISOString():null);
    const active=db.prepare("SELECT token FROM sessions WHERE userId=? AND revokedAt IS NULL AND expiresAt>? ORDER BY createdAt DESC").all(userId,now.toISOString());
    for(const row of active.slice(SESSION_CAP)) db.prepare("UPDATE sessions SET revokedAt=?,revocationReason=? WHERE token=? AND revokedAt IS NULL").run(now.toISOString(),"session_cap",row.token);
  });
  run(); const u=db.prepare("SELECT * FROM users WHERE id=?").get(userId); return {token,user:publicUser(u)};
}
function emitReuseEvent(row){ try { db.prepare("INSERT INTO platform_event_log(id,requestId,userId,action,entityType,entityId,metadata,createdAt) VALUES(?,?,?,?,?,?,?,?)").run(`evt_${crypto.randomBytes(12).toString("hex")}`,`session_${row.sessionId||"unknown"}`,row.userId,"session_reuse_detected","session",row.sessionId||null,JSON.stringify({reason:row.revocationReason||"revoked"}),new Date().toISOString()); } catch (_) {} }
function authMiddleware(req,res,next){
  purgeExpiredSessions(db); const h=String(req.headers.authorization||""); const token=h.startsWith("Bearer ")?h.slice(7).trim():"";
  if(!token) return res.status(401).json({error:"Sign in required."});
  const row=db.prepare("SELECT s.*,u.* FROM sessions s JOIN users u ON u.id=s.userId WHERE s.token=?").get(hashToken(token));
  if(row && row.accountStatus === "suspended") return res.status(403).json({error:"This NEXA account is suspended. Please contact NEXA support.",code:"ACCOUNT_SUSPENDED"});
  if(row && row.accountStatus !== "active") return res.status(401).json({error:"This account is not available for sign-in."});
  if(!row || row.accountStatus === "closed" || !policy.sessionValid(row,new Date())) {
    if(row?.revokedAt && row.revocationReason === "rotation") emitReuseEvent(row);
    if(row && !row.revokedAt) db.prepare("UPDATE sessions SET revokedAt=?,revocationReason=? WHERE token=?").run(new Date().toISOString(),"expired",hashToken(token));
    return res.status(401).json({error:"Session expired. Please sign in again."});
  }
  const presentedDevice = policy.normalizeDeviceId(req.headers["x-nexa-device-id"]);
  if(row.deviceIdHash && (!presentedDevice || policy.hash(presentedDevice)!==row.deviceIdHash)){
    db.prepare("UPDATE sessions SET revokedAt=?,revocationReason=? WHERE token=? AND revokedAt IS NULL").run(new Date().toISOString(),"device_mismatch",hashToken(token));
    return res.status(401).json({error:"This NEXA session is bound to a different device."});
  }
  const now=new Date();
  if(policy.needsTouch(row,now)) db.prepare("UPDATE sessions SET lastSeenAt=?,idleExpiresAt=? WHERE token=? AND revokedAt IS NULL").run(now.toISOString(),new Date(now.getTime()+policy.SESSION_IDLE_MS).toISOString(),hashToken(token));
  req.token=token; req.tokenHash=hashToken(token); req.session=row; req.user={...publicUser(row),adminSessionVerified:!!row.adminVerifiedAt,twoFactorVerified:!!row.twoFactorVerifiedAt}; return next();
}
function logout(token,reason="logout"){ db.prepare("UPDATE sessions SET revokedAt=?,revocationReason=? WHERE token=? AND revokedAt IS NULL").run(new Date().toISOString(),String(reason).slice(0,80),hashToken(token)); }
function listSessions(userId, currentToken){ return db.prepare("SELECT sessionId,createdAt,expiresAt,idleExpiresAt,lastSeenAt,deviceLabel,token FROM sessions WHERE userId=? AND revokedAt IS NULL AND expiresAt>? ORDER BY createdAt DESC").all(userId,new Date().toISOString()).map(r=>policy.safeSession(r,hashToken(currentToken))); }
function logoutOtherSessions(userId,currentToken){ return db.prepare("UPDATE sessions SET revokedAt=?,revocationReason=? WHERE userId=? AND token<>? AND revokedAt IS NULL").run(new Date().toISOString(),"logout_other_sessions",userId,hashToken(currentToken)).changes; }
function logoutAllSessions(userId,currentToken){ return db.prepare("UPDATE sessions SET revokedAt=?,revocationReason=? WHERE userId=? AND revokedAt IS NULL AND token<>?").run(new Date().toISOString(),"logout_all",userId,hashToken(currentToken)).changes; }
function passwordChangeRevokeAll(userId,currentToken){ return db.prepare("UPDATE sessions SET revokedAt=?,revocationReason=? WHERE userId=? AND revokedAt IS NULL AND token<>?").run(new Date().toISOString(),"password_changed",userId,currentToken?hashToken(currentToken):"").changes; }
function rotateSession(token,context={}){
  const oldHash=hashToken(token); const old=db.prepare("SELECT * FROM sessions WHERE token=?").get(oldHash);
  if(!old || !policy.sessionValid(old,new Date())) throw Object.assign(new Error("Session expired. Please sign in again."),{code:"AUTH_EXPIRED"});
  const account=db.prepare("SELECT accountStatus FROM users WHERE id=?").get(old.userId);
  if(!account || account.accountStatus !== "active") throw Object.assign(new Error("This account is not available for session renewal."),{status:403,code:account?.accountStatus === "suspended" ? "ACCOUNT_SUSPENDED" : account?.accountStatus === "closed" ? "ACCOUNT_CLOSED" : "ACCOUNT_UNAVAILABLE"});
  const next=policy.newToken(), nextHash=hashToken(next), now=new Date(), life=policy.sessionLifetime(now), c=sessionContext(context), nextId=policy.newSessionId();
  db.transaction(()=>{
    db.prepare("UPDATE sessions SET revokedAt=?,revocationReason=? WHERE token=? AND revokedAt IS NULL").run(now.toISOString(),"rotation",oldHash);
    db.prepare("INSERT INTO sessions(token,userId,createdAt,expiresAt,sessionId,idleExpiresAt,lastSeenAt,deviceIdHash,deviceLabel,deviceMetadata,ipHash,userAgentHash,revokedAt,revocationReason,rotatedFromHash,adminVerifiedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(nextHash,old.userId,now.toISOString(),life.absoluteExpiresAt,nextId,life.idleExpiresAt,now.toISOString(),c.deviceId?hashToken(c.deviceId):old.deviceIdHash,c.deviceLabel||old.deviceLabel,c.deviceMetadata,c.ipHash,c.userAgentHash,null,null,oldHash,old.adminVerifiedAt||null);
    if(old.twoFactorVerifiedAt) db.prepare("UPDATE sessions SET twoFactorVerifiedAt=? WHERE token=?").run(old.twoFactorVerifiedAt,nextHash); // M7772: a rotated session keeps the 2FA mark it already earned
  })();
  const u=db.prepare("SELECT * FROM users WHERE id=?").get(old.userId); return {token:next,user:publicUser(u)};
}
// M7772: called only after direct 2FA succeeds for this session. Takes the bearer token; never the client's claim.
function markSessionTwoFactorVerified(token,now=new Date()){
  if(typeof token!=="string"||!token) return false;
  return db.prepare("UPDATE sessions SET twoFactorVerifiedAt=? WHERE token=? AND revokedAt IS NULL").run(now.toISOString(),hashToken(token)).changes===1;
}

module.exports={markSessionTwoFactorVerified,MIN_BCRYPT_COST,signup,login,hashPassword,hashPasswordSync,logout,listSessions,logoutOtherSessions,logoutAllSessions,passwordChangeRevokeAll,authMiddleware,purgeExpiredSessions,verifyPassword,createSessionForProvider,createSession,rotateSession,hashToken};

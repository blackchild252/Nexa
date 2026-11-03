"use strict";

const crypto = require("node:crypto");
const ENDPOINT_PATH = "/zeeza/v1/admin/login-code";
const EXPECTED = Object.freeze({ v: 1, type: "login.code_delivery", issuer: "lordgistics", audience: "nexa-main-zeeza" });
const DATA_KEYS = Object.freeze(["userId", "challengeId", "code", "expiresAt", "channel"]);
const DATA_KEY_SET = new Set(DATA_KEYS);
const canonicalJson = value => Array.isArray(value) ? `[${value.map(canonicalJson).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}` : JSON.stringify(value);
const signEnvelope = (secret, envelope) => crypto.createHmac("sha256", secret).update(canonicalJson(envelope)).digest("hex");
const equalHex = (a,b) => { if(typeof a!=="string"||typeof b!=="string"||!/^[a-f0-9]{64}$/.test(a)||!/^[a-f0-9]{64}$/.test(b)) return false; return crypto.timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex")); };
const text = (v,max=160) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const ms = v => typeof v === "number" && Number.isSafeInteger(v) ? v : typeof v === "string" && v.length <= 64 ? Date.parse(v) : NaN;
function configuredKeys(env) { try { const raw=JSON.parse(String(env.NEXA_MAIN_ZEEZA_LOGIN_KEYS||"{}")); if(!raw||Array.isArray(raw)||typeof raw!=="object")return{}; return Object.fromEntries(Object.entries(raw).filter(([k,v])=>/^[A-Za-z0-9_-]{1,40}$/.test(k)&&typeof v==="string"&&v.length>=32)); } catch { return {}; } }
function ensureSchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS zeeza_login_secure_inbox (id TEXT PRIMARY KEY, eventId TEXT NOT NULL UNIQUE, userId TEXT NOT NULL, challengeId TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'local' CHECK(category='local'), preview TEXT NOT NULL DEFAULT 'LORDGISTICS sign-in code', message TEXT NOT NULL, expiresAt TEXT NOT NULL, createdAt TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_zeeza_login_inbox_user_expiry ON zeeza_login_secure_inbox(userId,expiresAt); CREATE TABLE IF NOT EXISTS zeeza_login_delivery_events (eventId TEXT PRIMARY KEY, deliveredAt TEXT NOT NULL);`);
}
function createZeezaLoginCodeDelivery({ db, env=process.env, now=()=>Date.now(), genId=()=>crypto.randomUUID(), scheduleCleanup=true }={}) {
  ensureSchema(db); const keys=configuredKeys(env);
  const cleanup=()=>db.prepare("DELETE FROM zeeza_login_secure_inbox WHERE expiresAt <= ?").run(new Date(now()).toISOString()); cleanup();
  let timer=null; if(scheduleCleanup){timer=setInterval(()=>{try{cleanup()}catch{}},60_000);timer.unref?.();}
  function handle(req,res){
    const out=(body,status=200)=>res.status(status).json(body);
    try {
      cleanup(); const body=req?.body; if(!body||Array.isArray(body)||typeof body!=="object")return out({delivered:false,reason:"bad_request"});
      const {keyId,signature,...envlp}=body; const secret=keys[keyId];
      if(!secret||!equalHex(signature,signEnvelope(secret,envlp)))return out({delivered:false,reason:"bad_signature"});
      if(envlp.v!==EXPECTED.v||envlp.type!==EXPECTED.type||envlp.issuer!==EXPECTED.issuer||envlp.audience!==EXPECTED.audience)return out({delivered:false,reason:"wrong_scope"});
      if(!Number.isFinite(envlp.at)||Math.abs(now()-envlp.at)>5*60_000)return out({delivered:false,reason:"stale_event"});
      if(!text(envlp.eventId,160)||!/^[A-Za-z0-9._:-]{1,160}$/.test(envlp.eventId))return out({delivered:false,reason:"bad_request"});
      const d=envlp.data; if(!d||Array.isArray(d)||typeof d!=="object"||Object.keys(d).length!==DATA_KEYS.length||Object.keys(d).some(k=>!DATA_KEY_SET.has(k)))return out({delivered:false,reason:"bad_request"});
      if(!text(d.userId,100)||!text(d.challengeId,160)||!/^[A-Za-z0-9._:-]{1,160}$/.test(d.challengeId)||typeof d.code!=="string"||!/^[0-9]{6}$/.test(d.code)||d.channel!=="zeeza_secure_inbox")return out({delivered:false,reason:"bad_request"});
      const expiry=ms(d.expiresAt); if(!Number.isFinite(expiry)||expiry<=now()||expiry>now()+5*60_000)return out({delivered:false,reason:"bad_expiry"});
      if(db.prepare("SELECT eventId FROM zeeza_login_delivery_events WHERE eventId = ?").get(envlp.eventId))return out({delivered:true,eventId:envlp.eventId});
      const user=db.prepare("SELECT id, accountStatus FROM users WHERE id = ?").get(d.userId); if(!user||(user.accountStatus&&user.accountStatus!=="active"))return out({delivered:false,reason:"identity_mismatch"});
      const at=new Date(now()).toISOString(), message=`Your LORDGISTICS sign-in code is ${d.code}. It works once and expires in five minutes. Never share this code.`;
      try { db.transaction(()=>{ if(db.prepare("SELECT eventId FROM zeeza_login_delivery_events WHERE eventId = ?").get(envlp.eventId))return; db.prepare("INSERT INTO zeeza_login_delivery_events (eventId,deliveredAt) VALUES (?,?)").run(envlp.eventId,at); db.prepare("INSERT INTO zeeza_login_secure_inbox (id,eventId,userId,challengeId,category,preview,message,expiresAt,createdAt) VALUES (?,?,?,?,'local','LORDGISTICS sign-in code',?,?,?)").run(genId(),envlp.eventId,user.id,d.challengeId,message,new Date(expiry).toISOString(),at); })(); }
      catch(error){ if(!db.prepare("SELECT eventId FROM zeeza_login_delivery_events WHERE eventId = ?").get(envlp.eventId))throw error; }
      return out({delivered:true,eventId:envlp.eventId});
    } catch { return out({delivered:false,reason:"delivery_unavailable"},500); }
  }
  return {handle,cleanup,close(){if(timer)clearInterval(timer)}};
}
function registerZeezaLoginCodeDelivery({app,db,env=process.env,now,genId,scheduleCleanup}={}){const service=createZeezaLoginCodeDelivery({db,env,now,genId,scheduleCleanup});app.post(ENDPOINT_PATH,service.handle);return service;}
module.exports={ENDPOINT_PATH,EXPECTED,canonicalJson,signEnvelope,configuredKeys,ensureSchema,createZeezaLoginCodeDelivery,registerZeezaLoginCodeDelivery};

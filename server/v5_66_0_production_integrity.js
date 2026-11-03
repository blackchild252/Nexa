"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PLACEHOLDER = /^(|your_key_here|changeme|change_me|todo|xxx+|placeholder)$/i;
const SEMVER = /^\d+\.\d+\.\d+$/;
const SECRETISH = /key|secret|token|password|credential/i;
const isProd = (env={}) => String(env.NODE_ENV||"").trim().toLowerCase() === "production";
const val = (env,k) => String(env?.[k] ?? "").trim();
const list = (v) => String(v||"").split(",").map(s=>s.trim()).filter(Boolean);
const https = (v) => /^https:\/\//i.test(String(v||""));
const local = (v) => /^(https?:\/\/)?(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|\[?::1)/i.test(String(v||""));
const fileJson = (p) => JSON.parse(fs.readFileSync(p,"utf8"));

function nodeEnv(env){ return val(env,"NODE_ENV") ? val(env,"NODE_ENV") : null; }
function strictLaunch(env){ return !isProd(env) || val(env,"NEXA_STRICT_LAUNCH")==="1" ? true : null; }
function launchCertified(env){ return !isProd(env) || val(env,"NEXA_LAUNCH_CERTIFIED")==="1"; }
function persistentDb(env){ const p=val(env,"DB_PATH"); return !isProd(env) || (p && path.isAbsolute(p)); }
function dbOutsideApp(env, root=process.cwd()){ const p=val(env,"DB_PATH"); return !isProd(env) || (p && path.isAbsolute(p) && !path.resolve(p).startsWith(path.resolve(root)+path.sep)); }
function paymentLive(env){ return !isProd(env) || val(env,"PAYMENT_MODE").toLowerCase()!=="mock"; }
function paymentSecret(env){ const k=val(env,"PAYSTACK_SECRET_KEY"); return !isProd(env) || (k && !PLACEHOLDER.test(k) && !/^sk_test_/i.test(k)); }
function googleOAuth(env){ if(!isProd(env)) return true; return Boolean(val(env,"GOOGLE_CLIENT_ID")&&val(env,"GOOGLE_CLIENT_SECRET")&&https(val(env,"GOOGLE_REDIRECT_URI"))); }
function aiProvider(env){ const p=(val(env,"DAMI_AI_PROVIDER")||val(env,"NEXA_AI_PROVIDER")||"grok").toLowerCase(); const G=["grok","xai","xai-grok","openai"]; if(!isProd(env)) return [...G,"google","gemini","google-gemini"].includes(p); return [...G,"google","gemini","google-gemini"].includes(p) && (G.includes(p) ? !PLACEHOLDER.test(val(env,"XAI_API_KEY")) : !PLACEHOLDER.test(val(env,"GEMINI_API_KEY")||val(env,"GOOGLE_API_KEY"))); }
function turnComplete(env){ const n=["NEXA_TURN_URL","NEXA_TURN_USERNAME","NEXA_TURN_CREDENTIAL"].filter(k=>val(env,k)).length; return n===0||n===3; }
function sentryConfigured(env){ return !isProd(env) || Boolean(val(env,"SENTRY_DSN")); }
function corsExplicit(env){ return !isProd(env) || (list(env.CORS_ORIGINS).length>0 && !list(env.CORS_ORIGINS).includes("*")); }
function publicUrl(env){ const u=val(env,"PUBLIC_URL"); return !isProd(env) || (https(u)&&!local(u)); }
function backupConfigured(env){ return !isProd(env) || Boolean(val(env,"BACKUP_DIR")); }
function backupAge(env){ if(!isProd(env)) return true; const n=Number(val(env,"BACKUP_MAX_AGE_HOURS")||26); return Number.isFinite(n)&&n>=1&&n<=168; }
function adminsClean(env){ if(!isProd(env)) return true; return ![...list(env.NEXA_ADMIN_EMAILS),...list(env.NEXA_ADMIN_USER_IDS)].some(x=>/@nexa\.local$|^preview\./i.test(x)); }
function previewOff(env){ return !isProd(env) || val(env,"NEXA_PREVIEW_MODE")!=="1"; }
function e2eOff(env){ return !isProd(env) || !["NEXA_E2E_PASSWORD","E2E_PASSWORD","TEST_PASSWORD"].some(k=>val(env,k)); }
function fixturesOff(env){ return !isProd(env) || !["NEXA_PREVIEW_MODE","NEXA_SEED_FIXTURES"].some(k=>val(env,k)==="1"); }
function marketExplicit(env){ if(!isProd(env)) return true; const m=(val(env,"MARKET_DATA_MODE")||"mock").toLowerCase(); return m!=="mock"; }
function nodeSupported(env){ const major=Number(String(process.versions.node).split(".")[0]); return major>=20; }
function packageVersionSync(_env,root=process.cwd()) { try { const p=fileJson(path.join(root,"package.json")).version,s=fileJson(path.join(root,"server","package.json")).version,a=fileJson(path.join(root,"app.json")).expo.version; return SEMVER.test(p)&&p===s&&p===a; } catch (_) { return false; } }
function lockVersionSync(_env,root=process.cwd()) { try { const p=fileJson(path.join(root,"package.json")); const l=fileJson(path.join(root,"package-lock.json")); return l.version===p.version && l.packages?.["" ]?.version===p.version; } catch (_) { return false; } }
function expoVersionSync(_env,root=process.cwd()) { try { const p=fileJson(path.join(root,"package.json")); const a=fileJson(path.join(root,"app.json")).expo; return a.version===p.version && Number.isInteger(a.android?.versionCode) && a.ios?.buildNumber!=null; } catch (_) { return false; } }
function lockfilePresent(root=process.cwd()){ return fs.existsSync(path.join(root,"package-lock.json")); }
function dependencyManifestStable(root=process.cwd()){ try { const p=fileJson(path.join(root,"package.json")); const l=fileJson(path.join(root,"package-lock.json")); return Boolean(p.dependencies&&l.packages&&l.packages[""]); } catch (_) { return false; } }
function dbRuntimeContract(root=path.join(process.cwd(),"server")){ try { const s=fs.readFileSync(path.join(root,"db.js"),"utf8"); return /foreign_keys\s*=\s*ON/.test(s)&&/journal_mode\s*=\s*WAL/.test(s)&&/busy_timeout\s*=\s*5000/.test(s); } catch (_) { return false; } }
function envNoSecretEcho(env){ return Object.entries(env||{}).every(([k,v])=>!SECRETISH.test(k) || !String(v||"").includes("your_key_here")); }
function startupContract(root=process.cwd()){ return fs.existsSync(path.join(root,"server","index.js"))&&fs.existsSync(path.join(root,"server","launchReadiness.js")); }
function configFingerprint(env){ const safe={}; for(const [k,v] of Object.entries(env||{})) if(!SECRETISH.test(k)) safe[k]=String(v??""); return crypto.createHash("sha256").update(JSON.stringify(Object.keys(safe).sort().reduce((o,k)=>(o[k]=safe[k],o),{}))).digest("hex"); }

const CONTROLS=[
 [1000,"NODE_ENV explicit",nodeEnv],[1001,"Strict launch policy",strictLaunch],[1002,"Launch certification",launchCertified],[1003,"Absolute persistent DB path",persistentDb],[1004,"DB outside application tree",dbOutsideApp],[1005,"Production payment mode",paymentLive],[1006,"Production payment secret",paymentSecret],[1007,"Google OAuth production contract",googleOAuth],[1008,"AI provider/key coherence",aiProvider],[1009,"TURN configuration completeness",turnComplete],[1010,"Sentry production configuration",sentryConfigured],[1011,"Explicit CORS origins",corsExplicit],[1012,"Canonical public HTTPS URL",publicUrl],[1013,"Backup directory configured",backupConfigured],[1014,"Backup age bound",backupAge],[1015,"Production admin identity hygiene",adminsClean],[1016,"Preview mode disabled",previewOff],[1017,"E2E credentials disabled",e2eOff],[1018,"Fixture mode disabled",fixturesOff],[1019,"Production market source explicit",marketExplicit],[1020,"Supported Node runtime",nodeSupported],[1021,"Package version synchronization",packageVersionSync],[1022,"Lockfile version synchronization",lockVersionSync],[1023,"Expo release version synchronization",expoVersionSync],[1024,"Runtime dependency/DB/startup/configuration contract",(env,root)=>lockfilePresent(root)&&dependencyManifestStable(root)&&dbRuntimeContract(path.join(root,"server"))&&startupContract(root)&&configFingerprint(env)]
];
function evaluate({env=process.env,root=process.cwd()}={}){const checks=CONTROLS.map(([milestone,name,fn])=>{let result;try{result=fn(env,root);}catch(_){result=false;}return {milestone,name,ok:result===true||typeof result==="string"&&result.length>0,value:typeof result==="string"?result:undefined};});const failed=checks.filter(x=>!x.ok);return {total:checks.length,pass:checks.length-failed.length,fail:failed.length,ok:failed.length===0,checks,fingerprint:configFingerprint(env)};}
module.exports={CONTROLS,evaluate,configFingerprint,nodeEnv,strictLaunch,launchCertified,persistentDb,dbOutsideApp,paymentLive,paymentSecret,googleOAuth,aiProvider,turnComplete,sentryConfigured,corsExplicit,publicUrl,backupConfigured,backupAge,adminsClean,previewOff,e2eOff,fixturesOff,marketExplicit,nodeSupported,packageVersionSync,lockVersionSync,expoVersionSync,lockfilePresent,dependencyManifestStable,dbRuntimeContract,startupContract};

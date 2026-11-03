"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const path=require("node:path");
const m=require("./v5_66_0_production_integrity");
const root=path.join(__dirname,"..");
const prod={NODE_ENV:"production",NEXA_STRICT_LAUNCH:"1",NEXA_LAUNCH_CERTIFIED:"1",DB_PATH:"/data/nexa.db",PAYMENT_MODE:"live",PAYSTACK_SECRET_KEY:"sk_live_example",GOOGLE_CLIENT_ID:"id",GOOGLE_CLIENT_SECRET:"secret",GOOGLE_REDIRECT_URI:"https://example.com/auth",DAMI_AI_PROVIDER:"grok",XAI_API_KEY:"real",SENTRY_DSN:"https://example@o.ingest.sentry.io/1",CORS_ORIGINS:"https://example.com",PUBLIC_URL:"https://example.com",BACKUP_DIR:"/data/backups",BACKUP_MAX_AGE_HOURS:"26",NEXA_ADMIN_EMAILS:"admin@example.com",MARKET_DATA_MODE:"live"};
for(const [milestone,name,fn] of m.CONTROLS){test(`M${milestone} ${name}`,()=>{const r=fn(prod,root);assert.ok(r===true||(typeof r==="string"&&r.length>0),`control returned invalid result: ${r}`);});}
test("B107 aggregate has exactly 25 milestones and passes production fixture",()=>{assert.equal(m.CONTROLS.length,25);const r=m.evaluate({env:prod,root});assert.equal(r.total,25);assert.equal(r.fail,0);});
test("B107 DB path rejects relative production path",()=>assert.equal(m.persistentDb({...prod,DB_PATH:"server/nexa.db"}),false));
test("B107 payment rejects test key in production",()=>assert.equal(m.paymentSecret({...prod,PAYSTACK_SECRET_KEY:"sk_test_x"}),false));
test("B107 OAuth rejects non-HTTPS redirect in production",()=>assert.equal(m.googleOAuth({...prod,GOOGLE_REDIRECT_URI:"http://example.com/auth"}),false));

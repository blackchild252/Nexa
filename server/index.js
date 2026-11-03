// Fail early with a concise local dependency report instead of a misleading first-module crash.
// This check is read-only and never prints environment values or credentials.
const bootstrapFs = require("node:fs");
const bootstrapPath = require("node:path");
const serverPackage = JSON.parse(bootstrapFs.readFileSync(bootstrapPath.join(__dirname, "package.json"), "utf8"));
const missingServerModules = Object.keys(serverPackage.dependencies || {}).filter((name) => {
  try { require.resolve(name, { paths: [__dirname, bootstrapPath.dirname(__dirname)] }); return false; }
  catch (_) { return true; }
});
if (missingServerModules.length) {
  console.error("NEXA server cannot start: required dependencies are missing or not resolvable.");
  console.error(`Missing packages (${missingServerModules.length}): ${missingServerModules.join(", ")}`);
  console.error("From the project root, restore dependencies with `npm ci` when registry access is available; then rerun `npm run deps:preflight`.");
  process.exit(1);
}
require("dotenv").config();
// Owner directive: run the app locally only; block outbound provider/API fetches.
const localOnlyNetwork = require("./localOnlyNetwork");
localOnlyNetwork.installLocalOnlyNetworkGuard();
const sentry = require("./sentry");
const operationalTelemetry = require("./observability"); // sanitised operational events; raw exception text never leaves the server
const express = require("express");
const cors = require("cors");
const grokProvider = require("./grokProvider");
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const yaayzAdvertisers = require("./yaayzAdvertisers");
const db = require("./db");
const auth = require("./auth");
const authLifecycle = require("./authLifecycle");
let adminSecurityCenter = null; // Block 04 Admin MFA, sessions and step-up authority.
const externalNavigation = require("./v5_75_0_external_navigation");
const legalPages = require("./v5_98_76_legal_pages"); // V5.98.76 / B224
const audioUploadLifecycle = require("./v5_76_0_audio_upload_lifecycle");
// Historical upload contract marker: nexa-voice-${crypto.randomBytes(16)} is the managed filename family.
const payments = require("./payments");
const currencyModel = require("./currencyModel");
const currencyPreferences = require("./currencyPreferences");
const regionalPreferences = require("./regionalPreferences");
const { createStoreAjoRouter } = require("./storeAjo");
const { createMarketRouter } = require("./market");
const aiActions = require("./aiActions");
const damiActionReceipts = require("./damiActionReceipts");
const aiHub = require("./aiHub");
const { errorPayload } = require("./httpErrors");
// B262: a 5xx answer must never carry the raw error text (it can be database or internal wording). 4xx keeps its message.
const clientErrorMessage = (e, status, fallback) => (Number(status) >= 500 ? fallback : ((e && e.message) || fallback));
const { isConfiguredAdmin } = require("./mallAdmin");
const paymentAttention = require("./paymentAttention");
const walletFinancialOperations = require("./financialOperations");
const planning = require("./planning");
const intelligence = require("./intelligence");
const search = require("./search");
const moneyPlanningMaturity = require("./moneyPlanningMaturity");
const marketplaceDiscovery = require("./marketplaceDiscovery");
const productStock = require("./productStock");
const marketplaceDelivery = require("./marketplaceDelivery");
const contracts = require("./contracts");
const extensions = require("./extensions");
const extensionCapabilities = require("./extensionCapabilities");
const extensionDeveloper = require("./extensionDeveloper");
const extensionIdentity = require("./extensionIdentity");
const extensionGovernance = require("./extensionGovernance");
const notifications = require("./notifications");
const notificationPreferences = require("./notificationPreferences");
const notificationPolicy = require("./notificationPolicy");
const marketplaceOperations = require("./marketplaceOperations");
const trustCommunity = require("./trustCommunity");
const notificationIntelligence = require("./notificationIntelligence");
const savingsProgress = require("./savingsProgress");
const venueOperations = require("./venueOperations");
const marketplaceResolution = require("./marketplaceResolution");
const communityGovernance = require("./communityGovernance");
const notificationControls = require("./notificationControls");
const savingsMilestones = require("./savingsMilestones");
const venueDiscovery = require("./venueDiscovery");
const vendorFulfillment = require("./vendorFulfillment");
const roomLifecycle = require("./roomLifecycle");
const notificationDigest = require("./notificationDigest");
const savingsInsights = require("./savingsInsights");
const venuePersonalization = require("./venuePersonalization");
const vendorReturns = require("./vendorReturns");
const roomSafety = require("./roomSafety");
const notificationBatching = require("./notificationBatching");
const savingsForecast = require("./savingsForecast");
const venueCollections = require("./venueCollections");
const notificationDelivery = require("./notificationDelivery");
const pushTokenRegistry = require("./pushTokenRegistry");
const dataRetention = require("./dataRetention");
const maintenance = require("./maintenance");
const accountPortability = require("./accountPortability");
const accountLifecycle = require("./accountLifecycle");
const accountLifecycleReadiness = require("./accountLifecycleReadiness");
const notificationDeliveryHealth = require("./notificationDeliveryHealth");
const walletReconciliationPlan = require("./walletReconciliationPlan");
const walletProviderBoundary = require("./walletProvider");
const damiWorkflowSafety = require("./damiWorkflowSafety");
const { DAMI_LANGUAGES, getDamiLanguage, normalizeDamiLanguage, isSupportedDamiLanguage } = require("./damiLanguage");
const { normalizeAvatarConfig, parseStoredAvatar, applyPoseTier, tierForUser, previewUnlockAll, reportedTier } = require("./damiAvatar");
const subscriptionsForAvatar = require("./subscriptions");
const operational = require("./operationalReadiness");
const criticalControls = require("./criticalControls");
const { boundedIdempotencyKey, idempotencyReplayWindow } = criticalControls;
const majorHardening = require("./v5_60_0_major_hardening");
const privacyAuthorization = require("./v5_63_0_privacy_authorization");
const launchReadiness = require("./launchReadiness");
const productionIntegrity = require("./v5_66_0_production_integrity");
const productionLaunchCertification = require("./productionLaunchCertification");
const observability = require("./v5_68_0_observability");
const recoveryOps = require("./recoveryOps");
const { createRateLimiter } = require("./rateLimiter");
const { createPersistentRateLimiter } = require("./persistentRateLimiter");
const httpSurface = require("./httpSurface");
const googleAuth = require("./googleAuth");
const eventCorrelation = require("./eventCorrelation");
const operationsConsole = require("./operationsConsole");
const jobQueue = require("./jobQueue");
const contractGovernance = require("./v5_65_0_contract_governance");
const domainRegistry = require("./domainRegistry");
const accountSecurity = require("./accountSecurity");
const legalRuntime = require("./v5_98_20_legal_runtime_governance");
const trustAppeals = require("./trustAppeals");
const damiKnowledgeState = require("./damiKnowledgeState");
const damiKnowledgeHub = require("./damiKnowledgeHub");
const walletSettlement = require("./walletSettlement");
const leisureArena = require("./leisureArena");
const notificationCompletion = require("./notificationCompletion");
const savingsAutomation = require("./savingsAutomation");
const marketplaceGrowth = require("./marketplaceGrowth");
const socialCommunity = require("./socialCommunity");
const leisureFulfillment = require("./leisureFulfillment");
const { createWalletRouter } = require("./wallet");
const { createSubscriptionRouter, feePreview, assertFeePreview, chargeServiceFee } = require("./subscriptions");
const adminApprovalCenter = require("./adminApprovalCenter");
const football = require("./football");
const vendorSettlementExceptions = require("./vendorSettlementExceptions");
const damiOperations = require("./damiOperations");
const customerCare = require("./customerCare");
const walletOperations = require("./walletOperations");
const communityOperations = require("./communityOperations");
const marketplaceSettlement = require("./marketplaceSettlement");
const { createGroupCallSignaling } = require("./groupCallSignaling");
const marketplaceExceptionActions = require("./marketplaceExceptionActions");
const damiWorkflowRuns = require("./damiWorkflowRuns");
const settlementTrends = require("./settlementTrends");
const moderationCaseHistory = require("./moderationCaseHistory");
const trustSafetyMaturity = require("./trustSafetyMaturity");
const marketplaceExceptionEvidence = require("./marketplaceExceptionEvidence");
const damiExecutionReceipts = require("./damiExecutionReceipts");
const settlementRefinement = require("./settlementRefinement");
const moderationResolution = require("./moderationResolution");
const groupCallPresence = require("./groupCallPresence");
const marketplaceEvidenceReview = require("./marketplaceEvidenceReview");
const walletHealthSnapshots = require("./walletHealthSnapshots");
const walletHistory = require("./walletHistory");
const moderationGovernance = require("./moderationGovernance");
const vendorSubscriptions = require("./vendorSubscriptions");
const subscriptionHub = require("./subscriptionHub");
const aamiEconomy = require("./aamiEconomy");
const skyMoneyHub = require("./skyMoneyHub");
const vendorSubscriptionScheduler = require("./vendorSubscriptionScheduler");
const paymentReconciler = require("./paymentReconciler");
const vendorProductAi = require("./vendorProductAi");
const productAiModeration = require("./productAiModeration");
const trustSafety = require("./trustSafety");
trustSafety.ensureSchema(db);
marketplaceDelivery.ensureSchema(db);
const youtubeContent = require("./youtubeContent");
const { registerCentralActivationCodeDelivery } = require("./centralActivationCodeDelivery");
const { registerCentralFactorVerify } = require("./centralFactorVerify");
const { registerCentralFactorCommit } = require("./centralFactorCommit");
const { registerCentralIdentityResolve } = require("./centralIdentityResolve");
const { registerCentralPrivilegedAccess } = require("./centralPrivilegedAccess");
const { registerAdminAamiAccess } = require("./adminAamiAccess");
const { registerZeezaLoginCodeDelivery } = require("./zeezaLoginCodeDelivery");

const app = express();

// Preview-only status endpoint. It is intentionally unavailable outside NEXA_PREVIEW_MODE.
app.get("/api/demo/status", (req, res) => {
  if (process.env.NEXA_PREVIEW_MODE !== "1") return res.status(404).json({ error: "Not found." });
  try { return res.json(require("./demoFixtures").status()); } catch (_) { return res.status(503).json({ error: "Preview demo status unavailable." }); }
});

// V4.19: durable background-job foundation. Workers are intentionally separate from request handling.
try { jobQueue.ensureSchema(db); vendorSubscriptions.ensureSchema(db); googleAuth.ensureSchema(db); aamiEconomy.ensureSchema(db); youtubeContent.ensureSchema(db); } catch (e) { console.warn("[NEXA] Job queue/vendor subscription schema initialization skipped:", e.message); }

// V3.90.0: Money Intelligence extends Store Ajo-era Market Insights with authenticated spending-theme research context (item-specific zero-interest layaway; information-only market layer).
createStoreAjoRouter({ db, auth, payments, genRowId }).register(app);
createWalletRouter({ app, auth, db, rateLimit, sendPush });
// B145: Paystack wallet top-up routes removed. The wallet is controlled by a licensed third-party provider.
// walletTopup.ensureSchema/settleTopup stay only so a top-up paid before this change is still credited once.
createSubscriptionRouter({ app, auth, db, rateLimit });
aamiEconomy.register({ app, auth, db, rateLimit });
skyMoneyHub.register({ app, auth, db, rateLimit });

app.get("/api/account/subscriptions", auth.authMiddleware, (req, res) => {
  try { res.json(subscriptionHub.overview(db, req.user.id)); }
  catch (e) { res.status(400).json({ error: e.message || "Subscription overview unavailable." }); }
});
createGroupCallSignaling({ app, auth, db, genRowId, sendPush }).register(app);

app.get("/api/zeeza/group-calls/:callId/presence", auth.authMiddleware, (req,res) => {
  const c=db.prepare("SELECT * FROM group_call_sessions WHERE id=?").get(req.params.callId); if(!c) return res.status(404).json({error:"Group call not found."});
  const me=db.prepare("SELECT * FROM group_call_participants WHERE callId=? AND userId=?").get(c.id,req.user.id); if(!me) return res.status(403).json({error:"You are not a participant in this group call."});
  const participants=db.prepare("SELECT userId,role,status,joinedAt,leftAt,reconnectCount,lastSeenAt FROM group_call_participants WHERE callId=? ORDER BY joinedAt ASC").all(c.id);
  res.json({summary:groupCallPresence.presenceSummary(participants),participants});
});

app.post("/api/zeeza/group-calls/:callId/host-actions", auth.authMiddleware, (req,res) => {
  const c=db.prepare("SELECT * FROM group_call_sessions WHERE id=?").get(req.params.callId); if(!c) return res.status(404).json({error:"Group call not found."});
  if(c.hostId!==req.user.id) return res.status(403).json({error:"Only the call host can use host controls."});
  const action=String(req.body?.action||""); if(!groupCallPresence.hostAction(action)) return res.status(400).json({error:"Unsupported host action."});
  const target=String(req.body?.userId||"");
  if(action==='end'){db.prepare("UPDATE group_call_sessions SET status='ended',endedAt=? WHERE id=? AND status NOT IN ('ended','expired')").run(new Date().toISOString(),c.id);return res.json({ok:true,action,callId:c.id});}
  const participant=db.prepare("SELECT * FROM group_call_participants WHERE callId=? AND userId=?").get(c.id,target); if(!participant) return res.status(404).json({error:"Call participant not found."});
  if(action==='remove'){db.prepare("UPDATE group_call_participants SET status='left',leftAt=? WHERE callId=? AND userId=? AND userId!=?").run(new Date().toISOString(),c.id,target,req.user.id);return res.json({ok:true,action,userId:target});}
  if(action==='promote'){db.prepare("UPDATE group_call_participants SET role='member' WHERE callId=? AND role='host'").run(c.id);db.prepare("UPDATE group_call_participants SET role='host' WHERE callId=? AND userId=?").run(c.id,target);db.prepare("UPDATE group_call_sessions SET hostId=? WHERE id=?").run(target,c.id);return res.json({ok:true,action,userId:target});}
});

const ballHouseFootballLimit=rateLimit({windowMs:60_000,max:30,keyFn:req=>req.user?.id||req.ip,message:"Too many football refreshes. Please try again shortly."});
app.get("/api/ball-house/football",auth.authMiddleware,ballHouseFootballLimit,async(req,res)=>{try{const raw=await football.getFootballUpdates();const league=req.query?.league?String(req.query.league).slice(0,80):null;const team=req.query?.team?String(req.query.team).slice(0,120):null;const state=req.query?.state?String(req.query.state).slice(0,20):null;const date=req.query?.date?String(req.query.date).slice(0,10):null;res.json(football.filterFootballUpdates(raw,{league,team,state,date}));}catch(error){res.status(502).json({error:error?.message||"Football updates are temporarily unavailable."});}});

function getDamiVoicePreference(userId) {
  const row = db.prepare("SELECT voiceStyle, languageMode, languageCode FROM ai_voice_preferences WHERE userId = ?").get(userId) || { voiceStyle: "female", languageMode: "auto", languageCode: "auto" };
  const languageCode = normalizeDamiLanguage(row.languageCode, row.languageMode);
  return { voiceStyle: row.voiceStyle === "male" ? "male" : "female", languageCode, language: getDamiLanguage(languageCode) };
}
httpSurface.hardenApp(app); // V5.54.0 / B91: no X-Powered-By
// V5.54.3: the number of proxies in front of the server is a deployment fact. TRUST_PROXY: an integer hop count
// (default 1, unchanged), "0"/"false" for no proxy (direct exposure), or a comma-separated list of proxy IPs/CIDRs.
// Too high a hop count lets callers spoof X-Forwarded-For and dodge every IP-based limit.
app.set("trust proxy", (() => {
  const raw = String(process.env.TRUST_PROXY ?? "").trim();
  if (!raw) return 1;
  if (/^(0|false|no)$/i.test(raw)) return false;
  if (/^\d{1,2}$/.test(raw)) return Number(raw);
  const list = raw.split(",").map((x) => x.trim()).filter(Boolean);
  return list.length ? list : 1;
})());

// V3.29 baseline response hardening and request correlation.
app.use((req, res, next) => {
  const supplied = String(req.headers["x-request-id"] || "");
  req.requestId = /^[A-Za-z0-9._-]{1,100}$/.test(supplied) ? supplied : crypto.randomUUID();
  return eventCorrelation.runWithRequestId(req.requestId, () => {
  res.setHeader("X-Request-Id", req.requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  res.setHeader("Cache-Control", "no-store");
  sentry.setRequestContext(req.requestId);
  contracts.applyContractHeaders(res);
  next();
  });
});
const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean);
const corsPolicy = majorHardening.productionCorsPolicy({ nodeEnv: process.env.NODE_ENV, origins: allowedOrigins });
app.use(cors((req, done) => done(null, {
  origin(origin, callback) {
    // Native clients and server-to-server requests may omit Origin.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (!corsPolicy.production && allowedOrigins.length === 0) return callback(null, true);
    return callback(Object.assign(new Error("Origin not allowed by CORS"), { code: "CORS_ORIGIN_DENIED", status: 403 }));
  },
})));
app.use((req, res, next) => {
  if (!majorHardening.requestTargetBounds(req.originalUrl || req.url).ok) return res.status(414).json({ error: "Request target is too large.", code: "REQUEST_TARGET_TOO_LARGE", requestId: req.requestId });
  if (!majorHardening.queryKeyCount(req.query).ok) return res.status(400).json({ error: "Too many query parameters.", code: "QUERY_PARAMETER_LIMIT", requestId: req.requestId });
  return next();
});

app.use(express.json({ limit: "3mb", verify: (req, res, buf) => { req.rawBody = Buffer.from(buf); } }));
app.get('/api/location/context', auth.authMiddleware, (req,res)=>{
  try { const row=db.prepare("SELECT locationCell,locationStatus,locationUpdatedAt,zeezaExploreCountry,zeezaExploreCity FROM users WHERE id=?").get(req.user.id)||{}; res.json({status:row.locationStatus||'manual',cell:row.locationCell||null,updatedAt:row.locationUpdatedAt||null,country:row.zeezaExploreCountry||null,city:row.zeezaExploreCity||null}); } catch(e){res.status(400).json({error:'Location context unavailable.'});}
});
app.post('/api/location/context', auth.authMiddleware, (req,res)=>{
  const cell=String(req.body?.cell||'').trim().toLowerCase();
  if(!/^[0-9bcdefghjkmnpqrstuvwxyz]{4,8}$/.test(cell)) return res.status(400).json({error:'A coarse location cell is required.'});
  try { db.prepare("ALTER TABLE users ADD COLUMN locationCell TEXT").run(); } catch(_) {}
  try { db.prepare("ALTER TABLE users ADD COLUMN locationStatus TEXT NOT NULL DEFAULT 'manual'").run(); } catch(_) {}
  try { db.prepare("ALTER TABLE users ADD COLUMN locationUpdatedAt TEXT").run(); } catch(_) {}
  const at=new Date().toISOString(); db.prepare("UPDATE users SET locationCell=?,locationStatus='granted',locationUpdatedAt=? WHERE id=?").run(cell,at,req.user.id); res.json({ok:true,status:'granted',cell,updatedAt:at});
});

// Optional API-version negotiation: clients may pin a supported contract version.
app.use((req, res, next) => {
  const requested = req.headers[contracts.API_VERSION_HEADER.toLowerCase()];
  const negotiated = contracts.negotiateApiVersion(requested);
  if (!negotiated.ok) return res.status(400).json({ error: "Unsupported NEXA API version.", code: "UNSUPPORTED_API_VERSION", requested: negotiated.requested, supported: negotiated.supported, requestId: req.requestId });
  res.setHeader(contracts.API_VERSION_HEADER, negotiated.version);
  // B106: reject malformed negotiation headers and oversized request targets before route work.
  if (!contractGovernance.acceptHeader(req.headers.accept)) return res.status(406).json({ error: "Unsupported Accept header.", code: "INVALID_ACCEPT_HEADER", requestId: req.requestId });
  const contentType = req.headers["content-type"];
  if (["POST", "PUT", "PATCH"].includes(req.method) && contentType && !contractGovernance.contentType(contentType)) return res.status(415).json({ error: "Unsupported content type.", code: "UNSUPPORTED_CONTENT_TYPE", requestId: req.requestId });
  const idem = req.headers["idempotency-key"];
  if (idem && !contractGovernance.idempotencyKey(idem)) return res.status(400).json({ error: "Invalid idempotency key.", code: "INVALID_IDEMPOTENCY_KEY", requestId: req.requestId });
  next();
});


// Server-to-server AAMI Central activation-code delivery. No client create/read route is exposed.
registerCentralActivationCodeDelivery({ app, db, env: process.env });
// AAMI Central activation second factor: the applicant requests a code into their own Zeeza inbox; Central checks it server to server and gets only { verified }.
registerCentralFactorVerify({ app, auth, db, env: process.env, rateLimit });
// AAMI Central second-factor commit: after activation, Central records which factor the Administrative Director enrolled. Signed, server to server, no client route.
registerCentralFactorCommit({ app, db, env: process.env });
// Server-to-server identity resolution for approved cross-product provisioning; only verified active identities are disclosed.
registerCentralIdentityResolve({ app, db, env: process.env });
registerCentralPrivilegedAccess({ app, db, env: process.env });
// Admin AAMI has its own role table and product-scoped API; the umbrella portal is not a company.
registerAdminAamiAccess({ app, db, auth, env: process.env });
// Server-to-server LORDGISTICS login-code delivery to the linked Main-owned Zeeza inbox. No code is returned to the caller.
registerZeezaLoginCodeDelivery({ app, db, env: process.env });

// Liveness is process-only; readiness confirms the database handle is available.
app.get("/api/platform/contracts", auth.authMiddleware, (req, res) => res.json(contracts.contractManifest()));

app.get("/api/platform/domains", auth.authMiddleware, (req, res) => {
  res.json({ domains: domainRegistry.listDomains() });
});

app.get("/api/admin/owner-analytics", auth.authMiddleware, (req, res) => {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Owner access required." });
  const analytics = require("./ownerAnalytics");
  const report = analytics.buildOwnerAnalytics(db, { windowDays: Number(req.query?.windowDays) });
  if (String(req.query?.format || "").toLowerCase() === "csv") {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="nexa-owner-analytics.csv"');
    return res.send(analytics.toCsv(report));
  }
  res.setHeader("Cache-Control", "no-store");
  return res.json(report);
});

// Block 19: consumer lifecycle events and referrals remain Main-owned. Admin receives only owner-level readiness.
app.get("/api/growth/onboarding-config", auth.authMiddleware, (req, res) => {
  const growth = require("./growthLifecycle");
  res.setHeader("Cache-Control", "no-store");
  return res.json(growth.onboardingConfig({ country: req.query?.country, language: req.query?.language, userId: req.user.id }));
});
app.post("/api/growth/events", auth.authMiddleware, (req, res) => {
  const growth = require("./growthLifecycle");
  try {
    const result = growth.recordEvent(db, { userId: req.user.id, eventName: req.body?.eventName, idempotencyKey: req.get("Idempotency-Key") || req.body?.idempotencyKey, country: req.body?.country, language: req.body?.language, module: req.body?.module });
    if (!result.ok) return res.status(result.code === "AUTH_REQUIRED" ? 401 : 400).json({ error: "Growth event was not accepted.", code: result.code });
    return res.status(result.duplicate ? 200 : 201).json(result);
  } catch (_) { return res.status(500).json({ error: "Growth event could not be recorded." }); }
});
app.get("/api/growth/referrals/me", auth.authMiddleware, (req, res) => {
  const growth = require("./growthLifecycle");
  res.setHeader("Cache-Control", "no-store");
  try {
    const result = growth.getOrCreateReferralCode(db, req.user.id);
    // Account type comes from server records (vendors table), never from request or token fields.
    const campaign = growth.ensureZeezaReferralCampaign(db, { userId: req.user.id, accountType: growth.resolveReferralAccountType(db, req.user.id) });
    const status = growth.getZeezaReferralCampaignStatus(db, { userId: req.user.id });
    return res.json(growth.omitHashFields({ ...result, programme: "zeeza", campaign: campaign.campaign || null, campaignStatus: status }));
  } catch (_) { return res.status(500).json({ error: "Referral foundation is temporarily unavailable." }); }
});
app.get("/api/admin/zeeza/referral-followups", auth.authMiddleware, (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Owner access required." });
  const growth = require("./growthLifecycle");
  try {
    const q = growth.parseFollowupQuery(req.query);
    if (!q.ok) return res.status(400).json({ error: "Follow-up filter is not valid.", code: q.code, field: q.field });
    const followups = growth.omitHashFields(growth.listZeezaReferralFollowups(db, q));
    return res.json({ programme: "zeeza", generatedAt: new Date().toISOString(), page: { limit: q.limit, offset: q.offset, returned: followups.length }, followups, kitchenHubSeparate: true });
  } catch (_) { return res.status(500).json({ error: "Referral follow-ups are temporarily unavailable." }); }
});
// Administrator decision on a qualified campaign. Separate from qualification; audited; never credits a balance.
app.post("/api/admin/zeeza/referral-followups/:userId/decision", auth.authMiddleware, (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Owner access required." });
  const growth = require("./growthLifecycle");
  try {
    const userId = String(req.params?.userId || "").trim();
    if (!userId || userId.length > 128) return res.status(400).json({ error: "Campaign owner is not valid.", code: "INVALID_FILTER" });
    const decision = req.body?.decision;
    const args = { campaignUserId: userId, actorId: req.user.id, reason: req.body?.reason };
    const result = decision === "credit" ? growth.recordZeezaRewardCredit(db, args) : growth.recordZeezaRewardDecision(db, { ...args, decision });
    if (result.ok) return res.status(200).json({ ok: true, duplicate: result.duplicate === true, ledger: growth.omitHashFields(result.ledger), balanceChangedByThisCall: false });
    const status = { INVALID_DECISION: 400, REASON_REQUIRED: 400, AUTH_REQUIRED: 401, CAMPAIGN_NOT_FOUND: 404, REWARD_LEDGER_UNAVAILABLE: 503 }[result.code] || 409;
    return res.status(status).json({ error: "Reward decision could not be recorded.", code: result.code });
  } catch (_) { return res.status(500).json({ error: "Reward decision is temporarily unavailable." }); }
});
app.post("/api/growth/referrals/attribute", auth.authMiddleware, (req, res) => {
  const growth = require("./growthLifecycle");
  try {
    const result = growth.attributeReferral(db, { userId: req.user.id, token: req.body?.token });
    if (!result.ok) return res.status(400).json({ error: "Referral could not be attributed.", code: result.code });
    return res.status(200).json(result);
  } catch (_) { return res.status(500).json({ error: "Referral attribution is temporarily unavailable." }); }
});
app.get("/api/admin/growth-readiness", auth.authMiddleware, (req, res) => {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Owner access required." });
  const growth = require("./growthLifecycle");
  res.setHeader("Cache-Control", "no-store");
  return res.json(growth.buildGrowthReadiness(db));
});

// Block 20: owner-only, read-only platform/search readiness. This report is evidence-based
// and explicitly leaves provider, OAuth, sandbox and production acceptance deferred.
app.get("/api/admin/platform-readiness", auth.authMiddleware, (req, res) => {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Owner access required." });
  const readiness = require("./platformReadiness");
  res.setHeader("Cache-Control", "no-store");
  return res.json(readiness.buildPlatformReadiness({ packageVersion: require("./package.json").version }));
});

app.get("/api/admin/operations/summary", auth.authMiddleware, (req, res) => {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Administrator access required." });
  res.json({ generatedAt: new Date().toISOString(), summary: operationsConsole.summary(db) });
});

app.get("/api/admin/operations/diagnostics", auth.authMiddleware, (req, res) => {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Administrator access required." });
  const diagnostics = operational.inspectDiagnostics({ db, env: process.env, packageVersion: require("./package.json").version });
  diagnostics.schemaFingerprint = criticalControls.schemaFingerprint(db);
  res.json({ generatedAt: new Date().toISOString(), diagnostics });
});

app.get("/api/admin/operations/events", auth.authMiddleware, (req, res) => {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Administrator access required." });
  const severity = req.query?.severity ? String(req.query.severity) : null;
  const page = privacyAuthorization.adminPage({ limit: req.query?.limit, offset: req.query?.offset, max: 100 });
  const limit = page.limit;
  const offset = page.offset;
  res.json({ events: operationsConsole.recentEvents(db, { severity, limit, offset }), limit, offset, severity: severity && ["info", "warning", "error", "critical"].includes(severity) ? severity : null });
});

app.get("/api/dami/actions/history", auth.authMiddleware, (req,res) => {
  res.json({ receipts: damiActionReceipts.list(db, req.user.id, req.query?.limit) });
});

app.get("/api/dami/operations/workflow-readiness/:workflowId", auth.authMiddleware, (req,res) => {
  const workflow = db.prepare("SELECT id,title,steps FROM ai_workflows WHERE id=? AND userId=?").get(req.params.workflowId, req.user.id);
  if (!workflow) return res.status(404).json({error:"Workflow not found."});
  let steps=[]; try { steps=JSON.parse(workflow.steps||"[]"); } catch (_) {}
  const completedRows = db.prepare("SELECT result FROM ai_workflow_runs WHERE workflowId=? AND userId=? ORDER BY createdAt DESC LIMIT 1").all(workflow.id, req.user.id);
  let completed=[]; try { completed=completedRows[0]?.result ? JSON.parse(completedRows[0].result)?.completed || [] : []; } catch (_) {}
  const confirmed = db.prepare("SELECT 1 FROM ai_workflow_run_receipts WHERE workflowId=? AND userId=? AND confirmed=1 LIMIT 1").get(workflow.id, req.user.id);
  res.json({ workflow:{id:workflow.id,title:workflow.title}, readiness:damiWorkflowSafety.audit(steps, completed, Boolean(confirmed)) });
});

app.get("/api/dami/operations/workflows", auth.authMiddleware, (req,res) => {
  const workflows=db.prepare("SELECT id,title,status,steps,createdAt,updatedAt FROM ai_workflows WHERE userId=? ORDER BY updatedAt DESC LIMIT 50").all(req.user.id);
  const ids=workflows.map(w=>w.id);
  const runs=ids.length?db.prepare(`SELECT id,workflowId,result,createdAt FROM ai_workflow_runs WHERE userId=? ORDER BY createdAt DESC LIMIT 100`).all(req.user.id):[];
  res.json({summary:damiOperations.workflowSummary(workflows,runs),workflows:workflows.map(w=>{let steps=[];try{steps=JSON.parse(w.steps||"[]");}catch(_){}return {id:w.id,title:w.title,status:w.status,nextSteps:damiOperations.nextSteps(steps,[])};})});
});

app.get("/api/dami/operations/workflow-history/:workflowId", auth.authMiddleware, (req,res) => {
  const workflow=db.prepare("SELECT id,title,steps,status FROM ai_workflows WHERE id=? AND userId=?").get(req.params.workflowId,req.user.id);
  if(!workflow) return res.status(404).json({error:"Workflow not found."});
  let steps=[]; try{steps=JSON.parse(workflow.steps||"[]");}catch(_){}
  const runs=db.prepare("SELECT id,workflowId,result,createdAt,NULL AS completedAt FROM ai_workflow_runs WHERE workflowId=? AND userId=? ORDER BY createdAt DESC LIMIT 100").all(workflow.id,req.user.id);
  const receipts=db.prepare("SELECT id,runId,workflowId,idempotencyKey,status,confirmed,confirmationRequired,result,dependencyState,createdAt,completedAt FROM ai_workflow_run_receipts WHERE workflowId=? AND userId=? ORDER BY createdAt DESC LIMIT 100").all(workflow.id,req.user.id);
  const confirmed=receipts.filter(r=>Number(r.confirmed)===1).map(()=>true);
  res.json({workflow:{id:workflow.id,title:workflow.title,status:workflow.status},runs:damiWorkflowRuns.runHistory(runs),receipts:receipts.map(damiExecutionReceipts.receipt),dependencies:damiWorkflowRuns.dependencyGraph({steps}),confirmation:damiWorkflowRuns.confirmationContinuity(steps,receipts.some(r=>Number(r.confirmed)===1))});
});

app.get("/api/dami/operations/workflow-replay/:workflowId", auth.authMiddleware, (req,res) => {
  const workflow=db.prepare("SELECT id FROM ai_workflows WHERE id=? AND userId=?").get(req.params.workflowId,req.user.id);
  if(!workflow) return res.status(404).json({error:"Workflow not found."});
  return res.status(410).json({error:"Workflow replay is not a public operation surface."});
});

app.get("/api/account/dami/knowledge", auth.authMiddleware, (req, res) => {
  const rows = db.prepare("SELECT id,title,content,createdAt,updatedAt FROM ai_knowledge WHERE userId=? ORDER BY updatedAt DESC LIMIT 50").all(req.user.id);
  res.json({ sources: damiKnowledgeState.buildKnowledgeContext(rows.map(r => ({ id:r.id, kind:"user", title:r.title, text:r.content, updatedAt:r.updatedAt }))) });
});

app.post("/api/account/dami/knowledge", auth.authMiddleware, (req, res) => {
  const title = String(req.body?.title || "").trim().slice(0,160);
  const content = String(req.body?.content || "").trim().slice(0,400);
  if (!title || !content) return res.status(400).json({ error: "Knowledge title and content are required." });
  const id = genRowId("aik"); const now = new Date().toISOString();
  db.prepare("INSERT INTO ai_knowledge(id,userId,title,content,createdAt,updatedAt) VALUES(?,?,?,?,?,?)").run(id, req.user.id, title, content, now, now);
  res.status(201).json({ source: { id, kind:"user", title, text:content, updatedAt:now } });
});

app.delete("/api/account/dami/knowledge/:id", auth.authMiddleware, (req, res) => {
  const changed = db.prepare("DELETE FROM ai_knowledge WHERE id=? AND userId=?").run(req.params.id, req.user.id);
  if (!changed.changes) return res.status(404).json({ error:"Knowledge item not found." });
  res.json({ ok:true });
});

app.get("/api/wallet/settlement/health", auth.authMiddleware, (req,res) => {
  const rows=db.prepare("SELECT id,providerReference,amountMinor,currency,status,createdAt FROM wallet_transactions WHERE userId=? AND providerReference IS NOT NULL ORDER BY createdAt DESC LIMIT 200").all(req.user.id);
  const provider=require("./walletProvider").getWalletProvider(); const results=rows.map(row=>{let remote={};try{remote=row.type==='deposit'?provider.verifyDeposit({providerReference:row.providerReference,reference:row.id,amountMinor:row.amountMinor,currency:row.currency}):provider.verifyWithdrawal({providerReference:row.providerReference,reference:row.id,amountMinor:row.amountMinor,currency:row.currency});}catch(_){}return {createdAt:row.createdAt,...walletSettlement.reconciliationDecision(row,remote),issue:walletHistory.classifyReconciliationIssue(walletSettlement.reconciliationDecision(row,remote))};});
  res.json({snapshot:walletHealthSnapshots.snapshot(results),aging:walletHealthSnapshots.aging(results),count:results.length});
});

app.get("/api/wallet/settlement/operations", auth.authMiddleware, (req,res) => {
  const rows=db.prepare("SELECT id,providerReference,source,amountMinor,currency,status FROM wallet_transactions WHERE userId=? AND providerReference IS NOT NULL ORDER BY createdAt DESC LIMIT 100").all(req.user.id);
  const provider=require("./walletProvider").getWalletProvider();
  const results=rows.map(row=>{let remote={};try{remote=row.type==="deposit"?provider.verifyDeposit({providerReference:row.providerReference,reference:row.id,amountMinor:row.amountMinor,currency:row.currency}):provider.verifyWithdrawal({providerReference:row.providerReference,reference:row.id,amountMinor:row.amountMinor,currency:row.currency});}catch(_){}return {...walletSettlement.reconciliationDecision(row,remote)};});
  res.json({summary:walletOperations.summarize(results),providerHealth:walletOperations.providerHealth(results)});
});

app.get("/api/wallet/settlement/history", auth.authMiddleware, (req,res) => {
  const rows=db.prepare("SELECT id,providerReference,source,amountMinor,currency,status,createdAt FROM wallet_transactions WHERE userId=? AND providerReference IS NOT NULL ORDER BY createdAt DESC LIMIT 200").all(req.user.id);
  const provider=require("./walletProvider").getWalletProvider();
  const results=rows.map(row=>{let remote={};try{remote=row.type==="deposit"?provider.verifyDeposit({providerReference:row.providerReference,reference:row.id,amountMinor:row.amountMinor,currency:row.currency}):provider.verifyWithdrawal({providerReference:row.providerReference,reference:row.id,amountMinor:row.amountMinor,currency:row.currency});}catch(_){}return {id:row.id,createdAt:row.createdAt,...walletSettlement.reconciliationDecision(row,remote)};});
  res.json({trend:settlementTrends.trend(results),history:settlementTrends.exceptionHistory(results)});
});

app.get("/api/wallet/settlement/refinement", auth.authMiddleware, (req,res) => {
  const rows=db.prepare("SELECT id,type,providerReference,source,amountMinor,currency,status,createdAt FROM wallet_transactions WHERE userId=? AND providerReference IS NOT NULL ORDER BY createdAt DESC LIMIT 200").all(req.user.id);
  const provider=require("./walletProvider").getWalletProvider();
  const results=rows.map(row=>{let remote={};try{remote=row.type==="deposit"?provider.verifyDeposit({providerReference:row.providerReference,reference:row.id,amountMinor:row.amountMinor,currency:row.currency}):provider.verifyWithdrawal({providerReference:row.providerReference,reference:row.id,amountMinor:row.amountMinor,currency:row.currency});}catch(_){}return {id:row.id,createdAt:row.createdAt,providerReference:row.providerReference,status:row.status,...walletSettlement.reconciliationDecision(row,remote)};});
  res.json({history:settlementRefinement.providerHistory(results),aging:settlementRefinement.exceptionAging(results)});
});

app.get("/api/wallet/settlement/plan", auth.authMiddleware, (req, res) => {
  const rows = db.prepare("SELECT id,source,status FROM wallet_transactions WHERE userId=? ORDER BY createdAt DESC LIMIT 200").all(req.user.id);
  const provider = require("./walletProvider").getWalletProvider();
  const results = rows.map(row => {
    let remote = {};
    try {
      const full = db.prepare("SELECT id,type,providerReference,source,amountMinor,currency,status,createdAt FROM wallet_transactions WHERE id=? AND userId=?").get(row.id, req.user.id);
      if (full?.providerReference) remote = full.type === "deposit" ? provider.verifyDeposit({providerReference:full.providerReference,reference:full.id,amountMinor:full.amountMinor,currency:full.currency}) : provider.verifyWithdrawal({providerReference:full.providerReference,reference:full.id,amountMinor:full.amountMinor,currency:full.currency});
      const decision = walletSettlement.reconciliationDecision(full || row, remote);
      return { id:row.id, ...decision };
    } catch (_) { return { id:row.id, applicable:false }; }
  });
  res.json({ mode:provider.mode, plan:walletReconciliationPlan.plan(results) });
});

app.get("/api/wallet/settlement/readiness", auth.authMiddleware, (req, res) => {
  const rows = db.prepare("SELECT id,providerReference,source,amountMinor,currency,status FROM wallet_transactions WHERE userId=? AND providerReference IS NOT NULL ORDER BY createdAt DESC LIMIT 100").all(req.user.id);
  const provider = require("./walletProvider").getWalletProvider();
  const results = rows.map(row => {
    let remote = {};
    try { remote = row.type === "deposit" ? provider.verifyDeposit({providerReference:row.providerReference,reference:row.id,amountMinor:row.amountMinor,currency:row.currency}) : provider.verifyWithdrawal({providerReference:row.providerReference,reference:row.id,amountMinor:row.amountMinor,currency:row.currency}); } catch (_) {}
    return { id:row.id, ...walletSettlement.reconciliationDecision(row, remote) };
  });
  const summary=results.reduce((a,x)=>{if(!x.applicable)a.internal++;else if(x.safeToApply&&x.mappedStatus==="completed")a.reconciled++;else if(x.safeToApply)a.review++;else a.mismatch++;return a;},{reconciled:0,review:0,mismatch:0,internal:0});
  res.json({ mode:provider.mode, summary, report:results });
});

app.get("/api/legal/readiness", auth.authMiddleware, (req, res) => {
  const status = legalRuntime.legalRuntimeStatus();
  const latest = db.prepare("SELECT privacyPolicyVersion,termsVersion,acceptedAt FROM legal_acceptances WHERE userId=? ORDER BY acceptedAt DESC LIMIT 1").get(req.user.id);
  const acceptanceHistory = db.prepare("SELECT privacyPolicyVersion,termsVersion,acceptedAt FROM legal_acceptances WHERE userId=? ORDER BY acceptedAt DESC LIMIT 20").all(req.user.id).map((row) => ({
    privacyPolicyVersion: String(row.privacyPolicyVersion),
    termsVersion: String(row.termsVersion),
    acceptedAt: String(row.acceptedAt),
  }));
  res.setHeader("Cache-Control", "no-store");
  res.json({ status, acceptance: legalRuntime.acceptanceSummary(latest), acceptanceHistory });
});

app.post("/api/account/legal-acceptance", auth.authMiddleware, (req, res) => {
  try {
    const status = legalRuntime.legalRuntimeStatus();
    legalRuntime.validateAcceptance(req.body || {}, status);
    const record = legalRuntime.acceptanceRecord({ userId: req.user.id });
    db.prepare("INSERT INTO legal_acceptances (id,userId,privacyPolicyVersion,termsVersion,acceptedAt) VALUES (?,?,?,?,?)").run(record.id,record.userId,record.privacyPolicyVersion,record.termsVersion,record.acceptedAt);
    res.status(201).json({ acceptance: legalRuntime.acceptanceSummary(record) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get("/api/account/lifecycle-readiness", auth.authMiddleware, (req, res) => {
  res.json({ readiness: accountLifecycleReadiness.readiness(db, req.user.id) });
});

app.get("/api/account/privacy", auth.authMiddleware, (req, res) => {
  const user = db.prepare("SELECT profileVisibility,zeezaExploreOptIn,allowFriendRequests,allowInboxRequests FROM users WHERE id=?").get(req.user.id);
  res.setHeader("Cache-Control", "no-store");
  res.json({ privacy: accountSecurity.normalizePrivacy({ visibility: user?.profileVisibility || "friends", discoverable: Boolean(user?.zeezaExploreOptIn), allowFriendRequests: user?.allowFriendRequests !== 0, allowInboxRequests: user?.allowInboxRequests !== 0 }), privacyPolicyVersion: accountSecurity.PRIVACY_POLICY_VERSION });
});

app.patch("/api/account/privacy", auth.authMiddleware, (req, res) => {
  try { accountSecurity.validatePrivacyPatch(req.body || {}); } catch (e) { return res.status(400).json({ error: e.message }); }
  const current = db.prepare("SELECT profileVisibility,zeezaExploreOptIn,allowFriendRequests,allowInboxRequests FROM users WHERE id=?").get(req.user.id);
  const normalized = accountSecurity.normalizePrivacy({
    visibility: req.body?.visibility ?? current?.profileVisibility ?? "friends",
    discoverable: req.body?.discoverable ?? Boolean(current?.zeezaExploreOptIn),
    allowFriendRequests: req.body?.allowFriendRequests ?? current?.allowFriendRequests !== 0,
    allowInboxRequests: req.body?.allowInboxRequests ?? current?.allowInboxRequests !== 0,
  });
  db.prepare("UPDATE users SET profileVisibility=?,zeezaExploreOptIn=?,allowFriendRequests=?,allowInboxRequests=? WHERE id=?").run(normalized.visibility, normalized.discoverable ? 1 : 0, normalized.allowFriendRequests ? 1 : 0, normalized.allowInboxRequests ? 1 : 0, req.user.id);
  res.setHeader("Cache-Control", "no-store");
  res.json({ privacy: normalized, privacyPolicyVersion: accountSecurity.PRIVACY_POLICY_VERSION });
});

app.get("/api/notifications/delivery-health", auth.authMiddleware, (req, res) => {
  const rows = db.prepare("SELECT status,updatedAt FROM notification_deliveries WHERE eventId IN (SELECT id FROM notification_events WHERE userId=?) ORDER BY updatedAt DESC LIMIT 200").all(req.user.id);
  res.json({ health: notificationDeliveryHealth.summarize(rows) });
});

app.get("/api/account/security-summary", auth.authMiddleware, (req, res) => {
  const sessions = db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE userId=?").get(req.user.id);
  const user = db.prepare("SELECT profileVisibility,zeezaExploreOptIn,allowFriendRequests,allowInboxRequests FROM users WHERE id=?").get(req.user.id);
  res.setHeader("Cache-Control", "no-store");
  res.json({ security: accountSecurity.securitySummary({ sessions: sessions?.n, privacy: { visibility: user?.profileVisibility, discoverable: Boolean(user?.zeezaExploreOptIn), allowFriendRequests: user?.allowFriendRequests !== 0, allowInboxRequests: user?.allowInboxRequests !== 0 } }) });
});

app.get("/api/platform/events/by-request/:requestId", auth.authMiddleware, (req, res) => {
  const requestId = String(req.params.requestId || "").trim();
  if (!requestId || requestId.length > 100) return res.status(400).json({ error: "Invalid request ID." });
  const events = eventCorrelation.listByRequest(db, requestId).filter((event) => event.userId === req.user.id || event.userId == null);
  res.json({ requestId, events });
});

app.get("/api/notifications/preferences", auth.authMiddleware, (req, res) => {
  res.json({ preferences: notificationPreferences.get(db, req.user.id) });
});

app.patch("/api/notifications/preferences", auth.authMiddleware, (req, res) => {
  res.json({ preferences: notificationPreferences.update(db, req.user.id, req.body || {}) });
});

// User currency preference controls display only; financial records keep their own currency.
app.get("/api/currency/preferences", auth.authMiddleware, (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ preferences: currencyPreferences.get(db, req.user.id), authority: "user_display_preference", convertsMoney: false });
});

app.put("/api/currency/preferences", auth.authMiddleware, (req, res) => {
  try {
    const preferences = currencyPreferences.update(db, req.user.id, req.body || {});
    res.setHeader("Cache-Control", "no-store");
    res.json({ preferences, authority: "user_display_preference", convertsMoney: false });
  } catch (error) {
    const status = Number(error?.status) || 400;
    res.status(status).json({ error: status >= 500 ? "Currency preference could not be saved." : error.message });
  }
});

app.get("/api/regional/countries", auth.authMiddleware, (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ countries: require("./countryRegionalization.json"), authority: "main_country_reference", commercialEligibilityAsserted: false });
});

app.get("/api/regional/preferences", auth.authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ preferences: regionalPreferences.get(db, req.user.id), authority: "user_regional_display_preference" });
});
app.put("/api/regional/preferences", auth.authMiddleware, (req, res) => {
  try {
    const preferences = regionalPreferences.update(db, req.user.id, req.body || {});
    res.set("Cache-Control", "no-store");
    res.json({ preferences, authority: "user_regional_display_preference" });
  } catch (error) { res.status(error.status || 400).json({ error: error.message || "Invalid regional preference." }); }
});

// V4.42 — preference-aware notification digest preview; in-app history remains authoritative.
app.get("/api/notifications/digest", auth.authMiddleware, (req,res) => {
  const prefs=notificationPreferences.get(db,req.user.id);
  const limit=Math.min(Math.max(Number(req.query?.limit)||30,1),100);
  const rows=db.prepare("SELECT id,title,body,type,data,createdAt FROM notification_events WHERE userId=? ORDER BY createdAt DESC LIMIT ?").all(req.user.id,limit);
  res.json({preferences:{digestEnabled:Boolean(prefs.digestEnabled),digestFrequency:prefs.digestFrequency,quietStart:prefs.quietStart,quietEnd:prefs.quietEnd},digest:notificationDigest.buildDigest(rows,prefs.digestFrequency),quiet:rows.length?notificationDigest.withinQuietHours(rows[0].createdAt,prefs.quietStart,prefs.quietEnd):false});
});

// V4.47 — bounded preference-aware digest batching and delivery recovery view.
app.get("/api/notifications/digest/batch", auth.authMiddleware, (req,res) => {
  const prefs=notificationPreferences.get(db,req.user.id);
  const rows=db.prepare("SELECT id,type,title,createdAt FROM notification_events WHERE userId=? ORDER BY createdAt DESC LIMIT 50").all(req.user.id);
  const deliveries=db.prepare("SELECT d.id,d.status FROM notification_deliveries d JOIN notification_events e ON e.id=d.eventId WHERE e.userId=? ORDER BY d.updatedAt DESC LIMIT 100").all(req.user.id);
  res.json({batch:notificationBatching.batch(rows,prefs),recovery:notificationBatching.recovery(deliveries)});
});

app.get("/api/notifications/operations", auth.authMiddleware, (req, res) => {
  const preferences = notificationPreferences.get(db, req.user.id);
  const rows = db.prepare("SELECT status FROM notification_deliveries d JOIN notification_events e ON e.id=d.eventId WHERE e.userId=? ORDER BY d.updatedAt DESC LIMIT 500").all(req.user.id);
  res.json({ preferences: notificationIntelligence.preferenceSummary(preferences), delivery: notificationIntelligence.deliveryHealth(rows) });
});

// V4.38 — notification digest, quiet-hours and authenticated recovery controls.
app.patch("/api/notifications/preferences/digest", auth.authMiddleware, (req,res) => {
  const current=notificationPreferences.get(db,req.user.id);
  const digest=notificationControls.normalizeDigest({
    digestEnabled:req.body?.digestEnabled===undefined ? current.digestEnabled : req.body.digestEnabled,
    digestFrequency:req.body?.digestFrequency===undefined ? current.digestFrequency : req.body.digestFrequency,
    quietStart:req.body?.quietStart===undefined ? current.quietStart : req.body.quietStart,
    quietEnd:req.body?.quietEnd===undefined ? current.quietEnd : req.body.quietEnd
  });
  res.json({preferences:notificationPreferences.update(db,req.user.id,{digestEnabled:digest.enabled,digestFrequency:digest.frequency,quietStart:digest.quietStart,quietEnd:digest.quietEnd})});
});
app.post("/api/notifications/operations/recover", auth.authMiddleware, (req,res) => {
  notificationDelivery.recoverStaleSending(db, new Date(), { userId: req.user.id });
  const rows=db.prepare("SELECT * FROM notification_deliveries d JOIN notification_events e ON e.id=d.eventId WHERE e.userId=? AND d.status IN ('pending','retry') ORDER BY d.nextAttemptAt ASC LIMIT 50").all(req.user.id);
  res.json({recovery:notificationControls.recoverySummary(rows)});
});

// M7191–M7215: Main-side AAMI Central report boundary. Central remains the
// record/status authority; Main stores only an owner-scoped opaque retry-key hash.
const centralReporting = require("./centralReporting");
centralReporting.ensureIdempotencySchema(db);
const centralReportClient = centralReporting.createCentralReportClient();
app.get("/api/central-reports/:reportId", auth.authMiddleware, async (req, res) => {
  if (!centralReportClient.configured()) return res.status(503).json(centralReporting.unavailableResponse());
  const result = await centralReportClient.status({ userId: req.user?.id, reportId: req.params.reportId });
  if (result.ok) return res.json({ report: result.report });
  if (result.reason === "rejected" && result.status === 403) return res.status(404).json({ error: "report_unavailable", message: "This report is unavailable." });
  if (result.reason === "invalid_request") return res.status(400).json({ error: "invalid_report_reference" });
  return res.status(503).json(centralReporting.unavailableResponse());
});
app.get("/api/central-reports", auth.authMiddleware, (_req, res) => {
  // Central currently supports owner-scoped status lookup by reference, not a list endpoint.
  return res.status(501).json({ error: "central_report_list_unavailable", message: "Open a report using its reference. A cross-product list endpoint is not configured." });
});
app.post("/api/central-reports", auth.authMiddleware, async (req, res) => {
  const validation = centralReporting.validateSubmission(req.body, req.user);
  if (!validation.ok) return res.status(400).json({ error: "invalid_report", fields: validation.errors });
  const requestId = centralReporting.idempotencyKey(req.user?.id, req.get("Idempotency-Key"));
  if (!requestId) return res.status(400).json({ error: "idempotency_key_required", message: "Provide a stable Idempotency-Key to safely retry this request." });
  if (!centralReportClient.configured()) return res.status(503).json({ ...centralReporting.unavailableResponse(), requestId, duplicateRequest: false });
  try {
    const reservation = centralReporting.reserveIdempotencyKey(db, requestId, req.user.id);
    if (!reservation.ok) return res.status(503).json(centralReporting.unavailableResponse());
    // Retry the same key after timeouts; Central owns the content fingerprint and
    // idempotency decision, so Main never treats a local reservation as delivery.
    const result = await centralReportClient.submit({ userId: req.user.id, report: validation.value, requestId });
    if (result.accepted && result.delivered) return res.status(201).json({ ...result, duplicateRequest: reservation.duplicate });
    const status = result.reason === "rejected" && result.status === 400 ? 400 : result.reason === "rate_limited" ? 429 : 503;
    return res.status(status).json({ error: "central_reporting_unavailable", message: status === 400 ? "AAMI Central rejected the report. Review the fields and retry with a new key if you change the content." : status === 429 ? "AAMI Central is rate limiting reports. Retry later with the same request key." : "AAMI Central did not confirm report receipt. Retry later with the same request key.", retryable: status !== 400, requestId });
  } catch {
    return res.status(503).json({ ...centralReporting.unavailableResponse(), requestId });
  }
});

app.get("/api/zeeza/moderation/operations", auth.authMiddleware, (req,res) => {
  const reports=db.prepare("SELECT id,status,createdAt FROM social_reports WHERE reporterId=? OR targetUserId=? ORDER BY createdAt DESC LIMIT 200").all(req.user.id,req.user.id);
  const appeals=db.prepare("SELECT id,status,createdAt FROM social_report_appeals WHERE appellantId=? ORDER BY createdAt DESC LIMIT 100").all(req.user.id);
  const members=db.prepare("SELECT m.role FROM chat_room_members m JOIN chat_rooms r ON r.id=m.roomId WHERE r.ownerId=? LIMIT 500").all(req.user.id);
  res.json({moderation:communityOperations.moderationSummary(reports,appeals),members:communityOperations.memberSafety(members)});
});

app.get("/api/zeeza/moderation/case-history", auth.authMiddleware, (req,res) => {
  const reports=db.prepare("SELECT id,status,reason,createdAt,updatedAt FROM social_reports WHERE reporterId=? OR targetUserId=? ORDER BY updatedAt DESC LIMIT 300").all(req.user.id,req.user.id);
  const appeals=db.prepare("SELECT id,reportId,status,createdAt,updatedAt FROM social_report_appeals WHERE appellantId=? ORDER BY updatedAt DESC LIMIT 200").all(req.user.id);
  const rooms=db.prepare("SELECT id,name,discoverable,updatedAt FROM chat_rooms WHERE ownerId=? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id);
  res.json({cases:moderationCaseHistory.caseHistory(trustSafetyMaturity.sortNewest(trustSafetyMaturity.dedupeReports(reports)),trustSafetyMaturity.sortNewest(trustSafetyMaturity.dedupeAppeals(appeals))),roomAudit:moderationCaseHistory.roomAudit(rooms)});
});

app.get("/api/zeeza/moderation/governance-metrics", auth.authMiddleware, (req,res) => {
  const reports=db.prepare("SELECT id,status,createdAt,updatedAt FROM social_reports WHERE reporterId=? OR targetUserId=? ORDER BY updatedAt DESC LIMIT 300").all(req.user.id,req.user.id);
  const appeals=db.prepare("SELECT id,status,createdAt,updatedAt FROM social_report_appeals WHERE appellantId=? ORDER BY updatedAt DESC LIMIT 200").all(req.user.id);
  const rooms=db.prepare("SELECT id,name,discoverable,updatedAt FROM chat_rooms WHERE ownerId=? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id);
  res.json({metrics:trustSafetyMaturity.moderationSummary(reports,appeals),appealAging:moderationGovernance.appealAging(trustSafetyMaturity.dedupeAppeals(appeals)),roomAudit:moderationGovernance.roomAudit(rooms)});
});

app.get("/api/zeeza/moderation/resolution-history", auth.authMiddleware, (req,res) => {
  const reports=db.prepare("SELECT id,status,reason,createdAt,updatedAt FROM social_reports WHERE reporterId=? OR targetUserId=? ORDER BY updatedAt DESC LIMIT 300").all(req.user.id,req.user.id);
  const appeals=db.prepare("SELECT id,reportId,status,createdAt,updatedAt FROM social_report_appeals WHERE appellantId=? ORDER BY updatedAt DESC LIMIT 200").all(req.user.id);
  const rooms=db.prepare("SELECT id,name,discoverable,updatedAt FROM chat_rooms WHERE ownerId=? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id);
  res.json({history:moderationResolution.resolutionHistory(reports,appeals),outcomes:moderationResolution.outcomeSummary(reports,appeals),governance:moderationResolution.governanceReport(rooms)});
});

app.get("/api/zeeza/trust/summary", auth.authMiddleware, (req, res) => {
  const reports=db.prepare("SELECT id,reporterId,targetUserId,reason,status FROM social_reports WHERE reporterId=? OR targetUserId=? ORDER BY createdAt DESC LIMIT 200").all(req.user.id,req.user.id);
  const appeals=db.prepare("SELECT id,reportId,appellantId,status FROM social_report_appeals WHERE appellantId=? ORDER BY createdAt DESC LIMIT 100").all(req.user.id);
  const rooms=db.prepare("SELECT id,discoverable FROM chat_rooms WHERE ownerId=? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id);
  res.json({ safety: trustCommunity.safetySummary(reports), appeals, rooms: trustCommunity.roomSummary(rooms) });
});

// V4.38 — unified user-owned appeal and room-governance view. Moderation authority remains in Zeeza.
// V4.47 — owner/member safety continuity for rooms.
app.get("/api/zeeza/rooms/safety", auth.authMiddleware, (req,res) => {
  const rooms=db.prepare("SELECT id,name,discoverable FROM chat_rooms WHERE ownerId=? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id);
  const reports=db.prepare("SELECT id,targetUserId,status,reason,createdAt FROM social_reports WHERE reporterId=? ORDER BY createdAt DESC LIMIT 200").all(req.user.id);
  const members=db.prepare("SELECT m.roomId,m.userId,m.role,m.joinedAt FROM chat_room_members m JOIN chat_rooms r ON r.id=m.roomId WHERE r.ownerId=? ORDER BY m.joinedAt DESC LIMIT 500").all(req.user.id);
  res.json({rooms:roomSafety.moderationSummary(reports,members),members:roomSafety.memberControls(members),roomCount:rooms.length});
});

app.get("/api/zeeza/governance", auth.authMiddleware, (req,res) => {
  const appeals=db.prepare("SELECT id,reportId,status,createdAt,updatedAt,resolvedAt FROM social_report_appeals WHERE appellantId=? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id);
  const rooms=db.prepare("SELECT id,name,discoverable,updatedAt FROM chat_rooms WHERE ownerId=? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id);
  res.json({appeals:communityGovernance.appealSummary(appeals),appealHistory:appeals,rooms:communityGovernance.roomGovernance(rooms),roomHistory:rooms});
});

app.get("/api/notifications", auth.authMiddleware, (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const before = req.query.before ? String(req.query.before) : null;
  const type = req.query.type ? String(req.query.type).trim().toLowerCase() : null;
  const validType = type && notifications.TYPES.has(type) ? type : null;
  res.json({ notifications: notifications.list(db, req.user.id, { limit, before, type: validType }), unreadCount: notifications.unreadCount(db, req.user.id, validType), unreadByType: Object.fromEntries([...notifications.TYPES].map((t) => [t, notifications.unreadCount(db, req.user.id, t)])) });
});

app.get("/api/notifications/:id/action", auth.authMiddleware, (req, res) => {
  const result = notificationCompletion.completion(db, req.user.id, String(req.params.id));
  if (!result) return res.status(404).json({ error: "Notification not found." });
  if (!result.action) return res.status(409).json({ error: "This notification has no actionable destination." });
  notifications.markRead(db, req.user.id, result.notificationId);
  res.json({ ok: true, action: result.action, id: result.id, type: result.type });
});

app.post("/api/notifications/:id/read", auth.authMiddleware, (req, res) => {
  const changed = notifications.markRead(db, req.user.id, String(req.params.id));
  if (!changed) return res.status(404).json({ error: "Notification not found or already read." });
  res.json({ ok: true, unreadCount: notifications.unreadCount(db, req.user.id) });
});

app.delete("/api/notifications", auth.authMiddleware, (req, res) => {
  try {
    const days = req.query.days == null ? dataRetention.DEFAULT_NOTIFICATION_DAYS : Number(req.query.days);
    if (!Number.isFinite(days) || days < 1 || days > dataRetention.MAX_NOTIFICATION_DAYS) return res.status(400).json({ error: `days must be between 1 and ${dataRetention.MAX_NOTIFICATION_DAYS}.` });
    const result = dataRetention.purgeUserNotifications(db, req.user.id, days);
    return res.json({ ok: true, deleted: result.deleted, retentionDays: result.days });
  } catch (_) {
    // Never leak database paths, SQL details, or driver errors to the caller.
    return res.status(503).json({ error: "Notification retention is temporarily unavailable." });
  }
});

app.post("/api/notifications/read-all", auth.authMiddleware, (req, res) => {
  const type = req.query.type ? String(req.query.type).trim().toLowerCase() : null;
  const validType = type && notifications.TYPES.has(type) ? type : null;
  notifications.markAllRead(db, req.user.id, validType);
  res.json({ ok: true, unreadCount: notifications.unreadCount(db, req.user.id, validType) });
});



// V3.58 Extension Framework. Extensions are metadata registrations only;
// the NEXA server does not execute arbitrary third-party code or expose secrets.
function extensionAudit(extensionId, userId, action, metadata = {}) {
  const event = extensions.auditAction({ extensionId, userId, action, metadata });
  eventCorrelation.record(db, eventCorrelation.createEvent({ requestId: eventCorrelation.currentRequestId(), userId, action: `extension.${action}`, entityType: "extension", entityId: extensionId, metadata }));
  db.prepare("INSERT INTO extension_audit_log(id,extensionId,userId,action,metadata,createdAt) VALUES(?,?,?,?,?,?)")
    .run(event.id, event.extensionId, event.userId, event.action, JSON.stringify(event.metadata || {}), event.createdAt);
  return event;
}

function readExtension(row) {
  if (!row) return null;
  let requestedScopes = [];
  let publicConfig = {};
  try { requestedScopes = JSON.parse(row.requestedScopes || "[]"); } catch (_) {}
  try { publicConfig = JSON.parse(row.publicConfig || "{}"); } catch (_) {}
  const consents = db.prepare(
    "SELECT scope, grantedAt, revokedAt FROM extension_consents WHERE extensionId=? AND userId=? ORDER BY scope"
  ).all(row.id, row.userId);
  const consentedScopes = consents.filter((c) => !c.revokedAt).map((c) => c.scope);
  return {
    id: row.id, name: row.name, slug: row.slug, version: row.version,
    description: row.description, requestedScopes, publicConfig, status: row.status,
    consentedScopes, createdAt: row.createdAt, updatedAt: row.updatedAt,
    canEnable: extensions.canEnable({ ...row, requestedScopes, status: row.status }, consentedScopes) && extensions.isVersionCompatible(extensions.NEXA_PLATFORM_VERSION, { minNexaVersion: row.minNexaVersion || "3.58.0", maxNexaVersion: row.maxNexaVersion || "" }),
    compatibility: { minNexaVersion: row.minNexaVersion || "3.58.0", maxNexaVersion: row.maxNexaVersion || "" },
  };
}

app.get("/api/extensions/manifest", auth.authMiddleware, (req, res) => {
  res.json(extensions.frameworkManifest());
});

app.get("/api/extensions/developer/manifest", auth.authMiddleware, (req, res) => {
  res.json(extensionDeveloper.developerManifest());
});

app.get("/api/extensions/developer/capabilities", auth.authMiddleware, (req, res) => {
  res.json({ capabilities: extensionDeveloper.capabilityCatalog() });
});

app.get("/api/extensions/developer/analytics", auth.authMiddleware, (req, res) => {
  const days = Math.max(7, Math.min(90, Number(req.query?.days) || 30));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const owned = db.prepare("SELECT id, name, status, createdAt FROM extensions WHERE userId=? ORDER BY createdAt DESC LIMIT 100").all(req.user.id);
  const events = db.prepare(`SELECT l.extensionId, l.action, COUNT(*) AS count
    FROM extension_audit_log l JOIN extensions e ON e.id=l.extensionId
    WHERE e.userId=? AND l.createdAt>=? GROUP BY l.extensionId, l.action`).all(req.user.id, since);
  const byExtension = new Map();
  for (const event of events) {
    const item = byExtension.get(event.extensionId) || { events: 0, actions: {} };
    const count = Math.max(0, Number(event.count) || 0);
    item.events += count; item.actions[String(event.action)] = count; byExtension.set(event.extensionId, item);
  }
  res.setHeader("Cache-Control", "no-store");
  return res.json({ generatedAt: new Date().toISOString(), windowDays: days, source: "extension_audit_log", readOnly: true,
    extensions: owned.map((row) => ({ id: row.id, name: row.name, status: row.status, createdAt: row.createdAt, ...(byExtension.get(row.id) || { events: 0, actions: {} }) })) });
});

app.get("/api/extensions/developer/reviews", auth.authMiddleware, (req, res) => {
  const rows = db.prepare(`SELECT r.id, r.extensionId, e.name AS extensionName, r.version, r.status, r.developerNotes, r.reviewerNotes, r.submittedAt, r.reviewedAt
    FROM extension_review_submissions r JOIN extensions e ON e.id=r.extensionId
    WHERE r.userId=? ORDER BY r.submittedAt DESC LIMIT 100`).all(req.user.id);
  res.setHeader("Cache-Control", "no-store");
  return res.json({ reviews: rows });
});

app.post("/api/extensions/:id/review", auth.authMiddleware, (req, res) => {
  const row = db.prepare("SELECT id, userId, version, status FROM extensions WHERE id=? AND userId=?").get(req.params.id, req.user.id);
  if (!row || row.status === "revoked") return res.status(404).json({ error: "Extension not found." });
  const existing = db.prepare("SELECT id, status FROM extension_review_submissions WHERE extensionId=? AND userId=? AND status IN ('submitted','in_review') ORDER BY submittedAt DESC LIMIT 1").get(row.id, req.user.id);
  if (existing) return res.status(409).json({ error: "A review submission is already open.", reviewId: existing.id, status: existing.status });
  const notes = String(req.body?.developerNotes || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 2000);
  const now = new Date().toISOString(); const id = `exr_${require("crypto").randomBytes(12).toString("hex")}`;
  db.prepare("INSERT INTO extension_review_submissions(id,extensionId,userId,version,status,developerNotes,submittedAt,updatedAt) VALUES(?,?,?,?, 'submitted',?,?,?)")
    .run(id, row.id, req.user.id, row.version, notes, now, now);
  extensionAudit(row.id, req.user.id, "review_submitted", { reviewId: id, version: row.version });
  res.setHeader("Cache-Control", "no-store");
  return res.status(201).json({ id, extensionId: row.id, version: row.version, status: "submitted", submittedAt: now });
});

app.get("/api/admin/extensions/reviews", auth.authMiddleware, (req, res) => {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Owner access required." });
  const status = ["submitted", "in_review", "approved", "rejected"].includes(String(req.query?.status || "")) ? String(req.query.status) : "submitted";
  const rows = db.prepare(`SELECT r.id, r.extensionId, e.name AS extensionName, r.userId AS developerId, r.version, r.status, r.developerNotes, r.reviewerNotes, r.submittedAt, r.reviewedAt
    FROM extension_review_submissions r JOIN extensions e ON e.id=r.extensionId WHERE r.status=? ORDER BY r.submittedAt ASC LIMIT 100`).all(status);
  res.setHeader("Cache-Control", "no-store");
  return res.json({ reviews: rows, status, readOnly: true });
});

app.post("/api/admin/extensions/reviews/:id/decision", auth.authMiddleware, (req, res) => {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Owner access required." });
  const decision = String(req.body?.decision || "").trim().toLowerCase();
  if (!new Set(["approved", "rejected", "in_review"]).has(decision)) return res.status(400).json({ error: "Decision must be approved, rejected, or in_review." });
  const notes = String(req.body?.reviewerNotes || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 2000);
  const current = db.prepare("SELECT id, extensionId, userId, status FROM extension_review_submissions WHERE id=?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Review submission not found." });
  if (["approved", "rejected"].includes(current.status)) return res.status(409).json({ error: "A terminal review decision cannot be changed." });
  const now = new Date().toISOString();
  const changed = db.prepare("UPDATE extension_review_submissions SET status=?, reviewerId=?, reviewerNotes=?, reviewedAt=?, updatedAt=? WHERE id=? AND status IN ('submitted','in_review')")
    .run(decision, req.user.id, notes, decision === "in_review" ? null : now, now, current.id);
  if (!changed.changes) return res.status(409).json({ error: "Review submission has already changed. Refresh before deciding again." });
  extensionAudit(current.extensionId, req.user.id, "review_decision", { reviewId: current.id, decision });
  return res.json({ ok: true, id: current.id, status: decision, terminal: ["approved", "rejected"].includes(decision) });
});

app.post("/api/extensions/developer/validate", auth.authMiddleware, (req, res) => {
  try {
    const manifest = extensionDeveloper.validateManifest(req.body || {});
    const governance = extensionGovernance.governanceDecision({
      requestedScopes: manifest.requestedScopes || [],
      developerVerified: Boolean(req.user?.developerVerified),
      published: Boolean(manifest.published),
    });
    if (!governance.allowed) return res.status(403).json({ valid: false, manifest, governance });
    return res.json({ valid: true, manifest, governance, digest: extensionGovernance.manifestDigest(manifest) });
  } catch (e) {
    return res.status(400).json({ valid: false, error: e.message || "Invalid extension manifest." });
  }
});



function requireExtensionScope(req, extensionId, scope) {
  const row = db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(extensionId, req.user.id);
  if (!row) return { error: "Extension not found.", status: 404 };
  let requestedScopes = [];
  try { requestedScopes = JSON.parse(row.requestedScopes || "[]"); } catch (_) {}
  const consented = db.prepare("SELECT scope FROM extension_consents WHERE extensionId=? AND userId=? AND revokedAt IS NULL").all(extensionId, req.user.id).map((r) => r.scope);
  const extension = { ...row, requestedScopes, status: row.status };
  if (!extensions.hasGrantedScope(extension, scope, consented)) {
    return { error: `Extension is not authorized for ${scope}.`, status: 403 };
  }
  return { row, extension };
}

const extensionRateLimiter = extensionIdentity.createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

function extensionKeyAuth(req, res, next) {
  const key = String(req.headers["x-nexa-extension-key"] || "").trim();
  const clientId = String(req.headers["x-nexa-client-id"] || "").trim();
  if (!key || !clientId) return res.status(401).json({ error: "Extension client ID and API key are required." });
  const identity = db.prepare("SELECT * FROM extension_identities WHERE clientId=? LIMIT 1").get(clientId);
  if (!identity || identity.revokedAt || !extensionIdentity.verifyApiKey(key, identity.keyHash)) {
    return res.status(401).json({ error: "Invalid or revoked extension API credentials." });
  }
  if (!identity) return res.status(401).json({ error: "Invalid or revoked extension API key." });
  const limit = extensionRateLimiter.consume(identity.clientId);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(limit.retryAfterMs / 1000)));
    return res.status(429).json({ error: "Extension API rate limit exceeded.", retryAfterMs: limit.retryAfterMs });
  }
  const ext = db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(identity.extensionId, identity.userId);
  if (!ext || ext.status !== "enabled") return res.status(403).json({ error: "Extension is not enabled." });
  const user = authUserForExtension(identity.userId);
  if (!user) return res.status(403).json({ error: "Extension owner is unavailable." });
  const compatibility = { minNexaVersion: ext.minNexaVersion || "3.58.0", maxNexaVersion: ext.maxNexaVersion || "" };
  if (!extensions.isVersionCompatible(extensions.NEXA_PLATFORM_VERSION, compatibility)) {
    return res.status(409).json({ error: "Extension is not compatible with the current NEXA platform version.", platformVersion: extensions.NEXA_PLATFORM_VERSION, compatibility });
  }
  const usedAt = new Date().toISOString();
  db.prepare("UPDATE extension_identities SET lastUsedAt=? WHERE id=?").run(usedAt, identity.id);
  identity.lastUsedAt = usedAt;
  req.extensionIdentity = identity;
  req.user = user;
  next();
}

function authUserForExtension(userId) {
  const u = db.prepare("SELECT id,email,name,username,accountStatus FROM users WHERE id=?").get(userId);
  if (!u || String(u.accountStatus || "active") !== "active") return null;
  return { id: u.id, email: u.email, name: u.name || "NEXA user", username: u.username || null };
}

app.get("/api/extension-runtime/:id/capabilities/:scope", extensionKeyAuth, (req, res) => {
  if (!req.extensionIdentity || req.extensionIdentity.extensionId !== req.params.id) return res.status(403).json({ error: "API key does not belong to this extension." });
  const scope = String(req.params.scope || "");
  const gate = requireExtensionScope(req, req.params.id, scope);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  try {
    const data = extensionCapabilities.read(db, req.user.id, scope);
    extensionAudit(req.params.id, req.user.id, "runtime_capability_read", { scope, clientId: req.extensionIdentity.clientId });
    return res.json({ scope, data });
  } catch (e) { return res.status(400).json({ error: e.message || "Capability unavailable." }); }
});

app.post("/api/extension-runtime/:id/capabilities/notifications.send", extensionKeyAuth, async (req, res) => {
  if (!req.extensionIdentity || req.extensionIdentity.extensionId !== req.params.id) return res.status(403).json({ error: "API key does not belong to this extension." });
  const gate = requireExtensionScope(req, req.params.id, "notifications.send");
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  try {
    const result = await extensionCapabilities.sendNotification(async (userId, payload) => sendPush(userId, payload.title, payload.body, { source: "extension" }), req.user.id, req.body || {});
    extensionAudit(req.params.id, req.user.id, "runtime_capability_action", { scope: "notifications.send", clientId: req.extensionIdentity.clientId });
    return res.json({ sent: true, result });
  } catch (e) {
    if (e && e.code === "invalid_input") return res.status(400).json({ error: e.message });
    console.error("[NEXA extension notification]", e && e.code ? e.code : "failed");
    return res.status(503).json({ error: "Notification could not be sent." });
  }
});

// Controlled capability adapters. The extension id and signed-in user are both
// required; the permission gate is evaluated on every request rather than cached.
app.get("/api/extensions/:id/capabilities/:scope", auth.authMiddleware, (req, res) => {
  const scope = String(req.params.scope || "");
  const gate = requireExtensionScope(req, req.params.id, scope);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  try {
    const data = extensionCapabilities.read(db, req.user.id, scope);
    extensionAudit(req.params.id, req.user.id, "capability_read", { scope });
    return res.json({ scope, data });
  } catch (e) {
    return res.status(400).json({ error: e.message || "Capability unavailable." });
  }
});

app.post("/api/extensions/:id/capabilities/notifications.send", auth.authMiddleware, async (req, res) => {
  const gate = requireExtensionScope(req, req.params.id, "notifications.send");
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  try {
    // Keep delivery behind the existing push registration table. This adapter
    // intentionally does not expose push tokens to the extension.
    const tokens = db.prepare("SELECT token,platform FROM push_tokens WHERE userId=?").all(req.user.id);
    if (!tokens.length) return res.status(409).json({ error: "No registered NEXA notification device is available." });
    const result = await extensionCapabilities.sendNotification(async (userId, payload) => {
      return sendPush(userId, payload.title, payload.body, { source: "extension" });
    }, req.user.id, req.body || {});
    extensionAudit(req.params.id, req.user.id, "capability_action", { scope: "notifications.send" });
    return res.json({ sent: true, result });
  } catch (e) {
    if (e && e.code === "invalid_input") return res.status(400).json({ error: e.message });
    console.error("[NEXA extension notification]", e && e.code ? e.code : "failed");
    return res.status(503).json({ error: "Notification could not be sent." });
  }
});

app.get("/api/extensions/:id/identity", auth.authMiddleware, (req, res) => {
  const row = db.prepare("SELECT id FROM extensions WHERE id=? AND userId=?").get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Extension not found." });
  const identities = db.prepare("SELECT id,clientId,keyPrefix,createdAt,lastUsedAt,revokedAt FROM extension_identities WHERE extensionId=? AND userId=? ORDER BY createdAt DESC").all(req.params.id, req.user.id);
  res.json({ identities });
});

app.post("/api/extensions/:id/identity/keys", auth.authMiddleware, (req, res) => {
  const key = extensionIdentity.generateApiKey();
  const record = extensionIdentity.identityRecord({ extensionId: req.params.id, userId: req.user.id, key });
  let created;
  try {
    created = db.transaction(() => {
      const row = db.prepare("SELECT id,status FROM extensions WHERE id=? AND userId=?").get(req.params.id, req.user.id);
      if (!row) return { error: { status: 404, message: "Extension not found." } };
      if (row.status === "revoked") return { error: { status: 409, message: "Revoked extensions cannot receive new identities." } };
      db.prepare("INSERT INTO extension_identities(id,extensionId,userId,clientId,keyHash,keyPrefix,createdAt,lastUsedAt,revokedAt) VALUES(?,?,?,?,?,?,?,NULL,NULL)")
        .run(record.id,record.extensionId,record.userId,record.clientId,record.keyHash,record.keyPrefix,record.createdAt);
      return { row };
    })();
  } catch (e) { return res.status(500).json({ error: "Could not create the extension identity." }); }
  if (created.error) return res.status(created.error.status).json({ error: created.error.message });
  extensionAudit(record.extensionId, req.user.id, "identity_key_created", { clientId: record.clientId, keyPrefix: record.keyPrefix });
  res.status(201).json({ identity: { id: record.id, clientId: record.clientId, keyPrefix: record.keyPrefix, createdAt: record.createdAt }, apiKey: key, warning: "Store this key now. NEXA will not show it again." });
});

app.delete("/api/extensions/:id/identity/keys/:keyId", auth.authMiddleware, (req, res) => {
  const identity = db.prepare("SELECT * FROM extension_identities WHERE id=? AND extensionId=? AND userId=?").get(req.params.keyId, req.params.id, req.user.id);
  if (!identity) return res.status(404).json({ error: "Identity not found." });
  if (!identity.revokedAt) db.prepare("UPDATE extension_identities SET revokedAt=? WHERE id=?").run(new Date().toISOString(), identity.id);
  extensionAudit(req.params.id, req.user.id, "identity_key_revoked", { clientId: identity.clientId, keyPrefix: identity.keyPrefix });
  res.json({ ok: true, revoked: true });
});

app.post("/api/extensions/:id/identity/keys/:keyId/rotate", auth.authMiddleware, (req, res) => {
  const key = extensionIdentity.generateApiKey();
  const now = new Date().toISOString();
  const record = extensionIdentity.identityRecord({ extensionId: req.params.id, userId: req.user.id, key, now });
  let rotated;
  try {
    rotated = db.transaction(() => {
      const extension = db.prepare("SELECT id,status FROM extensions WHERE id=? AND userId=?").get(req.params.id, req.user.id);
      if (!extension) return { error: { status: 404, message: "Extension not found." } };
      if (extension.status === "revoked") return { error: { status: 409, message: "Revoked extensions cannot receive new identities." } };
      const identity = db.prepare("SELECT * FROM extension_identities WHERE id=? AND extensionId=? AND userId=? AND revokedAt IS NULL").get(req.params.keyId, req.params.id, req.user.id);
      if (!identity) return { error: { status: 404, message: "Active identity not found." } };
      const changed = db.prepare("UPDATE extension_identities SET revokedAt=? WHERE id=? AND extensionId=? AND userId=? AND revokedAt IS NULL").run(now, identity.id, req.params.id, req.user.id);
      if (!changed.changes) return { error: { status: 409, message: "That identity changed before rotation completed." } };
      db.prepare("INSERT INTO extension_identities(id,extensionId,userId,clientId,keyHash,keyPrefix,createdAt,lastUsedAt,revokedAt) VALUES(?,?,?,?,?,?,?,NULL,NULL)")
        .run(record.id,record.extensionId,record.userId,record.clientId,record.keyHash,record.keyPrefix,record.createdAt);
      return { identity };
    })();
  } catch (e) { return res.status(500).json({ error: "Could not rotate the extension identity." }); }
  if (rotated.error) return res.status(rotated.error.status).json({ error: rotated.error.message });
  extensionAudit(req.params.id, req.user.id, "identity_key_rotated", { previousClientId: rotated.identity.clientId, clientId: record.clientId, keyPrefix: record.keyPrefix });
  res.status(201).json({ identity: { id: record.id, clientId: record.clientId, keyPrefix: record.keyPrefix, createdAt: record.createdAt }, apiKey: key, warning: "Store this key now. NEXA will not show it again." });
});

app.get("/api/extensions", auth.authMiddleware, (req, res) => {
  const rows = db.prepare("SELECT * FROM extensions WHERE userId=? ORDER BY createdAt DESC").all(req.user.id);
  res.json({ extensions: rows.map(readExtension) });
});

app.post("/api/extensions", auth.authMiddleware, (req, res) => {
  try {
    const input = extensions.normalizeRegistration(req.body || {});
    if (!/^[a-z0-9][a-z0-9._-]{1,78}[a-z0-9]$|^[a-z0-9]{2,3}$/.test(input.slug)) {
      return res.status(400).json({ error: "slug must contain only lowercase letters, numbers, dots, underscores or hyphens." });
    }
    const id = extensions.generateId();
    const now = new Date().toISOString();
    const created = db.transaction(() => {
      const exists = db.prepare("SELECT id FROM extensions WHERE userId=? AND slug=?").get(req.user.id, input.slug);
      if (exists) return { error: { status: 409, message: "An extension with that slug is already registered." } };
      try {
        db.prepare(`INSERT INTO extensions(id,userId,name,slug,version,description,requestedScopes,publicConfig,status,createdAt,updatedAt,minNexaVersion,maxNexaVersion)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
          id, req.user.id, input.name, input.slug, input.version, input.description,
          JSON.stringify(input.requestedScopes), JSON.stringify(input.publicConfig), "registered", now, now,
          input.compatibility.minNexaVersion, input.compatibility.maxNexaVersion
        );
      } catch (e) {
        if (String(e.message || "").includes("idx_extensions_user_slug")) return { error: { status: 409, message: "An extension with that slug is already registered." } };
        throw e;
      }
      return { id };
    })();
    if (created.error) return res.status(created.error.status).json({ error: created.error.message });
    extensionAudit(id, req.user.id, "registered", { version: input.version, requestedScopes: input.requestedScopes });
    return res.status(201).json({ extension: readExtension(db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(id, req.user.id)) });
  } catch (e) {
    return res.status(400).json({ error: e.message || "Invalid extension registration." });
  }
});

app.patch("/api/extensions/:id", auth.authMiddleware, (req, res) => {
  const row = db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Extension not found." });
  if (row.status === "revoked") return res.status(409).json({ error: "Revoked extensions cannot be edited." });
  try {
    const update = extensions.normalizeUpdate(req.body || {});
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(update)) {
      if (key === "compatibility") {
        fields.push("minNexaVersion=?", "maxNexaVersion=?");
        values.push(value.minNexaVersion, value.maxNexaVersion);
      } else {
        fields.push(`${key}=?`);
        values.push(key === "publicConfig" ? JSON.stringify(value) : value);
      }
    }
    const now = new Date().toISOString();
    fields.push("updatedAt=?");
    values.push(now, row.id, req.user.id);
    db.prepare(`UPDATE extensions SET ${fields.join(",")} WHERE id=? AND userId=?`).run(...values);
    extensionAudit(row.id, req.user.id, "updated", { fields: Object.keys(update) });
    return res.json({ extension: readExtension(db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(row.id, req.user.id)) });
  } catch (e) {
    return res.status(400).json({ error: e.message || "Invalid extension update." });
  }
});

app.get("/api/extensions/:id", auth.authMiddleware, (req, res) => {
  const row = db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Extension not found." });
  res.json({ extension: readExtension(row) });
});

app.post("/api/extensions/:id/consent", auth.authMiddleware, (req, res) => {
  const row = db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(req.params.id, req.user.id);
  if (!row || row.status === "revoked") return res.status(404).json({ error: "Extension not found." });
  let requested;
  try { requested = extensions.normalizeScopes(req.body?.scopes || JSON.parse(row.requestedScopes || "[]")); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  const allRequested = JSON.parse(row.requestedScopes || "[]");
  const invalid = requested.filter((scope) => !allRequested.includes(scope));
  if (invalid.length) return res.status(400).json({ error: `Scope was not requested by this extension: ${invalid[0]}` });
  const now = new Date().toISOString();
  const upsert = db.prepare(`INSERT INTO extension_consents(extensionId,userId,scope,grantedAt,revokedAt)
    VALUES(?,?,?,?,NULL) ON CONFLICT(extensionId,userId,scope) DO UPDATE SET grantedAt=excluded.grantedAt,revokedAt=NULL`);
  const tx = db.transaction((scopes) => scopes.forEach((scope) => upsert.run(row.id, req.user.id, scope, now)));
  tx(requested);
  extensionAudit(row.id, req.user.id, "consent_granted", { scopes: requested });
  res.json({ extension: readExtension(row) });
});

app.delete("/api/extensions/:id/consent", auth.authMiddleware, (req, res) => {
  const row = db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(req.params.id, req.user.id);
  if (!row || row.status === "revoked") return res.status(404).json({ error: "Extension not found." });
  const all = JSON.parse(row.requestedScopes || "[]");
  const scopes = Array.isArray(req.body?.scopes) && req.body.scopes.length ? req.body.scopes : all;
  const invalid = scopes.filter((scope) => !all.includes(scope));
  if (invalid.length) return res.status(400).json({ error: `Scope was not requested by this extension: ${invalid[0]}` });
  const now = new Date().toISOString();
  const update = db.prepare("UPDATE extension_consents SET revokedAt=? WHERE extensionId=? AND userId=? AND scope=?");
  const tx = db.transaction((items) => items.forEach((scope) => update.run(now, row.id, req.user.id, scope)));
  tx(scopes);
  db.prepare("UPDATE extensions SET status='disabled',updatedAt=? WHERE id=? AND userId=? AND status='enabled'").run(now, row.id, req.user.id);
  extensionAudit(row.id, req.user.id, "consent_revoked", { scopes });
  res.json({ extension: readExtension(db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(row.id, req.user.id)) });
});

app.post("/api/extensions/:id/enable", auth.authMiddleware, (req, res) => {
  const now = new Date().toISOString();
  let enabled;
  try {
    enabled = db.transaction(() => {
      const row = db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(req.params.id, req.user.id);
      if (!row) return { error: { status: 404, message: "Extension not found." } };
      if (row.status === "revoked") return { error: { status: 409, message: "Revoked extensions cannot be enabled." } };
      let requestedScopes = [];
      try { requestedScopes = JSON.parse(row.requestedScopes || "[]"); } catch (_) {}
      const consents = db.prepare("SELECT scope FROM extension_consents WHERE extensionId=? AND userId=? AND revokedAt IS NULL").all(row.id, req.user.id).map((r) => r.scope);
      const current = { ...row, requestedScopes, status: row.status };
      const compatibility = { minNexaVersion: row.minNexaVersion || "3.58.0", maxNexaVersion: row.maxNexaVersion || "" };
      if (!extensions.isVersionCompatible(extensions.NEXA_PLATFORM_VERSION, compatibility)) return { error: { status: 409, message: "This extension is not compatible with the current NEXA platform version." , compatibility } };
      if (!extensions.canEnable(current, consents)) return { error: { status: 403, message: "Explicit consent for every requested scope is required before enabling this extension.", missingScopes: requestedScopes.filter((s) => !consents.includes(s)) } };
      const changed = db.prepare("UPDATE extensions SET status='enabled',updatedAt=? WHERE id=? AND userId=? AND status IN ('registered','disabled')").run(now, row.id, req.user.id);
      if (!changed.changes) return { error: { status: 409, message: "Extension state changed before it could be enabled." } };
      return { id: row.id };
    })();
  } catch (e) { return res.status(500).json({ error: "Could not enable the extension." }); }
  if (enabled.error) return res.status(enabled.error.status).json({ error: enabled.error.message, ...(enabled.error.missingScopes ? { missingScopes: enabled.error.missingScopes } : {}) });
  extensionAudit(enabled.id, req.user.id, "enabled");
  res.json({ extension: readExtension(db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(enabled.id, req.user.id)) });
});

app.post("/api/extensions/:id/disable", auth.authMiddleware, (req, res) => {
  const row = db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Extension not found." });
  if (row.status === "revoked") return res.status(409).json({ error: "Extension is already revoked." });
  const now = new Date().toISOString();
  db.prepare("UPDATE extensions SET status='disabled',updatedAt=? WHERE id=? AND userId=?").run(now, row.id, req.user.id);
  extensionAudit(row.id, req.user.id, "disabled");
  res.json({ extension: readExtension(db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(row.id, req.user.id)) });
});

app.delete("/api/extensions/:id", auth.authMiddleware, (req, res) => {
  const row = db.prepare("SELECT * FROM extensions WHERE id=? AND userId=?").get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Extension not found." });
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare("UPDATE extensions SET status='revoked',updatedAt=? WHERE id=? AND userId=?").run(now, row.id, req.user.id);
    db.prepare("UPDATE extension_consents SET revokedAt=? WHERE extensionId=? AND userId=? AND revokedAt IS NULL").run(now, row.id, req.user.id);
    extensionAudit(row.id, req.user.id, "revoked");
  })();
  res.json({ ok: true, status: "revoked" });
});

app.get("/api/extensions/:id/audit", auth.authMiddleware, (req, res) => {
  const row = db.prepare("SELECT id FROM extensions WHERE id=? AND userId=?").get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Extension not found." });
  const rows = db.prepare("SELECT id,action,metadata,createdAt FROM extension_audit_log WHERE extensionId=? AND userId=? ORDER BY createdAt DESC LIMIT 100").all(row.id, req.user.id);
  res.json({ audit: rows.map((event) => ({ ...event, metadata: (() => { try { return JSON.parse(event.metadata || "{}"); } catch (_) { return {}; } })() })) });
});
/* PUBLIC_MARKET_VISIBILITY_CERTIFIED */
app.get("/health/live", (req, res) => res.json({ ok: true, status: "live", requestId: req.requestId }));
app.get("/privacy", legalPages.legalPageHandler("privacy")); // V5.98.76 / B224: public legal URLs
app.get("/terms", legalPages.legalPageHandler("terms"));
app.get("/health/ready", (req, res) => {
  try {
    db.prepare("SELECT 1").get();
    const integrity = criticalControls.databaseIntegrity(db);
    if (!integrity.ok) return res.status(503).json({ ok: false, status: "not_ready", requestId: req.requestId, checks: { databaseIntegrity: false } });
    return res.json({ ok: true, status: "ready", requestId: req.requestId, checks: { databaseIntegrity: true } });
  } catch (e) {
    return res.status(503).json({ ok: false, status: "not_ready", requestId: req.requestId });
  }
});
app.get("/health/operational", (req, res) => {
  try {
    const version = require("./package.json").version;
    const result = operational.inspectRuntime({ db, env: process.env, packageVersion: version });
    // Missing DB_PATH is reported as a deployment warning rather than exposing
    // filesystem paths or secrets. Local development can remain runnable.
    const status = result.db.ok && result.version ? "operational" : "degraded";
    const diagnostics = observability.operationalSummary({ dependencies: [observability.dependencyHealth("database", result.db.ok ? "up" : "down")], queue: { pending: 0, failed: 0 }, database: { ready: result.db.ok }, incidentCount: 0 });
    const body = { ok: result.ok, status, version, requestId: req.requestId, issues: result.issues.map((x) => String(x).replace(/DB_PATH[^ ]*/g, "DB_PATH")), diagnostics: { ok: diagnostics.ok, dependencies: [{ name: "database", status: result.db.ok ? "up" : "down" }] } };
    if (!observability.healthNoSecrets(body).ok || !observability.healthResponseSize(body).ok) return res.status(503).json({ ok: false, status: "degraded", requestId: req.requestId });
    return res.status(result.db.ok && result.version ? 200 : 503).json(body);
  } catch (_) {
    return res.status(503).json({ ok: false, status: "degraded", issues: ["Operational checks failed."] });
  }
});

// V5.98.4 / B142 — administrator-only, read-only payment attention report (paid-after-cancellation, unmatched, mismatched, unfinished events).
app.get("/api/admin/payments/attention", auth.authMiddleware, (req, res) => {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Administrator access required." });
  try {
    return res.json(paymentAttention.attentionReport(db, { staleMinutes: req.query?.staleMinutes, limit: req.query?.limit, offset: req.query?.offset }));
  } catch (e) {
    console.error("payment attention report failed", e);
    return res.status(500).json({ error: "Payment attention report is unavailable." });
  }
});

// Block 05 — read-only, secret-safe wallet provider readiness. Admin is not the financial authority.
app.get("/api/admin/wallet-provider-readiness", auth.authMiddleware, (req, res) => {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Administrator access required." });
  return res.json(walletProviderBoundary.getWalletProviderReadiness());
});

// V5.52.0 / B89 — administrator-only launch-readiness report. Never echoes env values.
app.get("/api/admin/launch-readiness", auth.authMiddleware, (req, res) => {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Administrator access required." });
  return res.json(launchReadiness.evaluateLaunchReadiness({ env: process.env, packageVersion: require("./package.json").version }));
});

// V5.53.0 / B90 — administrator-only recovery status (database health + backup freshness). Base names only.
app.get("/api/admin/recovery-status", auth.authMiddleware, (req, res) => {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({ error: "Administrator access required." });
  try { return res.json(recoveryOps.recoveryStatus({ db, env: process.env, packageVersion: require("./package.json").version })); }
  catch (_) { return res.status(503).json({ ok: false, error: "Recovery status unavailable." }); }
});

// Tiny in-memory rate limiter (no extra dependency). Good enough for one server
// process; resets on restart. keyFn picks who is being limited.
function rateLimit(options = {}) {
  if (options.persistent) return createPersistentRateLimiter({ ...options, db, scope: options.scope || "api" });
  return createRateLimiter(options);
} // B115 — persistent storage is opt-in for abuse-sensitive boundaries; legacy transient limits remain compatible.
// AI routes cost real money per call: signed-in users only, capped per minute AND per day per user.
// V5.54.3: added the daily ceiling (300 calls per user per 24h; a literal so the M713 audit can check it) and applied it to
// realtime voice, which previously had no limit at all.
const aiMinuteLimiter = rateLimit({
  windowMs: 60 * 1000, max: 20,
  persistent: true, scope: "ai-minute",
  keyFn: (req) => (req.user && req.user.id) || req.ip,
  message: "You're sending requests very fast. Wait a minute and try again.",
});
const aiDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, max: 300,
  persistent: true, scope: "ai-day",
  keyFn: (req) => ((req.user && req.user.id) || req.ip),
  message: "You've reached today's AI usage limit. Please try again tomorrow.",
});
const aiLimiter = (req, res, next) => aiMinuteLimiter(req, res, (err) => (err ? next(err) : aiDailyLimiter(req, res, next)));
// Local-only build: realtime voice provider integration is intentionally omitted.
app.post("/api/realtime/client-secret", auth.authMiddleware, (_req, res) => {
  return res.status(503).json({ error: "Realtime voice is disabled in local-only mode. No external provider was contacted." });
});

// Login/signup: capped per IP to slow down password guessing and mass sign-ups.
const authLimiter = rateLimit({
  persistent: true, scope: "auth",
  windowMs: 15 * 60 * 1000, max: 30,
  keyFn: (req) => req.ip,
  message: "Too many attempts. Please wait a few minutes and try again.",
});

// Signup gets its own account-scoped cap in addition to the shared per-IP cap.
// This limits repeated attempts against one email without changing the login lock-out policy.
const signupEmailKey = (req) => String((req.body && req.body.email) || "").trim().toLowerCase().slice(0, 254);
const signupEmailLimiter = rateLimit({
  persistent: true, scope: "signup-email",
  windowMs: 15 * 60 * 1000, max: 5,
  keyFn: (req) => "signup:" + signupEmailKey(req) + "|" + req.ip,
  message: "Too many signup attempts for this account. Please wait a few minutes and try again.",
});
const signupAccountFloodLimiter = rateLimit({
  persistent: true, scope: "signup-account",
  windowMs: 15 * 60 * 1000, max: 100,
  keyFn: (req) => "signup-flood:" + signupEmailKey(req),
  message: "Too many signup attempts for this account. Please wait a few minutes and try again.",
});

// Per-account limits on top of the per-IP cap. V5.54.3: the tight cap is keyed by email AND IP, so an attacker
// hammering a victim's address from their own IP can no longer lock the victim out; a much looser
// email-only cap remains to stop a botnet spreading guesses across many IPs at one account.
const loginEmailKey = (req) => String((req.body && req.body.email) || "").trim().toLowerCase().slice(0, 254);
const loginEmailLimiter = rateLimit({
  persistent: true, scope: "login-email",
  windowMs: 15 * 60 * 1000, max: 10,
  keyFn: (req) => "login:" + loginEmailKey(req) + "|" + req.ip,
  message: "Too many attempts for this account. Please wait a few minutes and try again.",
});
const loginAccountFloodLimiter = rateLimit({
  persistent: true, scope: "login-account",
  windowMs: 15 * 60 * 1000, max: 200,
  keyFn: (req) => "login-flood:" + loginEmailKey(req),
  message: "Too many attempts for this account. Please wait a few minutes and try again.",
});
const authActionLimiter = rateLimit({
  persistent: true, scope: "auth-action",
  windowMs: 15 * 60 * 1000, max: 8,
  keyFn: (req) => `${req.ip}|${req.user?.id || String(req.body?.email || req.body?.token || "").slice(0, 254)}`,
  message: "Too many account-security attempts. Please wait and try again.",
});

const AUDIO_EXTENSIONS = new Set([".m4a", ".mp3", ".mp4", ".mpeg", ".mpga", ".wav", ".webm", ".ogg", ".oga", ".flac", ".aac", ".caf", ".3gp"]);
function safeAudioExtension(name) { const ext = path.extname(String(name || "")).toLowerCase(); return AUDIO_EXTENSIONS.has(ext) ? ext : ".m4a"; }
function isAllowedAudioUpload(file) {
  const type = String((file && file.mimetype) || "").toLowerCase();
  const ext = path.extname(String((file && file.originalname) || "")).toLowerCase();
  if (type.startsWith("audio/")) return true;
  // some clients label recordings video/mp4, video/webm, video/3gpp or application/octet-stream: accept only with an audio extension
  return (type === "application/octet-stream" || /^video\/(mp4|webm|3gpp|quicktime)$/.test(type)) && AUDIO_EXTENSIONS.has(ext);
}
const audioUploadManager = audioUploadLifecycle.createManager(audioUploadLifecycle.createAudioUploadPolicy(process.env));
const audioUploadCleanupTimer = audioUploadLifecycle.startCleanupScheduler(audioUploadManager);
const upload = multer({
  storage: audioUploadLifecycle.createStorage(audioUploadManager),
  limits: { fileSize: audioUploadManager.policy.maxFileBytes, files: 1 },
  // V5.54.3: audio only. Anything else is rejected before it is written to disk.
  fileFilter: (req, file, cb) => {
    if (isAllowedAudioUpload(file)) return cb(null, true);
    const err = new Error("Only audio files can be uploaded here.");
    err.status = 415; err.statusCode = 415;
    return cb(err);
  },
});

const { getDamiProviderPolicy } = require('./damiProviderPolicy');
const { getAiProfile } = require('./aiProfileRegistry');
const { generateDamiText } = require('./damiTextProvider');
const { analyzeImage: analyzeAIImage, resolveProvider, PROVIDERS } = require('./aiProviderGateway');
const { createAiTelemetry } = require('./aiObservability');
const { createAiSelfLearning } = require('./aiSelfLearning');
const { captureMessage } = require('./sentry');
const aiTelemetry = createAiTelemetry({ captureMessage });
const aiSelfLearning = createAiSelfLearning(db);
const DAMI_POLICY = getDamiProviderPolicy();
// Grok (xAI) is the default AI provider. No SDK: plain fetch via grokProvider.js. Missing key fails per-request, never at startup.
const MODEL = grokProvider.models(process.env).text;
async function damiResponsesCreate(options, { providerAware = false, dependencies = {} } = {}) {
  const startedAt = Date.now();
  if (providerAware) {
    try {
      const result = await generateDamiText({
      input: options.input,
      model: undefined,
      maxOutputTokens: options.max_output_tokens || DAMI_POLICY.maxOutputTokens,
      env: process.env,
      dependencies,
      });
      const profile = getAiProfile("consumer_dami", process.env, { db });
      aiTelemetry.record({ event: "ai.request", provider: result.provider, model: result.model, profileId: profile.id, profileVersion: profile.version, evaluationState: profile.state, correlationId: options.correlationId, success: true, latencyMs: Date.now() - startedAt, route: "dami" });
      return { output_text: result.text, provider: result.provider, model: result.model };
    } catch (error) {
      const profile = getAiProfile("consumer_dami", process.env, { db });
      aiTelemetry.record({ event: "ai.request", provider: options.provider || profile.provider, model: options.model || profile.model, profileId: profile.id, profileVersion: profile.version, evaluationState: profile.state, correlationId: options.correlationId, success: false, latencyMs: Date.now() - startedAt, route: "dami", reason: error?.message || "provider_error" });
      throw error;
    }
  }
  try {
    const result = await grokProvider.respond({ max_output_tokens: DAMI_POLICY.maxOutputTokens, ...options }, { env: process.env });
    aiTelemetry.record({ event: "ai.request", provider: "xai-grok", model: options.model || MODEL, success: true, latencyMs: Date.now() - startedAt, route: "dami" });
    return result;
  } catch (error) {
    aiTelemetry.record({ event: "ai.request", provider: "xai-grok", model: options.model || MODEL, success: false, latencyMs: Date.now() - startedAt, route: "dami", reason: error?.message || "provider_error" });
    throw error;
  }
}

/* ============================================================
   NEXA AI CORE
   ============================================================ */
const damiPersonalization = require('./damiPersonalization');

const AI_ASSISTANT_NAME = 'Dami';
function getDamiPersonalization(userId) {
  const row = db.prepare("SELECT tone, responseLength, proactive, preferredCategories FROM ai_personalization WHERE userId = ?").get(userId);
  let preferredCategories = [];
  try { preferredCategories = JSON.parse(row?.preferredCategories || "[]"); } catch (_) {}
  return damiPersonalization.normalize({ ...row, proactive: Boolean(row?.proactive), preferredCategories });
}

const CORE_SYSTEM = `You are Dami, the AI assistant inside the NEXA platform, built for Nigeria first.

Personality:
- Speak natural Nigerian English and informal phrasing when the user does.
- Be clear, direct, helpful and concise.
- Never sound like a stiff corporate bot.
- Light Pidgin is fine when it matches the user.

Conversation memory:
- Use the recent chat history to stay consistent.
- If the user refers to “it”, “that product”, “the same person”, or previous expenses/debts, resolve the reference from history.
- Do not pretend to remember data that is not in the history or specialist results.

Long-term preferences (when provided in a system note):
- A short "User memory" block may be included. Treat it as soft preferences only (tone, frequent categories, recent shopping constraints).
- Never invent memory. Never claim permanent knowledge of private data beyond what is supplied.
- User can clear memory at any time; if no memory block is present, behave as a fresh helpful assistant.

You have specialist capabilities. Decide the correct intent for every user message.
When a single message genuinely needs more than one specialist run back-to-back in order to be fully answered (e.g. “compare this phone and also check if the seller looks legit”, “log this expense and also check if this payment message is a scam”), do NOT just pick one and mention the other — set "chain" to true and list the specialists as ordered "steps" (see Chaining rules below) so both actually run.

Available intents (choose exactly one per step):
- general          → ordinary questions, chit-chat, explanations
- shopping         → product search, comparison, recommendations, price questions
- price_watch      → check or watch price of a product
- scamcheck        → analyse messages, offers, links, jobs, investments for risk
- money            → log expenses, ask about spending, see totals
- iou              → who owes me, who I owe, debt recording, debt totals
- content          → captions, social posts, short ads, video scripts, rewrite requests
- split            → split a shared bill/expense between people and record who owes what
- mall             → search NEXA's own Mall (its vendor catalog) or check the user's own Mall orders

Rules:
1. Return ONLY valid JSON. No markdown, no extra text.
2. Shape:
{
  "intent": "one of the intents above (the FIRST/primary one)",
  "confidence": 0.0-1.0,
  "reply": "natural language reply (always fill) — if chaining, a short overview covering all steps",
  "needsSpecialist": true/false,
  "needsHuman": true/false,
  "specialistPayload": { ... },   // payload for the primary intent — always fill this even when chaining, as a fallback
  "navigation": "none",          // one of: none, home, money, zeeza, marketplace, vendor
  "toolRequests": [],             // optional read-only NEXA tools: profile, money_summary, mall_orders, vendor_summary
  "actionProposal": null,         // consequential action proposal; NEVER execute without explicit confirmation
  "chain": false,                 // true ONLY when this one message genuinely needs 2-3 specialists run in order
  "steps": [],                    // ordered capability steps; normally 2-4 when chaining
  "entities": {},                 // model-extracted entities: product, people, amounts, order refs, dates, etc.
  "constraints": {},               // structured constraints: budget, category, date, location, comparison criteria, etc.
  "clarification": null            // {"needed":true,"question":"..."} only when a safe answer/action requires missing information
}

3. shopping → needsSpecialist true, specialistPayload = { "message": "cleaned request", "mallQuery": "1-3 plain keywords naming the product, e.g. desk lamp (empty string if this is not a product search)", "maxPrice": number in naira or null }
   Ordinary product searches stay "shopping" — the app automatically adds matching Dream Marketplace listings under the results.
4. scamcheck → needsSpecialist true, specialistPayload = { "text": "message to analyse" }
5. money → needsSpecialist true
   - Logging: specialistPayload = { "action": "log", "raw": "original user text" }
   - Summary: specialistPayload = { "action": "summary" }
6. iou → needsSpecialist true
   - Recording: specialistPayload = { "action": "log", "raw": "original user text" }
   - Summary: specialistPayload = { "action": "summary" }
7. content → needsSpecialist true
   specialistPayload = { "request": "what the user wants created", "toneHint": "optional tone if mentioned" }

Chaining rules:
- Only chain when the steps are genuinely both needed to answer THIS message — never chain speculatively "just in case".
- Order steps the way a helpful human would do them (e.g. find/compare the product before checking its seller for risk; log the expense before checking a suspicious payment note).
- Max 4 steps. Most chained requests only need 2. Use the minimum necessary capability chain; never create steps merely because a capability exists.
- Each step's specialistPayload should read naturally on its own (each specialist only sees its own step's payload plus a short note about what the earlier step found — it cannot see your full reasoning).
- If a message needs only one specialist, set chain to false and use intent/specialistPayload as normal — do not wrap single requests in a one-item chain.
8. price_watch → needsSpecialist true, specialistPayload = { "action": "check", "productHint": "..." }
9. For general: needsSpecialist false.
10. Never invent prices or scam verdicts. Specialists handle that.
- Natural-language understanding is open-ended: infer intent from meaning, entities, constraints and conversation context; never require an exact phrase or canned command.
- If required information is genuinely missing or ambiguous, set clarification.needed=true and ask one focused question instead of guessing.

13. Confirmed actions:
   - You may prepare ONLY these consequential actionProposal types: cancel_order, settle_debt, send_friend_request, unfriend, block_user.
   - actionProposal shape: {"type":"...","title":"short action name","summary":"exact plain-language consequence","payload":{...}}.
   - cancel_order payload: {"orderId":"..."}; settle_debt: {"debtId":"..."}; send_friend_request: {"username":"..."}; unfriend/block_user: {"userId":"...","name":"optional display name"}.
   - Only propose an action when the user clearly asks to perform it and the required identifier is present or unambiguously available from supplied tool results/history. Never invent identifiers.
   - Never propose money transfer, payment, checkout, purchase, password/security, account deletion, or other consequential operations unless a later version explicitly adds them.
   - Preparing an action is NOT executing it. The application will show a confirmation control and execute only after explicit user confirmation.
11. mall → needsSpecialist true. Use ONLY when the user says Mall / Dream Marketplace / NEXA store / a NEXA vendor, or asks about their own Mall orders ("where's my order", "did my order ship", "my orders").
   - Search: specialistPayload = { "action": "search", "query": "1-3 plain keywords", "maxPrice": number in naira or null, "minPrice": number or null, "category": "electronics"|"phones & tablets"|"computers"|"fashion"|"jewelry & accessories"|"beauty"|"home & living"|"groceries"|"health & wellness"|"baby & kids"|"sports & fitness"|"automotive"|"books & media"|"services"|"other"|null }
   - Orders: specialistPayload = { "action": "orders" }
12. split → needsSpecialist true, specialistPayload = { "raw": "original user text" }. Use when the user shares a bill, meal, trip or purchase with other people ("split 24k dinner with Tolu and Ade", "Tolu paid for the cab, we're three").`;

/* ============================================================
   Specialist systems
   ============================================================ */
const COMPARE_SYSTEM = `You are Dami Product Comparison Engine. Search the web for real current products and compare them.
Rules:
- Never invent prices, sellers, specifications, URLs, availability, or reviews.
- Use web search. Prefer Nigerian sources and NGN when relevant.
- Extract products first, then compare only supported products.
- Treat trust as a signal summary, never a fraud verdict.
Return ONLY valid JSON:
{"criteria":["..."],"summary":"...","products":[{"name":"","brand":"","price":null,"currency":"","seller":"","source":"","url":"","availability":"","trust":"","note":""}],"comparison":[{"productName":"","fit":"","pros":[""],"cons":[""],"keyFacts":[""]}]}`;

const SCAMCHECK_SYSTEM = `You are Dami ScamCheck specialist. Analyse messages, offers, jobs, investments and payment requests for risk signals common in Nigeria and globally.
Principles:
- Never claim absolute certainty. Surface concrete risk indicators only.
- Explain every signal in plain language.
Return ONLY valid JSON:
{
  "riskLevel": "low"|"medium"|"high"|"critical",
  "summary": "plain-language overall assessment",
  "signals": [{"label":"","severity":"high"|"medium"|"low","explanation":""}],
  "whatToDo": ["step 1","step 2"],
  "safeToProceed": false
}`;

const SCAMCHECK_VISION_SYSTEM = `You are Dami ScamCheck specialist analysing a screenshot or image (chat, payment confirmation, job offer, investment post, marketplace listing, or website).

Principles:
- Never claim absolute certainty. Surface concrete visual and textual risk indicators only.
- Read any visible text in the image carefully.
- Be alert to: advance-fee patterns, fake payment receipts, urgency, secrecy, off-platform moves, unrealistic returns, impersonation, poor grammar used as pressure, QR codes to unknown destinations, etc.
- If the image is unclear or unrelated, say so and set riskLevel to low with an honest summary.

Return ONLY valid JSON:
{
  "riskLevel": "low"|"medium"|"high"|"critical",
  "summary": "plain-language overall assessment",
  "signals": [{"label":"","severity":"high"|"medium"|"low","explanation":""}],
  "whatToDo": ["step 1","step 2"],
  "safeToProceed": false,
  "textFound": "optional short transcription of key visible text"
}`;


const MONEY_PARSE_SYSTEM = `You are Dami Money Manager parser. Extract a structured expense from the user's natural language.
Rules:
- Amount is required. Parse Nigerian formats: 3500, 3,500, ₦3500, 3.5k, 3k, etc.
- Default currency is NGN.
- Category must be one of: food, transport, rent, utilities, shopping, entertainment, education, health, business, other
- Date: if mentioned use it, otherwise today (YYYY-MM-DD).
Return ONLY valid JSON:
{
  "amount": number,
  "currency": "NGN",
  "category": "food|transport|rent|utilities|shopping|entertainment|education|health|business|other",
  "date": "YYYY-MM-DD",
  "note": "",
  "confidence": 0.0-1.0
}
If no clear amount: { "error": "no_amount", "message": "I need an amount to log this expense." }`;

const IOU_PARSE_SYSTEM = `You are Dami Debt (IOU) parser. Extract structured debt information from natural language.
Rules:
- Direction required: "owed_to_me" or "i_owe".
- Person name and amount required. Parse Nigerian number formats.
- Optional note and dueDate (YYYY-MM-DD or null).
Return ONLY valid JSON:
{
  "direction": "owed_to_me" | "i_owe",
  "person": "",
  "amount": number,
  "currency": "NGN",
  "note": "",
  "dueDate": null | "YYYY-MM-DD",
  "confidence": 0.0-1.0
}
If incomplete: { "error": "incomplete", "message": "I need a name and an amount to record this debt." }`;

const SPLIT_PARSE_SYSTEM = `You are Dami Bill Splitter parser. Extract a shared expense from natural language. You only extract facts; the app does the arithmetic.
Rules:
- total (required): the whole bill. Parse Nigerian formats: 24000, 24,000, ₦24000, 24k, 1.5m.
- people (required): names of the OTHER people sharing the bill, including whoever paid if it is not the user. Never include the user ("me", "I", "we", "us").
- payer: "me" if the user paid, otherwise the name of the person who paid.
- includeMe: true if the user is one of the people sharing the cost (the normal case). false only if the user says they are not part of the split (e.g. "I paid for Tolu and Ade, they owe me").
- shares (optional): only when the user states specific amounts for specific people, e.g. [{"person":"Tolu","amount":5000}]. Otherwise omit.
- note: short label for what it was for (e.g. "dinner").
- currency: default NGN.
Return ONLY valid JSON:
{"total":number,"currency":"NGN","payer":"me"|"name","people":["name"],"includeMe":true,"shares":[],"note":"","confidence":0.0-1.0}
If incomplete: { "error": "incomplete", "message": "I need the total and who you're splitting it with." }`;

const CONTENT_SYSTEM = `You are Dami Content Creator specialist. Generate high-quality social content for Nigerian and global audiences.

You produce:
- Instagram / Facebook / X / LinkedIn / TikTok captions and posts
- Short video scripts (TikTok, Reels, YouTube Shorts)
- Ad headlines, descriptions, CTAs
- Rewrites (shorten, expand, professionalize, make funnier, Pidgin, etc.)

Rules:
- Always return 3 variants when possible so the user can choose.
- Respect requested tone: funny, professional, emotional, luxury, casual, Nigerian English, Pidgin, or mix.
- If user does not specify tone, default to natural Nigerian-friendly casual + one Pidgin option.
- Keep captions platform-aware (hashtags optional, not forced).
- Never invent false claims or medical/financial guarantees.
- Be culturally fluent for Nigeria.

Return ONLY valid JSON:
{
  "type": "caption" | "script" | "ad" | "rewrite",
  "topic": "short description of what was requested",
  "variants": [
    {
      "label": "e.g. Casual / Pidgin / Professional",
      "text": "the full content",
      "tone": "casual|professional|funny|emotional|luxury|pidgin|nigerian"
    }
  ],
  "tips": ["optional short tip 1", "optional tip 2"]
}`;

const PRICE_CHECK_SYSTEM = `You are Dami Price Watch Engine. Find the current price of one specific product.
Never invent a price. Prefer Nigerian sources and NGN when relevant.
Return ONLY valid JSON:
{"name":"","brand":"","price":null,"currency":"","seller":"","source":"","url":"","availability":"","checkedAt":"","note":""}`;

/* ============================================================
   Helpers
   ============================================================ */
function id(p) {
  return crypto.createHash("sha1").update(`${p.name || ""}|${p.seller || ""}|${p.url || ""}`).digest("hex").slice(0, 16);
}
function clean(x) {
  if (!x || typeof x !== "object") return null;
  return { ...x, id: id(x) };
}
function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const a = text.indexOf("{");
    const b = text.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1));
    throw new Error("NEXA returned invalid data");
  }
}

/* ============================================================
   Routes
   ============================================================ */

function friendlyError(e) {
  const msg = (e && (e.message || e.error || e.toString())) || "Unknown error";
  const lower = String(msg).toLowerCase();
  if (lower.includes("api key") || lower.includes("authentication") || lower.includes("401")) {
    const provider = String(process.env.DAMI_AI_PROVIDER || process.env.NEXA_AI_PROVIDER || "grok").toLowerCase();
    return provider === "gemini" || provider === "google" || provider === "google-gemini"
      ? "Google Gemini API key is missing or invalid. Check server/.env"
      : "Grok API key is missing or invalid. Check XAI_API_KEY in server/.env";
  }
  if (lower.includes("rate limit") || lower.includes("429") || lower.includes("quota")) {
    return "Grok rate limit or quota hit. Wait a moment and try again.";
  }
  if (lower.includes("timeout") || lower.includes("network")) {
    return "Network timeout talking to Grok. Check your connection.";
  }
  if (lower.includes("model")) {
    return "Model error: " + msg + " — set XAI_MODEL in server/.env to a real Grok model.";
  }
  return msg;
}

// V5.54.3: the public probe no longer reveals the AI model, provider-key state or specialist list.
app.get("/health", (req, res) => {
  res.json({ ok: true, version: require("./package.json").version, ...require("./releaseIdentity").publicIdentity() });
});

// Matches the original inline thresholds exactly (kept for the single-intent path).
const REPLY_MIN_LENGTH = { shopping: 20, scamcheck: 30, money: 15, iou: 15, content: 20, price_watch: 0, split: 15, mall: 10 };


/* ============================================================
   Split bills + Mall search helpers (V3.6)
   ============================================================ */

// Deterministic split arithmetic. The model only extracts facts; every
// naira figure below is computed here, in whole kobo, so shares always add
// up to the total exactly.
function computeSplit(data) {
  const total = Number(data.total);
  if (!Number.isFinite(total) || total <= 0 || total > 1e9) return { error: "I need a valid total to split." };
  const seen = new Set();
  const people = [];
  for (const raw of Array.isArray(data.people) ? data.people : []) {
    const name = String(raw || "").trim().slice(0, 60);
    const key = name.toLowerCase();
    if (!name || ["me", "i", "myself", "we", "us"].includes(key) || seen.has(key)) continue;
    seen.add(key);
    people.push(name);
  }
  const currency = /^[A-Za-z]{3}$/.test(String(data.currency || "")) ? String(data.currency).toUpperCase() : "NGN";
  const payerRaw = String(data.payer || "me").trim();
  const payerIsMe = ["", "me", "i", "myself", "user"].includes(payerRaw.toLowerCase());
  let payer = "me";
  if (!payerIsMe) {
    const match = people.find((n) => n.toLowerCase() === payerRaw.toLowerCase());
    payer = match || payerRaw.slice(0, 60);
    if (!match) { people.push(payer); }
  }
  const includeMe = data.includeMe !== false;
  if (!people.length) return { error: "Who are you splitting it with?" };
  if (people.length > 30) return { error: "That's too many people to split with in one go." };

  const totalKobo = Math.round(total * 100);
  // Optional custom amounts: people without one share what's left equally.
  const custom = new Map();
  for (const sh of Array.isArray(data.shares) ? data.shares : []) {
    const amt = Math.round(Number(sh && sh.amount) * 100);
    const person = people.find((n) => n.toLowerCase() === String((sh && sh.person) || "").trim().toLowerCase());
    if (person && Number.isFinite(amt) && amt > 0) custom.set(person, amt);
  }
  let customSum = [...custom.values()].reduce((a, b) => a + b, 0);
  if (customSum > totalKobo) { custom.clear(); customSum = 0; }

  const slots = people.filter((n) => !custom.has(n)); // equal-share slots (people)
  const slotCount = slots.length + (includeMe ? 1 : 0);
  const remaining = totalKobo - customSum;
  const kobo = new Map(custom);
  let myKobo = 0;
  if (slotCount === 0) {
    if (remaining !== 0) return { error: "Those amounts don't add up to the total." };
  } else {
    const base = Math.floor(remaining / slotCount);
    let extra = remaining - base * slotCount;
    for (const n of slots) { kobo.set(n, base + (extra > 0 ? 1 : 0)); if (extra > 0) extra--; }
    if (includeMe) myKobo = base + (extra > 0 ? 1 : 0);
  }

  const shares = people.map((n) => ({ person: n, amount: kobo.get(n) / 100 }));
  const myShare = myKobo / 100;
  const label = String(data.note || "").trim().slice(0, 80);
  const noteText = `Split${label ? `: ${label}` : ""} (₦${total.toLocaleString()} total)`;
  const debts = [];
  if (payer === "me") {
    for (const sh of shares) debts.push({ direction: "owed_to_me", person: sh.person, amount: sh.amount, currency, note: noteText, dueDate: null });
  } else if (myShare > 0) {
    debts.push({ direction: "i_owe", person: payer, amount: myShare, currency, note: noteText, dueDate: null });
  }
  if (!debts.length) return { error: "That split doesn't leave anything for you to record." };
  return { total, currency, note: label, payer, includeMe, shares, myShare, debts };
}

const MALL_STOPWORDS = new Set(["the", "and", "for", "with", "any", "some", "under", "over", "below", "above", "cheapest", "cheaper", "lowest", "affordable", "cheap", "best", "good", "a", "an", "in", "on", "of", "to", "me", "my"]);
const { normalizeMallQuery } = require("./mallQuery");
const { normalizePlan, summarizeSpecialist, MAX_STEPS } = require("./damiOrchestrator");
const { normalizeWorkflowSteps, buildMemoryContext, enforceCurrentInstructionPriority } = require("./damiWorkflow");

// Searches NEXA's own Mall catalog. Read-only, no AI call, so it is cheap
// enough to run alongside every shopping request.
function mallSearch({ query, maxPrice, minPrice, category, limit = 6 } = {}) {
  const normalized = normalizeMallQuery(query, category, { minPrice, maxPrice });
  query = normalized.query;
  category = normalized.category;
  minPrice = normalized.minPrice ?? minPrice;
  maxPrice = normalized.maxPrice ?? maxPrice;
  const tokens = String(query || "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !MALL_STOPWORDS.has(t)).slice(0, 6);
  let sql = `SELECT ${PRODUCT_COLS}, v.shopName as vendorName FROM mall_products p
             JOIN vendors v ON v.id = p.vendorId WHERE p.active = 1 AND COALESCE(v.status, 'active') = 'active' AND p.stock > 0`;
  const args = [];
  if (category && MALL_CATEGORIES.includes(String(category))) { sql += " AND p.category = ?"; args.push(category); }
  const max = Number(maxPrice), min = Number(minPrice);
  if (Number.isFinite(max) && max > 0) { sql += " AND p.currency = 'NGN' AND p.price <= ?"; args.push(max); }
  if (Number.isFinite(min) && min > 0) { sql += " AND p.currency = 'NGN' AND p.price >= ?"; args.push(min); }
  if (tokens.length) {
    sql += " AND (" + tokens.map(() => "(p.name LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\')").join(" OR ") + ")";
    for (const t of tokens) { const like = `%${t.replace(/[\\%_]/g, "\\$&")}%`; args.push(like, like); }
  }
  sql += " ORDER BY p.createdAt DESC LIMIT 100";
  const rows = db.prepare(sql).all(...args);
  const score = (r) => tokens.reduce((n, t) => n + (String(r.name).toLowerCase().includes(t) ? 2 : 0) + (String(r.description || "").toLowerCase().includes(t) ? 1 : 0), 0);
  return rows
    .map((r) => ({ r, sc: score(r) }))
    .sort((a, b) => normalized.sort === "price_asc" ? a.r.price - b.r.price || b.sc - a.sc : b.sc - a.sc || a.r.price - b.r.price)
    .slice(0, Math.max(1, Math.min(limit, 10)))
    .map((x) => toClientProduct(x.r));
}

function mallOrdersForUser(userId, limit = 5) {
  const ids = db.prepare("SELECT id FROM mall_orders WHERE userId = ? ORDER BY createdAt DESC LIMIT ?").all(userId, limit);
  return ids.map((r) => loadOrder(r.id)).filter(Boolean).map((o) => ({
    id: o.id, status: o.status, total: o.total, currency: o.currency, createdAt: o.createdAt,
    items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, status: i.status, vendorName: i.vendorName })),
  }));
}

/* ============================================================
   Specialist dispatcher (shared by single-intent and chained calls)
   ============================================================ */

// Short plain-text summary of a step's result, threaded into the next
// step's specialist call as context — never as invented data.
function summarizeForChain(intent, specialist) {
  if (!specialist) return `(${intent}: no result)`;
  switch (specialist.type) {
    case "comparison": {
      const names = (specialist.products || [])
        .slice(0, 3)
        .map((p) => `${p.name}${p.seller ? ` (${p.seller}${p.price ? `, ₦${Number(p.price).toLocaleString()}` : ""})` : ""}`)
        .join("; ");
      return `Shopping found: ${names || "no products"}.`;
    }
    case "scamcheck":
      return `ScamCheck result: ${specialist.riskLevel} risk — ${specialist.summary}`;
    case "expense_log":
      return `Expense logged: ₦${Number(specialist.expense.amount).toLocaleString()} under ${specialist.expense.category}.`;
    case "expense_summary":
      return "Expense summary was shown to the user.";
    case "debt_log": {
      const dirText = specialist.debt.direction === "owed_to_me" ? "owes the user" : "the user owes";
      return `Debt recorded: ${specialist.debt.person} ${dirText} ₦${Number(specialist.debt.amount).toLocaleString()}.`;
    }
    case "debt_summary":
      return "Debt summary was shown to the user.";
    case "content":
      return `Content generated for "${specialist.topic || "the request"}" (${specialist.contentType}).`;
    case "price_watch_prompt":
      return "Price watch prompt was shown to the user.";
    case "split_log":
      return `Bill split recorded: ${specialist.split.debts.length} debt(s) totalling ₦${Number(specialist.split.total).toLocaleString()} bill.`;
    case "mall_products":
      return `Dream Marketplace search found: ${(specialist.products || []).slice(0, 3).map((p) => p.name).join("; ") || "no products"}.`;
    case "mall_orders":
      return `The user's latest Mall order status: ${specialist.orders && specialist.orders[0] ? specialist.orders[0].status : "no orders"}.`;
    default:
      return `(${intent}: result produced)`;
  }
}

// Runs exactly one specialist for one (intent, payload) pair. Behavior is
// byte-for-byte identical to the original single-path logic when
// priorContext is empty — chaining only adds an extra context note.
async function runSpecialist(intent, specialistPayload, message, priorContext, locationLabel, userId, ownBase) {
  const payload = specialistPayload || {};
  const contextNote = [];
  if (priorContext) {
    contextNote.push({ role: "system", content: "Context from earlier step in this same request:\n" + priorContext });
  }
  if (locationLabel && intent === "shopping") {
    contextNote.push({
      role: "system",
      content: `User's approximate location: ${locationLabel}. Prefer sellers/marketplaces near this location when relevant, but don't force it if the best options are elsewhere.`,
    });
  }
  if (locationLabel && intent === "scamcheck") {
    contextNote.push({
      role: "system",
      content: `User's approximate location: ${locationLabel}. This is only to help you recognize region-relevant scam patterns (local bank/payment app names, local marketplace conventions) — it is NOT a risk signal itself and must never raise or lower the risk verdict on its own.`,
    });
  }
  let specialist = null;
  let reply = null;

  if (intent === "shopping") {
    const payloadMsg = payload.message || message;
    const r = await damiResponsesCreate({
      model: MODEL,
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: COMPARE_SYSTEM },
        ...contextNote,
        { role: "user", content: payloadMsg },
      ],
    });
    const data = parse(r.output_text || "");
    const products = (data.products || []).map(clean).filter(Boolean);
    const byName = new Map(products.map((p) => [p.name.toLowerCase(), p]));
    const comparison = (data.comparison || []).map((c) => ({
      ...c,
      productId: (byName.get(String(c.productName || "").toLowerCase()) || {}).id || "",
    }));
    specialist = { type: "comparison", criteria: data.criteria || [], summary: data.summary || "", products, comparison };
    // V3.6: also surface matching Dream Marketplace listings. Never allowed to break a shopping answer.
    try {
      if (payload.mallQuery && String(payload.mallQuery).trim()) {
        const mallMatches = mallSearch({ query: payload.mallQuery, maxPrice: payload.maxPrice, limit: 4 });
        if (mallMatches.length) specialist.mallMatches = mallMatches;
      }
    } catch (e) { console.warn("mall match failed:", e.message); }
    reply = data.summary || "Here’s what I found.";
  } else if (intent === "scamcheck") {
    const textToCheck = payload.text || message;
    // V3.9: a link to a Dream Marketplace store on this server brings that store's rating as extra evidence.
    // Look in both the text the router extracted and the user's original message (the router may drop a link).
    let mallSellers = [];
    try { mallSellers = social.findMallSellers(`${payload.text || ""}\n${message || ""}`, ownBase); }
    catch (e) { console.warn("mall seller lookup failed:", e.message); }
    const mallNote = social.describeMallSellers(mallSellers);
    const r = await damiResponsesCreate({
      model: MODEL,
      input: [
        { role: "system", content: SCAMCHECK_SYSTEM },
        ...contextNote,
        ...(mallNote ? [{ role: "system", content: mallNote }] : []),
        { role: "user", content: textToCheck },
      ],
    });
    const data = parse(r.output_text || "");
    specialist = {
      type: "scamcheck",
      riskLevel: data.riskLevel || "medium",
      summary: data.summary || "",
      signals: Array.isArray(data.signals) ? data.signals : [],
      whatToDo: Array.isArray(data.whatToDo) ? data.whatToDo : [],
      safeToProceed: !!data.safeToProceed,
    };
    if (mallSellers.length) specialist.mallSellers = mallSellers;
    reply = data.summary || "I’ve checked it.";
  } else if (intent === "money") {
    const action = payload.action || "log";
    if (action === "log") {
      const raw = payload.raw || message;
      const r = await damiResponsesCreate({
        model: MODEL,
        input: [
          { role: "system", content: MONEY_PARSE_SYSTEM },
          ...contextNote,
          { role: "user", content: raw },
        ],
      });
      const data = parse(r.output_text || "");
      if (data.error) {
        reply = data.message || "I need a clear amount to log this.";
        specialist = null;
      } else {
        specialist = {
          type: "expense_log",
          expense: {
            amount: Number(data.amount),
            currency: data.currency || "NGN",
            category: data.category || "other",
            date: data.date || new Date().toISOString().slice(0, 10),
            note: data.note || "",
            confidence: data.confidence ?? 0.8,
          },
        };
        reply = `Logged ₦${Number(data.amount).toLocaleString()} under ${data.category}.`;
      }
    } else {
      specialist = { type: "expense_summary" };
      reply = "Here’s your spending summary.";
    }
  } else if (intent === "iou") {
    const action = payload.action || "log";
    if (action === "log") {
      const raw = payload.raw || message;
      const r = await damiResponsesCreate({
        model: MODEL,
        input: [
          { role: "system", content: IOU_PARSE_SYSTEM },
          ...contextNote,
          { role: "user", content: raw },
        ],
      });
      const data = parse(r.output_text || "");
      if (data.error) {
        reply = data.message || "I need a name and an amount to record this.";
        specialist = null;
      } else {
        specialist = {
          type: "debt_log",
          debt: {
            direction: data.direction,
            person: data.person,
            amount: Number(data.amount),
            currency: data.currency || "NGN",
            note: data.note || "",
            dueDate: data.dueDate || null,
            confidence: data.confidence ?? 0.8,
          },
        };
        const dirText = data.direction === "owed_to_me" ? "owes you" : "you owe";
        reply = `Recorded: ${data.person} ${dirText} ₦${Number(data.amount).toLocaleString()}.`;
      }
    } else {
      specialist = { type: "debt_summary" };
      reply = "Here’s your debt overview.";
    }
  } else if (intent === "content") {
    const request = payload.request || message;
    const toneHint = payload.toneHint || "";
    const userContent = toneHint ? `${request}\n\nPreferred tone/style: ${toneHint}` : request;
    const r = await damiResponsesCreate({
      model: MODEL,
      input: [
        { role: "system", content: CONTENT_SYSTEM },
        ...contextNote,
        { role: "user", content: userContent },
      ],
    });
    const data = parse(r.output_text || "");
    specialist = {
      type: "content",
      contentType: data.type || "caption",
      topic: data.topic || "",
      variants: Array.isArray(data.variants) ? data.variants : [],
      tips: Array.isArray(data.tips) ? data.tips : [],
    };
    reply = data.topic ? `Here are some options for “${data.topic}”.` : "Here are some content options for you.";
  } else if (intent === "price_watch") {
    specialist = { type: "price_watch_prompt", hint: payload.productHint || null };
    reply = null;
  } else if (intent === "split") {
    const raw = payload.raw || message;
    const r = await damiResponsesCreate({
      model: MODEL,
      input: [
        { role: "system", content: SPLIT_PARSE_SYSTEM },
        ...contextNote,
        { role: "user", content: raw },
      ],
    });
    const data = parse(r.output_text || "");
    const result = data.error ? { error: data.message || "I need the total and who you're splitting it with." } : computeSplit(data);
    if (result.error) {
      reply = result.error;
      specialist = null;
    } else {
      specialist = { type: "split_log", split: result };
      const each = result.shares.map((sh) => `${sh.person} ₦${sh.amount.toLocaleString()}`).join(", ");
      reply = result.payer === "me"
        ? `Split done. ${each}. I’ve added ${result.debts.length === 1 ? "it" : "them"} to your debts.`
        : `Your share is ₦${result.myShare.toLocaleString()}, owed to ${result.payer}. I’ve added it to your debts.`;
    }
  } else if (intent === "mall") {
    if ((payload.action || "search") === "orders") {
      const orders = mallOrdersForUser(userId, 5);
      specialist = { type: "mall_orders", orders };
      reply = orders.length ? `Your latest Mall order is ${orders[0].status}.` : "You haven’t placed any Mall orders yet.";
    } else {
      const products = mallSearch({
        query: payload.query, maxPrice: payload.maxPrice, minPrice: payload.minPrice, category: payload.category, limit: 6,
      });
      specialist = { type: "mall_products", query: String(payload.query || ""), products };
      reply = products.length ? `Found ${products.length} in the Dream Marketplace.` : "Nothing in the Dream Marketplace matches that yet.";
    }
  }

  return { specialist, reply };
}


const NEXA_READ_TOOLS = new Set(["profile", "money_summary", "mall_orders", "vendor_summary"]);

function runNexaReadTool(name, userId) {
  if (name === "profile") {
    const user = db.prepare("SELECT id, email, name, createdAt FROM users WHERE id = ?").get(userId);
    return user ? { id: user.id, email: user.email, name: user.name || null, createdAt: user.createdAt } : null;
  }
  if (name === "money_summary") {
    const expense = db.prepare("SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total FROM expenses WHERE userId = ?").get(userId);
    const debts = db.prepare("SELECT COUNT(*) AS count, COALESCE(SUM(CASE WHEN direction='i_owe' AND settled=0 THEN amount ELSE 0 END),0) AS iOwe, COALESCE(SUM(CASE WHEN direction='owed_to_me' AND settled=0 THEN amount ELSE 0 END),0) AS owedToMe FROM debts WHERE userId = ?").get(userId);
    return { expenses: { count: expense.count, total: expense.total, currency: "NGN" }, outstandingDebts: { count: debts.count, iOwe: debts.iOwe, owedToMe: debts.owedToMe, currency: "NGN" } };
  }
  if (name === "mall_orders") {
    const orders = db.prepare(`SELECT id, total, currency, status, createdAt FROM mall_orders WHERE userId = ? ORDER BY createdAt DESC LIMIT 5`).all(userId);
    return { count: orders.length, orders };
  }
  if (name === "vendor_summary") {
    const vendor = db.prepare("SELECT id, shopName, bio FROM vendors WHERE userId = ?").get(userId);
    if (!vendor) return { vendor: null };
    const products = db.prepare("SELECT COUNT(*) AS count FROM mall_products WHERE vendorId = ? AND active = 1").get(vendor.id);
    const orders = db.prepare(`SELECT COUNT(DISTINCT o.id) AS count, COALESCE(SUM(i.price*i.quantity),0) AS gross FROM mall_orders o JOIN mall_order_items i ON i.orderId=o.id WHERE i.vendorId=? AND o.status <> 'cancelled'`).get(vendor.id);
    return { vendor, products: products.count, orders: orders.count, gross: orders.gross, currency: "NGN" };
  }
  throw new Error("Unsupported NEXA read tool");
}

async function enrichWithNexaTools(core, message, userId) {
  const requested = Array.isArray(core.toolRequests) ? core.toolRequests : [];
  const names = [...new Set(requested.map((x) => typeof x === "string" ? x : x?.name).filter((x) => NEXA_READ_TOOLS.has(x)))].slice(0, 3);
  if (!names.length) return { core, toolResults: [] };
  const toolResults = names.map((name) => ({ name, data: runNexaReadTool(name, userId) }));
  const followup = [
    { role: "system", content: `You are Dami. The user asked: ${message}\n\nYou requested read-only application tools. Here are their live results:\n${JSON.stringify(toolResults)}\n\nUse only these results for personal NEXA data. Do not invent missing values. Return ONLY JSON in the same response shape. Keep the original intent/navigation unless the tool results require a correction. Set toolRequests to [].` },
    { role: "user", content: message }
  ];
  const res = await damiResponsesCreate({ model: MODEL, input: followup }, { providerAware: true });
  const finalCore = parse(res.output_text || "");
  return { core: { ...core, ...finalCore, toolRequests: [] }, toolResults };
}

app.post("/api/dami", auth.authMiddleware, aiLimiter, async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ error: "message is required" });
    if (Buffer.byteLength(message, "utf8") > 64 * 1024) return res.status(413).json({ error: "message is too large" });

    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8).map((h) => ({ role: String(h?.role || "user").slice(0, 20), content: String(h?.content || "").slice(0, 8000) })) : [];
    const memory = typeof req.body?.memory === "string" ? req.body.memory.trim().slice(0, 16000) : "";
    const locationLabel = typeof req.body?.location === "string" && req.body.location.trim() ? req.body.location.trim().slice(0, 160) : null;

    const voicePref = getDamiVoicePreference(req.user.id);
    const personalization = getDamiPersonalization(req.user.id);
    const personalizationInstruction = damiPersonalization.systemInstruction(personalization);
    const memorySetting = db.prepare("SELECT enabled, retentionDays FROM ai_memory_settings WHERE userId = ?").get(req.user.id);
    let serverMemories = [];
    let serverPlans = [];
    if (memorySetting?.enabled) {
      const now = new Date().toISOString();
      db.prepare("DELETE FROM ai_memories WHERE userId = ? AND expiresAt IS NOT NULL AND expiresAt <= ?").run(req.user.id, now);
      serverMemories = db.prepare("SELECT content, category FROM ai_memories WHERE userId = ? ORDER BY updatedAt DESC LIMIT 20").all(req.user.id);
      serverPlans = db.prepare("SELECT title, goal, steps, status FROM ai_plans WHERE userId = ? AND status IN (\'draft\',\'active\') ORDER BY updatedAt DESC LIMIT 10").all(req.user.id).map(p => ({ ...p, steps: JSON.parse(p.steps || "[]") }));
    }
    const persistedMemoryContext = buildMemoryContext(serverMemories, serverPlans);
    let retrievedKnowledgeContext = "";
    if (memorySetting?.enabled) {
      const knowledgeDocs = db.prepare("SELECT id,userId,title,content,updatedAt FROM ai_knowledge WHERE userId=? ORDER BY updatedAt DESC LIMIT 1000").all(req.user.id);
      const knowledgeResults = damiKnowledgeHub.retrieve(message, knowledgeDocs, req.user.id, 6);
      if (knowledgeResults.ok && knowledgeResults.results.length) retrievedKnowledgeContext = damiKnowledgeHub.buildPromptContext(knowledgeResults.results);
    }
    const adaptiveLearning = aiSelfLearning.buildLearningContext({ profileId: "consumer_dami", userId: req.user.id, limit: 12 });
    const adaptiveBehavior = aiSelfLearning.buildBehaviorContext({ profileId: "consumer_dami", userId: req.user.id, limit: 10 });
    const adaptiveFollowups = aiSelfLearning.buildFollowupContext({ profileId: "consumer_dami", userId: req.user.id, limit: 6 });
    const adaptiveLearningContext = adaptiveLearning.length ? "Adaptive lessons learned from this user (soft context only; never override current instructions):\n" + adaptiveLearning.map((m) => `- ${m.lesson} (confidence ${Number(m.confidence || 0).toFixed(2)}, confirmations ${m.confirmations})`).join("\n") : "";
    const adaptiveBehaviorContext = adaptiveBehavior.length ? "Repeated activity patterns observed for this user (soft context only; do not treat as identity or authorization):\n" + adaptiveBehavior.map((p) => `- ${p.patternKey}: ${p.patternValue} (observed ${p.count} times, confidence ${Number(p.confidence || 0).toFixed(2)})`).join("\n") : "";
    const adaptiveFollowupContext = adaptiveFollowups.length ? "Pending user follow-ups (reminders only; do not claim completion):\n" + adaptiveFollowups.map((f) => `- ${f.title}: ${f.reason} · due ${f.dueAt}`).join("\n") : "";
    const languageInstruction = `The user selected ${voicePref.language.label} for Dami. ${voicePref.language.instruction} Stay in that language unless the user explicitly asks to change language.`;
    const input = [
      { role: "system", content: CORE_SYSTEM + "\n\nUser Dami language preference: " + languageInstruction + "\n" + personalizationInstruction },
    ];
    if (retrievedKnowledgeContext) input.push({ role: "system", content: retrievedKnowledgeContext });
    if (persistedMemoryContext || memory || adaptiveLearningContext || adaptiveBehaviorContext || adaptiveFollowupContext) {
      if (adaptiveLearningContext) input.push({ role: "system", content: adaptiveLearningContext });
      if (adaptiveBehaviorContext) input.push({ role: "system", content: adaptiveBehaviorContext });
      if (adaptiveFollowupContext) input.push({ role: "system", content: adaptiveFollowupContext });
      const combinedMemory = persistedMemoryContext || memory;
      input.push({ role: "system", content: enforceCurrentInstructionPriority(message, combinedMemory) });
      if (memory && persistedMemoryContext) input.push({ role: "system", content: "Additional session context supplied by the client (also soft context only):\n" + memory.slice(0, 4000) });
    }
    input.push(...history.map((h) => ({ role: h.role, content: h.content })));
    input.push({ role: "user", content: message });

    const coreRes = await damiResponsesCreate({
      model: MODEL,
      input,
    }, { providerAware: true });

    let core = normalizePlan(parse(coreRes.output_text || ""));
    const enriched = await enrichWithNexaTools(core, message, req.user.id);
    core = enriched.core;
    const intent = core.intent || "general";
    const humanText = message.toLowerCase();
    const explicitHumanRequest = /\b(live (agent|person|staff)|human (agent|support)|talk to (an )?(agent|staff|person)|customer (care|support)|speak (to|with) (an )?(agent|staff|person))\b/.test(humanText);
    const needsHuman = core.needsHuman === true || explicitHumanRequest;
    let customerCareHandoff = null;
    if (needsHuman) {
      const context = JSON.stringify({ source:"dami", message:message.slice(0,4000), history:history.slice(-4) });
      const thread = customerCare.create({db,auth,admin:adminAccess,genRowId,rateLimit}).openThread(req.user.id,{source:"dami",reason:core.needsHuman===true?"Dami requested human assistance":"User requested live Staff assistance",context});
      customerCareHandoff = { recommended:true, threadId:thread.id, reason:thread.handoffReason || "Live Staff assistance is available." };
    }

    const allowedNavigation = new Set(["none", "home", "money", "zeeza", "dami", "marketplace", "vendor", "yaayz", "leisure"]);
    const navigation = allowedNavigation.has(core.navigation) ? core.navigation : "none";
    const actionProposal = aiActions.createPending(db, req.user.id, core.actionProposal);
    let reply = core.reply || "I hear you. How can I help?";
    try {
      aiSelfLearning.observe({ profileId: "consumer_dami", userId: req.user.id, type: "activity", activity: `Dami interaction: ${intent}`, outcome: "response_generated", metadata: { navigation, chain: core.chain === true }, patternKey: "intent", patternValue: intent });
      if (navigation !== "none") aiSelfLearning.observe({ profileId: "consumer_dami", userId: req.user.id, type: "activity", activity: `Dami navigation: ${navigation}`, outcome: "navigation_selected", metadata: { navigation }, patternKey: "navigation", patternValue: navigation });
      if (core.chain === true) aiSelfLearning.observe({ profileId: "consumer_dami", userId: req.user.id, type: "activity", activity: "Dami multi-step workflow", outcome: "chain_used", metadata: { stepCount: Array.isArray(core.steps) ? core.steps.length : 0 }, patternKey: "workflow", patternValue: "multi_step" });
      aiSelfLearning.promoteRepeatedActivity({ profileId: "consumer_dami", userId: req.user.id, activity: `Dami interaction: ${intent}`, metadata: { navigation } });
    } catch (_) {}

    const rawSteps = core.chain === true && Array.isArray(core.steps) ? core.steps.filter((s) => s && s.intent).slice(0, MAX_STEPS) : [];
    const workflowCheck = rawSteps.length ? normalizeWorkflowSteps(rawSteps) : { ok:true, steps:[] };
    if (!workflowCheck.ok) {
      core.chain = false;
      core.steps = [];
    }

    if (workflowCheck.ok && rawSteps.length > 1) {
      // Multi-specialist chain: run each step in order, threading a short
      // summary of prior steps forward so later specialists have context.
      const steps = rawSteps.slice(0, 3);
      const results = [];
      let priorContext = "";
      for (const step of steps) {
        const { specialist: stepSpecialist, reply: stepReply } = await runSpecialist(
          step.intent,
          step.specialistPayload,
          message,
          priorContext,
          locationLabel,
          req.user.id,
          publicBase(req)
        );
        results.push({ intent: step.intent, specialist: stepSpecialist, reply: stepReply });
        priorContext = [priorContext, summarizeSpecialist(step.intent, stepSpecialist)].filter(Boolean).join("\n").slice(-5000);
      }
      if (!reply || reply.length < 20) {
        reply = results.map((r) => r.reply).filter(Boolean).join(" ") || "Done.";
      }
      res.json({
        intent,
        confidence: core.confidence ?? 0.8,
        navigation,
        reply,
        specialist: results[0]?.specialist ?? null, // backward-compatible single card
        chain: true,
        steps: results,
        toolResults: enriched.toolResults,
        actionProposal,
        customerCare: customerCareHandoff,
      });
      return;
    }

    // Single-intent path — identical behavior to before chaining existed
    // (same per-intent minimum-reply-length thresholds as the original code).
    let specialist = null;
    if (core.needsSpecialist) {
      const result = await runSpecialist(intent, core.specialistPayload, message, "", locationLabel, req.user.id, publicBase(req));
      specialist = result.specialist;
      const minLen = REPLY_MIN_LENGTH[intent] ?? 15;
      if (result.reply && (!reply || reply.length < minLen)) reply = result.reply;
    }

    res.json({ intent, confidence: core.confidence ?? 0.8, navigation, reply, specialist, toolResults: enriched.toolResults, actionProposal, customerCare: customerCareHandoff });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: friendlyError(e) });
  }
});

app.post("/api/ai/actions/confirm", auth.authMiddleware, aiLimiter, (req, res) => {
  try {
    const complete = (action, result) => {
      try { aiSelfLearning.observe({ profileId: "consumer_dami", userId: req.user.id, type: "success", activity: `Confirmed Dami action: ${action.type}`, outcome: "completed", metadata: { actionType: action.type }, patternKey: "confirmed_action", patternValue: action.type }); } catch (_) {}
      const receipt = damiActionReceipts.record(db, action, "completed", result, null);
      return res.json({ ok: true, type: action.type, result, receipt });
    };

    const action = aiActions.consume(db, req.user.id, req.body?.actionId);
    if (!action) return res.status(404).json({ error: "That NEXA action has expired or is no longer available." });

    const p = action.payload || {};
    if (action.type === "cancel_order") {
      const order = db.prepare("SELECT id FROM mall_orders WHERE id = ? AND userId = ?").get(String(p.orderId || ""), req.user.id);
      if (!order) return res.status(404).json({ error: "Order not found." });
      const active = db.prepare("SELECT * FROM mall_order_items WHERE orderId = ? AND status != 'cancelled'").all(order.id);
      if (!active.length) return complete(action, { order: loadOrder(order.id) });
      const orderState = db.prepare("SELECT status, paymentMethod, paymentRef FROM mall_orders WHERE id = ?").get(order.id);
      if (String(orderState?.paymentMethod || "").toLowerCase() === "online" && String(orderState?.paymentRef || "").trim()) {
        return res.status(409).json({ error: "Online payment has already been initialized for this order, so it can't be cancelled here." });
      }
      if (active.some((i) => i.status !== "placed")) return res.status(409).json({ error: "A seller has already started processing this order, so it can't be cancelled here." });
      if (active.some((i) => i.paid)) return res.status(409).json({ error: "The seller has already recorded your payment, so this can't be cancelled here." });
      const now = new Date().toISOString();
      const stockBefore = social.snapshotProducts(active.map((i) => i.productId));
      let cancelled;
      try {
        cancelled = db.transaction(() => {
        const currentOrder = db.prepare("SELECT status, paymentMethod, paymentRef FROM mall_orders WHERE id = ? AND userId = ?").get(order.id, req.user.id);
        if (!currentOrder) { const e = new Error("Order not found."); e.statusCode = 404; throw e; }
        if (String(currentOrder.paymentMethod || "").toLowerCase() === "online" && String(currentOrder.paymentRef || "").trim()) {
          const e = new Error("Online payment has already been initialized for this order, so it can't be cancelled here."); e.statusCode = 409; throw e;
        }
        const currentActive = db.prepare("SELECT * FROM mall_order_items WHERE orderId = ? AND status != 'cancelled'").all(order.id);
        if (!currentActive.length) return false;
        if (currentActive.some((i) => i.status !== "placed")) {
          const e = new Error("A seller has already started processing this order, so it can't be cancelled here."); e.statusCode = 409; throw e;
        }
        if (currentActive.some((i) => i.paid)) {
          const e = new Error("The seller has already recorded your payment, so this can't be cancelled here."); e.statusCode = 409; throw e;
        }
        for (const i of currentActive) {
          const changed = db.prepare("UPDATE mall_order_items SET status = 'cancelled' WHERE id = ? AND status = 'placed' AND paid = 0").run(i.id);
          if (!changed.changes) {
            const e = new Error("This order changed before the cancellation was completed. Please refresh and try again."); e.statusCode = 409; throw e;
          }
          productStock.release(db, { productId: i.productId, variantId: i.variantId, qty: i.quantity, now });
        }
        if (String(currentOrder.paymentMethod || "").toLowerCase() === "aami") {
        const refundCoins = Math.max(1, Math.ceil(Number(db.prepare("SELECT total FROM mall_orders WHERE id=?").get(order.id)?.total || 0)));
        aamiEconomy.credit(db, req.user.id, refundCoins, "dream_marketplace_refund", order.id, `dream-marketplace-refund:${order.id}`, { currency: currentOrder.currency || "NGN", orderId: order.id });
      }
      const orderChanged = db.prepare("UPDATE mall_orders SET status = 'cancelled' WHERE id = ? AND userId = ? AND status != 'cancelled'").run(order.id, req.user.id);
        if (!orderChanged.changes) {
          const e = new Error("This order changed before the cancellation was completed. Please refresh and try again."); e.statusCode = 409; throw e;
        }
        return true;
      })();
      } catch (e) {
        if (e?.statusCode === 404) return res.status(404).json({ error: e.message });
        if (e?.statusCode === 409) return res.status(409).json({ error: e.message });
        throw e;
      }
      if (!cancelled) return complete(action, { order: loadOrder(order.id) });
      social.notifyProductChanges(stockBefore);
      notifyVendorsOfOrder(order.id, "Order cancelled by buyer");
      return complete(action, { order: loadOrder(order.id) });
    }

    if (action.type === "settle_debt") {
      const r = db.prepare("UPDATE debts SET settled = 1 WHERE id = ? AND userId = ?").run(String(p.debtId || ""), req.user.id);
      if (!r.changes) return res.status(404).json({ error: "Debt not found." });
      return complete(action, { debtId: String(p.debtId) });
    }

    const targetId = String(p.userId || "");
    if (["unfriend", "block_user"].includes(action.type)) {
      if (!targetId || targetId === req.user.id) return res.status(400).json({ error: "Choose another user." });
      if (action.type === "unfriend") {
        db.transaction(() => {
          db.prepare("DELETE FROM friendships WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)").run(req.user.id, targetId, targetId, req.user.id);
        })();
        return complete(action, { userId: targetId });
      }
      db.transaction(() => {
        db.prepare("DELETE FROM friendships WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)").run(req.user.id, targetId, targetId, req.user.id);
        db.prepare("INSERT OR IGNORE INTO blocks (blockerId, blockedId, createdAt) VALUES (?,?,?)").run(req.user.id, targetId, new Date().toISOString());
      })();
      return complete(action, { userId: targetId });
    }

    if (action.type === "send_friend_request") {
      const username = String(p.username || "").toLowerCase().trim();
      if (!username) return res.status(400).json({ error: "Username is required." });
      const target = db.prepare("SELECT id, name, username FROM users WHERE username = ? COLLATE NOCASE").get(username);
      if (!target) return res.status(404).json({ error: "No NEXA user has that username." });
      if (target.id === req.user.id) return res.status(400).json({ error: "You can't friend yourself." });
      const id = genRowId("fr");
      const createdAt = new Date().toISOString();
      let created = false;
      try {
        created = db.transaction(() => {
          const blocked = db.prepare("SELECT 1 FROM blocks WHERE (blockerId = ? AND blockedId = ?) OR (blockerId = ? AND blockedId = ?)").get(req.user.id, target.id, target.id, req.user.id);
          if (blocked) { const e = new Error("You can't send a request to this person."); e.statusCode = 403; throw e; }
          const already = db.prepare("SELECT 1 FROM friendships WHERE userId = ? AND friendId = ?").get(req.user.id, target.id);
          if (already) { const e = new Error("You're already friends."); e.statusCode = 409; throw e; }
          const result = db.prepare("INSERT OR IGNORE INTO friend_requests (id, fromUserId, toUserId, status, createdAt) VALUES (?,?,?,?,?)").run(id, req.user.id, target.id, "pending", createdAt);
          if (!result.changes) { const e = new Error("You already sent a request to this person."); e.statusCode = 409; throw e; }
          return true;
        })();
      } catch (e) {
        if (e?.statusCode) return res.status(e.statusCode).json({ error: e.message });
        throw e;
      }
      if (!created) return res.status(409).json({ error: "You already sent a request to this person." });
      if (typeof sendPush === "function") sendPush(target.id, "NEXA", "You received a friend request", { screen: "friend_requests" });
      return complete(action, { requestId: id, username: target.username });
    }
    return res.status(400).json({ error: "Unsupported action." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: friendlyError(e) });
  }
});

app.post("/api/speak", auth.authMiddleware, aiLimiter, async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim().slice(0, 2000);
    if (!text) return res.status(400).json({ error: "text is required" });
    const pref = getDamiVoicePreference(req.user.id);
    const grokVoices = grokProvider.voices(process.env);
    const voice = pref.voiceStyle === "male" ? grokVoices.male : grokVoices.female;
    const instructions = `${pref.language.instruction} Speak warmly and conversationally. The user selected ${pref.language.label}; do not switch languages unless asked.`;
    const buffer = await grokProvider.textToSpeech({ text, voice, language: pref.language?.code }, { env: process.env });
    res.json({ audio: buffer.toString("base64") });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: friendlyError(e) });
  }
});

app.post("/api/compare", auth.authMiddleware, aiLimiter, async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ error: "message is required" });
    const r = await damiResponsesCreate({
      model: MODEL,
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: COMPARE_SYSTEM },
        { role: "user", content: message },
      ],
    });
    const data = parse(r.output_text || "");
    const products = (data.products || []).map(clean).filter(Boolean);
    const byName = new Map(products.map((p) => [p.name.toLowerCase(), p]));
    const comparison = (data.comparison || []).map((c) => ({
      ...c,
      productId: (byName.get(String(c.productName || "").toLowerCase()) || {}).id || "",
    }));
    res.json({ criteria: data.criteria || [], summary: data.summary || "", products, comparison });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: friendlyError(e) });
  }
});

app.post("/api/price-check", auth.authMiddleware, aiLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    if (!name) return res.status(400).json({ error: "product name is required" });
    const contextParts = [
      `Product name: ${name}`,
      body.brand ? `Brand: ${body.brand}` : null,
      body.seller ? `Preferred seller: ${body.seller}` : null,
      body.source ? `Preferred source: ${body.source}` : null,
      body.url ? `Previous URL: ${body.url}` : null,
      body.currency ? `Preferred currency: ${body.currency}` : null,
      body.previousPrice != null ? `Previously known price: ${body.previousPrice}` : null,
      "Find the most reliable current price for this exact product.",
    ].filter(Boolean);
    const r = await damiResponsesCreate({
      model: MODEL,
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: PRICE_CHECK_SYSTEM },
        { role: "user", content: contextParts.join("\n") },
      ],
    });
    const data = parse(r.output_text || "");
    const product = clean({
      name: data.name || name,
      brand: data.brand || body.brand || "",
      price: data.price ?? null,
      currency: data.currency || body.currency || "",
      seller: data.seller || body.seller || "",
      source: data.source || body.source || "",
      url: data.url || body.url || "",
      availability: data.availability || "",
      note: data.note || "",
      checkedAt: data.checkedAt || new Date().toISOString(),
    });
    let change = null;
    const prev = body.previousPrice != null ? Number(body.previousPrice) : null;
    const curr = product.price != null ? Number(product.price) : null;
    if (prev != null && !Number.isNaN(prev) && curr != null && !Number.isNaN(curr)) {
      const diff = curr - prev;
      change = {
        direction: diff < 0 ? "down" : diff > 0 ? "up" : "same",
        amount: Math.abs(diff),
        percent: prev === 0 ? null : Number(((diff / prev) * 100).toFixed(1)),
      };
    }
    res.json({ product, change });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: friendlyError(e) });
  }
});

/**
 * Voice → text (Grok speech-to-text)
 * multipart field name: "audio"
 */
app.post("/api/transcribe", auth.authMiddleware, aiLimiter, upload.single("audio"), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!filePath) return res.status(400).json({ error: "audio file is required" });

    const transcription = await grokProvider.speechToText({ fileBuffer: fs.readFileSync(filePath), filename: req.file.originalname || "audio.webm", mimeType: req.file.mimetype || "application/octet-stream", language: "en" }, { env: process.env });
    const textOut = (transcription.text || "").trim();
    res.json({ text: textOut });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: friendlyError(e) });
  } finally {
    if (filePath) audioUploadManager.remove(filePath);
  }
});


/**
 * ScamCheck from screenshot/image
 * Body: { imageBase64: string, mimeType?: string, caption?: string }
 */
app.post("/api/scamcheck-image", auth.authMiddleware, aiLimiter, async (req, res) => {
  try {
    const imageBase64 = String(req.body?.imageBase64 || "").trim();
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 is required" });
    const mimeType = String(req.body?.mimeType || "image/jpeg").trim();
    const caption = String(req.body?.caption || "").trim();

    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:${mimeType};base64,${imageBase64}`;

    // V3.9: links in the user's note to a Dream Marketplace store bring that store's rating as extra evidence.
    let mallSellers = [];
    try { mallSellers = social.findMallSellers(caption, publicBase(req)); }
    catch (e) { console.warn("mall seller lookup failed:", e.message); }
    const mallNote = social.describeMallSellers(mallSellers);

    const userContent = [
      {
        type: "input_text",
        text: caption
          ? `Analyse this screenshot for scam/risk signals. User note: ${caption}`
          : "Analyse this screenshot for scam/risk signals common in Nigeria and globally.",
      },
      {
        type: "input_image",
        image_url: dataUrl,
      },
    ];

    const visionInput = {
      model: MODEL,
      imageBase64,
      mimeType,
      prompt: caption
        ? `Analyse this screenshot for scam/risk signals. User note: ${caption}`
        : "Analyse this screenshot for scam/risk signals common in Nigeria and globally.",
      systemInstruction: [SCAMCHECK_VISION_SYSTEM, mallNote].filter(Boolean).join("\n\n"),
      maxOutputTokens: DAMI_POLICY.maxOutputTokens,
    };
    const selectedProvider = resolveProvider(process.env.DAMI_AI_PROVIDER || process.env.NEXA_AI_PROVIDER, process.env);
    const r = selectedProvider === PROVIDERS.GEMINI
      ? await analyzeAIImage(visionInput, { env: process.env })
      : await damiResponsesCreate({
          model: MODEL,
          input: [
            { role: "system", content: SCAMCHECK_VISION_SYSTEM },
            ...(mallNote ? [{ role: "system", content: mallNote }] : []),
            { role: "user", content: userContent },
          ],
        });

    const data = parse(r.output_text || r.text || "");
    // Links that only appear inside the screenshot are found after the fact. They are shown on the card
    // as their own note; the AI did not see them when it judged the risk.
    try {
      const seen = new Set(mallSellers.map((m) => m.vendorId));
      for (const m of social.findMallSellers(data.textFound || "", publicBase(req))) if (!seen.has(m.vendorId)) mallSellers.push(m);
    } catch (e) { console.warn("mall seller lookup failed:", e.message); }
    res.json({
      type: "scamcheck",
      riskLevel: data.riskLevel || "medium",
      summary: data.summary || "",
      signals: Array.isArray(data.signals) ? data.signals : [],
      whatToDo: Array.isArray(data.whatToDo) ? data.whatToDo : [],
      safeToProceed: !!data.safeToProceed,
      textFound: data.textFound || "",
      ...(mallSellers.length ? { mallSellers: mallSellers.slice(0, 3) } : {}),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: friendlyError(e) });
  }
});


/* ============================================================
   Accounts & real server-side data (V3.2)
   ============================================================ */

function genRowId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

// -- Auth --
app.get("/api/account/export", auth.authMiddleware, (req, res) => {
  try {
    const bundle = accountPortability.buildBundle(db, req.user.id);
    res.setHeader("Cache-Control", "no-store");
    res.json({ bundle, checksum: require("crypto").createHash("sha256").update(JSON.stringify(bundle)).digest("hex") });
  } catch (e) {
    const status = /closed|too large|too many rows/i.test(String(e.message || "")) ? 409 : 500;
    res.status(status).json({ error: clientErrorMessage(e, status, "Could not export account data.") });
  }
});

app.post("/api/account/import/validate", auth.authMiddleware, (req, res) => {
  try {
    const bundle = accountPortability.validateBundle(req.body?.bundle);
    const target = db.prepare("SELECT accountStatus FROM users WHERE id=?").get(req.user.id);
    if (!target || target.accountStatus === "closed") throw new Error("Closed accounts cannot import data.");
    const preflight = accountPortability.preflightImport(db, req.user.id, bundle);
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, exportVersion: preflight.exportVersion, checksum: require("crypto").createHash("sha256").update(JSON.stringify(preflight)).digest("hex"), tables: Object.fromEntries(Object.entries(preflight.data).map(([k,v]) => [k, v.length])) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message || "Account import is invalid." });
  }
});

app.delete("/api/account", auth.authMiddleware, (req, res) => {
  if (req.body?.confirmed !== true) return res.status(428).json({ error: "Explicit confirmation is required to close the account." });
  if (!auth.verifyPassword(req.user.id, req.body?.password)) return res.status(403).json({ error: "Current password is required to close the account." });
  try {
    const result = accountLifecycle.closeAccount(db, req.user.id, new Date().toISOString(), vendorSubscriptions);
    res.json({ ok: true, ...result, sessionRevoked: true, retained: accountLifecycle.RETAINED_USER_TABLES });
  } catch (e) {
    if (e?.code === "ACCOUNT_CLOSURE_BLOCKED") return res.status(409).json({ error: e.message, code: e.code, blockers: e.blockers || [] });
    if (e?.code === "ACCOUNT_CLOSURE_SCHEMA_INCOMPLETE") return res.status(503).json({ error: e.message, code: e.code, readiness: e.readiness || null });
    res.status(500).json({ error: "Account closure could not be completed." });
  }
});

app.post("/api/account/import", auth.authMiddleware, (req, res) => {
  try {
    const result = accountPortability.importBundle(db, req.user.id, req.body?.bundle);
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, ...result });
  } catch (e) {
    const status = /unsupported|missing|invalid|too large|refused|does not allow/i.test(String(e.message || "")) ? 400 : 500;
    res.status(status).json({ error: clientErrorMessage(e, status, "Could not import account data.") });
  }
});

app.get("/api/auth/google/start", authLimiter, (req, res) => {
  try {
    const started = googleAuth.start(db);
    res.json({ url: started.url, expiresAt: started.expiresAt });
  } catch (e) {
    res.status(e.status || 500).json({ error: clientErrorMessage(e, e.status || 500, "Google sign-in is unavailable."), code: e.code });
  }
});

app.get("/api/auth/google/callback", async (req, res) => {
  try {
    const result = await googleAuth.callback(db, String(req.query?.code || ""), String(req.query?.state || ""));
    const code = googleAuth.issueCode(db, result.userId);
    const target = new URL(result.appRedirect);
    target.searchParams.set("code", code);
    res.redirect(302, target.toString());
  } catch (e) {
    const target = new URL(googleAuth.appRedirect());
    target.searchParams.set("error", String(e.code || "GOOGLE_AUTH_FAILED"));
    res.redirect(302, target.toString());
  }
});

app.post("/api/auth/google/exchange", authLimiter, async (req, res) => {
  try {
    if (req.body?.ageConfirmed !== true) throw Object.assign(new Error("NEXA is available only to users aged 18 and above. Children and anyone under 18 are not permitted."), { status: 403, code: "AGE_RESTRICTION" });
    const { token, user } = await googleAuth.consumeCode(db, String(req.body?.code || ""), auth);
    res.json({ token, userId: user.id, user });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message || "Google sign-in could not be completed.", code: e.code });
  }
});

function authSessionContext(req){
  return { ageConfirmed: req.body?.ageConfirmed === true, deviceId: req.headers["x-nexa-device-id"], deviceLabel: req.headers["x-nexa-device-label"], deviceMetadata: { platform: req.headers["x-nexa-platform"], appVersion: req.headers["x-nexa-app-version"], osVersion: req.headers["x-nexa-os-version"], deviceModel: req.headers["x-nexa-device-model"], browserName: req.headers["x-nexa-browser-name"] }, ip: req.ip || req.socket?.remoteAddress || "", userAgent: req.headers["user-agent"] || "" };
}

app.post("/api/auth/signup", authLimiter, signupEmailLimiter, signupAccountFloodLimiter, async (req, res) => {
  try {
    const { email, password, name, ageConfirmed } = req.body || {};
    const context = authSessionContext(req);
    const { token, user } = await auth.signup(email, password, name, context);
    let verification = { accepted: true, delivered: false };
    try { verification = await authLifecycle.requestLink(email, "verify_email", context); } catch (_) { /* Signup remains available if email delivery is not configured. */ }
    res.json({ token, userId: user.id, user, emailVerification: { requested: true, delivered: verification.delivered === true } });
  } catch (e) {
    res.status(e.status || 500).json({ error: clientErrorMessage(e, e.status || 500, "Signup failed.") });
  }
});

app.post("/api/auth/login", authLimiter, loginEmailLimiter, loginAccountFloodLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await auth.login(email, password, authSessionContext(req), { beforeSession: (user, context) => adminSecurityCenter?.createLoginChallenge(user, context) });
    if (result?.mfaRequired) {
      // V6.1.93 B539: an admin or active Admin staff user must pass the Zeeza code before any admin or staff power works.
      // The Admin app (it names itself with this device label) gets the challenge only. Any other client, such as the NEXA app,
      // also gets an ordinary session that carries no admin power, so the person can open their Zeeza inbox and read the code.
      const adminAppClient = String(req.headers["x-nexa-device-label"] || "").trim().toLowerCase() === "aami admin web";
      if (adminAppClient) return res.json(result);
      const base = auth.createSession(result.userId, authSessionContext(req));
      return res.json({ ...result, token: base.token, userId: base.user.id, user: base.user, adminVerificationRequired: true });
    }
    const { token, user } = result;
    res.json({ token, userId: user.id, user });
  } catch (e) {
    res.status(e.status || 500).json({ error: clientErrorMessage(e, e.status || 500, "Login failed.") });
  }
});
// Block 03: account verification, password recovery, password change and security history.
app.post("/api/auth/email-verification/request", authLimiter, authActionLimiter, async (req, res) => {
  try {
    const result = await authLifecycle.requestLink(req.body?.email, "verify_email", authSessionContext(req));
    res.json({ ok: true, message: "If the account can receive verification mail, a link will be sent." , ...(result.previewUrl ? { previewUrl: result.previewUrl } : {}) });
  } catch (_) { res.json({ ok: true, message: "If the account can receive verification mail, a link will be sent." }); }
});
app.post("/api/auth/email-verification/confirm", authActionLimiter, (req, res) => {
  try { res.json(authLifecycle.verifyEmail(req.body?.token, authSessionContext(req))); }
  catch (e) { res.status(e.status || 400).json({ error: e.message || "Verification could not be completed.", code: e.code || "AUTH_TOKEN_INVALID" }); }
});
app.post("/api/auth/password-reset/request", authLimiter, authActionLimiter, async (req, res) => {
  try {
    const result = await authLifecycle.requestLink(req.body?.email, "password_reset", authSessionContext(req));
    res.json({ ok: true, message: "If an account matches that email, recovery instructions will be sent.", ...(result.previewUrl ? { previewUrl: result.previewUrl } : {}) });
  } catch (_) { res.json({ ok: true, message: "If an account matches that email, recovery instructions will be sent." }); }
});
app.post("/api/auth/password-reset/confirm", authActionLimiter, async (req, res) => {
  try { const result = await authLifecycle.resetPassword(req.body?.token, req.body?.password, authSessionContext(req)); if (result.securityAuditUserId && adminSecurityCenter?.isAdmin({ id: result.securityAuditUserId })) adminSecurityCenter.auditCredentialChange({ user: { id: result.securityAuditUserId } }, "admin_password_reset", "Admin password reset completed using a valid single-use recovery token; sessions revoked."); const { securityAuditUserId, ...publicResult } = result; res.json(publicResult); }
  catch (e) { res.status(e.status || 400).json({ error: e.message || "Password recovery could not be completed.", code: e.code || "PASSWORD_RESET_FAILED" }); }
});
app.post("/api/auth/password/change", auth.authMiddleware, authActionLimiter, async (req, res) => {
  try { const result = await authLifecycle.changePassword(req.user.id, req.body?.currentPassword, req.body?.newPassword, authSessionContext(req)); if (adminSecurityCenter?.isAdmin(req.user)) adminSecurityCenter.auditCredentialChange(req, "admin_password_changed", "Password changed after current-password confirmation; all sessions revoked."); res.json(result); }
  catch (e) { res.status(e.status || 400).json({ error: e.message || "Password change could not be completed.", code: e.code || "PASSWORD_CHANGE_FAILED" }); }
});
app.get("/api/auth/security-events", auth.authMiddleware, (req, res) => {
  res.json({ events: authLifecycle.listSecurityEvents(req.user.id, req.query?.limit) });
});

app.post("/api/auth/logout", auth.authMiddleware, (req, res) => {
  auth.logout(req.token);
  res.json({ ok: true });
});

app.get("/api/auth/me", auth.authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/session/rotate", auth.authMiddleware, (req, res) => {
  try {
    const result = auth.rotateSession(req.token, authSessionContext(req));
    res.json(result);
  } catch (e) {
    res.status(e.code === "AUTH_EXPIRED" ? 401 : 500).json({ error: clientErrorMessage(e, e.code === "AUTH_EXPIRED" ? 401 : 500, "Session rotation failed."), code: e.code });
  }
});

// V3.32: allow signed-in users to inspect session metadata and revoke other sessions.
// Session tokens are never returned by this endpoint.
app.get("/api/auth/sessions", auth.authMiddleware, (req, res) => {
  res.json({ sessions: auth.listSessions(req.user.id, req.token) });
});

app.delete("/api/auth/sessions/others", auth.authMiddleware, (req, res) => {
  const revoked = auth.logoutOtherSessions(req.user.id, req.token);
  res.json({ ok: true, revoked });
});

app.delete("/api/auth/sessions/all", auth.authMiddleware, (req, res) => {
  const revoked = auth.logoutAllSessions(req.user.id, req.token);
  res.json({ ok: true, revoked });
});

// V3.35: User-controlled AI memory foundation. Memory is disabled by default.
app.get("/api/ai/personalization", auth.authMiddleware, (req, res) => {
  const personalization = getDamiPersonalization(req.user.id);
  res.json({ personalization });
});

app.patch("/api/ai/personalization", auth.authMiddleware, (req, res) => {
  const personalization = damiPersonalization.normalize(req.body || {});
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO ai_personalization(userId,tone,responseLength,proactive,preferredCategories,updatedAt) VALUES(?,?,?,?,?,?)
    ON CONFLICT(userId) DO UPDATE SET tone=excluded.tone,responseLength=excluded.responseLength,proactive=excluded.proactive,preferredCategories=excluded.preferredCategories,updatedAt=excluded.updatedAt`)
    .run(req.user.id, personalization.tone, personalization.responseLength, personalization.proactive ? 1 : 0, JSON.stringify(personalization.preferredCategories), now);
  res.json({ personalization: { ...personalization, updatedAt: now } });
});

app.delete("/api/ai/personalization", auth.authMiddleware, (req, res) => {
  db.prepare("DELETE FROM ai_personalization WHERE userId = ?").run(req.user.id);
  res.json({ ok: true, personalization: damiPersonalization.DEFAULTS, reset: true });
});

app.get("/api/ai/voice-preferences", auth.authMiddleware, (req, res) => {
  const row = db.prepare("SELECT voiceStyle, languageMode, languageCode, updatedAt FROM ai_voice_preferences WHERE userId = ?").get(req.user.id);
  const pref = row || { voiceStyle: "female", languageMode: "auto", languageCode: "auto", updatedAt: null };
  const languageCode = normalizeDamiLanguage(pref.languageCode, pref.languageMode);
  res.json({ preferences: { voiceStyle: pref.voiceStyle === "male" ? "male" : "female", languageMode: pref.languageMode || "auto", languageCode, language: getDamiLanguage(languageCode), updatedAt: pref.updatedAt }, languages: DAMI_LANGUAGES });
});
app.patch("/api/ai/voice-preferences", auth.authMiddleware, (req, res) => {
  const voiceStyle = ["female", "male"].includes(String(req.body?.voiceStyle || "")) ? String(req.body.voiceStyle) : null;
  const requestedCode = String(req.body?.languageCode || "").trim().toLowerCase();
  const languageCode = isSupportedDamiLanguage(requestedCode) ? requestedCode : normalizeDamiLanguage(null, req.body?.languageMode);
  if (!voiceStyle || !isSupportedDamiLanguage(languageCode)) return res.status(400).json({ error: "voiceStyle must be female or male and languageCode must be a supported Dami language." });
  const languageMode = languageCode === "pcm" ? "pidgin" : languageCode === "en" ? "nigerian" : languageCode === "auto" ? "auto" : languageCode;
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO ai_voice_preferences(userId,voiceStyle,languageMode,languageCode,updatedAt) VALUES(?,?,?,?,?) ON CONFLICT(userId) DO UPDATE SET voiceStyle=excluded.voiceStyle, languageMode=excluded.languageMode, languageCode=excluded.languageCode, updatedAt=excluded.updatedAt`).run(req.user.id, voiceStyle, languageMode, languageCode, now);
  res.json({ preferences: { voiceStyle, languageMode, languageCode, language: getDamiLanguage(languageCode), updatedAt: now } });
});

app.get("/api/ai/avatar", auth.authMiddleware, (req, res) => {
  const row = db.prepare("SELECT config, updatedAt FROM ai_avatar WHERE userId = ?").get(req.user.id);
  const stored = row ? parseStoredAvatar(row.config) : null;
  // A plan that ended hides plan-only poses without deleting them.
  const tier = tierForUser(subscriptionsForAvatar, db, req.user.id), unlockAll = previewUnlockAll(process.env);
  const avatar = stored ? applyPoseTier(stored, tier, { unlockAll }).config : null;
  res.json({ avatar, updatedAt: avatar ? row.updatedAt : null, tier: reportedTier(tier, { unlockAll }) });
});

app.put("/api/ai/avatar", auth.authMiddleware, (req, res) => {
  const result = normalizeAvatarConfig(req.body?.avatar);
  if (!result.ok) return res.status(400).json({ error: result.error });
  const tier = tierForUser(subscriptionsForAvatar, db, req.user.id), unlockAll = previewUnlockAll(process.env);
  const { config, clamped } = applyPoseTier(result.config, tier, { unlockAll });
  const now = new Date().toISOString();
  db.prepare("INSERT INTO ai_avatar(userId,config,updatedAt) VALUES(?,?,?) ON CONFLICT(userId) DO UPDATE SET config=excluded.config, updatedAt=excluded.updatedAt").run(req.user.id, JSON.stringify(config), now);
  res.json({ avatar: config, updatedAt: now, poseLocked: clamped, tier: reportedTier(tier, { unlockAll }) });
});

app.delete("/api/ai/voice-preferences", auth.authMiddleware, (req, res) => {
  db.prepare("DELETE FROM ai_voice_preferences WHERE userId = ?").run(req.user.id);
  res.json({ ok: true, preferences: { voiceStyle: "female", languageMode: "auto", languageCode: "auto" }, reset: true });
});

app.get("/api/ai/memory/settings", auth.authMiddleware, (req, res) => {
  const row = db.prepare("SELECT enabled, retentionDays, updatedAt FROM ai_memory_settings WHERE userId = ?").get(req.user.id);
  res.json({ settings: row || { enabled: 0, retentionDays: 180, updatedAt: null } });
});

app.put("/api/ai/memory/settings", auth.authMiddleware, (req, res) => {
  const enabled = req.body && req.body.enabled;
  if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled must be a boolean." });
  const rawDays = Number(req.body.retentionDays ?? 180);
  if (!Number.isInteger(rawDays) || rawDays < 1 || rawDays > 3650) {
    return res.status(400).json({ error: "retentionDays must be an integer from 1 to 3650." });
  }
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare(`INSERT INTO ai_memory_settings(userId, enabled, retentionDays, updatedAt) VALUES(?,?,?,?)
      ON CONFLICT(userId) DO UPDATE SET enabled=excluded.enabled, retentionDays=excluded.retentionDays, updatedAt=excluded.updatedAt`)
      .run(req.user.id, enabled ? 1 : 0, rawDays, now);
    if (!enabled) db.prepare("DELETE FROM ai_memories WHERE userId = ?").run(req.user.id);
  })();
  res.json({ settings: { enabled: enabled ? 1 : 0, retentionDays: rawDays, updatedAt: now }, cleared: !enabled });
});

app.get("/api/ai/memory", auth.authMiddleware, (req, res) => {
  const setting = db.prepare("SELECT enabled, retentionDays FROM ai_memory_settings WHERE userId = ?").get(req.user.id);
  if (!setting || !setting.enabled) return res.json({ memories: [], enabled: false });
  const now = new Date().toISOString();
  db.prepare("DELETE FROM ai_memories WHERE userId = ? AND expiresAt IS NOT NULL AND expiresAt <= ?").run(req.user.id, now);
  const memories = db.prepare("SELECT id, content, category, createdAt, updatedAt, expiresAt FROM ai_memories WHERE userId = ? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id);
  res.json({ memories, enabled: true });
});

app.post("/api/ai/memory", auth.authMiddleware, (req, res) => {
  const content = String(req.body?.content || "").trim();
  const allowed = new Set(["preference", "goal", "context", "other"]);
  const category = allowed.has(req.body?.category) ? req.body.category : "preference";
  if (!content || content.length > 1000) return res.status(400).json({ error: "content must contain 1–1000 characters." });
  let created;
  try {
    created = db.transaction(() => {
      const setting = db.prepare("SELECT enabled, retentionDays FROM ai_memory_settings WHERE userId = ?").get(req.user.id);
      if (!setting || !setting.enabled) return { error: { status: 403, message: "Enable AI memory before adding memories." } };
      const count = db.prepare("SELECT COUNT(*) AS n FROM ai_memories WHERE userId = ?").get(req.user.id).n;
      if (count >= 100) return { error: { status: 409, message: "Memory limit reached. Delete a memory before adding another." } };
      const id = genRowId("mem");
      const now = new Date();
      const expires = new Date(now.getTime() + setting.retentionDays * 86400000).toISOString();
      db.prepare("INSERT INTO ai_memories(id,userId,content,category,createdAt,updatedAt,expiresAt) VALUES(?,?,?,?,?,?,?)")
        .run(id, req.user.id, content, category, now.toISOString(), now.toISOString(), expires);
      return { memory: { id, content, category, createdAt: now.toISOString(), updatedAt: now.toISOString(), expiresAt: expires } };
    })();
  } catch (_) { return res.status(500).json({ error: "Could not create memory." }); }
  if (created.error) return res.status(created.error.status).json({ error: created.error.message });
  res.status(201).json({ memory: created.memory });
});

app.patch("/api/ai/memory/:id", auth.authMiddleware, (req, res) => {
  const existing = db.prepare("SELECT id FROM ai_memories WHERE id = ? AND userId = ?").get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: "Memory not found." });
  const content = String(req.body?.content || "").trim();
  if (!content || content.length > 1000) return res.status(400).json({ error: "content must contain 1–1000 characters." });
  const category = ["preference", "goal", "context", "other"].includes(req.body?.category) ? req.body.category : null;
  const now = new Date().toISOString();
  db.prepare("UPDATE ai_memories SET content = ?, category = COALESCE(?, category), updatedAt = ? WHERE id = ? AND userId = ?")
    .run(content, category, now, req.params.id, req.user.id);
  res.json({ ok: true, updatedAt: now });
});

app.delete("/api/ai/memory/:id", auth.authMiddleware, (req, res) => {
  const result = db.prepare("DELETE FROM ai_memories WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Memory not found." });
  res.json({ ok: true });
});

app.delete("/api/ai/memory", auth.authMiddleware, (req, res) => {
  const result = db.prepare("DELETE FROM ai_memories WHERE userId = ?").run(req.user.id);
  res.json({ ok: true, deleted: result.changes });
});

// V3.36: User-owned AI planning workspace. Plans are drafts; this API does not execute actions.
const damiPlanLifecycle = require("./damiPlanLifecycle");
const PLAN_STATUSES = damiPlanLifecycle.PLAN_STATUSES;
function validPlanSteps(steps) {
  if (!Array.isArray(steps) || steps.length > 50) return false;
  return steps.every((step) => step && typeof step === "object" && !Array.isArray(step)
    && typeof step.title === "string" && step.title.trim().length >= 1 && step.title.trim().length <= 240
    && (step.status === undefined || ["todo", "in_progress", "done"].includes(step.status)));
}
function planRow(row) {
  return { ...row, steps: JSON.parse(row.steps || "[]") };
}
app.get("/api/ai/plans", auth.authMiddleware, (req, res) => {
  const plans = db.prepare("SELECT id,title,goal,steps,status,createdAt,updatedAt FROM ai_plans WHERE userId = ? ORDER BY updatedAt DESC LIMIT 100")
    .all(req.user.id).map(planRow);
  res.json({ plans });
});
app.post("/api/ai/plans", auth.authMiddleware, (req, res) => {
  const title = String(req.body?.title || "").trim();
  const goal = String(req.body?.goal || "").trim();
  const steps = req.body?.steps ?? [];
  const status = req.body?.status ?? "draft";
  if (!title || title.length > 160) return res.status(400).json({ error: "title must contain 1–160 characters." });
  if (goal.length > 2000) return res.status(400).json({ error: "goal must be at most 2000 characters." });
  if (!validPlanSteps(steps)) return res.status(400).json({ error: "steps must be an array of up to 50 steps, each with a title of 1–240 characters and optional valid status." });
  if (status !== "draft") return res.status(400).json({ error: "New plans must start as drafts; use the explicit approval lifecycle to activate them." });
  let created;
  try {
    created = db.transaction(() => {
      const count = db.prepare("SELECT COUNT(*) AS n FROM ai_plans WHERE userId = ?").get(req.user.id).n;
      if (count >= 100) return { error: { status: 409, message: "Plan limit reached (100). Delete a plan before creating another." } };
      const id = genRowId("plan"), now = new Date().toISOString();
      db.prepare("INSERT INTO ai_plans(id,userId,title,goal,steps,status,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)")
        .run(id, req.user.id, title, goal, JSON.stringify(steps.map(x => ({ title: x.title.trim(), status: x.status || "todo" }))), status, now, now);
      return { id };
    })();
  } catch (_) { return res.status(500).json({ error: "Could not create plan." }); }
  if (created.error) return res.status(created.error.status).json({ error: created.error.message });
  res.status(201).json({ plan: planRow(db.prepare("SELECT id,title,goal,steps,status,createdAt,updatedAt FROM ai_plans WHERE id = ? AND userId = ?").get(created.id, req.user.id)) });
});
app.patch("/api/ai/plans/:id", auth.authMiddleware, (req, res) => {
  const existing = db.prepare("SELECT * FROM ai_plans WHERE id = ? AND userId = ?").get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: "Plan not found." });
  const title = req.body?.title === undefined ? existing.title : String(req.body.title).trim();
  const goal = req.body?.goal === undefined ? existing.goal : String(req.body.goal).trim();
  const status = req.body?.status === undefined ? existing.status : req.body.status;
  let steps = req.body?.steps === undefined ? JSON.parse(existing.steps || "[]") : req.body.steps;
  if (!title || title.length > 160) return res.status(400).json({ error: "title must contain 1–160 characters." });
  if (goal.length > 2000) return res.status(400).json({ error: "goal must be at most 2000 characters." });
  if (!validPlanSteps(steps)) return res.status(400).json({ error: "Invalid steps array." });
  const transitionError = damiPlanLifecycle.planTransitionError(existing.status, status);
  if (transitionError) return res.status(409).json({ error: transitionError, currentStatus: existing.status, requestedStatus: status });
  steps = steps.map(x => ({ title: x.title.trim(), status: x.status || "todo" }));
  const now = new Date().toISOString();
  const changed = db.prepare("UPDATE ai_plans SET title=?,goal=?,steps=?,status=?,updatedAt=? WHERE id=? AND userId=? AND status=?")
    .run(title, goal, JSON.stringify(steps), status, now, req.params.id, req.user.id, existing.status);
  if (!changed.changes) return res.status(409).json({ error: "Plan changed concurrently. Refresh before retrying.", currentStatus: existing.status });
  res.json({ plan: planRow(db.prepare("SELECT id,title,goal,steps,status,createdAt,updatedAt FROM ai_plans WHERE id = ? AND userId = ?").get(req.params.id, req.user.id)) });
});
app.delete("/api/ai/plans/:id", auth.authMiddleware, (req, res) => {
  const result = db.prepare("DELETE FROM ai_plans WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Plan not found." });
  res.json({ ok: true });
});

// -- Unified Search (V3.56) --
app.get("/api/search", auth.authMiddleware, rateLimit({ windowMs: 60_000, max: 60, keyFn: (req) => req.user.id, message: "Too many searches. Please slow down." }), (req, res) => {
  const q = String(req.query.q || "");
  const types = String(req.query.types || "");
  const limit = req.query.limit;
  const cursor = req.query.cursor ? String(req.query.cursor) : null;
  res.json(search.searchAll(db, req.user.id, q, types, limit, cursor));
});

// -- Expenses --
// V3.87.1 — Unified Money statistics: payment-bearing NEXA modules are summarized
// here without replacing the original expense/debt Money records. All figures are
// derived from server-owned records and scoped to the authenticated account.
app.get("/api/money/summary", auth.authMiddleware, (req, res) => {
  const userId = req.user.id;
  const byCurrency = new Map();
  const add = (currency, amount, kind) => {
    const c = String(currency || "NGN").toUpperCase();
    const row = byCurrency.get(c) || { currency: c, paid: 0, cashback: 0, orders: 0, receipts: 0 };
    if (kind === "cashback") row.cashback += Number(amount || 0);
    else { row.paid += Number(amount || 0); row.orders += 1; }
    byCurrency.set(c, row);
  };
  const mall = db.prepare("SELECT o.total,o.currency FROM mall_orders o WHERE o.userId=? AND EXISTS (SELECT 1 FROM mall_order_items i WHERE i.orderId=o.id AND i.paid=1 AND i.status!=\'cancelled\') AND NOT EXISTS (SELECT 1 FROM mall_order_items i WHERE i.orderId=o.id AND i.status!=\'cancelled\' AND i.paid=0)").all(userId);
  // The EXISTS form above intentionally counts an order once even when it has many paid lines.
  for (const row of mall) add(row.currency, row.total, "paid");
  const yaayz = db.prepare("SELECT total,currency FROM yaayz_ticket_orders WHERE buyerId=? AND status='paid'").all(userId);
  for (const row of yaayz) add(row.currency, row.total, "paid");
  const kitchen = db.prepare("SELECT total,currency,receiptImage FROM kitchen_orders WHERE userId=? AND status='paid'").all(userId);
  for (const row of kitchen) { add(row.currency, row.total, "paid"); if (row.receiptImage) { const c=String(row.currency||"NGN").toUpperCase(); const x=byCurrency.get(c); x.receipts += 1; } }
  const ajoPaid = db.prepare("SELECT amount,currency FROM money_store_ajo_contributions WHERE userId=? AND status='paid'").all(userId);
  for (const row of ajoPaid) add(row.currency, row.amount, "paid");
  const cashback = db.prepare("SELECT amount,currency FROM kitchen_cashback_ledger WHERE beneficiaryId=? AND status='available' AND COALESCE(migratedToAami,0)=0").all(userId);
  for (const row of cashback) add(row.currency, row.amount, "cashback");
  const totals = { paid: 0, cashback: 0, orders: 0, receipts: 0 };
  for (const row of byCurrency.values()) { totals.paid += row.paid; totals.cashback += row.cashback; totals.orders += row.orders; totals.receipts += row.receipts; }
  res.json({ totals, byCurrency: Array.from(byCurrency.values()) });
});

app.get("/api/money/planning/summary", auth.authMiddleware, (req, res) => {
  const start = req.query.start ? String(req.query.start).slice(0,10) : undefined;
  const end = req.query.end ? String(req.query.end).slice(0,10) : undefined;
  if ((start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) || (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) || (start && end && start > end)) return res.status(400).json({ error: "Invalid planning period." });
  res.json(moneyPlanningMaturity.summarize(db, req.user.id, { start: start || moneyPlanningMaturity.monthStart(), end: end || moneyPlanningMaturity.monthEnd() }));
});

app.get("/api/expenses", auth.authMiddleware, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC, createdAt DESC")
    .all(req.user.id);
  res.json({ expenses: rows });
});

app.post("/api/expenses", auth.authMiddleware, (req, res) => {
  const e = req.body || {};
  if (e.amount == null || Number.isNaN(Number(e.amount))) {
    return res.status(400).json({ error: "amount is required" });
  }
  const id = e.id || genRowId("e");
  db.prepare(
    "INSERT OR REPLACE INTO expenses (id,userId,amount,currency,category,date,note,createdAt) VALUES (?,?,?,?,?,?,?,?)"
  ).run(
    id, req.user.id, Number(e.amount), e.currency || "NGN", e.category || "other",
    e.date || new Date().toISOString().slice(0, 10), e.note || "", e.createdAt || new Date().toISOString()
  );
  res.json({ id });
});

// -- Debts --
app.get("/api/debts", auth.authMiddleware, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM debts WHERE userId = ? ORDER BY createdAt DESC")
    .all(req.user.id)
    .map((r) => ({ ...r, settled: !!r.settled }));
  res.json({ debts: rows });
});

app.post("/api/debts", auth.authMiddleware, (req, res) => {
  const d = req.body || {};
  if (!d.person || d.amount == null || Number.isNaN(Number(d.amount))) {
    return res.status(400).json({ error: "person and amount are required" });
  }
  const id = d.id || genRowId("d");
  db.prepare(
    "INSERT OR REPLACE INTO debts (id,userId,direction,person,amount,currency,note,dueDate,settled,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id, req.user.id, d.direction === "i_owe" ? "i_owe" : "owed_to_me", d.person, Number(d.amount),
    d.currency || "NGN", d.note || "", d.dueDate || null, d.settled ? 1 : 0, d.createdAt || new Date().toISOString()
  );
  res.json({ id });
});

app.patch("/api/debts/:id/settle", auth.authMiddleware, (req, res) => {
  db.prepare("UPDATE debts SET settled = 1 WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// -- Financial Planning & Goals (V3.53) --
function planningSettings(userId) {
  let row = db.prepare("SELECT * FROM financial_planning_settings WHERE userId = ?").get(userId);
  if (!row) {
    const now = new Date().toISOString();
    db.prepare("INSERT INTO financial_planning_settings (userId, insightsEnabled, updatedAt) VALUES (?,?,?)").run(userId, 1, now);
    row = db.prepare("SELECT * FROM financial_planning_settings WHERE userId = ?").get(userId);
  }
  return { ...row, insightsEnabled: !!row.insightsEnabled };
}

function planningDates(req) {
  const today = new Date().toISOString().slice(0, 10);
  const start = String(req.query.start || `${today.slice(0, 7)}-01`);
  const end = String(req.query.end || today);
  return { start, end };
}

app.get("/api/planning", auth.authMiddleware, (req, res) => {
  const settings = planningSettings(req.user.id);
  const budgets = db.prepare("SELECT * FROM financial_budgets WHERE userId = ? ORDER BY periodStart DESC, createdAt DESC").all(req.user.id)
    .map((b) => ({ ...b, active: !!b.active }));
  const goals = db.prepare("SELECT * FROM financial_goals WHERE userId = ? ORDER BY updatedAt DESC").all(req.user.id);
  const expenses = db.prepare("SELECT id, amount, currency, category, date FROM expenses WHERE userId = ? ORDER BY date DESC, createdAt DESC").all(req.user.id);
  const progress = budgets.map((b) => ({ ...b, progress: planning.budgetProgress(b, expenses) }));
  const goalRows = goals.map((g) => ({ ...g, progress: planning.goalProgress(g) }));
  const { start, end } = planningDates(req);
  const summary = planning.summarizeExpenses(expenses, start, end);
  const insights = settings.insightsEnabled ? {
    topCategory: summary.byCategory[0] || null,
    averagePerRecordedDay: summary.expenseCount ? Number((summary.total / Math.max(1, new Set(expenses.filter(e => planningDateIn(e.date, start, end)).map(e => String(e.date).slice(0,10))).size)).toFixed(2)) : 0,
    calculation: "Informational calculations from the user's logged NEXA expenses only."
  } : null;
  res.json({ budgets: progress, goals: goalRows, settings, summary, insights });
});

function planningDateIn(date, start, end) {
  const d = String(date || "").slice(0, 10);
  return d >= start && d <= end;
}

app.get("/api/planning/intelligence", auth.authMiddleware, (req, res) => {
  const settings = planningSettings(req.user.id);
  if (!settings.insightsEnabled) return res.json({ enabled: false, intelligence: null });
  const { start, end } = planningDates(req);
  const error = planning.validatePeriod(start, end);
  if (error) return res.status(400).json({ error });
  const expenses = db.prepare("SELECT id, amount, currency, category, date FROM expenses WHERE userId = ? ORDER BY date DESC, createdAt DESC").all(req.user.id);
  const budgets = db.prepare("SELECT * FROM financial_budgets WHERE userId = ? ORDER BY periodStart DESC, createdAt DESC").all(req.user.id).map(b => ({ ...b, active: !!b.active, progress: planning.budgetProgress(b, expenses) }));
  const goals = db.prepare("SELECT * FROM financial_goals WHERE userId = ? ORDER BY updatedAt DESC").all(req.user.id).map(g => ({ ...g, progress: planning.goalProgress(g) }));
  const result = intelligence.buildIntelligence(expenses, budgets, goals, start, end, new Date().toISOString().slice(0,10));
  res.json({ enabled: true, intelligence: result });
});

app.get("/api/planning/summary", auth.authMiddleware, (req, res) => {
  const { start, end } = planningDates(req);
  const error = planning.validatePeriod(start, end);
  if (error) return res.status(400).json({ error });
  const expenses = db.prepare("SELECT id, amount, currency, category, date FROM expenses WHERE userId = ? AND date >= ? AND date <= ? ORDER BY date DESC").all(req.user.id, start, end);
  const summary = planning.summarizeExpenses(expenses, start, end);
  const settings = planningSettings(req.user.id);
  res.json({ summary, insightsEnabled: settings.insightsEnabled, insights: settings.insightsEnabled ? { topCategories: summary.byCategory.slice(0, 5), calculation: "Top categories are ordered by the user's logged expense totals in the selected period." } : null });
});

app.get("/api/planning/savings-rules", auth.authMiddleware, (req, res) => {
  const rows=db.prepare(`SELECT r.*,g.name AS goalName,g.targetAmount,g.currentAmount,g.currency AS goalCurrency,g.targetDate,g.status AS goalStatus FROM financial_savings_rules r JOIN financial_goals g ON g.id=r.goalId WHERE r.userId=? ORDER BY r.updatedAt DESC`).all(req.user.id);
  res.json({ rules: rows.map(r => ({ ...r, active: !!r.active, plan: savingsAutomation.goalPlan(r, { amount: r.amount, cadence: r.cadence }) })) });
});
app.post("/api/planning/savings-rules", auth.authMiddleware, (req, res) => {
  try { const rule=savingsAutomation.normalizeRule(req.body||{}), goalId=String(req.body?.goalId||"").trim(), goal=db.prepare("SELECT * FROM financial_goals WHERE id=? AND userId=?").get(goalId,req.user.id); if(!goal)return res.status(404).json({error:"Goal not found."}); if(String(goal.currency).toUpperCase()!==rule.currency)return res.status(400).json({error:"Rule currency must match the goal currency."}); const id=genRowId("save_rule"),now=new Date().toISOString(); db.prepare("INSERT INTO financial_savings_rules(id,userId,goalId,amount,currency,cadence,active,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)").run(id,req.user.id,goalId,rule.amount,rule.currency,rule.cadence,rule.active?1:0,now,now); const row=db.prepare("SELECT * FROM financial_savings_rules WHERE id=? AND userId=?").get(id,req.user.id); res.status(201).json({rule:row,plan:savingsAutomation.goalPlan(goal,rule)}); } catch(e){res.status(400).json({error:e.message||"Invalid savings rule."});}
});
app.patch("/api/planning/savings-rules/:id", auth.authMiddleware, (req, res) => {
  const row=db.prepare("SELECT * FROM financial_savings_rules WHERE id=? AND userId=?").get(req.params.id,req.user.id); if(!row)return res.status(404).json({error:"Savings rule not found."});
  try { const rule=savingsAutomation.normalizeRule({amount:req.body?.amount===undefined?row.amount:req.body.amount,cadence:req.body?.cadence===undefined?row.cadence:req.body.cadence,currency:row.currency,active:req.body?.active===undefined?!!row.active:!!req.body.active}); const now=new Date().toISOString(); db.prepare("UPDATE financial_savings_rules SET amount=?,cadence=?,active=?,updatedAt=? WHERE id=? AND userId=?").run(rule.amount,rule.cadence,rule.active?1:0,now,row.id,req.user.id); const goal=db.prepare("SELECT * FROM financial_goals WHERE id=? AND userId=?").get(row.goalId,req.user.id); res.json({rule:db.prepare("SELECT * FROM financial_savings_rules WHERE id=?").get(row.id),plan:savingsAutomation.goalPlan(goal,rule)}); } catch(e){res.status(400).json({error:e.message||"Invalid savings rule."});}
});

app.post("/api/planning/budgets", auth.authMiddleware, (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  const amount = Number(b.amount);
  const periodStart = String(b.periodStart || "");
  const periodEnd = String(b.periodEnd || "");
  const periodError = planning.validatePeriod(periodStart, periodEnd);
  if (!name || name.length > 120) return res.status(400).json({ error: "name is required and must be at most 120 characters." });
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "amount must be greater than zero." });
  if (periodError) return res.status(400).json({ error: periodError });
  const id = genRowId("budget"); const now = new Date().toISOString();
  db.prepare("INSERT INTO financial_budgets (id,userId,name,amount,currency,category,periodStart,periodEnd,active,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, req.user.id, name, amount, String(b.currency || "NGN"), b.category ? String(b.category).trim() : null, periodStart, periodEnd, b.active === false ? 0 : 1, now, now);
  res.status(201).json({ budget: db.prepare("SELECT * FROM financial_budgets WHERE id = ? AND userId = ?").get(id, req.user.id) });
});

app.patch("/api/planning/budgets/:id", auth.authMiddleware, (req, res) => {
  const existing = db.prepare("SELECT * FROM financial_budgets WHERE id = ? AND userId = ?").get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: "Budget not found." });
  const b = req.body || {};
  const name = b.name === undefined ? existing.name : String(b.name).trim();
  const amount = b.amount === undefined ? existing.amount : Number(b.amount);
  const periodStart = b.periodStart === undefined ? existing.periodStart : String(b.periodStart);
  const periodEnd = b.periodEnd === undefined ? existing.periodEnd : String(b.periodEnd);
  const periodError = planning.validatePeriod(periodStart, periodEnd);
  if (!name || name.length > 120 || !Number.isFinite(amount) || amount <= 0 || periodError) return res.status(400).json({ error: periodError || "Invalid budget fields." });
  const now = new Date().toISOString();
  db.prepare("UPDATE financial_budgets SET name=?,amount=?,currency=?,category=?,periodStart=?,periodEnd=?,active=?,updatedAt=? WHERE id=? AND userId=?")
    .run(name, amount, b.currency === undefined ? existing.currency : String(b.currency), b.category === undefined ? existing.category : (b.category ? String(b.category).trim() : null), periodStart, periodEnd, b.active === undefined ? existing.active : (b.active ? 1 : 0), now, req.params.id, req.user.id);
  res.json({ budget: db.prepare("SELECT * FROM financial_budgets WHERE id = ? AND userId = ?").get(req.params.id, req.user.id) });
});

app.delete("/api/planning/budgets/:id", auth.authMiddleware, (req, res) => {
  const result = db.prepare("DELETE FROM financial_budgets WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Budget not found." });
  res.json({ ok: true });
});

app.get("/api/planning/goals/progress", auth.authMiddleware, (req, res) => {
  const goals=db.prepare("SELECT * FROM financial_goals WHERE userId=? ORDER BY updatedAt DESC").all(req.user.id);
  const history=db.prepare("SELECT id,goalId,amount,currency,recordedAt FROM financial_goal_contributions WHERE userId=? ORDER BY recordedAt DESC LIMIT 200").all(req.user.id);
  res.json({ goals: goals.map(savingsProgress.progress), contributionHistory: savingsProgress.contributionHistory(history) });
});

// V4.40 — milestone and contribution totals remain planning-only and never move funds.
app.get("/api/planning/goals/milestones", auth.authMiddleware, (req,res) => {
  const goals=db.prepare("SELECT * FROM financial_goals WHERE userId=? ORDER BY updatedAt DESC").all(req.user.id);
  const history=db.prepare("SELECT id,goalId,amount,currency,recordedAt FROM financial_goal_contributions WHERE userId=? ORDER BY recordedAt DESC LIMIT 500").all(req.user.id);
  res.json({goals:goals.map(g=>({...savingsMilestones.milestoneProgress(g),contributions:savingsMilestones.contributionTotals(history.filter(h=>h.goalId===g.id))}))});
});

// V4.42 — read-only savings planning insights derived from existing goal history.
// V4.47 — contribution forecast/history depth remains planning-only.
app.get("/api/planning/goals/forecast", auth.authMiddleware, (req,res) => {
  const goals=db.prepare("SELECT * FROM financial_goals WHERE userId=? ORDER BY updatedAt DESC").all(req.user.id);
  const history=db.prepare("SELECT id,goalId,amount,currency,recordedAt FROM financial_goal_contributions WHERE userId=? ORDER BY recordedAt DESC LIMIT 500").all(req.user.id);
  res.json({goals:goals.map(g=>({...savingsForecast.forecast(g,history.filter(h=>h.goalId===g.id)),trend:savingsForecast.trend(history.filter(h=>h.goalId===g.id))}))});
});

app.get("/api/planning/goals/insights", auth.authMiddleware, (req,res) => {
  const goals=db.prepare("SELECT * FROM financial_goals WHERE userId=? ORDER BY updatedAt DESC").all(req.user.id);
  const history=db.prepare("SELECT id,goalId,amount,currency,recordedAt FROM financial_goal_contributions WHERE userId=? ORDER BY recordedAt DESC LIMIT 500").all(req.user.id);
  res.json({portfolio:savingsInsights.portfolioSummary(goals),goals:goals.map(g=>savingsInsights.goalInsight(g,history.filter(h=>h.goalId===g.id)))});
});

app.post("/api/planning/goals", auth.authMiddleware, (req, res) => {
  const g = req.body || {};
  const name = String(g.name || "").trim(); const target = Number(g.targetAmount); const current = g.currentAmount === undefined ? 0 : Number(g.currentAmount);
  if (!name || name.length > 120) return res.status(400).json({ error: "name is required and must be at most 120 characters." });
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(current) || current < 0) return res.status(400).json({ error: "targetAmount must be greater than zero and currentAmount cannot be negative." });
  const id = genRowId("goal"); const now = new Date().toISOString();
  db.prepare("INSERT INTO financial_goals (id,userId,name,targetAmount,currentAmount,currency,targetDate,note,status,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, req.user.id, name, target, current, String(g.currency || "NGN"), g.targetDate ? String(g.targetDate) : null, g.note ? String(g.note).slice(0, 500) : "", g.status === "completed" ? "completed" : "active", now, now);
  res.status(201).json({ goal: db.prepare("SELECT * FROM financial_goals WHERE id = ? AND userId = ?").get(id, req.user.id) });
});

app.patch("/api/planning/goals/:id", auth.authMiddleware, (req, res) => {
  const existing = db.prepare("SELECT * FROM financial_goals WHERE id = ? AND userId = ?").get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: "Goal not found." });
  const g = req.body || {};
  const name = g.name === undefined ? existing.name : String(g.name).trim(); const target = g.targetAmount === undefined ? existing.targetAmount : Number(g.targetAmount); const current = g.currentAmount === undefined ? existing.currentAmount : Number(g.currentAmount);
  if (!name || name.length > 120 || !Number.isFinite(target) || target <= 0 || !Number.isFinite(current) || current < 0) return res.status(400).json({ error: "Invalid goal fields." });
  const now = new Date().toISOString();
  db.prepare("UPDATE financial_goals SET name=?,targetAmount=?,currentAmount=?,currency=?,targetDate=?,note=?,status=?,updatedAt=? WHERE id=? AND userId=?")
    .run(name, target, current, g.currency === undefined ? existing.currency : String(g.currency), g.targetDate === undefined ? existing.targetDate : (g.targetDate ? String(g.targetDate) : null), g.note === undefined ? existing.note : String(g.note).slice(0, 500), g.status === undefined ? existing.status : (String(g.status) === "completed" ? "completed" : "active"), now, req.params.id, req.user.id);
  res.json({ goal: db.prepare("SELECT * FROM financial_goals WHERE id = ? AND userId = ?").get(req.params.id, req.user.id) });
});

app.delete("/api/planning/goals/:id", auth.authMiddleware, (req, res) => {
  const result = db.prepare("DELETE FROM financial_goals WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Goal not found." });
  res.json({ ok: true });
});

app.get("/api/planning/settings", auth.authMiddleware, (req, res) => res.json({ settings: planningSettings(req.user.id) }));
app.patch("/api/planning/settings", auth.authMiddleware, (req, res) => {
  const enabled = req.body?.insightsEnabled !== false;
  const now = new Date().toISOString();
  db.prepare("INSERT INTO financial_planning_settings (userId,insightsEnabled,updatedAt) VALUES (?,?,?) ON CONFLICT(userId) DO UPDATE SET insightsEnabled=excluded.insightsEnabled, updatedAt=excluded.updatedAt").run(req.user.id, enabled ? 1 : 0, now);
  res.json({ settings: planningSettings(req.user.id) });
});

// -- Favorites (whole-list sync — simplest correct approach given the client
//    already keeps the full list in memory and mutates it as one unit) --
app.get("/api/favorites", auth.authMiddleware, (req, res) => {
  const rows = db
    .prepare("SELECT data FROM favorites WHERE userId = ? ORDER BY updatedAt DESC")
    .all(req.user.id);
  res.json({ favorites: rows.map((r) => JSON.parse(r.data)) });
});

app.post("/api/favorites", auth.authMiddleware, (req, res) => {
  const list = Array.isArray(req.body?.favorites) ? req.body.favorites : [];
  const now = new Date().toISOString();
  const tx = db.transaction((items) => {
    db.prepare("DELETE FROM favorites WHERE userId = ?").run(req.user.id);
    const insert = db.prepare("INSERT INTO favorites (id, userId, data, updatedAt) VALUES (?,?,?,?)");
    for (const item of items) {
      if (item && item.id) insert.run(String(item.id), req.user.id, JSON.stringify(item), now);
    }
  });
  tx(list);
  res.json({ ok: true, count: list.length });
});

// -- One-time bulk import from a phone's local storage, called once right
//    after first login. INSERT OR IGNORE so re-running it is harmless. --
app.post("/api/migrate", auth.authMiddleware, (req, res) => {
  const { expenses = [], debts = [], favorites = [] } = req.body || {};
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    const insE = db.prepare(
      "INSERT OR IGNORE INTO expenses (id,userId,amount,currency,category,date,note,createdAt) VALUES (?,?,?,?,?,?,?,?)"
    );
    for (const e of expenses) {
      insE.run(e.id || genRowId("e"), req.user.id, Number(e.amount), e.currency || "NGN", e.category || "other", e.date, e.note || "", e.createdAt || now);
    }
    const insD = db.prepare(
      "INSERT OR IGNORE INTO debts (id,userId,direction,person,amount,currency,note,dueDate,settled,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)"
    );
    for (const d of debts) {
      insD.run(d.id || genRowId("d"), req.user.id, d.direction === "i_owe" ? "i_owe" : "owed_to_me", d.person, Number(d.amount), d.currency || "NGN", d.note || "", d.dueDate || null, d.settled ? 1 : 0, d.createdAt || now);
    }
    if (favorites.length) {
      const existing = db.prepare("SELECT id FROM favorites WHERE userId = ?").all(req.user.id).map((r) => r.id);
      const insF = db.prepare("INSERT INTO favorites (id, userId, data, updatedAt) VALUES (?,?,?,?)");
      for (const f of favorites) {
        if (f && f.id && !existing.includes(String(f.id))) insF.run(String(f.id), req.user.id, JSON.stringify(f), now);
      }
    }
  });
  tx();
  res.json({ ok: true, migrated: { expenses: expenses.length, debts: debts.length, favorites: favorites.length } });
});

/* ============================================================
   Mall — vendor catalog & customer shopping (V3.3)
   ============================================================ */

const MALL_CATEGORIES = ["electronics", "phones & tablets", "computers", "fashion", "jewelry & accessories", "beauty", "home & living", "groceries", "health & wellness", "baby & kids", "sports & fitness", "automotive", "books & media", "services", "other"];
const CATEGORY_PLACEHOLDER = {
  electronics: { emoji: "🔌", color: "#1a2332" },
  "phones & tablets": { emoji: "📱", color: "#1d2430" },
  computers: { emoji: "💻", color: "#20252d" },
  fashion: { emoji: "👗", color: "#2a1a30" },
  "jewelry & accessories": { emoji: "💍", color: "#302717" },
  beauty: { emoji: "💄", color: "#301a24" },
  "home & living": { emoji: "🏠", color: "#1a2a22" },
  groceries: { emoji: "🛒", color: "#2a2416" },
  "health & wellness": { emoji: "🧘", color: "#182a26" },
  "baby & kids": { emoji: "🧸", color: "#2b2020" },
  "sports & fitness": { emoji: "🏋️", color: "#20281c" },
  automotive: { emoji: "🚗", color: "#25221d" },
  "books & media": { emoji: "📚", color: "#25202a" },
  services: { emoji: "🛠️", color: "#242424" },
  other: { emoji: "📦", color: "#1c2128" },
};

// Product photos are stored as data URLs but never sent inside list responses:
// clients get a small, cacheable URL and fetch the bytes separately.
const MAX_IMAGE_BYTES = 400 * 1024;
const IMAGE_DATA_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
// V3.8: every product also carries its own rating and its seller's rating (null when there are no reviews yet).
const RATING_COLS = `(SELECT ROUND(AVG(r.rating), 1) FROM mall_reviews r WHERE r.productId = p.id AND r.moderationStatus = 'published') AS ratingAvg,
  (SELECT COUNT(*) FROM mall_reviews r WHERE r.productId = p.id AND r.moderationStatus = 'published') AS ratingCount,
  (SELECT ROUND(AVG(r.rating), 1) FROM mall_reviews r WHERE r.vendorId = p.vendorId AND r.moderationStatus = 'published') AS vendorRatingAvg,
  (SELECT COUNT(*) FROM mall_reviews r WHERE r.vendorId = p.vendorId AND r.moderationStatus = 'published') AS vendorRatingCount,
  (SELECT CASE WHEN COALESCE(v.status,'active') = 'active' THEN 1 ELSE 0 END FROM vendors v WHERE v.id = p.vendorId) AS vendorActive,
  (SELECT COALESCE(SUM(oi.quantity), 0) FROM mall_order_items oi WHERE oi.productId = p.id AND oi.status NOT IN ('cancelled','refunded')) AS soldCount`;
function sellerTrustBadge({ active, ratingAvg, ratingCount }) {
  const isActive = active === true || Number(active) === 1 || active === 'active';
  const count = Number(ratingCount || 0);
  const avg = ratingAvg == null ? null : Number(ratingAvg);
  return isActive && count >= 5 && avg != null && Number.isFinite(avg) && avg >= 4 ? 'reviewed_seller' : null;
}

const PRODUCT_COLS = `p.id, p.vendorId, p.name, p.description, p.price, p.weightKg, p.salePrice, p.saleEndsAt, p.currency, p.category, p.stock,
  p.imageEmoji, p.imageColor, p.active, p.imageRev, p.createdAt, p.updatedAt, (p.imageUrl IS NOT NULL) AS hasImage,
  (SELECT COUNT(*) FROM mall_product_images gi WHERE gi.productId = p.id) AS extraImageCount,
  (SELECT COUNT(*) FROM mall_product_variants mv WHERE mv.productId = p.id) AS variantCount,
  ${RATING_COLS}`;
const MAX_EXTRA_IMAGES = 5; // + the cover photo = 6 photos per product
const vendorProductAiLimiter = rateLimit({ windowMs: 60 * 1000, max: 3, keyFn: (req) => (req.user && req.user.id) || req.ip, message: "Too many product-image beautification requests. Please wait a moment." });
const vendorProductAiDailyLimiter = rateLimit({ windowMs: 24 * 60 * 60 * 1000, max: 20, persistent: true, scope: "vendor-product-image-ai", keyFn: (req) => (req.user && req.user.id) || req.ip, message: "You have reached today's product-image beautification limit. Please try again tomorrow." });

class ValidationError extends Error {}

// Reviews, seller ratings and product alerts (V3.8) live in social.js.
const { createSocial, AUTO_CONFIRM_DAYS } = require("./social");
const productWeight = require("./productWeight");
const productPrice = require("./productPrice");
const marketplaceReviewLimiter = rateLimit({ windowMs: 60 * 1000, max: 12, persistent: true, scope: "marketplace-review", keyFn: (req) => (req.user && req.user.id) || req.ip, message: "You’re sending review requests very quickly. Please wait a moment." });
const social = createSocial({ db, auth, sendPush, genRowId, toClientProduct, PRODUCT_COLS, effectivePrice, reviewLimiter: marketplaceReviewLimiter });

const { createDisputes } = require("./disputes");
const disputes = createDisputes({ db, auth, sendPush, genRowId });

// Shared money ledgers: split / pot / ajo groups (V3.14) live in groups.js.
const { createGroups } = require("./groups");
const groups = createGroups({
  db, auth, sendPush, genRowId,
  joinLimiter: rateLimit({ // invite codes are short, so slow down anyone guessing them
    windowMs: 15 * 60 * 1000, max: 20,
    keyFn: (req) => (req.user && req.user.id) || req.ip,
    message: "Too many attempts. Please wait a few minutes and try again.",
  }),
});

// Vendor staff accounts (V3.15): a reduced dashboard for people a vendor invites to help run
// the shop. requireVendorAccess below is the staff-aware sibling of requireVendor — swap it in
// on routes staff should reach; leave requireVendor as-is on owner-only routes (profile, staff
// management, summary/incomes).
const { createStaff } = require("./staff");
const staff = createStaff({
  db, auth, sendPush, genRowId,
  isVendorActive: (vendorId) => vendorSubscriptions.isVendorActive(db, vendorId),
  joinLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, max: 20,
    keyFn: (req) => (req.user && req.user.id) || req.ip,
    message: "Too many attempts. Please wait a few minutes and try again.",
  }),
});
const requireVendorAccess = staff.requireVendorAccess;

// Staff Link registry routes (M7769-M7777). Only the vendor-owner boss is wired so far; Director, CEO
// and Founder authority resolve to null (fail closed) until the Admin/Central bridges (M7785/M7786).
// The staff door reads sessions.twoFactorVerifiedAt (auth.markSessionTwoFactorVerified sets it). Nothing in the live sign-in calls the setter yet, so the door still refuses everyone until Zeeza 2FA is wired to it.
const { createStaffLinks } = require("./staffLinks");
const { createStaffLinkRoutes } = require("./staffLinkRoutes");
const staffLinks = createStaffLinks(db);
const { createStaffManagers } = require("./staffManagers");
const staffManagers = createStaffManagers(db, staffLinks);
const { createStaffDirectors } = require("./staffDirector");
const staffDirectors = createStaffDirectors(db);
createStaffLinkRoutes({
  links: staffLinks, A: auth.authMiddleware,
  // Vendor owner first (unchanged). Otherwise an appointed, not-suspended Manager. Anyone else resolves to null (fail closed).
  resolveActor: (req) => {
    const v = staff.getVendorForUser(req.user.id);
    if (v) return { id: req.user.id, tier: "vendor", bossId: v.id, cap: ["products", "orders", "uploads", "stock", "sales_view"] };
    const m = staffManagers.managerFor(req.user.id);
    return m ? { id: m.id, tier: "manager" } : null;
  },
  requestManagerStaff: (actor, input) => staffManagers.requestStaff(actor, input),
  // Director approval: an active Administrative Director grant for NEXA (Central-signed, stored by Admin AAMI access). Nobody else resolves.
  resolveApprover: (req) => staffDirectors.directorFor(req.user && req.user.id),
  userExists: (id) => !!db.prepare("SELECT 1 FROM users WHERE id = ?").get(id),
  isTwoFactorVerified: (req) => !!(req.user && req.user.twoFactorVerified === true),
  limiter: [rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyFn: (req) => (req.user && req.user.id) || req.ip, message: "Too many attempts. Please wait a few minutes and try again." })],
}).register(app);

// Social layer (V3.17): usernames, friends, blocking, DMs and rooms. friends.js has no
// dependency on chat.js; chat.js depends on friends.js (isBlocked/areFriends/publicUser) so a DM
// thread and a room's member list can show the same "First L." identity everywhere else uses.
const { createFriends } = require("./friends");
const friends = createFriends({
  db, auth, sendPush, genRowId,
  actionLimiter: rateLimit({ // username changes / friend requests: slow down enumeration attempts
    windowMs: 15 * 60 * 1000, max: 30,
    keyFn: (req) => (req.user && req.user.id) || req.ip,
    message: "Too many attempts. Please wait a few minutes and try again.",
  }),
});
const { createZeezaMessaging } = require("./zeezaMessaging");
const { createCallSignaling } = require("./callSignaling");
const zeezaMessaging = createZeezaMessaging({
  db, auth, sendPush, genRowId, friends,
  audioUpload: upload,
  messageLimiter: rateLimit({ // basic spam guard on sending messages / creating rooms
    windowMs: 60 * 1000, max: 30,
    keyFn: (req) => (req.user && req.user.id) || req.ip,
    message: "You're sending messages too fast. Slow down a little.",
  }),
});

function decodeImageDataUrl(v) {
  if (typeof v !== "string" || v.length > Math.ceil(MAX_IMAGE_BYTES * 1.4) + 64) throw new ValidationError("That photo is too large. Try a smaller one.");
  const m = IMAGE_DATA_RE.exec(v);
  if (!m) throw new ValidationError("Photo must be a JPEG, PNG or WebP image.");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_IMAGE_BYTES) throw new ValidationError("That photo is too large. Try a smaller one.");
  const b = buf;
  const okMagic =
    (m[1] === "image/jpeg" && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||
    (m[1] === "image/png" && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) ||
    (m[1] === "image/webp" && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP");
  if (!okMagic) throw new ValidationError("That file doesn't look like a valid image.");
  return { mime: m[1], buf };
}

// Discounts (V3.13): salePrice/saleEndsAt live on the row untouched; this is the one place that
// decides what a sale is actually worth right now. Called on every read (product list, detail,
// checkout, the watch-alert price-drop check in social.js) — never written back, so an expired
// sale just quietly stops applying without needing a cron to clean it up.
function effectivePrice(row, nowMs = Date.now()) {
  return row.salePrice != null && row.saleEndsAt && Date.parse(row.saleEndsAt) > nowMs ? row.salePrice : row.price;
}

// Turns a DB row into what clients see: no blob, just a versioned image URL, and the sale price
// (if any) swapped in as `price` so every screen that already renders `product.price` shows the
// right number with no changes of its own. `regularPrice` and `saleEndsAt` are only present while
// a sale is actually active, so existing UI that doesn't know about sales still renders correctly.
function toClientProduct(row) {
  if (!row) return row;
  const { hasImage, imageRev, salePrice, saleEndsAt, price, extraImageCount, variantCount, vendorActive, vendorRatingAvg, vendorRatingCount, ...rest } = row;
  const sellerBadge = sellerTrustBadge({ active: vendorActive, ratingAvg: vendorRatingAvg, ratingCount: vendorRatingCount });
  const onSale = salePrice != null && saleEndsAt && Date.parse(saleEndsAt) > Date.now();
  return {
    ...rest,
    vendorRatingAvg: vendorRatingAvg == null ? null : Number(vendorRatingAvg),
    vendorRatingCount: Number(vendorRatingCount || 0),
    sellerBadge,
    price: onSale ? salePrice : price,
    ...(onSale ? { regularPrice: price, saleEndsAt } : {}),
    imageUrl: hasImage ? `/api/mall/products/${row.id}/image?v=${imageRev}` : null,
    // Gallery: cover first, then extras. Only present when a product actually has extra photos,
    // so single-photo products keep exactly the response shape they always had.
    // Size/colour options: lists only carry the flag (so a card sends the shopper to the product page
    // to choose); the full option list is attached by withVariants() on single-product responses.
    ...(Number(variantCount) > 0 ? { hasVariants: true } : {}),
    ...(Number(extraImageCount) > 0 ? {
      imageUrls: [
        ...(hasImage ? [`/api/mall/products/${row.id}/image?v=${imageRev}`] : []),
        ...Array.from({ length: Number(extraImageCount) }, (_, n) => `/api/mall/products/${row.id}/images/${n}?v=${imageRev}`),
      ],
    } : {}),
  };
}

function withVariants(product) {
  if (product && product.hasVariants) product.variants = productStock.variantsOf(db, product.id);
  return product;
}

function getProductForClient(id) {
  return withVariants(toClientProduct(db.prepare(`SELECT ${PRODUCT_COLS} FROM mall_products p WHERE p.id = ?`).get(id)));
}

// Validates a create/update body. `existing` is the current row on update.
function readProductFields(body, existing) {
  const p = body || {};
  const out = {};
  const creating = !existing;

  if (creating || p.name !== undefined) {
    const name = String(p.name ?? "").trim();
    if (!name) throw new ValidationError("A product name is required.");
    if (name.length > 120) throw new ValidationError("Product name is too long (120 characters max).");
    out.name = name;
  }
  if (p.description !== undefined && p.description !== null) {
    const d = String(p.description).trim();
    if (d.length > 2000) throw new ValidationError("Description is too long (2000 characters max).");
    out.description = d;
  }
  if (creating || p.price !== undefined) {
    const price = Number(p.price);
    if (p.price === null || p.price === "" || !Number.isFinite(price) || price < 0 || price > 1e9) {
      throw new ValidationError("Enter a valid price.");
    }
    out.price = price;
  }
  if (creating || p.weightKg !== undefined) {
    const parsedWeight = productWeight.parseWeightKg(p.weightKg, { required: creating });
    if (!parsedWeight.ok) throw new ValidationError(parsedWeight.error);
    if (parsedWeight.value !== null) out.weightKg = parsedWeight.value;
  }
  if (p.currency !== undefined) {
    const c = String(p.currency).toUpperCase();
    if (!/^[A-Z]{3}$/.test(c)) throw new ValidationError("Currency must be a 3-letter code like NGN.");
    out.currency = c;
  }
  // Discounts (V3.13): salePrice and saleEndsAt are set or cleared together — a sale price with no
  // end date isn't the feature, and an end date with no sale price is meaningless. Pass both as null
  // to end a sale early.
  if (p.salePrice !== undefined || p.saleEndsAt !== undefined) {
    if (p.salePrice === null && p.saleEndsAt === null) {
      out.salePrice = null;
      out.saleEndsAt = null;
    } else {
      const salePrice = Number(p.salePrice);
      const regularPrice = out.price ?? existing?.price;
      if (!Number.isFinite(salePrice) || salePrice <= 0) throw new ValidationError("Enter a valid sale price.");
      if (regularPrice == null || salePrice >= regularPrice) throw new ValidationError("Sale price must be less than the regular price.");
      const endsAt = p.saleEndsAt ? new Date(p.saleEndsAt) : null;
      if (!endsAt || Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now()) {
        throw new ValidationError("Choose a sale end date in the future.");
      }
      out.salePrice = salePrice;
      out.saleEndsAt = endsAt.toISOString();
    }
  }
  if (p.stock !== undefined) {
    const stock = Number(p.stock);
    if (!Number.isInteger(stock) || stock < 0 || stock > 100000) throw new ValidationError("Stock must be a whole number from 0 to 100,000.");
    out.stock = stock;
  }
  if (p.imageUrl !== undefined) {
    if (p.imageUrl === null || p.imageUrl === "") out.imageUrl = null;
    else { decodeImageDataUrl(p.imageUrl); out.imageUrl = p.imageUrl; }
  }
  if (p.category !== undefined) out.category = MALL_CATEGORIES.includes(p.category) ? p.category : (existing?.category || "other");
  // Currency precision is an integrity boundary: reject fractional minor units instead of
  // silently rounding a seller price into a different checkout/payment amount.
  const priceCurrency = out.currency ?? existing?.currency ?? "NGN";
  if (creating || p.price !== undefined || p.currency !== undefined) {
    const priceCandidate = out.price ?? existing?.price;
    const checked = productPrice.validateProductPrice(priceCandidate, priceCurrency, { allowZero: true });
    if (!checked.ok) throw new ValidationError(checked.error);
    if (out.price !== undefined) out.price = checked.amount;
  }
  if ((p.salePrice !== undefined || p.currency !== undefined) && (out.salePrice ?? existing?.salePrice) != null) {
    const saleCandidate = out.salePrice ?? existing?.salePrice;
    const checkedSale = productPrice.validateProductPrice(saleCandidate, priceCurrency, { allowZero: false });
    if (!checkedSale.ok) throw new ValidationError(checkedSale.error);
    if (out.salePrice !== undefined) out.salePrice = checkedSale.amount;
  }
  if (p.active !== undefined && p.active !== null) out.active = p.active ? 1 : 0;
  return out;
}

function getVendorForUser(userId) {
  return db.prepare("SELECT * FROM vendors WHERE userId = ?").get(userId);
}

function requireVendor(req, res, next) {
  const vendor = getVendorForUser(req.user.id);
  if (!vendor) return res.status(403).json({ error: "No vendor profile for this account yet." });
  const entitlement = vendorSubscriptions.vendorEntitlement(db, vendor.id);
  if (!entitlement.active) return res.status(403).json({ error: "This vendor subscription is not active. Renew to continue managing the shop.", code: entitlement.source });
  req.vendor = vendor;
  next();
}

// -- Vendor profile & subscription lifecycle --
app.get("/api/mall/vendor/me", auth.authMiddleware, (req, res) => {
  const vendor = getVendorForUser(req.user.id);
  res.json({ vendor: vendor ? vendorSubscriptions.getVendorState(db, vendor.id) : null, offer: vendorSubscriptions.publicConstants() });
});

app.get("/api/mall/vendor/subscription", auth.authMiddleware, (req, res) => {
  const vendor = getVendorForUser(req.user.id);
  if (!vendor) return res.status(404).json({ error: "No vendor profile for this account yet." });
  res.json(vendorSubscriptions.getVendorState(db, vendor.id));
});

async function startVendorPayment(req, res, payment) {
  if (!payments.isEnabled()) return res.status(409).json({ error: "Online vendor payment is not enabled yet." });
  if (String(req.user?.email || "").trim() === "") return res.status(400).json({ error: "A customer email is required for vendor payment." });
  const reference = String(payment.reference);
  try {
    const pay = await payments.initialize({
      email: String(req.user.email),
      amountMinor: Number(payment.amountMinor),
      currency: "NGN",
      reference,
      metadata: { vendorId: payment.vendorId, userId: req.user.id, vendorSubscriptionPaymentId: payment.id, kind: payment.kind },
    });
    const saved = vendorSubscriptions.updatePaymentInitialization(db, reference, pay, "PENDING");
    return res.status(201).json({ payment: saved ? { ...saved, amount: Number(saved.amountMinor) / 100, authorization_url: saved.authorizationUrl || null } : pay, vendor: vendorSubscriptions.getVendorState(db, payment.vendorId) });
  } catch (e) {
    vendorSubscriptions.updatePaymentInitialization(db, reference, null, "FAILED");
    return res.status(502).json({ error: "The vendor payment page could not be started. Try again." });
  }
}

app.post("/api/mall/vendor/register", auth.authMiddleware, async (req, res) => {
  const shopName = String(req.body?.shopName || "").trim();
  const bio = req.body?.bio ? String(req.body.bio).trim() : null;
  if (!shopName) return res.status(400).json({ error: "Shop name is required." });

  const existing = getVendorForUser(req.user.id);
  if (existing) {
    db.prepare("UPDATE vendors SET shopName = ?, bio = ? WHERE id = ?").run(shopName, bio, existing.id);
    const before = vendorSubscriptions.getVendorState(db, existing.id);
    if (before?.platforms && before.platforms.shop === false) {
      // Shop added after sign-up (YouTube-only account). Launch benefits are decided once at sign-up, so this is a paid entry only.
      if (!payments.isEnabled()) return res.status(409).json({ error: "Adding a shop after sign-up needs a verified ₦30,000 payment, and online payment is not enabled yet." });
      const kinds = String(existing.businessType || "").split(",").map((x) => x.trim()).filter(Boolean);
      if (!kinds.includes("marketplace")) kinds.unshift("marketplace");
      db.prepare("UPDATE vendors SET businessType = ?, status = 'pending_payment' WHERE id = ?").run(kinds.join(","), existing.id);
      const added = vendorSubscriptions.createPaymentForVendor(db, { vendorId: existing.id, userId: req.user.id, kind: vendorSubscriptions.PERIOD_TYPES.PAID_ENTRY });
      return startVendorPayment(req, res, added.payment || added);
    }
    const state = vendorSubscriptions.getVendorState(db, existing.id);
    const pending = state?.pendingPayment;
    return res.json({ vendor: state, existing: true, payment: pending ? { ...pending, amount: pending.amount } : null });
  }

  const free = vendorSubscriptions.createFreeVendor(db, { userId: req.user.id, shopName, bio });
  if (free.existing) {
    const state = vendorSubscriptions.getVendorState(db, free.vendorId);
    return res.json({ vendor: state, existing: true });
  }
  if (free.allocated) {
    return res.status(201).json({ vendor: vendorSubscriptions.getVendorState(db, free.vendorId), launchOffer: { free: true, days: 30 } });
  }

  if (!payments.isEnabled()) return res.status(409).json({ error: "The launch offer is full. A ₦30,000 verified payment is required before your vendor account can be activated." });
  const pending = vendorSubscriptions.createPendingVendor(db, { userId: req.user.id, shopName, bio, kind: vendorSubscriptions.PERIOD_TYPES.PAID_ENTRY });
  return startVendorPayment(req, res, { id: pending.paymentId, vendorId: pending.vendorId, userId: req.user.id, reference: pending.reference, amountMinor: pending.amountMinor, kind: pending.kind });
});

app.post("/api/mall/vendor/subscription/entry/payment", auth.authMiddleware, async (req, res) => {
  const vendor = getVendorForUser(req.user.id);
  if (!vendor) return res.status(404).json({ error: "No vendor profile for this account yet." });
  const state = vendorSubscriptions.getVendorState(db, vendor.id);
  if (state?.subscription?.status === "ACTIVE" || state?.vendor?.status === "active") return res.status(409).json({ error: "This vendor account is already active." });
  const pending = vendorSubscriptions.createPaymentForVendor(db, { vendorId: vendor.id, userId: req.user.id, kind: vendorSubscriptions.PERIOD_TYPES.PAID_ENTRY });
  return startVendorPayment(req, res, pending.payment || pending);
});

app.post("/api/mall/vendor/subscription/renew", auth.authMiddleware, async (req, res) => {
  const vendor = getVendorForUser(req.user.id);
  if (!vendor) return res.status(404).json({ error: "No vendor profile for this account yet." });
  const pending = vendorSubscriptions.createPaymentForVendor(db, { vendorId: vendor.id, userId: req.user.id, kind: vendorSubscriptions.PERIOD_TYPES.RENEWAL });
  return startVendorPayment(req, res, pending.payment || pending);
});

app.post("/api/mall/vendor/subscription/payment/retry", auth.authMiddleware, async (req, res) => {
  const vendor = getVendorForUser(req.user.id);
  if (!vendor) return res.status(404).json({ error: "No vendor profile for this account yet." });
  const state = vendorSubscriptions.getVendorState(db, vendor.id);
  if (state?.subscription?.status === "ACTIVE") return res.status(409).json({ error: "This vendor subscription is already active." });
  const pending = vendorSubscriptions.retryPayment(db, { vendorId: vendor.id, userId: req.user.id });
  return startVendorPayment(req, res, pending.payment || pending);
});

app.post("/api/mall/vendor/subscription/payment/verify", auth.authMiddleware, async (req, res) => {
  const reference = String(req.body?.reference || "").trim();
  if (!reference) return res.status(400).json({ error: "Payment reference is required." });
  const payment = db.prepare("SELECT * FROM vendor_subscription_payments WHERE reference=? AND userId=?").get(reference, req.user.id);
  if (!payment) return res.status(404).json({ error: "Vendor payment not found." });
  if (payment.status === vendorSubscriptions.PAYMENT_STATUSES.VERIFIED) {
    return res.json({ verified: true, status: "success", idempotent: true, vendor: vendorSubscriptions.getVendorState(db, payment.vendorId) });
  }
  if (payment.status !== vendorSubscriptions.PAYMENT_STATUSES.PENDING) return res.status(409).json({ verified: false, status: payment.status.toLowerCase(), error: "This vendor payment is no longer pending." });
  try {
    const result = await payments.verify(reference);
    const ok = vendorSubscriptions.assertServerAmount(result, Number(payment.amountMinor), reference);
    if (!ok) {
      const providerStatus = String(result?.status || "unknown").toLowerCase();
      if (["failed", "abandoned", "cancelled"].includes(providerStatus)) db.prepare("UPDATE vendor_subscription_payments SET status='FAILED',updatedAt=? WHERE id=? AND status='PENDING'").run(new Date().toISOString(), payment.id);
      return res.json({ verified: false, status: providerStatus, vendor: vendorSubscriptions.getVendorState(db, payment.vendorId) });
    }
    const activated = vendorSubscriptions.activateVerifiedPayment(db, payment);
    if (!activated.alreadyVerified) {
      await sendPush(payment.userId, "Vendor payment confirmed", `Your NEXA vendor access is active for 30 days.`, { screen: "mall_vendor", type: "marketplace", vendorId: payment.vendorId, dedupeKey: `vendor-subscription-activated:${payment.reference}` });
    }
    return res.json({ verified: true, status: "success", vendor: vendorSubscriptions.getVendorState(db, payment.vendorId) });
  } catch (e) {
    return res.status(502).json({ error: "Could not verify the vendor payment right now." });
  }
});


app.get("/api/mall/admin/vendor-subscriptions/launch-offer", auth.authMiddleware, (req,res) => {
  if (!adminAccess.allowRoute(req, "mall", isConfiguredAdmin(req.user))) return res.status(403).json({error:"Administrator access required."});
  const summary = vendorSubscriptions.launchOfferSummary(db);
  res.json({ generatedAt:new Date().toISOString(), ...summary });
});

app.get("/api/mall/vendor/subscription/history", auth.authMiddleware, (req, res) => {
  const vendor = getVendorForUser(req.user.id);
  if (!vendor) return res.status(404).json({ error: "No vendor profile for this account yet." });
  const history = vendorSubscriptions.history(db, req.user.id, vendor.id);
  res.json({ history });
});

// -- Public catalog (no auth — anyone shopping in the main app) --
app.get("/api/mall/products", rateLimit({ windowMs: 60_000, max: 120, keyFn: (req) => req.ip, message: "Too many catalog searches. Please try again shortly." }), (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const { category, cursor } = req.query || {};
  const q = req.query?.q ? String(req.query.q).trim().slice(0, 100) : "";
  const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 20, 1), 50);
  const vendorIdFilter = req.query?.vendorId ? String(req.query.vendorId).slice(0, 80) : "";
  const sort = String(req.query?.sort || "newest");
  if (!new Set(["newest", "price_asc", "price_desc"]).has(sort)) return res.status(400).json({ error: "Invalid sort order." });
  const minPrice = req.query?.minPrice === undefined ? null : Number(req.query.minPrice);
  const maxPrice = req.query?.maxPrice === undefined ? null : Number(req.query.maxPrice);
  const priceCurrencyRaw = String(req.query?.currency || "").trim();
  let priceCurrency = null;
  if (priceCurrencyRaw) {
    try { priceCurrency = currencyModel.normalizeCurrency(priceCurrencyRaw); }
    catch (_) { return res.status(400).json({ error: "Choose a supported currency for price filtering." }); }
  }
  if ((minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0)) || (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0)) || (minPrice !== null && maxPrice !== null && minPrice > maxPrice)) return res.status(400).json({ error: "Invalid price range." });
  if ((minPrice !== null || maxPrice !== null || sort !== "newest") && !priceCurrency) return res.status(400).json({ error: "A currency is required before filtering or sorting by price." });
  let sql = `SELECT ${PRODUCT_COLS}, v.shopName as vendorName FROM mall_products p JOIN vendors v ON v.id = p.vendorId WHERE p.active = 1 AND COALESCE(v.status, 'active') = 'active'`;
  const args = [];
  if (vendorIdFilter) { sql += " AND p.vendorId = ?"; args.push(vendorIdFilter); }
  if (priceCurrency) { sql += " AND UPPER(COALESCE(p.currency, '')) = ?"; args.push(priceCurrency); }
  // Storefront filters (V5.99): all server-side so cursor pagination stays correct.
  if (String(req.query?.onSale || "") === "1") { sql += " AND p.salePrice IS NOT NULL AND p.saleEndsAt IS NOT NULL AND p.saleEndsAt > ?"; args.push(new Date().toISOString()); }
  if (String(req.query?.inStock || "") === "1") sql += " AND p.stock > 0";
  if (req.query?.minRating !== undefined) {
    const minRating = Number(req.query.minRating);
    if (!Number.isFinite(minRating) || minRating < 1 || minRating > 5) return res.status(400).json({ error: "Invalid rating filter." });
    sql += " AND (SELECT AVG(r.rating) FROM mall_reviews r WHERE r.productId = p.id AND r.moderationStatus = 'published') >= ?"; args.push(minRating);
  }
  if (req.query?.ids !== undefined) {
    const ids = String(req.query.ids).split(",").map((x) => x.trim()).filter(Boolean).slice(0, 50);
    if (!ids.length || ids.some((x) => x.length > 80)) return res.status(400).json({ error: "Invalid product list." });
    sql += ` AND p.id IN (${ids.map(() => "?").join(",")})`; args.push(...ids);
  }
  if (category) {
    if (!MALL_CATEGORIES.includes(String(category))) return res.status(400).json({ error: "Invalid category." });
    sql += " AND p.category = ?"; args.push(category);
  }
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    sql += " AND (p.name LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\')"; args.push(like, like);
  }
  if (minPrice !== null) { sql += " AND COALESCE(p.salePrice, p.price) >= ?"; args.push(minPrice); }
  if (maxPrice !== null) { sql += " AND COALESCE(p.salePrice, p.price) <= ?"; args.push(maxPrice); }
  const order = sort === "price_asc" ? "COALESCE(p.salePrice,p.price) ASC, p.id ASC" : sort === "price_desc" ? "COALESCE(p.salePrice,p.price) DESC, p.id DESC" : "p.createdAt DESC, p.id DESC";
  if (cursor) {
    const parts = String(cursor).split("|");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return res.status(400).json({ error: "Invalid cursor." });
    if (sort === "newest") { sql += " AND (p.createdAt < ? OR (p.createdAt = ? AND p.id < ?))"; args.push(parts[0], parts[0], parts[1]); }
    else {
      const price = Number(parts[0]); if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: "Invalid cursor." });
      sql += sort === "price_asc" ? " AND (COALESCE(p.salePrice,p.price) > ? OR (COALESCE(p.salePrice,p.price) = ? AND p.id > ?))" : " AND (COALESCE(p.salePrice,p.price) < ? OR (COALESCE(p.salePrice,p.price) = ? AND p.id < ?))";
      args.push(price, price, parts[1]);
    }
  }
  sql += ` ORDER BY ${order} LIMIT ?`; args.push(limit + 1);
  const rows = db.prepare(sql).all(...args); const page = rows.slice(0, limit); const last = page[page.length - 1];
  const nextCursor = rows.length > limit && last ? `${sort === "newest" ? last.createdAt : effectivePrice(last)}|${last.id}` : null;
  res.json({ products: page.map(toClientProduct), nextCursor });
});

// Public product detail. Inactive products remain private to their seller.
app.get("/api/mall/products/:id", (req, res) => {
  const visibility = publicMarketVisibility.publicProductQuery(req.params.id);
  if (!visibility) return res.status(404).json({ error: "Listing not found." });
  const row = db.prepare(`SELECT ${PRODUCT_COLS}, v.shopName as vendorName FROM mall_products p JOIN vendors v ON v.id = p.vendorId WHERE ${visibility.where}`).get(visibility.id);
  if (!row) return res.status(404).json({ error: "Listing not found." });
  res.json({ product: withVariants(toClientProduct(row)) });
});

// Photo bytes. The URL carries imageRev, so browsers/RN can cache it "forever".
app.get("/api/mall/products/:id/image", (req, res) => {
  const id = publicMarketVisibility.normalizeId(req.params.id);
  if (!id) return res.status(404).end();
  const row = db.prepare(`SELECT p.imageUrl FROM mall_products p JOIN vendors v ON v.id=p.vendorId WHERE p.id=? AND p.active=1 AND COALESCE(v.status,'active')='active' AND p.imageUrl IS NOT NULL`).get(id);
  if (!row) return res.status(404).end();
  let img;
  try { img = decodeImageDataUrl(row.imageUrl); } catch { return res.status(404).end(); }
  res.set({
    "Content-Type": img.mime,
    "Content-Length": String(img.buf.length),
    ...publicMarketVisibility.publicImageHeaders({ publicListing: true }),
  });
  res.send(img.buf);
});

// Extra photo n (0-based, in position order). Same visibility rules as the cover photo.
app.get("/api/mall/products/:id/images/:n", (req, res) => {
  const id = publicMarketVisibility.normalizeId(req.params.id);
  const n = Number(req.params.n);
  if (!id || !Number.isInteger(n) || n < 0 || n >= MAX_EXTRA_IMAGES) return res.status(404).end();
  const row = db.prepare(`SELECT gi.imageData FROM mall_product_images gi JOIN mall_products p ON p.id=gi.productId JOIN vendors v ON v.id=p.vendorId
    WHERE gi.productId=? AND p.active=1 AND COALESCE(v.status,'active')='active' ORDER BY gi.position ASC, gi.id ASC LIMIT 1 OFFSET ?`).get(id, n);
  if (!row) return res.status(404).end();
  let img;
  try { img = decodeImageDataUrl(row.imageData); } catch { return res.status(404).end(); }
  res.set({
    "Content-Type": img.mime,
    "Content-Length": String(img.buf.length),
    ...publicMarketVisibility.publicImageHeaders({ publicListing: true }),
  });
  res.send(img.buf);
});

app.get("/api/mall/personalized", auth.authMiddleware, (req,res)=>res.json({products:marketplaceGrowth.personalized(db,req.user.id,req.query.limit)}));
app.get("/api/mall/vendor/growth", auth.authMiddleware, (req,res)=>res.json(marketplaceGrowth.vendorGrowth(db,req.user.id)));

// Public shop directory: active vendors that have at least one live product (drives the Marketplace shop rail).
app.get("/api/mall/vendors", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const rows = db.prepare(`SELECT v.id, v.shopName, v.bio, COUNT(p.id) AS productCount, MIN(COALESCE(p.salePrice, p.price)) AS fromPrice,
      (SELECT ROUND(AVG(r.rating),1) FROM mall_reviews r WHERE r.vendorId=v.id AND r.moderationStatus='published') AS ratingAvg,
      (SELECT COUNT(*) FROM mall_reviews r WHERE r.vendorId=v.id AND r.moderationStatus='published') AS ratingCount
    FROM vendors v
    JOIN mall_products p ON p.vendorId = v.id AND p.active = 1
    WHERE COALESCE(v.status, 'active') = 'active'
    GROUP BY v.id ORDER BY productCount DESC, v.shopName ASC LIMIT 50`).all();
  res.json({ vendors: rows.map((r) => {
    const ratingAvg=r.ratingAvg==null?null:Number(r.ratingAvg); const ratingCount=Number(r.ratingCount||0);
    return { id:r.id, shopName:r.shopName, bio:r.bio||null, productCount:Number(r.productCount)||0, fromPrice:r.fromPrice==null?null:Number(r.fromPrice), ratingAvg, ratingCount, sellerBadge:sellerTrustBadge({ active: true, ratingAvg, ratingCount }) };
  }) });
});

app.get("/api/mall/discovery", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(marketplaceDiscovery.discovery(db, { limit: req.query.limit }));
});

// V5.99 storefront rails: deals, best sellers, top rated and new arrivals, ranked by the server so every
// client shows the same ordering. Each product carries the same shape as /api/mall/products.
app.get("/api/mall/storefront", rateLimit({ windowMs: 60_000, max: 60, keyFn: (req) => req.ip, message: "Too many storefront requests. Please try again shortly." }), (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 12, 1), 24);
  const base = `SELECT ${PRODUCT_COLS}, v.shopName as vendorName FROM mall_products p JOIN vendors v ON v.id = p.vendorId WHERE p.active = 1 AND p.stock > 0 AND COALESCE(v.status, 'active') = 'active'`;
  const nowIso = new Date().toISOString();
  const rail = (extra, order, ...args) => db.prepare(`${base}${extra} ORDER BY ${order} LIMIT ?`).all(...args, limit).map(toClientProduct);
  const soldOnly = " AND (SELECT COALESCE(SUM(oi.quantity), 0) FROM mall_order_items oi WHERE oi.productId = p.id AND oi.status NOT IN ('cancelled','refunded')) > 0";
  res.json({
    deals: rail(" AND p.salePrice IS NOT NULL AND p.saleEndsAt IS NOT NULL AND p.saleEndsAt > ?", "(p.price - p.salePrice) / p.price DESC, p.id ASC", nowIso),
    bestSellers: rail(soldOnly, "soldCount DESC, p.createdAt DESC, p.id DESC"),
    topRated: rail(" AND (SELECT COUNT(*) FROM mall_reviews r WHERE r.productId = p.id AND r.moderationStatus = 'published') > 0", "ratingAvg DESC, ratingCount DESC, p.id ASC"),
    newArrivals: rail("", "p.createdAt DESC, p.id DESC"),
  });
});

// -- Marketplace buyer/seller interaction layer (V3.48) --
const { createMarketplaceInteractions } = require("./marketplaceInteractions");
const marketplaceInteractions = createMarketplaceInteractions({ db, auth, genRowId });
createMarketRouter({ app, auth, db });
marketplaceInteractions.register(app);
const { createMarketplaceOrders } = require("./marketplaceOrders");
createMarketplaceOrders({ db, auth, genRowId }).register(app);

// -- Reviews, seller ratings, watching & alerts (V3.8) --
app.get("/api/social/community/rooms", auth.authMiddleware, (req,res)=>res.json({rooms:socialCommunity.discoverRooms(db,req.user.id,req.query.q,req.query.limit)}));
app.get("/api/social/community/graph", auth.authMiddleware, (req,res)=>res.json({graph:socialCommunity.graphSummary(db,req.user.id)}));
app.patch("/api/social/rooms/:roomId/discoverability", auth.authMiddleware, (req,res)=>{const room=db.prepare("SELECT * FROM chat_rooms WHERE id=? AND ownerId=?").get(req.params.roomId,req.user.id);if(!room)return res.status(404).json({error:"Room not found."});const discoverable=req.body?.discoverable===true;db.prepare("UPDATE chat_rooms SET discoverable=?,updatedAt=? WHERE id=? AND ownerId=?").run(discoverable?1:0,new Date().toISOString(),room.id,req.user.id);res.json({ok:true,discoverable});});

// Owner-scoped local secure inbox for server-delivered activation and Zeeza login codes.
// Messages are returned only to the authenticated Main user that owns the inbox row.
app.get("/api/zeeza/local-inbox", auth.authMiddleware, (req, res) => {
  try {
    const now = new Date().toISOString();
    const activation = db.prepare("SELECT id,preview,message,expiresAt,createdAt FROM zeeza_central_secure_inbox WHERE userId=? AND expiresAt>? ORDER BY createdAt DESC LIMIT 100").all(req.user.id, now);
    const login = db.prepare("SELECT id,preview,message,expiresAt,createdAt FROM zeeza_login_secure_inbox WHERE userId=? AND expiresAt>? ORDER BY createdAt DESC LIMIT 100").all(req.user.id, now);
    const messages = [...activation, ...login].sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,100).map(m => ({ id: m.id, category: "local", preview: m.preview, message: m.message, expiresAt: m.expiresAt, createdAt: m.createdAt }));
    return res.set("Cache-Control", "no-store").json({ messages });
  } catch {
    return res.status(503).json({ error: "Local inbox is temporarily unavailable.", code: "LOCAL_INBOX_UNAVAILABLE" });
  }
});

app.get("/api/social/inbox/summary", auth.authMiddleware, (req, res) => {
  const userId=req.user.id;
  const threads=db.prepare("SELECT t.id,t.lastMessageAt,t.createdAt,(SELECT COUNT(*) FROM dm_messages m WHERE m.threadId=t.id AND m.senderId!=? AND m.readAt IS NULL) AS unread FROM dm_threads t WHERE t.userAId=? OR t.userBId=? ORDER BY COALESCE(t.lastMessageAt,t.createdAt) DESC LIMIT 100").all(userId,userId,userId);
  const rooms=db.prepare("SELECT r.id,r.name,r.updatedAt,m.role,(SELECT COUNT(*) FROM room_messages x WHERE x.roomId=r.id) AS messageCount FROM chat_room_members m JOIN chat_rooms r ON r.id=m.roomId WHERE m.userId=? ORDER BY r.updatedAt DESC").all(userId);
  res.json({inbox:{threadCount:threads.length,unreadMessages:threads.reduce((n,x)=>n+Number(x.unread||0),0),latestThreadAt:threads[0]?.lastMessageAt||threads[0]?.createdAt||null},rooms:{count:rooms.length,latestUpdatedAt:rooms[0]?.updatedAt||null},threads,rooms});
});

// V4.42 — owner-scoped room lifecycle controls; membership remains authoritative.
app.get("/api/zeeza/rooms/lifecycle", auth.authMiddleware, (req,res) => {
  const rows=db.prepare(`SELECT r.id,r.name,r.discoverable,m.role,r.updatedAt,(SELECT COUNT(*) FROM chat_room_members x WHERE x.roomId=r.id) AS memberCount
    FROM chat_room_members m JOIN chat_rooms r ON r.id=m.roomId WHERE m.userId=? ORDER BY r.updatedAt DESC LIMIT 100`).all(req.user.id);
  res.json({summary:roomLifecycle.summarizeRooms(rows),rooms:rows});
});
app.patch("/api/zeeza/rooms/:id/lifecycle", auth.authMiddleware, (req,res) => {
  const room=db.prepare("SELECT id,name,discoverable FROM chat_rooms WHERE id=? AND ownerId=?").get(req.params.id,req.user.id);
  if(!room) return res.status(404).json({error:"Room not found or owner access required."});
  const patch=roomLifecycle.normalizeRoomPatch(req.body||{}); const fields=Object.keys(patch); if(!fields.length) return res.status(400).json({error:"No valid room changes supplied."});
  const values=fields.map(k=>patch[k]); db.prepare(`UPDATE chat_rooms SET ${fields.map(k=>k+'=?').join(',')},updatedAt=? WHERE id=? AND ownerId=?`).run(...values,new Date().toISOString(),room.id,req.user.id);
  res.json({room:db.prepare("SELECT id,name,discoverable,updatedAt FROM chat_rooms WHERE id=? AND ownerId=?").get(room.id,req.user.id)});
});

app.delete("/api/zeeza/rooms/:id/members/:memberId", auth.authMiddleware, (req,res) => {
  const room=db.prepare("SELECT id FROM chat_rooms WHERE id=? AND ownerId=?").get(req.params.id,req.user.id);
  if(!room) return res.status(404).json({error:"Room not found or owner access required."});
  if(String(req.params.memberId)===String(req.user.id)) return res.status(409).json({error:"The room owner cannot remove themselves."});
  const changed=db.prepare("DELETE FROM chat_room_members WHERE roomId=? AND userId=? AND role!='owner'").run(room.id,req.params.memberId);
  if(!changed.changes) return res.status(404).json({error:"Room member not found."});
  db.prepare("UPDATE chat_rooms SET updatedAt=? WHERE id=? AND ownerId=?").run(new Date().toISOString(),room.id,req.user.id);
  res.json({ok:true,roomId:room.id,memberId:String(req.params.memberId)});
});

social.register(app);
disputes.register(app);

app.get("/api/mall/vendor/settlement-exceptions", auth.authMiddleware, requireVendorAccess, (req,res) => {
  const rows=db.prepare(`SELECT i.orderId,i.status,o.status AS orderStatus,o.createdAt,o.providerVerified FROM mall_order_items i JOIN mall_orders o ON o.id=i.orderId WHERE i.vendorId=? ORDER BY o.createdAt DESC LIMIT 300`).all(req.vendor.id);
  res.json({summary:vendorSettlementExceptions.summarize(rows),exceptions:vendorSettlementExceptions.sla(rows)});
});

app.get("/api/mall/operations/settlement-depth", auth.authMiddleware, (req,res) => {
  const rows=db.prepare("SELECT id,status,total,currency,createdAt,providerVerified FROM mall_orders WHERE userId=? ORDER BY createdAt DESC LIMIT 100").all(req.user.id);
  res.json({exceptions:marketplaceSettlement.exceptions(rows),sla:marketplaceSettlement.fulfillmentSla(rows)});
});

app.get("/api/mall/operations/summary", auth.authMiddleware, (req, res) => {
  const orders = db.prepare(`SELECT DISTINCT o.* FROM mall_orders o LEFT JOIN mall_order_items i ON i.orderId=o.id LEFT JOIN vendors v ON v.id=i.vendorId WHERE o.userId=? OR v.userId=? ORDER BY o.createdAt DESC LIMIT 100`).all(req.user.id, req.user.id);
  const disputes = db.prepare("SELECT status FROM mall_checkout_disputes WHERE buyerId=? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id);
  res.json({ summary: marketplaceOperations.merchantSummary(orders, disputes), orders: orders.map(marketplaceOperations.summarizeOrder) });
});

// V4.37 — buyer-facing commerce resolution view. Payment/refund/dispute mutation remains canonical.
// V4.47 — vendor return/exception resolution view layered over canonical refunds and disputes.
app.post("/api/mall/vendor/settlement-exceptions/:orderId/actions", auth.authMiddleware, requireVendorAccess, (req,res) => {
  const action=String(req.body?.action||"");
  if(!marketplaceExceptionActions.allowedAction(action)) return res.status(400).json({error:"Unsupported settlement exception action."});
  const row=db.prepare(`SELECT o.id AS orderId,o.status,i.status AS itemStatus,o.createdAt FROM mall_order_items i JOIN mall_orders o ON o.id=i.orderId WHERE i.vendorId=? AND o.id=? LIMIT 1`).get(req.vendor.id,req.params.orderId);
  if(!row) return res.status(404).json({error:"Vendor order not found."});
  res.json({ok:true,orderId:row.orderId,action,next:marketplaceExceptionActions.nextState(action,row.status)});
});

app.post("/api/mall/vendor/settlement-exceptions/:orderId/evidence", auth.authMiddleware, requireVendorAccess, (req,res) => {
  const row=db.prepare(`SELECT o.id AS orderId FROM mall_order_items i JOIN mall_orders o ON o.id=i.orderId WHERE i.vendorId=? AND o.id=? LIMIT 1`).get(req.vendor.id,req.params.orderId);
  if(!row) return res.status(404).json({error:"Vendor order not found."});
  const evidence=marketplaceExceptionEvidence.normalizeEvidence(req.body||{});
  if(!evidence.note && !evidence.reference) return res.status(400).json({error:"Evidence note or reference is required."});
  const id=genRowId("mev"),ts=new Date().toISOString();
  db.prepare("INSERT INTO mall_exception_evidence(id,orderId,vendorId,kind,note,reference,createdAt) VALUES(?,?,?,?,?,?,?)").run(id,row.orderId,req.vendor.id,evidence.kind,evidence.note,evidence.reference,ts);
  res.status(201).json({evidence:{id,orderId:row.orderId,...evidence,createdAt:ts}});
});
app.get("/api/mall/vendor/settlement-exceptions/sla-trends", auth.authMiddleware, requireVendorAccess, (req,res) => {
  const rows=db.prepare(`SELECT o.id AS orderId,o.status,o.createdAt,COALESCE(NULLIF(o.updatedAt,''),o.createdAt) AS updatedAt FROM mall_order_items i JOIN mall_orders o ON o.id=i.orderId WHERE i.vendorId=? ORDER BY o.createdAt DESC LIMIT 300`).all(req.vendor.id);
  const mapped=rows.map(r=>({...r,slaMs:72*60*60*1000}));
  res.json(marketplaceExceptionEvidence.slaTrend(mapped));
});

app.get("/api/mall/vendor/settlement-exceptions/review-queue", auth.authMiddleware, requireVendorAccess, (req,res) => {
  const rows=db.prepare("SELECT id,orderId,kind,note,reference,reviewStatus,reviewedAt,escalation,createdAt FROM mall_exception_evidence WHERE vendorId=? ORDER BY createdAt DESC LIMIT 300").all(req.vendor.id);
  res.json({queue:marketplaceEvidenceReview.queue(rows),escalation:marketplaceEvidenceReview.escalation(rows)});
});

app.post("/api/mall/vendor/settlement-exceptions/evidence/:evidenceId/review", auth.authMiddleware, requireVendorAccess, (req,res) => {
  const status=new Set(['pending','reviewed','rejected']).has(String(req.body?.reviewStatus))?String(req.body.reviewStatus):null;
  if(!status) return res.status(400).json({error:"Unsupported evidence review status."});
  const escalation=new Set(['none','watch','urgent']).has(String(req.body?.escalation))?String(req.body.escalation):'none';
  const changed=db.prepare("UPDATE mall_exception_evidence SET reviewStatus=?,reviewedAt=?,escalation=? WHERE id=? AND vendorId=?").run(status,new Date().toISOString(),escalation,req.params.evidenceId,req.vendor.id);
  if(!changed.changes) return res.status(404).json({error:"Evidence not found."});
  res.json({ok:true,evidenceId:req.params.evidenceId,reviewStatus:status,escalation});
});

app.get("/api/mall/vendor/settlement-exceptions/sla-history", auth.authMiddleware, requireVendorAccess, (req,res) => {
  const rows=db.prepare(`SELECT o.id AS orderId,o.status,o.createdAt,o.updatedAt FROM mall_order_items i JOIN mall_orders o ON o.id=i.orderId WHERE i.vendorId=? ORDER BY o.createdAt DESC LIMIT 300`).all(req.vendor.id);
  res.json({history:marketplaceExceptionActions.slaHistory(rows)});
});

app.get("/api/mall/vendor/returns", auth.authMiddleware, requireVendorAccess, (req,res) => {
  const rows=db.prepare(`SELECT o.id AS orderId,o.status,i.status AS itemStatus,i.quantity,(i.price*i.quantity) AS lineTotal
    FROM mall_order_items i JOIN mall_orders o ON o.id=i.orderId WHERE i.vendorId=? ORDER BY o.createdAt DESC LIMIT 300`).all(req.vendor.id);
  const refunds=db.prepare(`SELECT id,orderId,amount,currency,status,reason,updatedAt FROM mall_refunds WHERE orderId IN (SELECT DISTINCT orderId FROM mall_order_items WHERE vendorId=?) ORDER BY updatedAt DESC LIMIT 200`).all(req.vendor.id);
  const disputes=db.prepare(`SELECT id,orderId,status,reason,updatedAt FROM mall_checkout_disputes WHERE orderId IN (SELECT DISTINCT orderId FROM mall_order_items WHERE vendorId=?) ORDER BY updatedAt DESC LIMIT 200`).all(req.vendor.id);
  res.json({fulfillment:vendorFulfillment.fulfillmentSummary(rows),returns:vendorReturns.summarize(refunds),exceptions:vendorReturns.exceptions(disputes),refunds,disputes});
});

app.get("/api/mall/operations/resolution", auth.authMiddleware, (req,res) => {
  const orders=db.prepare("SELECT id,status,total,currency,paymentRef,providerVerified FROM mall_orders WHERE userId=? ORDER BY createdAt DESC LIMIT 100").all(req.user.id);
  const refunds=db.prepare("SELECT id,orderId,amount,currency,status,reason,createdAt,updatedAt FROM mall_refunds WHERE buyerId=? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id);
  const disputes=db.prepare("SELECT id,orderId,status,reason,updatedAt FROM mall_checkout_disputes WHERE buyerId=? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id);
  res.json({orders:orders.map(marketplaceResolution.orderLifecycle),refunds:marketplaceResolution.refundSummary(refunds),refundHistory:refunds,disputes:marketplaceResolution.disputeSummary(disputes),disputeHistory:disputes});
});
groups.register(app);
staff.register(app);
friends.register(app);
zeezaMessaging.register(app);
const callSignaling = createCallSignaling({ db, auth, friends, sendPush, genRowId });
callSignaling.register(app);

// -- Vendor's own products (incl. inactive) -- staff see and manage these too.
// V4.42 — vendor fulfillment and settlement visibility over canonical order/payment state.
app.get("/api/mall/vendor/fulfillment", auth.authMiddleware, requireVendorAccess, (req,res) => {
  const rows=db.prepare(`SELECT i.orderId,i.status,i.quantity,i.price,(i.price*i.quantity) AS lineTotal,o.status AS orderStatus,o.providerVerified,o.feeStatus
    FROM mall_order_items i JOIN mall_orders o ON o.id=i.orderId WHERE i.vendorId=? ORDER BY o.createdAt DESC LIMIT 300`).all(req.vendor.id);
  const orderIds=[...new Set(rows.map(r=>String(r.orderId||"")).filter(Boolean))];
  const refunds=orderIds.length?db.prepare(`SELECT status FROM mall_refunds WHERE orderId IN (${orderIds.map(()=>"?").join(",")})`).all(...orderIds):[];
  res.json({fulfillment:vendorFulfillment.fulfillmentSummary(rows.map(r=>({...r,status:r.status||r.orderStatus}))),settlement:vendorFulfillment.settlementSummary(rows.map(r=>({...r,status:r.orderStatus}))),returns:vendorFulfillment.returnSummary(refunds),orders:rows.slice(0,100)});
});

app.get("/api/mall/vendor/delivery-settings", auth.authMiddleware, requireVendorAccess, (req, res) => {
  res.json({ settings: marketplaceDelivery.getSettings(db, req.vendor.id) });
});

app.put("/api/mall/vendor/delivery-settings", auth.authMiddleware, requireVendorAccess, (req, res) => {
  try {
    const settings = marketplaceDelivery.saveSettings(db, req.vendor.id, req.body);
    res.json({ settings });
  } catch (e) {
    if (e?.code === "invalid_mode" || e?.code === "invalid_amount" || e?.code === "invalid_currency") return res.status(400).json({ error: e.message });
    throw e;
  }
});

app.post("/api/mall/delivery-estimate", auth.authMiddleware, (req, res) => {
  try {
    const estimate = marketplaceDelivery.estimateForLines(db, req.body?.items, productStock);
    res.json({ estimate, notice: "This is a seller-configured estimate. Final delivery fees are confirmed by the seller." });
  } catch (e) {
    const clientCodes = new Set(["empty_items","too_many_items","invalid_item","product_unavailable","variant_required","variant_unknown","variant_not_supported"]);
    if (clientCodes.has(e?.code)) return res.status(400).json({ error: e.message, code: e.code });
    throw e;
  }
});

app.get("/api/mall/vendor/products", auth.authMiddleware, requireVendorAccess, (req, res) => {
  const rows = db.prepare(`SELECT ${PRODUCT_COLS} FROM mall_products p WHERE p.vendorId = ? ORDER BY p.createdAt DESC, p.id DESC LIMIT 500`).all(req.vendor.id);
  res.json({ products: rows.map((r) => withVariants(toClientProduct(r))) });
});

app.post("/api/mall/vendor/products", auth.authMiddleware, requireVendorAccess, async (req, res) => {
  let f;
  try { f = readProductFields(req.body, null); }
  catch (e) { if (e instanceof ValidationError) return res.status(400).json({ error: e.message }); throw e; }
  let ai;
  try { ai = await productAiModeration.moderateProduct({ name:f.name, description:f.description || "", category:f.category || "other", imageUrl:f.imageUrl || null, env:process.env }); }
  catch (e) { return res.status(503).json({ error:e.message || "AI product moderation is temporarily unavailable. Please try again." }); }
  if (ai.decision !== "approved") return res.status(422).json({ error:"AI moderation rejected this product listing.", code:"PRODUCT_AI_MODERATION_REJECTED", moderation:ai });
  const category = f.category || "other";
  const placeholder = CATEGORY_PLACEHOLDER[category];
  const id = genRowId("mp");
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO mall_products
     (id, vendorId, name, description, price, weightKg, salePrice, saleEndsAt, currency, category, stock, imageUrl, imageEmoji, imageColor, active, imageRev, aiModerationStatus, aiModerationReason, aiModeratedAt, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, req.vendor.id, f.name, f.description || "", f.price, f.weightKg, f.salePrice ?? null, f.saleEndsAt ?? null, f.currency || "NGN", category,
    f.stock ?? 0, f.imageUrl || null, placeholder.emoji, placeholder.color, 1, f.imageUrl ? 1 : 0, "approved", ai.reason || null, now, now, now
  );
  res.json({ product: getProductForClient(id), aiModeration:ai });
});

app.put("/api/mall/vendor/products/:id", auth.authMiddleware, requireVendorAccess, async (req, res) => {
  const existing = db.prepare("SELECT * FROM mall_products WHERE id = ? AND vendorId = ?").get(req.params.id, req.vendor.id);
  if (!existing) return res.status(404).json({ error: "Product not found." });
  let f;
  try { f = readProductFields(req.body, existing); }
  catch (e) { if (e instanceof ValidationError) return res.status(400).json({ error: e.message }); throw e; }

  const moderationChanged = f.name !== undefined || f.description !== undefined || f.category !== undefined || f.imageUrl !== undefined;
  let aiModeration = null;
  if (moderationChanged) {
    const candidate = { name:f.name ?? existing.name, description:f.description ?? existing.description ?? "", category:f.category ?? existing.category ?? "other", imageUrl:f.imageUrl !== undefined ? f.imageUrl : existing.imageUrl };
    try { aiModeration = await productAiModeration.moderateProduct({ ...candidate, env:process.env }); }
    catch (e) { return res.status(503).json({ error:e.message || "AI product moderation is temporarily unavailable. Please try again." }); }
    if (aiModeration.decision !== "approved") return res.status(422).json({ error:"AI moderation rejected this product change.", code:"PRODUCT_AI_MODERATION_REJECTED", moderation:aiModeration });
  }
  const before = social.snapshotProducts([existing.id]);
  let updated;
  try {
    updated = db.transaction(() => {
      const current = db.prepare("SELECT * FROM mall_products WHERE id = ? AND vendorId = ?").get(req.params.id, req.vendor.id);
      if (!current) { const e = new Error("Product not found."); e.statusCode = 404; throw e; }
      const category = f.category || current.category;
      const placeholder = CATEGORY_PLACEHOLDER[category];
      const imageUrl = f.imageUrl !== undefined ? f.imageUrl : current.imageUrl;
      const imageChanged = f.imageUrl !== undefined && f.imageUrl !== current.imageUrl;
      const salePrice = f.salePrice !== undefined ? f.salePrice : current.salePrice;
      const saleEndsAt = f.saleEndsAt !== undefined ? f.saleEndsAt : current.saleEndsAt;
      const changed = db.prepare(
        `UPDATE mall_products SET name=?, description=?, price=?, weightKg=?, salePrice=?, saleEndsAt=?, currency=?, category=?, stock=?,
         imageUrl=?, imageEmoji=?, imageColor=?, active=?, imageRev=?, aiModerationStatus=?, aiModerationReason=?, aiModeratedAt=?, updatedAt=? WHERE id=? AND vendorId=?`
      ).run(
        f.name ?? current.name,
        f.description ?? current.description,
        f.price ?? current.price,
        f.weightKg ?? current.weightKg ?? null,
        salePrice,
        saleEndsAt,
        f.currency ?? current.currency,
        category,
        productStock.hasVariants(db, current.id) ? current.stock : (f.stock ?? current.stock), // with variants, stock is the sum of the options
        imageUrl,
        placeholder.emoji, placeholder.color,
        f.active ?? current.active,
        imageChanged ? current.imageRev + 1 : current.imageRev,
        aiModeration ? "approved" : (current.aiModerationStatus || "approved"),
        aiModeration?.reason || current.aiModerationReason || null,
        aiModeration ? new Date().toISOString() : (current.aiModeratedAt || null),
        new Date().toISOString(),
        current.id, req.vendor.id
      );
      if (!changed.changes) { const e = new Error("Product changed before this update completed. Please refresh and try again."); e.statusCode = 409; throw e; }
      return db.prepare("SELECT * FROM mall_products WHERE id = ? AND vendorId = ?").get(current.id, req.vendor.id);
    })();
  } catch (e) {
    if (e?.statusCode === 404) return res.status(404).json({ error: e.message });
    if (e?.statusCode === 409) return res.status(409).json({ error: e.message });
    throw e;
  }
  social.notifyProductChanges(before);
  res.json({ product: getProductForClient(updated.id) });
});

app.delete("/api/mall/vendor/products/:id", auth.authMiddleware, requireVendor, (req, res) => {
  const existing = db.prepare("SELECT id FROM mall_products WHERE id = ? AND vendorId = ?").get(req.params.id, req.vendor.id);
  if (!existing) return res.status(404).json({ error: "Product not found." });
  db.prepare("DELETE FROM mall_products WHERE id = ?").run(existing.id);
  db.prepare("DELETE FROM mall_watches WHERE productId = ?").run(existing.id);
  db.prepare("DELETE FROM mall_product_images WHERE productId = ?").run(existing.id);
  db.prepare("DELETE FROM mall_product_variants WHERE productId = ?").run(existing.id);
  res.json({ ok: true });
});

// -- Size / colour variants (B144 WIP9) --
// PUT replaces the whole option list in one go (an option that keeps its size+colour keeps its id, so
// carts and past orders stay valid). mall_products.stock becomes the sum of the options.
app.get("/api/mall/vendor/products/:id/variants", auth.authMiddleware, requireVendorAccess, (req, res) => {
  const existing = db.prepare("SELECT id FROM mall_products WHERE id = ? AND vendorId = ?").get(req.params.id, req.vendor.id);
  if (!existing) return res.status(404).json({ error: "Product not found." });
  res.json({ variants: productStock.variantsOf(db, existing.id) });
});
app.put("/api/mall/vendor/products/:id/variants", auth.authMiddleware, requireVendorAccess, (req, res) => {
  const existing = db.prepare("SELECT id FROM mall_products WHERE id = ? AND vendorId = ?").get(req.params.id, req.vendor.id);
  if (!existing) return res.status(404).json({ error: "Product not found." });
  let list;
  try { list = productStock.readVariantList(req.body?.variants); }
  catch (e) { if (e instanceof productStock.VariantValidationError) return res.status(400).json({ error: e.message }); throw e; }
  const before = social.snapshotProducts([existing.id]);
  const now = new Date().toISOString();
  let variants;
  try {
    variants = db.transaction(() => {
      const current = db.prepare("SELECT id FROM mall_products WHERE id = ? AND vendorId = ?").get(existing.id, req.vendor.id);
      if (!current) { const e = new Error("Product not found."); e.statusCode = 404; throw e; }
      return productStock.replaceVariants(db, existing.id, list, now, () => genRowId("mv"));
    })();
  } catch (e) {
    if (e?.statusCode === 404) return res.status(404).json({ error: e.message });
    throw e;
  }
  social.notifyProductChanges(before); // an option coming back in stock may be what a watcher was waiting for
  res.json({ variants, product: getProductForClient(existing.id) });
});

// Vendor Product AI Beautifier: edit an owned photo and return a server-owned, expiring preview token.
const VENDOR_AI_PREVIEW_TTL_MS = 10 * 60 * 1000;
app.post("/api/mall/vendor/products/:id/images/beautify", auth.authMiddleware, requireVendorAccess, vendorProductAiLimiter, vendorProductAiDailyLimiter, async (req,res)=>{
 const existing=db.prepare("SELECT id,imageUrl FROM mall_products WHERE id=? AND vendorId=?").get(req.params.id,req.vendor.id);
 if(!existing)return res.status(404).json({error:"Product not found."});
 const n=req.body?.imageIndex==null?0:Number(req.body.imageIndex);
 // AI beautification is intentionally restricted to the primary/hero image (slot 1).
 // Reference photos are customer-verification evidence and must remain unmodified originals.
 if(!Number.isInteger(n)||n<0||n>=MAX_EXTRA_IMAGES+1)return res.status(400).json({error:"Invalid product photo."});
 if(n!==0)return res.status(403).json({error:"AI beautification is available only for the main product image. Reference photos must remain original."});
 const hasCover=!!existing.imageUrl;
 const extraIndex=hasCover?n-1:n;
 const imageData=hasCover&&n===0?existing.imageUrl:(extraIndex>=0&&extraIndex<MAX_EXTRA_IMAGES?db.prepare("SELECT imageData FROM mall_product_images WHERE productId=? ORDER BY position ASC,id ASC LIMIT 1 OFFSET ?").get(existing.id,extraIndex)?.imageData||null:null);
 if(!imageData)return res.status(404).json({error:"Product photo not found."});
 try{decodeImageDataUrl(imageData);}catch(e){if(e instanceof ValidationError)return res.status(400).json({error:e.message});throw e;}
 try{
   const result=await vendorProductAi.beautifyProductImage({imageDataUrl:imageData,style:req.body?.style,env:process.env});
   try{decodeImageDataUrl(result.image);}catch(e){if(e instanceof ValidationError)return res.status(502).json({error:"The beautified image is too large for NEXA's product gallery. Try a smaller source photo."});throw e;}
   const sourceHash=crypto.createHash("sha256").update(decodeImageDataUrl(imageData).buf).digest("hex");
   const previewHash=crypto.createHash("sha256").update(decodeImageDataUrl(result.image).buf).digest("hex");
   const token=crypto.randomBytes(32).toString("hex");
   const now=new Date(); const expiresAt=new Date(now.getTime()+VENDOR_AI_PREVIEW_TTL_MS).toISOString();
   db.prepare("INSERT INTO vendor_ai_image_previews (token,productId,vendorId,sourceIndex,sourceHash,previewHash,previewData,expiresAt,createdAt) VALUES (?,?,?,?,?,?,?,?,?)")
     .run(token,existing.id,req.vendor.id,n,sourceHash,previewHash,result.image,expiresAt,now.toISOString());
   res.json({preview:result.image,style:result.style,model:result.model,sourceIndex:n,sourceHash,previewToken:token,expiresAt});
 }catch(e){const status=Number.isInteger(e?.statusCode)?e.statusCode:502;res.status(status).json({error:e?.message||"Could not beautify this product photo right now."});}
});

// Approval consumes only a server-issued, single-use preview token. The client never supplies
// the image that is written to the gallery, preventing arbitrary-image substitution at approval.
app.post("/api/mall/vendor/products/:id/images/beautify/approve", auth.authMiddleware, requireVendorAccess, (req,res)=>{
 const existing=db.prepare("SELECT id,imageUrl FROM mall_products WHERE id=? AND vendorId=?").get(req.params.id,req.vendor.id);
 if(!existing)return res.status(404).json({error:"Product not found."});
 const token=String(req.body?.previewToken||"").trim();
 if(!/^[a-f0-9]{64}$/.test(token))return res.status(400).json({error:"Invalid AI preview token."});
 const preview=db.prepare("SELECT token,productId,vendorId,sourceIndex,sourceHash,previewHash,previewData,expiresAt,usedAt FROM vendor_ai_image_previews WHERE token=? AND productId=? AND vendorId=?").get(token,existing.id,req.vendor.id);
 if(!preview)return res.status(404).json({error:"AI preview not found or already consumed."});
 if(preview.usedAt)return res.status(409).json({error:"This AI preview has already been used."});
 if(Date.parse(preview.expiresAt)<=Date.now())return res.status(410).json({error:"This AI preview has expired. Generate a new preview before saving it."});
 const n=Number(preview.sourceIndex);
 if(n!==0)return res.status(403).json({error:"Only the main product image can be saved from an AI beautifier preview."});
 const hasCover=!!existing.imageUrl;
 const extraIndex=hasCover?n-1:n;
 const imageData=hasCover&&n===0?existing.imageUrl:(extraIndex>=0&&extraIndex<MAX_EXTRA_IMAGES?db.prepare("SELECT imageData FROM mall_product_images WHERE productId=? ORDER BY position ASC,id ASC LIMIT 1 OFFSET ?").get(existing.id,extraIndex)?.imageData||null:null);
 if(!imageData)return res.status(404).json({error:"The original product photo is no longer available."});
 let sourceHash; try{sourceHash=crypto.createHash("sha256").update(decodeImageDataUrl(imageData).buf).digest("hex");}catch(e){if(e instanceof ValidationError)return res.status(400).json({error:e.message});throw e;}
 if(sourceHash!==preview.sourceHash)return res.status(409).json({error:"This AI preview was generated from an older product photo. Generate a new preview before saving it."});
 let previewHash; try{previewHash=crypto.createHash("sha256").update(decodeImageDataUrl(preview.previewData).buf).digest("hex");}catch(e){if(e instanceof ValidationError)return res.status(400).json({error:e.message});throw e;}
 if(previewHash!==preview.previewHash)return res.status(409).json({error:"This AI preview is no longer valid. Generate a new preview before saving it."});
 const now=new Date().toISOString();
 const result=db.transaction(()=>{
   const count=db.prepare("SELECT COUNT(*) AS c FROM mall_product_images WHERE productId=?").get(existing.id).c;
   if(count>=MAX_EXTRA_IMAGES)return {full:true};
   const consumed=db.prepare("UPDATE vendor_ai_image_previews SET usedAt=? WHERE token=? AND usedAt IS NULL").run(now,token);
   if(consumed.changes!==1)return {consumed:true};
   db.prepare("INSERT INTO mall_product_images (id,productId,position,imageData,createdAt) VALUES (?,?,?,?,?)").run(genRowId("mpi"),existing.id,count,preview.previewData,now);
   db.prepare("UPDATE mall_products SET imageRev=imageRev+1,updatedAt=? WHERE id=?").run(now,existing.id);
   return {full:false,consumed:false};
 })();
 if(result.full)return res.status(409).json({error:`A product can have up to ${MAX_EXTRA_IMAGES+1} photos.`});
 if(result.consumed)return res.status(409).json({error:"This AI preview has already been used."});
 res.json({product:getProductForClient(existing.id)});
});

// -- Product gallery (B144 WIP8) --
// One photo per request so a phone on mobile data never has to push several photos in a single body.
function galleryProduct(req, res) {
  const existing = db.prepare("SELECT id FROM mall_products WHERE id = ? AND vendorId = ?").get(req.params.id, req.vendor.id);
  if (!existing) { res.status(404).json({ error: "Product not found." }); return null; }
  return existing;
}
function renumberGallery(productId) {
  const rows = db.prepare("SELECT id FROM mall_product_images WHERE productId = ? ORDER BY position ASC, id ASC").all(productId);
  const upd = db.prepare("UPDATE mall_product_images SET position = ? WHERE id = ?");
  rows.forEach((r, i) => upd.run(i, r.id));
}
app.post("/api/mall/vendor/products/:id/images", auth.authMiddleware, requireVendorAccess, async (req, res) => {
  const existing = galleryProduct(req, res); if (!existing) return;
  try { decodeImageDataUrl(req.body?.image); }
  catch (e) { if (e instanceof ValidationError) return res.status(400).json({ error: e.message }); throw e; }
  const productMeta = db.prepare("SELECT name,description,category FROM mall_products WHERE id=?").get(existing.id);
  try {
    const ai = await productAiModeration.moderateProduct({ ...productMeta, imageUrl:req.body.image, env:process.env });
    if (ai.decision !== "approved") return res.status(422).json({ error:"AI moderation rejected this product image.", code:"PRODUCT_AI_MODERATION_REJECTED", moderation:ai });
  } catch (e) { return res.status(503).json({ error:e.message || "AI product moderation is temporarily unavailable. Please try again." }); }
  const now = new Date().toISOString();
  const result = db.transaction(() => {
    const count = db.prepare("SELECT COUNT(*) AS c FROM mall_product_images WHERE productId = ?").get(existing.id).c;
    if (count >= MAX_EXTRA_IMAGES) return { full: true };
    db.prepare("INSERT INTO mall_product_images (id, productId, position, imageData, createdAt) VALUES (?,?,?,?,?)")
      .run(genRowId("mpi"), existing.id, count, req.body.image, now);
    db.prepare("UPDATE mall_products SET imageRev = imageRev + 1, updatedAt = ? WHERE id = ?").run(now, existing.id);
    return { full: false };
  })();
  if (result.full) return res.status(409).json({ error: `A product can have up to ${MAX_EXTRA_IMAGES + 1} photos.` });
  res.json({ product: getProductForClient(existing.id) });
});
app.delete("/api/mall/vendor/products/:id/images/:n", auth.authMiddleware, requireVendorAccess, (req, res) => {
  const existing = galleryProduct(req, res); if (!existing) return;
  const n = Number(req.params.n);
  if (!Number.isInteger(n) || n < 0 || n >= MAX_EXTRA_IMAGES) return res.status(404).json({ error: "Photo not found." });
  const now = new Date().toISOString();
  const found = db.transaction(() => {
    const row = db.prepare("SELECT id FROM mall_product_images WHERE productId = ? ORDER BY position ASC, id ASC LIMIT 1 OFFSET ?").get(existing.id, n);
    if (!row) return false;
    db.prepare("DELETE FROM mall_product_images WHERE id = ?").run(row.id);
    renumberGallery(existing.id);
    db.prepare("UPDATE mall_products SET imageRev = imageRev + 1, updatedAt = ? WHERE id = ?").run(now, existing.id);
    return true;
  })();
  if (!found) return res.status(404).json({ error: "Photo not found." });
  res.json({ product: getProductForClient(existing.id) });
});
// Make extra photo n the cover: swap it with the current cover photo.
app.post("/api/mall/vendor/products/:id/images/:n/cover", auth.authMiddleware, requireVendorAccess, (req, res) => {
  const existing = galleryProduct(req, res); if (!existing) return;
  const n = Number(req.params.n);
  if (!Number.isInteger(n) || n < 0 || n >= MAX_EXTRA_IMAGES) return res.status(404).json({ error: "Photo not found." });
  const now = new Date().toISOString();
  const found = db.transaction(() => {
    const row = db.prepare("SELECT id, imageData FROM mall_product_images WHERE productId = ? ORDER BY position ASC, id ASC LIMIT 1 OFFSET ?").get(existing.id, n);
    if (!row) return false;
    const cover = db.prepare("SELECT imageUrl FROM mall_products WHERE id = ?").get(existing.id).imageUrl;
    db.prepare("UPDATE mall_products SET imageUrl = ?, imageRev = imageRev + 1, updatedAt = ? WHERE id = ?").run(row.imageData, now, existing.id);
    if (cover) db.prepare("UPDATE mall_product_images SET imageData = ? WHERE id = ?").run(cover, row.id);
    else { db.prepare("DELETE FROM mall_product_images WHERE id = ?").run(row.id); renumberGallery(existing.id); }
    return true;
  })();
  if (!found) return res.status(404).json({ error: "Photo not found." });
  res.json({ product: getProductForClient(existing.id) });
});

// -- Public share pages (V3.6) --
// Plain HTML pages so a product or store link pasted into WhatsApp shows a
// preview card (title, price, photo) and opens in any browser. No login, no
// scripts; every value is HTML-escaped.
function escHtml(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function publicBase(req) {
  if (process.env.PUBLIC_URL) return String(process.env.PUBLIC_URL).replace(/\/+$/, "");
  const proto = String(req.get("x-forwarded-proto") || req.protocol || "https").split(",")[0].trim();
  return `${proto}://${req.get("host")}`;
}
function ratingText(avg, count) {
  return count > 0 && avg != null ? `★ ${avg} (${count} review${count === 1 ? "" : "s"})` : "";
}
function priceText(p) {
  return `${p.currency === "NGN" ? "₦" : p.currency + " "}${Number(p.price).toLocaleString()}`;
}
function sharePage({ title, description, image, url, body }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title>
<meta name="description" content="${escHtml(description)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Dream Marketplace">
<meta property="og:title" content="${escHtml(title)}"><meta property="og:description" content="${escHtml(description)}">
<meta property="og:url" content="${escHtml(url)}">${image ? `<meta property="og:image" content="${escHtml(image)}">` : ""}
<style>
body{margin:0;background:#0b0d10;color:#fff;font-family:-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5}
main{max-width:520px;margin:0 auto;padding:20px}
img.hero{width:100%;border-radius:14px;display:block;margin-bottom:16px}
.ph{width:100%;height:220px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:64px;margin-bottom:16px}
h1{font-size:24px;margin:0 0 6px}.price{color:#8fe0a8;font-size:22px;font-weight:800;margin:6px 0}
.muted{color:#9da4ae;font-size:14px}.desc{margin:14px 0}
a.btn{display:block;text-align:center;background:#fff;color:#0b0d10;font-weight:800;padding:14px;border-radius:12px;text-decoration:none;margin-top:18px}
.item{display:flex;gap:12px;align-items:center;padding:12px 0;border-top:1px solid #262b33;color:#fff;text-decoration:none}
.item img,.item .th{width:56px;height:56px;border-radius:10px;object-fit:cover;flex:none;display:flex;align-items:center;justify-content:center;font-size:26px}
.item b{display:block}.item span{color:#8fe0a8}
</style></head><body><main>${body}</main></body></html>`;
}
function sendSharePage(res, status, html) {
  res.status(status).set({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
    "X-Content-Type-Options": "nosniff",
  }).send(html);
}
const notFoundPage = () => sharePage({
  title: "Not found · Dream Marketplace", description: "This listing is no longer available.", url: "",
  body: `<h1>Not available</h1><p class="muted">This listing has been removed or is no longer for sale.</p>`,
});

app.get("/p/:id", (req, res) => {
  const visibility = publicMarketVisibility.publicProductQuery(req.params.id);
  const row = visibility ? db.prepare(
    `SELECT ${PRODUCT_COLS}, v.shopName as vendorName FROM mall_products p
     JOIN vendors v ON v.id = p.vendorId WHERE ${visibility.where}`
  ).get(visibility.id) : null;
  if (!row) return sendSharePage(res, 404, notFoundPage());
  const p = toClientProduct(row);
  const base = publicBase(req);
  const image = p.imageUrl ? base + p.imageUrl : null;
  const desc = (p.description ? p.description.slice(0, 160) + " · " : "") + `Sold by ${row.vendorName} on Dream Marketplace`;
  const hero = image
    ? `<img class="hero" src="${escHtml(p.imageUrl)}" alt="${escHtml(p.name)}">`
    : `<div class="ph" style="background:${escHtml(/^#[0-9a-fA-F]{3,8}$/.test(p.imageColor) ? p.imageColor : "#1c2128")}">${escHtml(p.imageEmoji)}</div>`;
  const html = sharePage({
    title: `${p.name} · ${priceText(p)}`, description: desc, image, url: `${base}/p/${p.id}`,
    body: `${hero}<h1>${escHtml(p.name)}</h1><div class="price">${escHtml(priceText(p))}</div>
<div class="muted">Sold by <a style="color:#9da4ae" href="/s/${escHtml(p.vendorId)}">${escHtml(row.vendorName)}</a> · ${p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</div>
${[ratingText(p.ratingAvg, p.ratingCount) && `This product ${ratingText(p.ratingAvg, p.ratingCount)}`, ratingText(p.vendorRatingAvg, p.vendorRatingCount) && `Seller ${ratingText(p.vendorRatingAvg, p.vendorRatingCount)}`].filter(Boolean).map((t) => `<div class="muted">${escHtml(t)}</div>`).join("")}
${p.description ? `<p class="desc">${escHtml(p.description)}</p>` : ""}
<a class="btn" href="nexa://">Open in NEXA</a>`,
  });
  sendSharePage(res, 200, html);
});

app.get("/s/:vendorId", (req, res) => {
  const visibility = publicMarketVisibility.publicVendorQuery(req.params.vendorId);
  const vendor = visibility ? db.prepare("SELECT * FROM vendors v WHERE " + visibility.where).get(visibility.id) : null;
  if (!vendor) return sendSharePage(res, 404, notFoundPage());
  const base = publicBase(req);
  const rows = db.prepare(
    `SELECT ${PRODUCT_COLS} FROM mall_products p WHERE p.vendorId = ? AND p.active = 1 AND p.stock > 0
     ORDER BY p.createdAt DESC, p.id DESC LIMIT 30`
  ).all(vendor.id).map(toClientProduct);
  const first = rows.find((r) => r.imageUrl);
  const items = rows.map((p) => {
    const thumb = p.imageUrl
      ? `<img src="${escHtml(p.imageUrl)}" alt="">`
      : `<div class="th" style="background:${escHtml(/^#[0-9a-fA-F]{3,8}$/.test(p.imageColor) ? p.imageColor : "#1c2128")}">${escHtml(p.imageEmoji)}</div>`;
    return `<a class="item" href="/p/${escHtml(p.id)}">${thumb}<div><b>${escHtml(p.name)}</b><span>${escHtml(priceText(p))}</span></div></a>`;
  }).join("");
  const vr = social.summarize("vendorId", vendor.id);
  const vendorRating = ratingText(vr.ratingAvg, vr.ratingCount);
  const html = sharePage({
    title: `${vendor.shopName} · Dream Marketplace`,
    description: vendor.bio ? String(vendor.bio).slice(0, 160) : `Shop ${vendor.shopName} on Dream Marketplace`,
    image: first ? base + first.imageUrl : null, url: `${base}/s/${vendor.id}`,
    body: `<h1>${escHtml(vendor.shopName)}</h1>${vendorRating ? `<div class="muted">${escHtml(vendorRating)}</div>` : ""}${vendor.bio ? `<p class="muted">${escHtml(vendor.bio)}</p>` : ""}
${items || `<p class="muted">No products in stock right now.</p>`}
<a class="btn" href="nexa://">Open in NEXA</a>`,
  });
  sendSharePage(res, 200, html);
});

app.get("/api/leisure/venue/operations", auth.authMiddleware, (req, res) => {
  const tickets=db.prepare("SELECT id,title,type,venue,startsAt,quantity,active FROM yaayz_ticket_listings WHERE active=1 ORDER BY startsAt ASC LIMIT 500").all();
  const ticketOrders=db.prepare("SELECT status FROM yaayz_ticket_orders WHERE buyerId=? LIMIT 200").all(req.user.id);
  const kitchenOrders=db.prepare("SELECT status FROM kitchen_orders WHERE userId=? LIMIT 200").all(req.user.id);
  res.json({ venues: venueOperations.summarizeTickets(tickets), ticketLifecycle: venueOperations.eventLifecycle(ticketOrders), kitchenLifecycle: venueOperations.eventLifecycle(kitchenOrders) });
});

// V4.41 — authenticated event discovery layered over canonical Yaayz inventory and order state.
app.get("/api/leisure/events/discovery", auth.authMiddleware, (req,res) => {
  const type=req.query?.type?String(req.query.type).slice(0,40):null;
  const venue=req.query?.venue?String(req.query.venue).slice(0,100):null;
  const rows=db.prepare("SELECT id,title,type,venue,startsAt,endsAt,price,currency,quantity FROM yaayz_ticket_listings WHERE active=1 AND quantity>0 ORDER BY startsAt ASC LIMIT 500").all();
  const filtered=rows.filter(r=>(!type||r.type===type)&&(!venue||String(r.venue||"").toLowerCase().includes(venue.toLowerCase())));
  const mine=db.prepare("SELECT status FROM yaayz_ticket_orders WHERE buyerId=? ORDER BY updatedAt DESC LIMIT 200").all(req.user.id);
  res.json({events:venueDiscovery.upcomingEvents(filtered),ticketLifecycle:venueDiscovery.lifecycleSummary(mine)});
});

// -- Push notifications (Expo) --
// Best-effort: a failed or skipped push never affects the request that
// triggered it. Tokens Expo reports as dead are pruned.
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

app.post("/api/push/register", auth.authMiddleware, (req, res) => {
  const token = String(req.body?.token || "");
  if (!EXPO_TOKEN_RE.test(token)) return res.status(400).json({ error: "Invalid push token." });
  const platform = req.body?.platform ? String(req.body.platform).trim().toLowerCase().slice(0, 20) : null;
  const registration = pushTokenRegistry.registerPushToken(db, { token, userId: req.user.id, platform });
  if (!registration.ok && registration.reason === "token_owned_by_other_user") {
    return res.status(409).json({ error: "This push token is already registered to another account." });
  }
  if (!registration.ok) return res.status(503).json({ error: "Push token registration could not be completed." });
  res.json({ ok: true, refreshed: Boolean(registration.refreshed) });
});

app.post("/api/push/unregister", auth.authMiddleware, (req, res) => {
  db.prepare("DELETE FROM push_tokens WHERE token = ? AND userId = ?").run(String(req.body?.token || ""), req.user.id);
  res.json({ ok: true });
});

async function sendPush(userId, title, body, data = {}) {
  // The in-app event is the source of truth. A caller may supply data.dedupeKey
  // when the same business event can be emitted more than once during retries.
  const event = notifications.createEvent(userId, title, body, data);
  const dedupeKey = String(data?.dedupeKey || "").trim().slice(0, 160);
  const eventData = JSON.stringify(event.data);
  if (dedupeKey) {
    // The unique (userId,dedupeKey) index is the concurrency boundary. Do not
    // SELECT-then-INSERT: concurrent retries can both observe no row.
    const inserted = db.prepare(`
      INSERT OR IGNORE INTO notification_events
        (id,userId,title,body,type,data,createdAt,readAt,dedupeKey)
      VALUES(?,?,?,?,?,?,?,NULL,?)`)
      .run(event.id, event.userId, event.title, event.body, event.type, eventData, event.createdAt, dedupeKey);
    if (!inserted.changes) {
      const existing = db.prepare("SELECT id FROM notification_events WHERE userId=? AND dedupeKey=? LIMIT 1")
        .get(userId, dedupeKey);
      if (existing) return { recorded: true, duplicate: true, delivered: false, queued: 0, delivery: null, eventId: existing.id };
      throw new Error("notification dedupe insert was ignored without an existing event");
    }
  } else {
    db.prepare("INSERT INTO notification_events(id,userId,title,body,type,data,createdAt,readAt,dedupeKey) VALUES(?,?,?,?,?,?,?,NULL,NULL)")
      .run(event.id, event.userId, event.title, event.body, event.type, eventData);
  }
  const preferences = notificationPreferences.get(db, userId);
  const pushAllowed = notificationPreferences.allows(db, userId, event.type);
  if (!pushAllowed) return { recorded: true, pushSuppressed: true, delivered: false, queued: 0, delivery: null, eventId: event.id };
  const quiet = notificationDigest.withinQuietHours(new Date().toISOString(), preferences.quietStart, preferences.quietEnd);
  const decision = notificationPolicy.deliveryDecision({
    category: event.data?.category || event.type,
    priority: event.data?.priority || "normal",
    channel: "push",
    enabled: true,
    quiet,
    providerReady: true,
  });
  if (!decision.allowed) return { recorded: true, pushSuppressed: true, suppressionReason: decision.reason, delivered: false, queued: 0, delivery: null, eventId: event.id };
  const tokens = db.prepare("SELECT token FROM push_tokens WHERE userId = ?").all(userId).map((r) => r.token);
  const queued = notificationDelivery.enqueue(db, event, tokens);
  const delivery = await notificationDelivery.deliverDue(db, new Date(), notificationDelivery.MAX_BATCH);
  if (delivery.failed || delivery.retried) console.warn("push delivery deferred:", delivery);
  return { recorded: true, delivered: delivery.delivered > 0, queued, delivery, eventId: event.id };
}

// Tell each vendor with items in this order (once per vendor).
function notifyVendorsOfOrder(orderId, title) {
  const rows = db.prepare(
    `SELECT i.name, i.quantity, v.userId as vendorUserId FROM mall_order_items i
     JOIN vendors v ON v.id = i.vendorId WHERE i.orderId = ?`
  ).all(orderId);
  const byVendor = new Map();
  for (const r of rows) {
    if (!byVendor.has(r.vendorUserId)) byVendor.set(r.vendorUserId, []);
    byVendor.get(r.vendorUserId).push(`${r.quantity} × ${r.name}`);
  }
  for (const [uid, lines] of byVendor) sendPush(uid, title, lines.join(", ").slice(0, 140), { screen: "mall_vendor", orderId });
}

// -- Checkout & orders --
// Stock is decremented inside one transaction with a guarded UPDATE
// (stock >= qty), so two shoppers can't both buy the last unit and a failure
// on any line rolls everything back. A cart with mixed currencies is split
// into one order per currency (all inside the same transaction).
class CheckoutError extends Error {}

// Each vendor moves their own items through this lifecycle; an order that
// spans several vendors therefore has per-item statuses.
const ORDER_TRANSITIONS = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
const STATUS_RANK = { placed: 0, confirmed: 1, shipped: 2, delivered: 3 };

// A vendor is warned once when a product's stock falls to this number or below.
const LOW_STOCK_THRESHOLD = 5;

// unpaid / partial / paid across the live (non-cancelled) items; "none" if all are cancelled.
function derivePaymentStatus(items) {
  const active = items.filter((i) => i.status !== "cancelled");
  if (!active.length) return "none";
  const paid = active.filter((i) => i.paid).length;
  return paid === 0 ? "unpaid" : paid === active.length ? "paid" : "partial";
}

// Overall status = the least-advanced item that isn't cancelled.
function deriveOrderStatus(items) {
  const active = items.filter((i) => i.status !== "cancelled");
  if (!active.length) return "cancelled";
  return active.reduce((low, i) => (STATUS_RANK[i.status] < STATUS_RANK[low] ? i.status : low), active[0].status);
}

function loadOrder(orderId) {
  const order = db.prepare("SELECT * FROM mall_orders WHERE id = ?").get(orderId);
  if (!order) return null;
  order.items = db.prepare("SELECT * FROM mall_order_items WHERE orderId = ?").all(orderId);
  const reviews = new Map(db.prepare("SELECT orderItemId, rating, comment, sellerReply, sellerRepliedAt FROM mall_reviews WHERE orderId = ?").all(orderId).map((r) => [r.orderItemId, r]));
  for (const i of order.items) {
    const r = reviews.get(i.id);
    i.review = r ? { rating: r.rating, comment: r.comment || "", reply: r.sellerReply || null, repliedAt: r.sellerReply ? r.sellerRepliedAt : null } : null;
    i.receipt = social.receiptOf(i);
  }
  order.status = deriveOrderStatus(order.items);
  order.paymentStatus = derivePaymentStatus(order.items);
  return order;
}

function rollbackUnpaidCheckout(orderId, now) {
  return db.transaction(() => {
    const items = db.prepare("SELECT productId, variantId, quantity, status FROM mall_order_items WHERE orderId = ?").all(orderId);
    for (const item of items) {
      if (item.status !== "cancelled") {
        productStock.release(db, { productId: item.productId, variantId: item.variantId, qty: item.quantity, now });
      }
    }
    db.prepare("UPDATE mall_order_items SET status = 'cancelled' WHERE orderId = ? AND status != 'cancelled'").run(orderId);
    db.prepare("UPDATE mall_orders SET status = 'cancelled' WHERE id = ?").run(orderId);
    return items.length;
  })();
}

function notifyCheckoutVendors(orderIds, lowStockHits) {
  for (const id of orderIds) notifyVendorsOfOrder(id, "New order 🛍️");
  for (const hit of lowStockHits) {
    const v = db.prepare("SELECT userId FROM vendors WHERE id = ?").get(hit.vendorId);
    if (v) sendPush(v.userId, hit.left === 0 ? "Sold out" : "Low stock", `${hit.name}: ${hit.left === 0 ? "none" : hit.left} left`, { screen: "mall_vendor" });
  }
}


function marketplaceFeePreview(userId, amount, currency = "NGN") {
  const amountMinor = Math.round(Number(amount) * 100);
  return feePreview(db, userId, "marketplace_service", { amountMinor, currency });
}

function marketplaceFeeWalletReady(userId, preview) {
  const wallet = require("./wallet");
  const feeMinor = Math.round(Number(preview?.fee?.amount || 0) * 100);
  const balance = wallet.availableMinor(db, userId, preview?.fee?.currency || "NGN");
  const capRemainingMinor = preview?.capRemaining ? Math.round(Number(preview.capRemaining.amount) * 100) : null;
  if (feeMinor > balance) return { ok: false, error: "Add enough funds to your NEXA Wallet to cover the Dream Marketplace service fee before checkout." };
  if (capRemainingMinor !== null && feeMinor > capRemainingMinor) return { ok: false, error: "Your monthly NEXA spending cap would be exceeded by this Marketplace service fee." };
  return { ok: true, balanceMinor: balance, feeMinor };
}

function settleMarketplaceFee(dbConn, userId, orderId) {
  const order = dbConn.prepare("SELECT feeStatus,feeChargeId,feePreviewId,total,currency FROM mall_orders WHERE id=? AND userId=?").get(orderId, userId);
  if (!order) throw new Error("Marketplace order not found.");
  if (String(order.feeStatus || "").toLowerCase() === "paid" || String(order.feeStatus || "").toLowerCase() === "bundled") {
    return { settled: true, idempotent: true, feeStatus: order.feeStatus, feeChargeId: order.feeChargeId || null };
  }
  const fee = chargeServiceFee(dbConn, userId, "marketplace_service", { idempotencyKey: `marketplace:${orderId}`, withinTransaction: true, previewId: order.feePreviewId, actionAmountMinor: Math.round(Number(order.total) * 100), currency: order.currency });
  const feeStatus = fee.charged ? "paid" : "bundled";
  dbConn.prepare("UPDATE mall_orders SET feeStatus=?,feeChargeId=? WHERE id=? AND userId=?").run(feeStatus, fee.charge?.id || null, orderId, userId);
  return { settled: true, idempotent: Boolean(fee.idempotent), feeStatus, fee: fee.fee, feeChargeId: fee.charge?.id || null };
}

function marketplaceCheckoutIdempotency(userId, requestKey) {
  const row = db.prepare("SELECT status,responseJson,createdAt FROM mall_checkout_idempotency WHERE buyerId=? AND requestKey=?").get(userId, requestKey);
  if (!row) return null;
  const replay = idempotencyReplayWindow(row.createdAt);
  if (!replay.valid) {
    db.prepare("DELETE FROM mall_checkout_idempotency WHERE buyerId=? AND requestKey=?").run(userId, requestKey);
    return null;
  }
  if (row.status === "completed" && row.responseJson) {
    try { return { status: "completed", response: JSON.parse(row.responseJson) }; } catch (_) {
      db.prepare("DELETE FROM mall_checkout_idempotency WHERE buyerId=? AND requestKey=?").run(userId, requestKey);
      return null;
    }
  }
  return { status: "processing" };
}

app.post("/api/mall/checkout", auth.authMiddleware, async (req, res) => {
  const requestKey = boundedIdempotencyKey(req.headers["idempotency-key"] || req.body?.idempotencyKey);
  if (!requestKey) return res.status(400).json({ error: "A valid Idempotency-Key is required for Marketplace checkout." });
  const replay = marketplaceCheckoutIdempotency(req.user.id, requestKey);
  if (replay?.status === "completed") return res.json({ ...replay.response, idempotent: true });
  if (replay?.status === "processing") return res.status(409).json({ error: "This Marketplace checkout request is already being processed. Please wait and refresh your orders." });

  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const feePreviewId = String(req.body?.feePreviewId || "").trim();
  const deliveryAddress = String(req.body?.deliveryAddress || "").trim().slice(0, 300);
  const note = req.body?.note ? String(req.body.note).trim().slice(0, 300) : null;
  if (!rawItems.length) return res.status(400).json({ error: "Your cart is empty." });
  if (rawItems.length > 50) return res.status(400).json({ error: "Too many items in one order." });
  if (!deliveryAddress) return res.status(400).json({ error: "A delivery address is required." });
  const paymentMethod = String(req.body?.paymentMethod || "pay_seller");
  if (!["pay_seller", "online", "aami"].includes(paymentMethod)) return res.status(400).json({ error: "Invalid payment method." });
  if (paymentMethod === "online") {
    if (!payments.isEnabled()) return res.status(409).json({ error: "Online payment is not enabled yet. Choose “Pay the seller directly”." });
    if (String(process.env.PAYMENT_MODE || "live").toLowerCase() !== "mock" && !process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ error: "Online payment is configured but the Paystack secret key is missing." });
    if (String(req.body?.email || req.user?.email || "").trim() === "") return res.status(400).json({ error: "A customer email is required for online payment." });
  }

  if (paymentMethod === "aami") {
    const ids = [...new Set(rawItems.map((it) => String(it?.productId || "")).filter(Boolean))];
    if (!ids.length) return res.status(400).json({ error: "Your cart is empty." });
    const placeholders = ids.map(() => "?").join(",");
    const currencies = db.prepare(`SELECT DISTINCT currency FROM mall_products WHERE active = 1 AND id IN (${placeholders})`).all(...ids).map((r) => String(r.currency || "").toUpperCase());
    if (currencies.length !== 1 || currencies[0] !== "NGN") return res.status(409).json({ error: "Aami Marketplace payments currently support NGN Dream Marketplace orders only." });
  }

  // Merge duplicate lines and validate quantities.
  // A line is one product, or one size/colour of a product (variantId), so two sizes of the same
  // shirt stay two lines.
  const wanted = new Map(); // key -> { productId, variantId, qty }
  for (const it of rawItems) {
    const productId = String(it?.productId || "");
    const variantId = it?.variantId ? String(it.variantId) : null;
    const qty = Math.floor(Number(it?.quantity));
    if (!productId || !Number.isFinite(qty) || qty < 1 || qty > 99) {
      return res.status(400).json({ error: "Invalid item in your cart." });
    }
    const key = `${productId}\u0000${variantId || ""}`;
    const prev = wanted.get(key);
    wanted.set(key, { productId, variantId, qty: (prev?.qty || 0) + qty });
  }

  // Online checkout is currently NGN-only and must produce exactly one order.
  // Validate this before reserving stock; rejecting after the transaction would strand
  // inventory in an order the buyer cannot pay for.
  if (paymentMethod === "online") {
    const ids = [...new Set([...wanted.values()].map((w) => w.productId))];
    const placeholders = ids.map(() => "?").join(",");
    const currencies = db.prepare(`SELECT DISTINCT currency FROM mall_products WHERE active = 1 AND id IN (${placeholders})`).all(...ids).map((r) => String(r.currency || "").toUpperCase());
    if (currencies.length !== 1) return res.status(409).json({ error: "Online payment currently supports one-currency orders only." });
    if (currencies[0] !== "NGN") return res.status(409).json({ error: "Online payment currently supports NGN orders only." });
  }

  // Reserve the idempotency key only after basic request validation has passed.
  // This prevents malformed requests from poisoning a reusable checkout key.
  try {
    db.prepare("INSERT INTO mall_checkout_idempotency(buyerId,requestKey,status,createdAt,updatedAt) VALUES(?,?,?,?,?)").run(req.user.id, requestKey, "processing", new Date().toISOString(), new Date().toISOString());
  } catch (e) {
    const again = marketplaceCheckoutIdempotency(req.user.id, requestKey);
    if (again?.status === "completed") return res.json({ ...again.response, idempotent: true });
    return res.status(409).json({ error: "This Marketplace checkout request is already being processed. Please wait and refresh your orders." });
  }

  // V3.96: every Marketplace checkout must disclose the fixed NEXA service fee
  // before confirmation. The server recalculates it again at settlement time.
  const estimatedLines = [...wanted.values()].map(({ productId, qty }) => {
    const row = db.prepare(`SELECT ${PRODUCT_COLS} FROM mall_products p WHERE p.id=? AND p.active=1`).get(productId);
    return row ? { row, qty } : null;
  }).filter(Boolean);
  const estimatedTotal = estimatedLines.reduce((sum, entry) => sum + effectivePrice(entry.row) * entry.qty, 0);
  if (!Number.isFinite(estimatedTotal) || estimatedTotal <= 0) return res.status(409).json({ error: "Could not calculate the Marketplace order total." });
  let marketplaceFee;
  try {
    const feeCurrency = estimatedLines[0]?.row?.currency || "NGN";
    const currencies = [...new Set(estimatedLines.map(entry => String(entry.row.currency || "NGN").toUpperCase()))];
    if (currencies.length !== 1) return res.status(409).json({ error: "Marketplace checkout currently requires one currency so the displayed NEXA service fee matches the confirmed order." });
    marketplaceFee = assertFeePreview(db, req.user.id, feePreviewId, "marketplace_service", { amountMinor: Math.round(estimatedTotal * 100), currency: feeCurrency });
    const ready = marketplaceFeeWalletReady(req.user.id, { fee: { amount: Number(marketplaceFee.feeMinor) / 100, currency: feeCurrency }, capRemaining: null });
    if (!ready.ok) {
      db.prepare("DELETE FROM mall_checkout_idempotency WHERE buyerId=? AND requestKey=?").run(req.user.id, requestKey);
      return res.status(409).json({ error: ready.error, preview: marketplaceFee });
    }
  } catch (e) {
    db.prepare("DELETE FROM mall_checkout_idempotency WHERE buyerId=? AND requestKey=?").run(req.user.id, requestKey);
    return res.status(400).json({ error: e.message || "Marketplace service fee preview is unavailable." });
  }

  const now = new Date().toISOString();
  const orderIds = [];
  const lowStockHits = [];

  try {
    db.transaction(() => {
      const byCurrency = new Map();
      for (const { productId, variantId, qty } of wanted.values()) {
        const p = db.prepare(
          `SELECT ${PRODUCT_COLS}, v.shopName as vendorName FROM mall_products p
           JOIN vendors v ON v.id = p.vendorId WHERE p.id = ? AND p.active = 1 AND COALESCE(v.status, 'active') = 'active'`
        ).get(productId);
        if (!p) throw new CheckoutError("An item in your cart is no longer available.");
        const taken = productStock.reserve(db, { productId, variantId, qty, now });
        if (!taken.ok) throw new CheckoutError(taken.message);
        const stockAfter = taken.after;
        if (taken.before > LOW_STOCK_THRESHOLD && stockAfter <= LOW_STOCK_THRESHOLD) lowStockHits.push({ vendorId: p.vendorId, name: p.name, left: stockAfter });
        if (!byCurrency.has(p.currency)) byCurrency.set(p.currency, []);
        byCurrency.get(p.currency).push({ p, qty, variantId: taken.variantId, variantLabel: taken.variantLabel });
      }

      const insOrder = db.prepare(
        "INSERT INTO mall_orders (id, userId, total, currency, status, deliveryAddress, note, paymentMethod, createdAt, feePreviewId) VALUES (?,?,?,?,?,?,?,?,?,?)"
      );
      const insItem = db.prepare(
        "INSERT INTO mall_order_items (id, orderId, productId, vendorId, vendorName, name, price, quantity, imageEmoji, imageColor, status, variantId, variantLabel) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
      );
      for (const [currency, lines] of byCurrency) {
        const orderId = genRowId("o");
        const total = lines.reduce((n, { p, qty }) => n + effectivePrice(p) * qty, 0);
        insOrder.run(orderId, req.user.id, total, currency, "placed", deliveryAddress, note, paymentMethod, now, feePreviewId);
        const insertedItems = [];
        for (const { p, qty, variantId, variantLabel } of lines) {
          const item = { id: genRowId("oi"), orderId, productId: p.id, vendorId: p.vendorId, vendorName: p.vendorName, name: p.name, price: effectivePrice(p), quantity: qty, imageEmoji: p.imageEmoji, imageColor: p.imageColor, status: "placed", variantId, variantLabel };
          insItem.run(item.id, orderId, p.id, p.vendorId, p.vendorName, p.name, item.price, qty, p.imageEmoji, p.imageColor, "placed", variantId, variantLabel);
          insertedItems.push(item);
        }
        const invariant = criticalControls.orderAmountInvariant({ total }, insertedItems);
        if (!invariant.ok) throw new CheckoutError("Order total integrity check failed; checkout was not completed.");
        if (paymentMethod === "pay_seller") settleMarketplaceFee(db, req.user.id, orderId);
        if (paymentMethod === "aami") {
          const totalCoins = Math.max(1, aamiEconomy.ngnToAami(total));
          const paid = aamiEconomy.debit(db, req.user.id, totalCoins, "dream_marketplace_purchase", orderId, `dream-marketplace:${requestKey}:${orderId}`, { currency, orderId });
          if (paid.duplicate) throw new CheckoutError("This Aami Marketplace payment was already applied.");
          db.prepare("UPDATE mall_order_items SET paid=1,paidAt=? WHERE orderId=? AND status!='cancelled'").run(now, orderId);
        }
        orderIds.push(orderId);
      }
    })();
  } catch (e) {
    db.prepare("DELETE FROM mall_checkout_idempotency WHERE buyerId=? AND requestKey=?").run(req.user.id, requestKey);
    if (e instanceof CheckoutError) return res.status(409).json({ error: e.message });
    console.error("checkout failed", e);
    return res.status(500).json({ error: "Could not place your order. Please try again." });
  }
  if (paymentMethod === "online") {
    if (orderIds.length !== 1) return res.status(409).json({ error: "Online payment currently supports one-currency orders only." });
    const orderId = orderIds[0];
    const order = loadOrder(orderId);
    if (order.currency !== "NGN") return res.status(409).json({ error: "Online payment currently supports NGN orders only." });
    const reference = `nexa-${orderId}-${Date.now()}`;
    try {
      const pay = await payments.initialize({
        email: String(req.body?.email || req.user.email),
        amountMinor: Math.round(Number(order.total) * 100),
        currency: order.currency, reference, metadata: { orderId, userId: req.user.id }
      });
      db.prepare("UPDATE mall_orders SET paymentRef = ? WHERE id = ?").run(pay.reference, orderId);
      if (String(process.env.PAYMENT_MODE || "live").toLowerCase() === "mock") {
        const nowPaid = new Date().toISOString();
        db.transaction(() => {
          db.prepare("UPDATE mall_orders SET providerVerified=1 WHERE id=?").run(orderId);
          settleMarketplaceFee(db, req.user.id, orderId);
          db.prepare("UPDATE mall_order_items SET paid = 1, paidAt = ? WHERE orderId = ? AND status != 'cancelled'").run(nowPaid, orderId);
        })();
      }
      // Payment initialization succeeded, so now (and only now) publish the checkout
      // notifications that were intentionally deferred until payment setup succeeded.
      notifyCheckoutVendors(orderIds, lowStockHits);
      const response = { orders: [loadOrder(orderId)], payment: pay };
      db.prepare("UPDATE mall_checkout_idempotency SET status='completed',responseJson=?,updatedAt=? WHERE buyerId=? AND requestKey=?").run(JSON.stringify(response), new Date().toISOString(), req.user.id, requestKey);
      return res.json({ orders: [loadOrder(orderId)], payment: pay });
    } catch (e) {
      console.error("payment initialization failed", e);
      try {
        rollbackUnpaidCheckout(orderId, new Date().toISOString());
      } catch (rollbackError) {
        console.error("checkout rollback failed after payment initialization failure", rollbackError);
        return res.status(500).json({ error: "The payment page could not be started and the order requires support reconciliation before retrying." });
      }
      db.prepare("DELETE FROM mall_checkout_idempotency WHERE buyerId=? AND requestKey=?").run(req.user.id, requestKey);
      return res.status(502).json({ error: "The payment page could not be started. Your order was cancelled and reserved stock was released. Please try again." });
    }
  }
  notifyCheckoutVendors(orderIds, lowStockHits);
  const response = { orders: orderIds.map(loadOrder), fee: marketplaceFee };
  db.prepare("UPDATE mall_checkout_idempotency SET status='completed',responseJson=?,updatedAt=? WHERE buyerId=? AND requestKey=?").run(JSON.stringify(response), new Date().toISOString(), req.user.id, requestKey);
  res.json(response);
});

app.get("/api/mall/orders", auth.authMiddleware, (req, res) => {
  const ids = db.prepare("SELECT id FROM mall_orders WHERE userId = ? ORDER BY createdAt DESC LIMIT 50").all(req.user.id);
  res.json({ orders: ids.map((r) => loadOrder(r.id)) });
});

// Buyers can cancel only while nothing has been confirmed yet. After a seller
// starts processing, cancelling is between the two of them.
app.post("/api/mall/orders/:orderId/cancel", auth.authMiddleware, (req, res) => {
  const order = db.prepare("SELECT id FROM mall_orders WHERE id = ? AND userId = ?").get(req.params.orderId, req.user.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  const active = db.prepare("SELECT * FROM mall_order_items WHERE orderId = ? AND status != 'cancelled'").all(order.id);
  if (!active.length) return res.json({ order: loadOrder(order.id) }); // already cancelled — idempotent
  const orderState = db.prepare("SELECT status, paymentMethod, paymentRef FROM mall_orders WHERE id = ?").get(order.id);
  if (String(orderState?.paymentMethod || "").toLowerCase() === "online" && String(orderState?.paymentRef || "").trim()) {
    return res.status(409).json({ error: "Online payment has already been initialized for this order, so it can't be cancelled here." });
  }
  if (active.some((i) => i.status !== "placed")) {
    return res.status(409).json({ error: "A seller has already started processing this order, so it can't be cancelled here. Please contact them." });
  }
  if (active.some((i) => i.paid) && String(orderState?.paymentMethod || "").toLowerCase() !== "aami") {
    return res.status(409).json({ error: "The seller has already recorded your payment, so this can't be cancelled here. Please contact them." });
  }
  const now = new Date().toISOString();
  const stockBefore = social.snapshotProducts(active.map((i) => i.productId));
  let cancelled = false;
  try {
    cancelled = db.transaction(() => {
      // Re-read every cancellation boundary inside the write transaction. The earlier reads
      // are only a fast path; they must not authorize a stale state after a seller/payment
      // transition wins the race.
      const currentOrder = db.prepare("SELECT status, paymentMethod, paymentRef FROM mall_orders WHERE id = ? AND userId = ?").get(order.id, req.user.id);
      if (!currentOrder) { const e = new Error("Order not found."); e.statusCode = 404; throw e; }
      if (String(currentOrder.paymentMethod || "").toLowerCase() === "online" && String(currentOrder.paymentRef || "").trim()) {
        const e = new Error("Online payment has already been initialized for this order, so it can't be cancelled here."); e.statusCode = 409; throw e;
      }
      const currentActive = db.prepare("SELECT * FROM mall_order_items WHERE orderId = ? AND status != 'cancelled'").all(order.id);
      if (!currentActive.length) return false;
      if (currentActive.some((i) => i.status !== "placed")) {
        const e = new Error("A seller has already started processing this order, so it can't be cancelled here. Please contact them."); e.statusCode = 409; throw e;
      }
      if (currentActive.some((i) => i.paid) && String(currentOrder.paymentMethod || "").toLowerCase() !== "aami") {
        const e = new Error("The seller has already recorded your payment, so this can't be cancelled here. Please contact them."); e.statusCode = 409; throw e;
      }
      for (const i of currentActive) {
        const changed = db.prepare("UPDATE mall_order_items SET status = 'cancelled' WHERE id = ? AND status = 'placed' AND paid = 0").run(i.id);
        if (!changed.changes) {
          const e = new Error("This order changed before the cancellation was completed. Please refresh and try again."); e.statusCode = 409; throw e;
        }
        productStock.release(db, { productId: i.productId, variantId: i.variantId, qty: i.quantity, now });
      }
      const orderChanged = db.prepare("UPDATE mall_orders SET status = 'cancelled' WHERE id = ? AND userId = ? AND status != 'cancelled'").run(order.id, req.user.id);
      if (!orderChanged.changes) {
        const e = new Error("This order changed before the cancellation was completed. Please refresh and try again."); e.statusCode = 409; throw e;
      }
      db.prepare("INSERT INTO mall_order_events(id,orderId,actorId,fromStatus,toStatus,note,createdAt) VALUES(?,?,?,?,?,?,?)")
        .run(genRowId("oe"), order.id, req.user.id, currentOrder.status || "placed", "cancelled", "Order cancelled by buyer", now);
      return true;
    })();
  } catch (e) {
    if (e?.statusCode === 404) return res.status(404).json({ error: e.message });
    if (e?.statusCode === 409) return res.status(409).json({ error: e.message });
    throw e;
  }
  if (!cancelled) return res.json({ order: loadOrder(order.id) });
  social.notifyProductChanges(stockBefore); // cancelled units go back on the shelf: someone may have been waiting
  notifyVendorsOfOrder(order.id, "Order cancelled by buyer");
  res.json({ order: loadOrder(order.id) });
});

// -- Vendor side: orders containing this vendor's items --
// Buyer name/email are included because there's no in-app payment yet: the
// vendor needs a way to reach the buyer to arrange it.
app.get("/api/mall/vendor/orders", auth.authMiddleware, requireVendorAccess, (req, res) => {
  const rows = db.prepare(
    `SELECT i.*, o.createdAt as orderCreatedAt, o.currency as currency, o.deliveryAddress, o.note, o.paymentMethod as paymentMethod,
            u.name as buyerName, u.email as buyerEmail
     FROM mall_order_items i
     JOIN mall_orders o ON o.id = i.orderId
     LEFT JOIN users u ON u.id = o.userId
     WHERE i.vendorId = ? ORDER BY o.createdAt DESC LIMIT 200`
  ).all(req.vendor.id);

  const grouped = new Map();
  for (const r of rows) {
    if (!grouped.has(r.orderId)) {
      grouped.set(r.orderId, {
        orderId: r.orderId, createdAt: r.orderCreatedAt, currency: r.currency,
        buyerName: r.buyerName, buyerEmail: r.buyerEmail,
        deliveryAddress: r.deliveryAddress, note: r.note, paymentMethod: r.paymentMethod, subtotal: 0, items: [],
      });
    }
    const g = grouped.get(r.orderId);
    g.items.push({ id: r.id, productId: r.productId, name: r.name, price: r.price, quantity: r.quantity, status: r.status, paid: !!r.paid,
                   variantId: r.variantId || null, variantLabel: r.variantLabel || null,
                   imageEmoji: r.imageEmoji, imageColor: r.imageColor, receipt: social.receiptOf(r) });
    if (r.status !== "cancelled") g.subtotal += r.price * r.quantity;
  }
  const orders = [...grouped.values()].map((g) => {
    const live = g.items.filter((i) => i.status !== "cancelled");
    // Seller fulfilment needs a delivery destination, but does not need the buyer's
    // private account email. Keep contact discovery inside NEXA's authenticated flows.
    return { ...g, buyerEmail: undefined, status: deriveOrderStatus(g.items), paid: live.length > 0 && live.every((i) => i.paid) };
  });
  res.json({ orders: orders.map(({ buyerEmail, ...order }) => order) });
});

app.get("/api/mall/orders/:orderId/events", auth.authMiddleware, (req, res) => {
  const order = db.prepare("SELECT id, userId FROM mall_orders WHERE id = ?").get(req.params.orderId);
  if (!order) return res.status(404).json({ error: "Order not found." });
  const seller = db.prepare("SELECT 1 FROM mall_order_items i JOIN vendors v ON v.id = i.vendorId WHERE i.orderId = ? AND v.userId = ? LIMIT 1").get(order.id, req.user.id);
  if (order.userId !== req.user.id && !seller) return res.status(404).json({ error: "Order not found." });
  const events = db.prepare("SELECT id, fromStatus, toStatus, note, createdAt FROM mall_order_events WHERE orderId = ? ORDER BY createdAt ASC, id ASC LIMIT 100").all(order.id);
  res.json({ events });
});

app.patch("/api/mall/vendor/orders/:orderId/status", auth.authMiddleware, requireVendorAccess, (req, res) => {
  const next = String(req.body?.status || "");
  if (!Object.prototype.hasOwnProperty.call(ORDER_TRANSITIONS, next) || next === "placed") {
    return res.status(400).json({ error: "Invalid status." });
  }
  const rows = db.prepare("SELECT * FROM mall_order_items WHERE orderId = ? AND vendorId = ?").all(req.params.orderId, req.vendor.id);
  if (!rows.length) return res.status(404).json({ error: "Order not found." });

  // Cancelled lines stay cancelled; every other line must be allowed to move to `next`.
  const movable = rows.filter((r) => r.status !== "cancelled" && r.status !== next);
  const blocked = movable.find((r) => !ORDER_TRANSITIONS[r.status].includes(next));
  if (blocked) return res.status(409).json({ error: `An item is "${blocked.status}" and can't be moved to "${next}".` });
  if (!movable.length) return res.json({ ok: true, status: next });

  const now = new Date().toISOString();
  const stockBefore = next === "cancelled" ? social.snapshotProducts(movable.map((r) => r.productId)) : null;
  let changed = false;
  try {
    changed = db.transaction(() => {
      // Re-read the vendor-owned lines inside the same write transaction. The earlier query
      // only decides whether this request is worth entering the transaction; the transaction
      // itself is the authoritative state-transition boundary.
      const currentRows = db.prepare("SELECT * FROM mall_order_items WHERE orderId = ? AND vendorId = ?").all(req.params.orderId, req.vendor.id);
      if (!currentRows.length) { const error = new Error("Order not found."); error.statusCode = 404; throw error; }
      const currentMovable = currentRows.filter((r) => r.status !== "cancelled" && r.status !== next);
      const currentBlocked = currentMovable.find((r) => !ORDER_TRANSITIONS[r.status]?.includes(next));
      if (currentBlocked) {
        const error = new Error(`An item is "${currentBlocked.status}" and can't be moved to "${next}".`);
        error.statusCode = 409;
        throw error;
      }
      if (!currentMovable.length) return false;
      if (next === "cancelled") {
        // Re-read the payment boundary inside the same write transaction as the cancellation.
        const orderPayment = db.prepare("SELECT paymentMethod, paymentRef FROM mall_orders WHERE id = ?").get(req.params.orderId);
        if (String(orderPayment?.paymentMethod || "").toLowerCase() === "online" && String(orderPayment?.paymentRef || "").trim()) {
          const error = new Error("Online payment has already been initialized for this order, so a seller cannot cancel it here. Reconcile the payment before cancelling.");
          error.statusCode = 409;
          throw error;
        }
      }
      for (const r of currentMovable) {
        const changedLine = db.prepare("UPDATE mall_order_items SET status = ? WHERE id = ? AND status = ?").run(next, r.id, r.status);
        if (!changedLine.changes) {
          const error = new Error("An order item changed before the fulfilment update completed.");
          error.statusCode = 409;
          throw error;
        }
        if (next === "delivered") db.prepare("UPDATE mall_order_items SET deliveredAt = ? WHERE id = ? AND deliveredAt IS NULL").run(now, r.id);
        if (next === "cancelled") {
          // Put the reserved units back on the shelf (no-op if the product was deleted).
          productStock.release(db, { productId: r.productId, variantId: r.variantId, qty: r.quantity, now });
        }
      }
      const all = db.prepare("SELECT status FROM mall_order_items WHERE orderId = ?").all(req.params.orderId);
      const previousOrder = db.prepare("SELECT status FROM mall_orders WHERE id = ?").get(req.params.orderId);
      const derived = deriveOrderStatus(all);
      db.prepare("UPDATE mall_orders SET status = ? WHERE id = ?").run(derived, req.params.orderId);
      db.prepare("INSERT INTO mall_order_events(id,orderId,actorId,fromStatus,toStatus,note,createdAt) VALUES(?,?,?,?,?,?,?)")
        .run(genRowId("oe"), req.params.orderId, req.user.id, previousOrder?.status || null, derived, `Seller ${next} order items`, now);
      return true;
    })();
  } catch (e) {
    if (e?.statusCode === 409) return res.status(409).json({ error: e.message });
    throw e;
  }
  if (!changed) return res.json({ ok: true, status: next });
  if (stockBefore) social.notifyProductChanges(stockBefore);
  const buyerRow = db.prepare("SELECT userId FROM mall_orders WHERE id = ?").get(req.params.orderId);
  if (next === 'delivered') {
    try {
      const vendorOwner=db.prepare("SELECT userId FROM vendors WHERE id=?").get(req.vendor.id);
      if(vendorOwner?.userId) aamiEconomy.awardActivity(db,vendorOwner.userId,'seller_order',`${req.params.orderId}:${req.vendor.id}`,{orderId:req.params.orderId,vendorId:req.vendor.id});
    } catch (_) {}
  }
  if (buyerRow) {
    const verb = { confirmed: "confirmed", shipped: "shipped", delivered: "marked as delivered", cancelled: "cancelled" }[next];
    const tail = next === "delivered" ? " Did it arrive? Tap to confirm." : "";
    sendPush(buyerRow.userId, `Order ${next}`, `${req.vendor.shopName} ${verb} your order.${tail}`, { screen: "mall_orders", orderId: req.params.orderId });
  }
  res.json({ ok: true, status: next });
});


// V3.86.1 — Yaayz: one permanent NEXA destination for adverts and ticketing.

// V3.87.1 — Leisure Arena / Kitchen
function kitchenUserCode(db,userId,orderId){
  const now=new Date().toISOString();
  const code=leisureArena.ensureReferralCode(db,userId,now);
  db.prepare("UPDATE kitchen_orders SET referralCode=?,updatedAt=? WHERE id=? AND userId=? AND status='paid'").run(code,now,orderId,userId);
  return code;
}
async function generateKitchenReceipt(order){
  if(!grokProvider.isConfigured(process.env)) return null;
  const items=JSON.parse(order.items||'[]');
  const description=items.map(x=>`${x.quantity} ${x.name}`).join(', ');
  try{
    const result=await grokProvider.generateImage({prompt:`Create a polished illustrated food receipt for a NEXA Leisure Arena Kitchen order. The image must visibly depict exactly this order: ${description}. Make the food quantities visually clear. Include a tasteful small title “NEXA Kitchen” and a simple receipt-style composition. Do not add food items that are not in the order.`},{env:process.env,timeoutMs:90000});
    const b64=result?.b64;
    if(!b64) return null;
    const dataUrl=`data:image/png;base64,${b64}`;
    db.prepare("UPDATE kitchen_orders SET receiptImage=?,updatedAt=? WHERE id=?").run(dataUrl,new Date().toISOString(),order.id);
    return dataUrl;
  }catch(e){ console.warn('Kitchen AI receipt generation unavailable:',e?.message||e); return null; }
}
function settleKitchenReferral(db, orderId){
  const order=db.prepare("SELECT * FROM kitchen_orders WHERE id=? AND status='paid'").get(orderId);
  if(!order || !order.referralCode) return {qualified:false,reason:'no_referral'};
  const referral=db.prepare("SELECT * FROM kitchen_referrals WHERE code=?").get(order.referralCode);
  if(!referral || referral.ownerId===order.userId) return {qualified:false,reason:'invalid_referral'};
  const original=db.prepare("SELECT * FROM kitchen_orders WHERE userId=? AND referralCode=? AND status='paid' ORDER BY createdAt ASC LIMIT 1").get(referral.ownerId,referral.code);
  if(!original || String(original.currency).toUpperCase()!==String(order.currency).toUpperCase() || Number(order.total)<Number(original.total)) return {qualified:false,reason:'minimum_or_currency'};
  const amount=Math.floor(Number(order.total)*leisureArena.REFERRAL_RATE);
  if(amount<=0) return {qualified:false,reason:'zero_aami'};
  const reward=aamiEconomy.awardActivity(db,referral.ownerId,'kitchen_referral',order.id,{total:Number(order.total),currency:order.currency,referredByUserId:order.userId});
  if(reward.credited || reward.duplicate){
    try { db.prepare("UPDATE kitchen_cashback_ledger SET status='migrated_to_aami',migratedToAami=1,migrationRef=? WHERE sourceOrderId=?").run(`kitchen-aami:${order.id}`,order.id); } catch (_) {}
  }
  return {qualified:reward.credited,duplicate:reward.duplicate,amount:reward.amount,currency:order.currency,beneficiaryId:referral.ownerId,aami:true};
}

function kitchenFeePreview(userId, amount, currency = "NGN") {
  const amountMinor = Math.round(Number(amount) * 100);
  return feePreview(db, userId, "kitchen_service", { amountMinor, currency });
}

function settleKitchenFee(dbConn, userId, orderId) {
  const order = dbConn.prepare("SELECT feeStatus,feeChargeId,currency,status,providerVerified FROM kitchen_orders WHERE id=? AND userId=?").get(orderId, userId);
  if (!order) throw new Error("Kitchen order not found.");
  if (String(order.status).toLowerCase() !== "paid" || !order.providerVerified) throw new Error("Kitchen payment must be verified before the NEXA service fee can be settled.");
  if (["paid", "bundled"].includes(String(order.feeStatus || "").toLowerCase())) {
    return { settled: true, idempotent: true, feeStatus: order.feeStatus, feeChargeId: order.feeChargeId || null };
  }
  const fee = chargeServiceFee(dbConn, userId, "kitchen_service", { idempotencyKey: `kitchen:${orderId}`, withinTransaction: true, previewId: order.feePreviewId, actionAmountMinor: Math.round(Number(order.total) * 100), currency: order.currency });
  const feeStatus = fee.charged ? "paid" : "bundled";
  dbConn.prepare("UPDATE kitchen_orders SET feeStatus=?,feeChargeId=?,updatedAt=? WHERE id=? AND userId=?").run(feeStatus, fee.charge?.id || null, new Date().toISOString(), orderId, userId);
  return { settled: true, idempotent: Boolean(fee.idempotent), feeStatus, fee: fee.fee, feeChargeId: fee.charge?.id || null };
}

app.get("/api/leisure/discovery", auth.authMiddleware, (req, res) => {
  const tickets=db.prepare("SELECT id,title,type,venue,startsAt,price,currency,quantity FROM yaayz_ticket_listings WHERE active=1 AND quantity>0 ORDER BY CASE WHEN startsAt IS NULL THEN 1 ELSE 0 END,startsAt ASC,createdAt DESC LIMIT 12").all();
  const menu=db.prepare("SELECT key,name,price,currency FROM kitchen_menu WHERE active=1 ORDER BY name ASC LIMIT 20").all();
  res.json({areas:[{id:"kitchen",title:"The Kitchen",route:"/leisure/kitchen",available:menu.length>0},{id:"ball-house",title:"Ball House",route:"/leisure/ball-house",available:true},{id:"game-house",title:"Game House",route:"/leisure/game-house",available:true},{id:"fitness",title:"Fitness",route:"/leisure/fitness",available:true}],upcomingTickets:tickets,menu});
});

// V4.42 — preference-ranked leisure discovery over canonical Yaayz inventory.
// V4.47 — venue collections and ticket-state continuity over canonical inventory.
app.get("/api/leisure/events/collections", auth.authMiddleware, (req,res) => {
  const rows=db.prepare("SELECT id,title,type,venue,startsAt,quantity,active FROM yaayz_ticket_listings WHERE active=1 AND quantity>0 ORDER BY startsAt ASC LIMIT 500").all();
  const mine=db.prepare("SELECT status FROM yaayz_ticket_orders WHERE buyerId=? ORDER BY updatedAt DESC LIMIT 200").all(req.user.id);
  res.json({collections:venueCollections.collections(rows),ticketLifecycle:venueCollections.lifecycle(mine),events:venueDiscovery.upcomingEvents(rows).slice(0,100)});
});

app.get("/api/leisure/events/personalized", auth.authMiddleware, (req,res) => {
  const type=req.query?.type?String(req.query.type).slice(0,40):""; const venue=req.query?.venue?String(req.query.venue).slice(0,100):"";
  const rows=db.prepare("SELECT id,title,type,venue,startsAt,endsAt,price,currency,quantity FROM yaayz_ticket_listings WHERE active=1 AND quantity>0 ORDER BY startsAt ASC LIMIT 500").all();
  const events=venueDiscovery.upcomingEvents(venuePersonalization.rankEvents(rows,{type,venue}));
  res.json({events:events.slice(0,50),preferences:{type:type||null,venue:venue||null}});
});

app.get('/api/leisure/kitchen/fee-preview',auth.authMiddleware,(req,res)=>{
  const currency = String(req.query?.currency || "NGN").trim().toUpperCase();
  let items;
  try { items = leisureArena.normalizeItems(JSON.parse(String(req.query?.items || "[]"))); }
  catch(e) { return res.status(400).json({error:e.message||'Valid Kitchen items are required.'}); }
  const prices=Object.fromEntries(db.prepare("SELECT key,price FROM kitchen_menu WHERE active=1").all().map(x=>[x.key,x.price]));
  for(const item of items) if(!(item.key in prices)) return res.status(409).json({error:'One or more Kitchen items are unavailable.'});
  const amount=leisureArena.orderTotal(items,prices);
  try {
    const preview = kitchenFeePreview(req.user.id, amount, currency);
    res.json({preview,orderTotal:amount,currency,items});
  } catch(e) { res.status(400).json({error:e.message||'Kitchen service fee preview is unavailable.'}); }
});

app.get("/api/leisure/fulfillment",auth.authMiddleware,(req,res)=>res.json(leisureFulfillment.userStatus(db,req.user.id)));

app.get('/api/leisure/kitchen/menu',auth.authMiddleware,(req,res)=>{
  const rows=db.prepare("SELECT key,name,price,currency FROM kitchen_menu WHERE active=1 ORDER BY rowid").all();
  res.json({menu:rows});
});
app.get('/api/leisure/kitchen/orders',auth.authMiddleware,(req,res)=>{
  const rows=db.prepare("SELECT id,items,total,currency,status,paymentRef,providerVerified,feeStatus,feeChargeId,referralCode,createdAt,updatedAt FROM kitchen_orders WHERE userId=? ORDER BY createdAt DESC LIMIT 50").all(req.user.id).map(x=>({...x,items:JSON.parse(x.items||'[]'),receiptUrl:x.receiptImage?`/api/leisure/kitchen/orders/${x.id}/receipt`:null}));
  res.json({orders:rows});
});
app.get('/api/leisure/kitchen/referral',auth.authMiddleware,(req,res)=>{
  const code=leisureArena.ensureReferralCode(db,req.user.id);
  const aami=aamiEconomy.balance(db,req.user.id);
  const entries=db.prepare("SELECT id,sourceOrderId,referredByUserId,amount,currency,status,createdAt,migratedToAami FROM kitchen_cashback_ledger WHERE beneficiaryId=? ORDER BY createdAt DESC LIMIT 100").all(req.user.id);
  res.json({code,deepLink:`nexa://leisure/kitchen/ref/${code}`,cashbackBalance:0,aamiBalance:aami,unit:'Aami',legacyCashbackHistory:entries});
});
app.get('/api/leisure/kitchen/orders/:id/receipt',auth.authMiddleware,(req,res)=>{
  const row=db.prepare("SELECT receiptImage FROM kitchen_orders WHERE id=? AND userId=?").get(req.params.id,req.user.id);
  if(!row?.receiptImage) return res.status(404).end();
  const m=String(row.receiptImage).match(/^data:(image\/png);base64,([A-Za-z0-9+/=]+)$/); if(!m) return res.status(404).end();
  res.setHeader('Content-Type','image/png'); res.setHeader('Cache-Control','private, max-age=31536000'); return res.send(Buffer.from(m[2],'base64'));
});
app.get('/api/leisure/kitchen/orders/:id/receipt-data',auth.authMiddleware,(req,res)=>{ const row=db.prepare("SELECT receiptImage FROM kitchen_orders WHERE id=? AND userId=?").get(req.params.id,req.user.id); if(!row?.receiptImage) return res.status(404).json({error:'Receipt not available.'}); res.json({dataUrl:row.receiptImage}); });
app.post('/api/leisure/kitchen/orders',auth.authMiddleware,async(req,res)=>{
  try{
    const items=leisureArena.normalizeItems(req.body?.items);
    const feePreviewId=String(req.body?.feePreviewId||'').trim();
    const prices=Object.fromEntries(db.prepare("SELECT key,price FROM kitchen_menu WHERE active=1").all().map(x=>[x.key,x.price]));
    for(const item of items) if(!(item.key in prices)) return res.status(409).json({error:'One or more Kitchen items are unavailable.'});
    const total=leisureArena.orderTotal(items,prices); const currency='NGN';
    const referralCode=String(req.body?.referralCode||'').trim().toUpperCase()||null;
    assertFeePreview(db, req.user.id, feePreviewId, 'kitchen_service', { amountMinor: Math.round(total*100), currency });
    if(referralCode){const ref=db.prepare("SELECT ownerId FROM kitchen_referrals WHERE code=?").get(referralCode);if(!ref)return res.status(400).json({error:'Referral code not found.'});if(ref.ownerId===req.user.id)return res.status(400).json({error:'You cannot refer yourself.'});}
    const id=leisureArena.id('kitchen'); const now=new Date().toISOString();
    db.prepare("INSERT INTO kitchen_orders(id,userId,items,total,currency,status,providerVerified,feeStatus,feeChargeId,referralCode,createdAt,updatedAt,feePreviewId) VALUES(?,?,?,?,?,'pending_payment',0,'pending',NULL,?,?,?,?)").run(id,req.user.id,JSON.stringify(items),total,currency,referralCode,now,now,feePreviewId);
    if(!payments.isEnabled()) return res.status(201).json({order:db.prepare("SELECT id,items,total,currency,status,referralCode,createdAt FROM kitchen_orders WHERE id=?").get(id),payment:null,paymentRequired:true});
    if(String(process.env.PAYMENT_MODE||'live').toLowerCase()!=='mock' && !process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({error:'Kitchen payment is configured but the Paystack secret key is missing.'});
    const reference=`kitchen-${id}-${Date.now()}`;
    const pay=await payments.initialize({email:String(req.user.email),amountMinor:Math.round(total*100),currency,reference,metadata:{kitchenOrderId:id,userId:req.user.id,referralCode}});
    db.prepare("UPDATE kitchen_orders SET paymentRef=?,updatedAt=? WHERE id=?").run(pay.reference,new Date().toISOString(),id);
    if(String(process.env.PAYMENT_MODE||'live').toLowerCase()==='mock'){
      db.transaction(()=>{
        db.prepare("UPDATE kitchen_orders SET status='paid',providerVerified=1,updatedAt=? WHERE id=? AND status='pending_payment'").run(new Date().toISOString(),id);
        try { settleKitchenFee(db, req.user.id, id); } catch (_) { db.prepare("UPDATE kitchen_orders SET feeStatus='pending',feeChargeId=NULL,updatedAt=? WHERE id=?").run(new Date().toISOString(),id); }
      })();
      kitchenUserCode(db,req.user.id,id); settleKitchenReferral(db,id); await generateKitchenReceipt(db.prepare("SELECT * FROM kitchen_orders WHERE id=?").get(id));
    }
    res.status(201).json({order:db.prepare("SELECT id,items,total,currency,status,paymentRef,providerVerified,feeStatus,feeChargeId,referralCode,createdAt,updatedAt FROM kitchen_orders WHERE id=?").get(id),payment:pay});
  }catch(e){return res.status(400).json({error:e.message||'Could not create Kitchen order.'});}
});
app.post('/api/leisure/kitchen/payments/verify',auth.authMiddleware,async(req,res)=>{
  const reference=String(req.body?.reference||'').trim(); if(!reference)return res.status(400).json({error:'Payment reference is required.'});
  const order=db.prepare("SELECT * FROM kitchen_orders WHERE paymentRef=? AND userId=?").get(reference,req.user.id); if(!order)return res.status(404).json({error:'Kitchen order not found.'});
  if(order.status==='paid') return res.json({verified:true,order,referral:settleKitchenReferral(db,order.id)});
  try{
    const result=String(process.env.PAYMENT_MODE||'live').toLowerCase()==='mock'?{status:'success',reference,currency:order.currency,amount:Math.round(Number(order.total)*100)}:await payments.verify(reference);
    if(!payments.matchesExpectedPayment(result,{status:'pending',currency:order.currency,total:order.total,paymentRef:reference},reference)) return res.json({verified:false,status:result.status,order});
    const changed=db.transaction(()=>{
      const current=db.prepare("SELECT status,paymentRef,providerVerified FROM kitchen_orders WHERE id=? AND userId=?").get(order.id,req.user.id);
      if(!current || current.status==='cancelled' || current.paymentRef!==reference) return {changes:0};
      if(current.providerVerified && current.status==='paid') return {changes:0,alreadyPaid:true};
      return {changes:db.prepare("UPDATE kitchen_orders SET status='paid',providerVerified=1,updatedAt=? WHERE id=? AND userId=? AND status='pending_payment' AND paymentRef=?").run(new Date().toISOString(),order.id,req.user.id,reference).changes};
    })();
    if(changed.alreadyPaid){
      try { const fee=settleKitchenFee(db,req.user.id,order.id); return res.json({verified:true,status:'success',feePending:false,fee,order:db.prepare("SELECT * FROM kitchen_orders WHERE id=?").get(order.id),referral:settleKitchenReferral(db,order.id)}); }
      catch(e){ return res.status(409).json({verified:true,status:'success',feePending:true,error:e.message||'Fund your NEXA Wallet and try again.',order:db.prepare("SELECT * FROM kitchen_orders WHERE id=?").get(order.id)}); }
    }
    if(changed.changes){kitchenUserCode(db,req.user.id,order.id);settleKitchenReferral(db,order.id);await generateKitchenReceipt(db.prepare("SELECT * FROM kitchen_orders WHERE id=?").get(order.id));try{await sendPush(req.user.id,'Kitchen order confirmed',`Your NEXA Kitchen order ${order.id} is paid.`,{screen:'leisure_kitchen',orderId:order.id});}catch{}}
    if(!changed.changes) return res.json({verified:false,status:'unchanged',order:db.prepare("SELECT * FROM kitchen_orders WHERE id=?").get(order.id)});
    try {
      const fee=db.transaction(()=>settleKitchenFee(db,req.user.id,order.id))();
      res.json({verified:true,status:'success',feePending:false,fee,order:db.prepare("SELECT * FROM kitchen_orders WHERE id=?").get(order.id),referral:settleKitchenReferral(db,order.id)});
    } catch(e) {
      db.prepare("UPDATE kitchen_orders SET feeStatus='pending',feeChargeId=NULL,updatedAt=? WHERE id=? AND userId=?").run(new Date().toISOString(),order.id,req.user.id);
      res.status(409).json({verified:true,status:'success',feePending:true,error:e.message||'Fund your NEXA Wallet and try again.',order:db.prepare("SELECT * FROM kitchen_orders WHERE id=?").get(order.id)});
    }
  }catch(e){res.status(502).json({error:'Could not verify Kitchen payment right now.'});}
});
app.post('/api/leisure/kitchen/orders/:orderId/fee-retry',auth.authMiddleware,(req,res)=>{
  const orderId=String(req.params.orderId||'').trim();
  const order=db.prepare("SELECT * FROM kitchen_orders WHERE id=? AND userId=?").get(orderId,req.user.id);
  if(!order)return res.status(404).json({error:'Kitchen order not found.'});
  if(order.status!=='paid' || !order.providerVerified)return res.status(409).json({error:'Kitchen payment must be verified before the NEXA service fee can be settled.'});
  try { const fee=db.transaction(()=>settleKitchenFee(db,req.user.id,orderId))(); return res.json({settled:true,fee,order:db.prepare("SELECT * FROM kitchen_orders WHERE id=?").get(orderId)}); }
  catch(e) { const st=/Insufficient|monthly cap/.test(e.message||'')?409:500; return res.status(st).json({error:clientErrorMessage(e,st,'Could not settle the Kitchen service fee.')}); }
});

app.get('/api/leisure/kitchen/ref/:code',auth.authMiddleware,(req,res)=>{
  const code=String(req.params.code||'').trim().toUpperCase(); const ref=db.prepare("SELECT ownerId,code FROM kitchen_referrals WHERE code=?").get(code);
  if(!ref)return res.status(404).json({error:'Kitchen referral code not found.'});
  res.json({valid:true,code:ref.code});
});
require("./kitchenHub").register(app,{db,auth,isConfiguredAdmin,notify:sendPush,admin:{allowRoute:(...a)=>adminAccess.allowRoute(...a),scopedGate:(p)=>(q,s,n)=>adminAccess.scopedGate(p)(q,s,n)}}); // B313 Kitchen Hub
const adminAccess=require("./adminAccess").create({db,isConfiguredAdmin,genRowId}); // B320 admin roles and audit
const marketplaceInvestigations = require("./marketplaceInvestigations");
marketplaceInvestigations.ensureSchema(db);
const marketplaceExceptionTriage = require("./marketplaceExceptionTriage");
marketplaceExceptionTriage.ensureSchema(db);
// Block 10: sanitized, read-only marketplace operations snapshot. Main remains the only authority.
app.get("/api/admin/marketplace/operations", auth.authMiddleware, adminAccess.require("mall"), (req,res) => {
  try {
    const orders = db.prepare("SELECT id,status,currency,total,createdAt FROM mall_orders ORDER BY createdAt DESC,id DESC LIMIT 100").all();
    const vendors = db.prepare("SELECT id,shopName FROM vendors ORDER BY id LIMIT 500").all();
    const disputes = db.prepare("SELECT id,orderId,status,resolution,createdAt,updatedAt FROM mall_checkout_disputes ORDER BY updatedAt DESC,id DESC LIMIT 100").all();
    const refunds = db.prepare("SELECT id,orderId,status,createdAt,updatedAt FROM mall_refunds ORDER BY updatedAt DESC,id DESC LIMIT 100").all();
    const summary = require("./marketplaceOperations").summarizeMarketplaceCommandCenter({orders, vendors, disputes, refunds});
    const orderIds = orders.map((o) => o.id).filter(Boolean);
    const events = orderIds.length ? db.prepare(`SELECT id,orderId,actorId,fromStatus,toStatus,note,createdAt FROM mall_order_events WHERE orderId IN (${orderIds.map(() => "?").join(",")}) ORDER BY createdAt DESC,id DESC LIMIT 250`).all(...orderIds) : [];
    const sellerIdsByOrder = new Map();
    for (const orderId of orderIds) sellerIdsByOrder.set(orderId, db.prepare("SELECT DISTINCT vendorId FROM mall_order_items WHERE orderId=? ORDER BY vendorId LIMIT 100").all(orderId).map((row) => row.vendorId));
    const safeOrders = orders.map((o) => ({...o, timeline: events.filter((e) => e.orderId === o.id).slice(0, 20).map((e) => ({ id: e.id, fromStatus: e.fromStatus, toStatus: e.toStatus, note: e.note == null ? null : String(e.note).slice(0, 300), createdAt: e.createdAt, actorRole: marketplaceExceptionTriage.actorRoleForEvent(e, { buyerId: db.prepare("SELECT userId FROM mall_orders WHERE id=?").get(o.id)?.userId, sellerIds: sellerIdsByOrder.get(o.id) || [] }) }))}));
    const investigations = marketplaceInvestigations.list(db, { status: "all", limit: 50 }).investigations;
    const exceptions = marketplaceExceptionTriage.list(db, { status: "all", limit: 50, offset: 0 });
    const orderItems = orderIds.length ? db.prepare(`SELECT orderId,status FROM mall_order_items WHERE orderId IN (${orderIds.map(() => "?").join(",")}) ORDER BY orderId LIMIT 1000`).all(...orderIds) : [];
    const diagnosticEvents = db.prepare("SELECT id,orderId,createdAt FROM mall_order_events ORDER BY createdAt DESC,id DESC LIMIT 500").all();
    const diagnostics = marketplaceExceptionTriage.diagnostics({ orders, events: diagnosticEvents, disputes, refunds, orderItems });
    return res.json({ summary, orders: safeOrders, disputes, refunds, investigations, exceptions: exceptions.exceptions, exceptionTotal: exceptions.total, diagnostics, readOnly: true, authority: "main", providerCalls: false, mutationsPerformed: false });
  } catch (e) { console.error("[marketplace-operations-read-model]", e.message); return res.status(503).json({ error: "Marketplace operations snapshot unavailable." }); }
});
adminSecurityCenter = require("./adminSecurityCenter").createAdminSecurityCenter({ db, auth, admin: adminAccess });
adminAccess.setStepUpPolicy({ actionFor: (req) => adminSecurityCenter.stepUpAction(req), validate: (req, action) => adminSecurityCenter.validateStepUp(req, action), requiresMfa: (userId) => adminSecurityCenter.requiresMfa(userId) });
const adminBootstrap=require("./adminBootstrap");
try { adminBootstrap.ensureBootstrapAdmin({db,auth,admin:adminAccess}); } catch (e) { console.error("[NEXA] Admin bootstrap failed:",e.message); process.exitCode=1; }

// Block 12: Main-owned exception provenance and triage. These routes only write operational case metadata.
app.get("/api/admin/marketplace/exceptions", auth.authMiddleware, adminAccess.require("mall"), (req, res) => {
  try {
    const result = marketplaceExceptionTriage.list(db, { status: req.query.status, category: req.query.category, q: req.query.q, limit: req.query.limit, offset: req.query.offset });
    return res.json(result);
  } catch (e) { console.error("[marketplace-exceptions-read-model]", e.message); return res.status(503).json({ error: "Marketplace exceptions are unavailable.", authority: "main", readOnly: true, mutationsPerformed: false }); }
});
app.post("/api/admin/marketplace/exceptions", auth.authMiddleware, adminAccess.require("mall"), (req, res) => {
  try {
    const result = marketplaceExceptionTriage.create(db, { ...req.body, actorId: req.user.id, actorRole: "admin", genRowId });
    if (!result.ok) return res.status(result.status || 400).json({ error: result.error, ...(result.conflict ? { conflict: result.conflict } : {}) });
    adminAccess.audit(req, result.duplicate ? "marketplace_exception_idempotent_replay" : "marketplace_exception_created", "marketplace_exception", result.exception.id, "Exception provenance metadata only; no order, inventory, refund, payout or provider state changed.");
    return res.status(result.duplicate ? 200 : 201).json({ ...result, authority: "main", providerCalls: false, mutationsPerformed: false });
  } catch (e) { console.error("[marketplace-exception-create]", e.message); return res.status(503).json({ error: "Marketplace exception could not be recorded." }); }
});
app.post("/api/admin/marketplace/exceptions/:id/triage", auth.authMiddleware, adminAccess.require("mall"), (req, res) => {
  try {
    const result = marketplaceExceptionTriage.transition(db, { ...req.body, id: req.params.id, actorId: req.user.id });
    if (!result.ok) return res.status(result.status || 400).json({ error: result.error, ...(result.conflict ? { conflict: result.conflict } : {}) });
    adminAccess.audit(req, result.duplicate ? "marketplace_exception_triage_replay" : "marketplace_exception_triaged", "marketplace_exception", result.exception.id, `Operational triage ${result.exception.status}; marketplace and financial state unchanged.`);
    return res.status(200).json({ ...result, authority: "main", providerCalls: false, mutationsPerformed: false });
  } catch (e) { console.error("[marketplace-exception-triage]", e.message); return res.status(503).json({ error: "Marketplace exception triage could not be recorded." }); }
});

// Investigation records are operational audit metadata only; this route never changes an order or payment.
app.post("/api/admin/marketplace/investigations", auth.authMiddleware, adminAccess.require("mall"), (req,res) => {
  try {
    const result = marketplaceInvestigations.create(db, { ...req.body, actorId: req.user.id, genRowId });
    if (!result.ok) return res.status(result.status || 400).json({ error: result.error });
    adminAccess.audit(req, result.duplicate ? "marketplace_investigation_idempotent_replay" : "marketplace_investigation_created", "marketplace_investigation", result.investigation.id, "Operational investigation metadata only; marketplace and financial state unchanged.");
    return res.status(result.duplicate ? 200 : 201).json(result);
  } catch (e) { console.error("[marketplace-investigation]", e.message); return res.status(503).json({ error: "Marketplace investigation could not be recorded." }); }
});

// B389: Aami financial policy is admin-only. Never expose the NGN conversion rate or
// aggregate liability through consumer Aami/SkyMoney responses.
app.get("/api/admin/payments/aami-economy", auth.authMiddleware, adminAccess.require("payments"), (req,res) => {
  try {
    const accounts = db.prepare("SELECT COALESCE(SUM(balance),0) AS totalAami, COUNT(*) AS accounts FROM aami_accounts WHERE status='active'").get();
    const totalAami = Number(accounts?.totalAami || 0);
    res.json({
      policy: { ...aamiEconomy.financialPolicy(), aamiToNgn: aamiEconomy.aamiToNgn(1) },
      aggregate: { activeAccounts: Number(accounts?.accounts || 0), totalAami, equivalentNgn: aamiEconomy.aamiToNgn(totalAami) },
      note: "Internal accounting authority only. Do not expose the NGN equivalent or conversion rate to consumer clients."
    });
  } catch (e) { res.status(e.status || 400).json({ error: e.message || "Aami financial report unavailable." }); }
});

// CEO Global Readiness Block 06 — Main-owned reconciliation and financial operations.
// Admin receives sanitized operational records only; no route below initiates provider calls or changes balances.
app.post("/api/admin/financial-operations/reconcile", auth.authMiddleware, adminAccess.require("payments"), (req,res) => {
  try {
    const result = walletFinancialOperations.reconcile(db, { providerState: walletProviderBoundary.getWalletProviderReadiness() });
    adminAccess.audit(req, "financial_reconciliation_run", "wallet_reconciliation_run", result.runId, "Local canonical wallet/ledger scan only; no provider call or financial mutation.");
    return res.json(result);
  } catch (e) { console.error("financial reconciliation run failed", e); return res.status(503).json({ error: "Financial reconciliation could not be run." }); }
});
app.get("/api/admin/financial-operations/summary", auth.authMiddleware, adminAccess.require("payments"), (req,res) => {
  try { return res.json(walletFinancialOperations.getSummary(db, walletProviderBoundary.getWalletProviderReadiness())); }
  catch (e) { console.error("financial operations summary failed", e); return res.status(503).json({ error: "Financial operations summary unavailable." }); }
});
app.get("/api/admin/financial-operations/assignees", auth.authMiddleware, adminAccess.require("payments"), (req,res) => {
  try {
    const items = adminAccess.adminUserIds("payments").map((id) => db.prepare("SELECT id,name,email FROM users WHERE id=?").get(id))
      .filter((user) => user && adminAccess.can(user, "payments"))
      .map((user) => ({ id: user.id, name: String(user.name || "").slice(0, 100), email: String(user.email || "").slice(0, 180) }));
    return res.json({ items });
  } catch (e) { console.error("financial assignee list failed", e); return res.status(503).json({ error: "Financial assignees unavailable." }); }
});
app.post("/api/admin/financial-operations/exceptions/:exceptionId/assign", auth.authMiddleware, adminAccess.require("payments"), (req,res) => {
  try {
    const targetId = String(req.body?.assignedTo || "").trim().slice(0, 120);
    const target = db.prepare("SELECT id,name,email FROM users WHERE id=?").get(targetId);
    const result = walletFinancialOperations.assignException(db, {
      exceptionId: req.params.exceptionId, assignedTo: targetId, actorId: req.user.id, actorRole: req.adminRole,
      reason: req.body?.reason, canAssign: (id) => Boolean(target && target.id === id && adminAccess.can(target, "payments")),
    });
    adminAccess.audit(req, "financial_reconciliation_exception_assigned", "wallet_reconciliation_exception", result.id, `Assigned to authorized Admin ${result.assignedTo}; reason recorded.`);
    return res.json(result);
  } catch (e) { return res.status(e.status || 400).json({ error: e.status && e.status < 500 ? e.message : "Financial exception assignment unavailable." }); }
});
app.get("/api/admin/financial-operations/exceptions", auth.authMiddleware, adminAccess.require("payments"), (req,res) => {
  try { return res.json(walletFinancialOperations.listExceptions(db, { status: req.query?.status, limit: req.query?.limit, offset: req.query?.offset })); }
  catch (e) { console.error("financial exception queue failed", e); return res.status(503).json({ error: "Financial exception queue unavailable." }); }
});
app.get("/api/admin/financial-operations/transactions", auth.authMiddleware, adminAccess.require("payments"), (req,res) => {
  try { return res.json(walletFinancialOperations.searchTransactions(db, { q: req.query?.q, limit: req.query?.limit, offset: req.query?.offset })); }
  catch (e) { console.error("financial transaction search failed", e); return res.status(503).json({ error: "Financial transaction search unavailable." }); }
});
app.get("/api/admin/financial-operations/transactions/:transactionId/timeline", auth.authMiddleware, adminAccess.require("payments"), (req,res) => {
  try {
    const result = walletFinancialOperations.transactionTimeline(db, req.params.transactionId);
    return result ? res.json(result) : res.status(404).json({ error: "Transaction not found." });
  } catch (e) { console.error("financial transaction timeline failed", e); return res.status(503).json({ error: "Financial transaction timeline unavailable." }); }
});
app.post("/api/admin/financial-operations/exceptions/:exceptionId/review", auth.authMiddleware, adminAccess.require("payments"), (req,res) => {
  try {
    const result = walletFinancialOperations.reviewException(db, { exceptionId: req.params.exceptionId, actorId: req.user.id, actorRole: req.adminRole, reason: req.body?.reason });
    adminAccess.audit(req, "financial_reconciliation_exception_reviewed", "wallet_reconciliation_exception", result.id, "Financial state unchanged; reason recorded.");
    return res.json(result);
  } catch (e) { return res.status(e.status || 400).json({ error: e.status && e.status < 500 ? e.message : "Financial exception review unavailable." }); }
});
require("./lifestyle").register(app,{db,auth,friends,genRowId,notify:sendPush,admin:adminAccess});
require("./verification").register(app,{db,auth,admin:adminAccess,notify:sendPush}); // B320 verification requests
require("./identityVerification").register(app,{db,auth,admin:adminAccess}); // Block 09 Main-owned identity verification boundary
require("./adminOps").register(app,{db,auth,admin:adminAccess,notify:sendPush}); // B320 admin app routes // B316 Lifestyle photo posts
adminSecurityCenter.register(app); // Block 04 Admin Security Center endpoints
adminApprovalCenter.register({app,auth,db,admin:adminAccess}); // B337 centralized approval bus stop
require("./adminStaffWork").create({db,auth,admin:adminAccess,genRowId}).register(app);
require("./customerCare").create({db,auth,admin:adminAccess,genRowId,rateLimit}).register(app);
require("./adminAi").registerAdminAi({app,auth,admin:adminAccess,db,telemetry:aiTelemetry});
require("./adminDamiGovernance").registerAdminDamiGovernance({app,auth,admin:adminAccess,db});
require("./adminAiTraining").registerAdminAiTraining({app,auth,admin:adminAccess,db});
require("./aiSelfLearning").registerAiSelfLearning({app,auth,db,admin:adminAccess});
youtubeContent.register({app,auth,db,rateLimit,payments,isConfiguredAdmin,admin:adminAccess});
youtubeContent.startNarrativiaAutoSync(db);
app.get('/api/leisure/kitchen/cashback',auth.authMiddleware,(req,res)=>{
  const balance=db.prepare("SELECT COALESCE(SUM(amount),0) AS amount FROM kitchen_cashback_ledger WHERE beneficiaryId=? AND status='available' AND COALESCE(migratedToAami,0)=0").get(req.user.id);
  const ledger=db.prepare("SELECT id,sourceOrderId,amount,currency,status,createdAt,migratedToAami FROM kitchen_cashback_ledger WHERE beneficiaryId=? ORDER BY createdAt DESC LIMIT 100").all(req.user.id);
  const aami=aamiEconomy.balance(db,req.user.id);
  res.json({balance:0,legacyBalance:Number(balance.amount||0),aamiBalance:aami,unit:'Aami',ledger});
});

// V4.15.0 — fitness directory. Public listings require administrator approval;
// submissions are user-owned and never expose submitter account details.
const fitnessGymWriteLimit = rateLimit({windowMs:60*60*1000,max:5,keyFn:req=>String(req.user?.id||req.ip),message:"Too many gym submissions. Please try again later."});
app.get("/api/fitness/gyms", auth.authMiddleware, (req,res) => {
  const city=String(req.query?.city||"").trim().slice(0,80);
  const rows=db.prepare("SELECT id,name,city,address,websiteOrSocial FROM fitness_gyms WHERE status='approved' AND (?='' OR lower(city) LIKE '%' || lower(?) || '%') ORDER BY city COLLATE NOCASE,name COLLATE NOCASE LIMIT 100").all(city,city);
  res.json({gyms:rows});
});
app.post("/api/fitness/gyms", auth.authMiddleware, fitnessGymWriteLimit, (req,res) => {
  const name=String(req.body?.name||"").trim().slice(0,120), city=String(req.body?.city||"").trim().slice(0,80), address=String(req.body?.address||"").trim().slice(0,240), websiteOrSocial=String(req.body?.websiteOrSocial||"").trim().slice(0,240);
  if(!name||!city||!address) return res.status(400).json({error:"Gym name, city and public address are required."});
  if(websiteOrSocial && /^(javascript:|data:)/i.test(websiteOrSocial)) return res.status(400).json({error:"Enter a public website or social handle."});
  const id=crypto.randomUUID(), now=new Date().toISOString();
  db.prepare("INSERT INTO fitness_gyms(id,ownerId,name,city,address,websiteOrSocial,status,createdAt,updatedAt) VALUES(?,?,?,?,?,?,'pending',?,?)").run(id,req.user.id,name,city,address,websiteOrSocial||null,now,now);
  res.status(201).json({submitted:true,status:"pending",id,message:"Gym submitted for review before it appears publicly."});
});
app.get("/api/leisure/admin/operations", auth.authMiddleware, (req,res) => {
  if (!adminAccess.allowRoute(req, "leisure_ops", isConfiguredAdmin(req.user))) return res.status(403).json({error:"Administrator access required."});
  const kitchen = db.prepare("SELECT status, COUNT(*) AS count FROM kitchen_orders GROUP BY status").all();
  const tickets = db.prepare("SELECT status, COUNT(*) AS count FROM yaayz_ticket_orders GROUP BY status").all();
  const gyms = db.prepare("SELECT status, COUNT(*) AS count FROM fitness_gyms GROUP BY status").all();
  res.json({ generatedAt: new Date().toISOString(), kitchen, yaayzTickets: tickets, fitnessGyms: gyms });
});

app.get("/api/fitness/admin/gyms", auth.authMiddleware, (req,res) => {
  if(!adminAccess.allowRoute(req, "fitness_gyms", isConfiguredAdmin(req.user))) return res.status(403).json({error:"Administrator access required."});
  const rows=db.prepare("SELECT id,name,city,address,websiteOrSocial,status,createdAt FROM fitness_gyms WHERE status='pending' ORDER BY createdAt ASC LIMIT 200").all(); res.json({gyms:rows});
});
app.post("/api/fitness/admin/gyms/:id/review", auth.authMiddleware, adminAccess.scopedGate("fitness_gyms_write"), (req,res) => {
  if(!adminAccess.allowRoute(req, "fitness_gyms_write", isConfiguredAdmin(req.user))) return res.status(403).json({error:"Administrator access required."});
  const status=String(req.body?.status||""); if(!["approved","rejected"].includes(status)) return res.status(400).json({error:"Status must be approved or rejected."});
  const changed=db.prepare("UPDATE fitness_gyms SET status=?,updatedAt=? WHERE id=? AND status='pending'").run(status,new Date().toISOString(),String(req.params.id||""));
  if(!changed.changes) return res.status(404).json({error:"Pending gym submission not found."}); res.json({reviewed:true,status});
});

const YAAyz_TICKET_TYPES = new Set(["bus","airplane","event","stadium","concert","train","ferry","other"]);
function sanitizeYaayzTicket(row) {
  return {
    id: row.id, title: row.title, description: row.description || "", type: row.type,
    providerName: row.providerName || null, venue: row.venue || null,
    origin: row.origin || null, destination: row.destination || null,
    startsAt: row.startsAt || null, endsAt: row.endsAt || null,
    price: Number(row.price), currency: String(row.currency || "NGN"), availableQuantity: Number(row.quantity || 0)
  };
}
function issueYaayzTicketCode(orderId) {
  return `YAA-${String(orderId).replace(/[^A-Za-z0-9]/g, '').slice(-10).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function yaayzFeePreview(userId, amount, currency = "NGN") {
  const amountMinor = Math.round(Number(amount) * 100);
  return feePreview(db, userId, "yaayz_service", { amountMinor, currency });
}

function settleYaayzFee(dbConn, userId, orderId) {
  const order = dbConn.prepare("SELECT feeStatus,feeChargeId,feePreviewId,total,currency FROM yaayz_ticket_orders WHERE id=? AND buyerId=?").get(orderId, userId);
  if (!order) throw new Error("Yaayz ticket order not found.");
  if (["paid", "bundled"].includes(String(order.feeStatus || "").toLowerCase())) {
    return { settled: true, idempotent: true, feeStatus: order.feeStatus, feeChargeId: order.feeChargeId || null };
  }
  const fee = chargeServiceFee(dbConn, userId, "yaayz_service", { idempotencyKey: `yaayz:${orderId}`, withinTransaction: true, previewId: order.feePreviewId, actionAmountMinor: Math.round(Number(order.total) * 100), currency: order.currency });
  const feeStatus = fee.charged ? "paid" : "bundled";
  dbConn.prepare("UPDATE yaayz_ticket_orders SET feeStatus=?,feeChargeId=? WHERE id=? AND buyerId=?").run(feeStatus, fee.charge?.id || null, orderId, userId);
  return { settled: true, idempotent: Boolean(fee.idempotent), feeStatus, fee: fee.fee, feeChargeId: fee.charge?.id || null };
}

function releaseExpiredYaayzReservations() {
  const now = new Date().toISOString();
  return db.transaction(() => {
    const expired = db.prepare("SELECT id,ticketId,quantity FROM yaayz_ticket_orders WHERE status='pending_payment' AND reservationExpiresAt IS NOT NULL AND reservationExpiresAt <= ?").all(now);
    for (const row of expired) {
      db.prepare("UPDATE yaayz_ticket_listings SET quantity=quantity+?,updatedAt=? WHERE id=?").run(Number(row.quantity || 0), now, row.ticketId);
      db.prepare("UPDATE yaayz_ticket_orders SET status='cancelled',updatedAt=? WHERE id=? AND status='pending_payment'").run(now, row.id);
    }
    return expired.length;
  })();
}

yaayzAdvertisers.ensureSchema(db);

app.get("/api/mall/vendor/yaayz/adverts", auth.authMiddleware, (req,res) => {
  const vendor=getVendorForUser(req.user.id);
  if(!vendor) return res.status(404).json({error:"No vendor profile for this account yet."});
  yaayzAdvertisers.ensureSchema(db);
  const limitRaw=Number(req.query?.limit||50), offsetRaw=Number(req.query?.offset||0);
  if(!Number.isInteger(limitRaw)||!Number.isInteger(offsetRaw)||limitRaw<1||offsetRaw<0) return res.status(400).json({error:"Invalid advert page."});
  const limit=Math.min(100,limitRaw), offset=offsetRaw;
  res.json({adverts:yaayzAdvertisers.ownerList(db,vendor.id,{limit,offset})});
});

app.post("/api/mall/vendor/yaayz/adverts", auth.authMiddleware, (req,res) => {
  const vendor=getVendorForUser(req.user.id);
  if(!vendor) return res.status(404).json({error:"No vendor profile for this account yet."});
  const entitlement=vendorSubscriptions.vendorEntitlement(db,vendor.id);
  if(!entitlement.active) return res.status(403).json({error:"Your vendor subscription must be active before submitting a YaayzAdvert."});
  yaayzAdvertisers.ensureSchema(db);
  const result=yaayzAdvertisers.create(db,{vendorId:vendor.id,input:req.body||{}});
  if(result.error) return res.status(400).json({error:result.error});
  res.status(201).json({advert:result.value});
});

app.get("/api/yaayz/ads", auth.authMiddleware, (req, res) => {
  const rows = db.prepare("SELECT id,advertiserName,title,body,imageUrl,targetUrl FROM yaayz_ads WHERE active=1 AND status='approved' ORDER BY createdAt DESC LIMIT 50").all();
  const ads = rows.map((row) => {
    const target = row.targetUrl ? externalNavigation.adTargetUrl(row.targetUrl) : null;
    const image = row.imageUrl ? externalNavigation.adImageUrl(row.imageUrl) : null;
    return { ...row, imageUrl: image?.ok ? image.url : null, targetUrl: target?.ok ? target.url : null };
  });
  res.json({ ads });
});

app.get("/api/yaayz/tickets/fee-preview", auth.authMiddleware, (req, res) => {
  const ticketId = String(req.query?.ticketId || "").trim();
  const quantity = Math.floor(Number(req.query?.quantity || 1));
  if (!ticketId) return res.status(400).json({ error: "Ticket is required." });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return res.status(400).json({ error: "Ticket quantity must be between 1 and 20." });
  const ticket = db.prepare("SELECT price,currency,quantity,active FROM yaayz_ticket_listings WHERE id=?").get(ticketId);
  if (!ticket || !ticket.active) return res.status(404).json({ error: "Ticket listing not found." });
  if (Number(ticket.quantity) < quantity) return res.status(409).json({ error: "Not enough tickets are available." });
  try {
    const preview = yaayzFeePreview(req.user.id, Number(ticket.price) * quantity, ticket.currency);
    res.json({ preview, ticketTotal: Number(ticket.price) * quantity, currency: ticket.currency });
  } catch (e) {
    res.status(400).json({ error: e.message || "Yaayz service fee preview is unavailable." });
  }
});

app.get("/api/yaayz/tickets", auth.authMiddleware, (req, res) => {
  releaseExpiredYaayzReservations();
  const type = String(req.query?.type || "").trim().toLowerCase();
  const search = String(req.query?.search || "").trim().slice(0, 120);
  if (type && type !== "all" && !YAAyz_TICKET_TYPES.has(type)) return res.status(400).json({ error: "Invalid ticket type." });
  const rows = db.prepare(`SELECT * FROM yaayz_ticket_listings
    WHERE active=1 AND quantity>0
      AND (?='' OR type=?)
      AND (?='' OR lower(title) LIKE '%' || lower(?) || '%' OR lower(description) LIKE '%' || lower(?) || '%' OR lower(COALESCE(providerName,'')) LIKE '%' || lower(?) || '%' OR lower(COALESCE(venue,'')) LIKE '%' || lower(?) || '%')
    ORDER BY CASE WHEN startsAt IS NULL THEN 1 ELSE 0 END, startsAt ASC, createdAt DESC LIMIT 100`).all(type === "all" ? "" : type, type === "all" ? "" : type, search, search, search, search, search);
  res.json({ tickets: rows.map(sanitizeYaayzTicket) });
});

// Sellers/organizers can publish ticket inventory. Every listing is owned by the authenticated user.
app.post("/api/yaayz/tickets", auth.authMiddleware, (req, res) => {
  const title = String(req.body?.title || "").trim().slice(0, 160);
  const description = String(req.body?.description || "").trim().slice(0, 2000);
  const type = String(req.body?.type || "event").trim().toLowerCase();
  const price = Number(req.body?.price);
  const quantity = Math.floor(Number(req.body?.quantity));
  const currency = String(req.body?.currency || "NGN").trim().toUpperCase();
  if (title.length < 2) return res.status(400).json({ error: "Ticket title is required." });
  if (!YAAyz_TICKET_TYPES.has(type)) return res.status(400).json({ error: "Invalid ticket type." });
  if (!Number.isFinite(price) || price <= 0 || price > 1e9) return res.status(400).json({ error: "Ticket price must be a valid positive amount." });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) return res.status(400).json({ error: "Ticket quantity must be between 1 and 100000." });
  if (!/^[A-Z]{3}$/.test(currency)) return res.status(400).json({ error: "Invalid ticket currency." });
  const id = genRowId("yt"); const now = new Date().toISOString();
  db.prepare(`INSERT INTO yaayz_ticket_listings(id,sellerId,title,description,type,providerName,venue,origin,destination,startsAt,endsAt,price,currency,quantity,active,createdAt,updatedAt)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`).run(id, req.user.id, title, description, type,
      String(req.body?.providerName || "").trim().slice(0,160) || null, String(req.body?.venue || "").trim().slice(0,240) || null,
      String(req.body?.origin || "").trim().slice(0,160) || null, String(req.body?.destination || "").trim().slice(0,160) || null,
      String(req.body?.startsAt || "").trim() || null, String(req.body?.endsAt || "").trim() || null, price, currency, quantity, now, now);
  res.status(201).json({ ticket: sanitizeYaayzTicket(db.prepare("SELECT * FROM yaayz_ticket_listings WHERE id=?").get(id)) });
});

app.get("/api/yaayz/orders", auth.authMiddleware, (req, res) => {
  const orders = db.prepare(`SELECT o.id,o.ticketId,o.quantity,o.total,o.currency,o.status,o.paymentRef,o.ticketCode,o.providerVerified,o.feeStatus,o.feeChargeId,o.createdAt,o.updatedAt,
    t.title,t.type,t.providerName,t.venue,t.startsAt FROM yaayz_ticket_orders o JOIN yaayz_ticket_listings t ON t.id=o.ticketId
    WHERE o.buyerId=? ORDER BY o.createdAt DESC LIMIT 100`).all(req.user.id);
  res.json({ orders });
});

app.post("/api/yaayz/tickets/:ticketId/purchase", auth.authMiddleware, async (req, res) => {
  releaseExpiredYaayzReservations();
  const ticketId = String(req.params.ticketId || "");
  const quantity = Math.floor(Number(req.body?.quantity));
  const feePreviewId = String(req.body?.feePreviewId || "").trim();
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return res.status(400).json({ error: "Ticket quantity must be between 1 and 20." });
  if (!payments.isEnabled()) return res.status(409).json({ error: "Online ticket payment is not enabled yet." });
  if (String(process.env.PAYMENT_MODE || "live").toLowerCase() !== "mock" && !process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ error: "Online ticket payment is configured but the Paystack secret key is missing." });
  if (String(req.user?.email || "").trim() === "") return res.status(400).json({ error: "A customer email is required for ticket payment." });
  const feeCheckTicket = db.prepare("SELECT price,currency,quantity,active FROM yaayz_ticket_listings WHERE id=?").get(ticketId);
  if (!feeCheckTicket || !feeCheckTicket.active) return res.status(404).json({ error: "Ticket listing not found." });
  let yaayzFee;
  try { yaayzFee = assertFeePreview(db, req.user.id, feePreviewId, "yaayz_service", { amountMinor: Math.round(Number(feeCheckTicket.price) * quantity * 100), currency: feeCheckTicket.currency }); }
  catch (e) { return res.status(400).json({ error: e.message || "Yaayz service fee preview is unavailable." }); }
  const now = new Date().toISOString(); const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); let order;
  try {
    order = db.transaction(() => {
      const t = db.prepare("SELECT * FROM yaayz_ticket_listings WHERE id=? AND active=1").get(ticketId);
      if (!t) { const e = new Error("Ticket listing not found."); e.statusCode=404; throw e; }
      if (String(t.currency).toUpperCase() !== "NGN") { const e = new Error("Online ticket payment currently supports NGN only."); e.statusCode=409; throw e; }
      const changed = db.prepare("UPDATE yaayz_ticket_listings SET quantity=quantity-?,updatedAt=? WHERE id=? AND active=1 AND quantity>=?").run(quantity, now, ticketId, quantity);
      if (!changed.changes) { const e = new Error("Not enough tickets are available."); e.statusCode=409; throw e; }
      const id=genRowId("yto"); const total=Number(t.price)*quantity;
      db.prepare("INSERT INTO yaayz_ticket_orders(id,ticketId,buyerId,quantity,total,currency,status,providerVerified,feeStatus,createdAt,updatedAt,feePreviewId,reservationExpiresAt) VALUES(?,?,?,?,?,?,'pending_payment',0,'pending',?,?,?,?)").run(id,ticketId,req.user.id,quantity,total,t.currency,now,now,feePreviewId,reservationExpiresAt);
      return {id,ticketId,buyerId:req.user.id,total,currency:t.currency};
    })();
  } catch(e){ if(e.statusCode) return res.status(e.statusCode).json({error:e.message}); console.error('Yaayz ticket reservation failed',e); return res.status(500).json({error:'Could not reserve this ticket.'}); }
  const reference=`yaayz-${order.id}-${Date.now()}`;
  try {
    const pay=await payments.initialize({email:String(req.user.email),amountMinor:Math.round(order.total*100),currency:order.currency,reference,metadata:{yaayzOrderId:order.id,ticketId:order.ticketId,userId:req.user.id}});
    db.prepare("UPDATE yaayz_ticket_orders SET paymentRef=?,updatedAt=? WHERE id=?").run(pay.reference,now,order.id);
    if(String(process.env.PAYMENT_MODE||"live").toLowerCase()==="mock") db.transaction(()=>{
      const code=issueYaayzTicketCode(order.id);
      db.prepare("UPDATE yaayz_ticket_orders SET status='paid',providerVerified=1,ticketCode=?,updatedAt=? WHERE id=? AND status='pending_payment'").run(code,new Date().toISOString(),order.id);
      try { settleYaayzFee(db, req.user.id, order.id); } catch (e) { /* provider payment remains verified; fee can be retried */ }
    })();
    return res.status(201).json({order:db.prepare("SELECT * FROM yaayz_ticket_orders WHERE id=?").get(order.id),payment:pay,fee:yaayzFee});
  } catch(e){ console.error('Yaayz payment initialization failed',e); try{db.transaction(()=>{db.prepare("UPDATE yaayz_ticket_listings SET quantity=quantity+(SELECT quantity FROM yaayz_ticket_orders WHERE id=?),updatedAt=? WHERE id=(SELECT ticketId FROM yaayz_ticket_orders WHERE id=?)").run(order.id,new Date().toISOString(),order.id);db.prepare("UPDATE yaayz_ticket_orders SET status='cancelled',updatedAt=? WHERE id=? AND status='pending_payment'").run(new Date().toISOString(),order.id);})();}catch(re){console.error('Yaayz reservation rollback failed',re)} return res.status(502).json({error:'The ticket payment page could not be started. The reserved ticket quantity was released.'}); }
});

app.post("/api/yaayz/payments/verify", auth.authMiddleware, async (req,res)=>{
  const reference=String(req.body?.reference||"").trim(); if(!reference)return res.status(400).json({error:'Payment reference is required.'});
  const order=db.prepare("SELECT o.*,t.price,t.currency as ticketCurrency FROM yaayz_ticket_orders o JOIN yaayz_ticket_listings t ON t.id=o.ticketId WHERE o.paymentRef=? AND o.buyerId=?").get(reference,req.user.id);
  if(!order)return res.status(404).json({error:'Ticket order not found.'});
  if(String(order.status).toLowerCase()==='paid'){
    try { const fee = settleYaayzFee(db, req.user.id, order.id); return res.json({verified:true,order:db.prepare("SELECT * FROM yaayz_ticket_orders WHERE id=?").get(order.id),feePending:false,fee}); }
    catch (e) { return res.status(409).json({verified:true,status:'success',feePending:true,error:e.message || 'Fund your NEXA Wallet and try again.',order:db.prepare("SELECT * FROM yaayz_ticket_orders WHERE id=?").get(order.id)}); }
  }
  try{
    const result=String(process.env.PAYMENT_MODE||'live').toLowerCase()==='mock'?{status:'success',reference,currency:order.currency,amount:Math.round(Number(order.total)*100)}:await payments.verify(reference);
    const ok=payments.matchesExpectedPayment(result,{status:'pending',currency:order.currency,total:order.total,paymentRef:reference},reference);
    if(!ok)return res.json({verified:false,status:result.status,order});
    const now=new Date().toISOString();
    const changed=db.transaction(()=>{const current=db.prepare("SELECT status,paymentRef FROM yaayz_ticket_orders WHERE id=? AND buyerId=?").get(order.id,req.user.id);if(!current||current.status==='cancelled'||current.paymentRef!==reference)return {changes:0};const code=issueYaayzTicketCode(order.id);return {changes:db.prepare("UPDATE yaayz_ticket_orders SET status='paid',providerVerified=1,ticketCode=?,updatedAt=? WHERE id=? AND status='pending_payment' AND paymentRef=?").run(code,now,order.id,reference).changes};})();
    if(!changed.changes) return res.json({verified:false,status:'unchanged',order:db.prepare("SELECT * FROM yaayz_ticket_orders WHERE id=?").get(order.id)});
    try {
      const fee = db.transaction(()=>settleYaayzFee(db, req.user.id, order.id))();
      return res.json({verified:true,status:'success',feePending:false,fee,order:db.prepare("SELECT * FROM yaayz_ticket_orders WHERE id=?").get(order.id)});
    } catch (e) {
      return res.status(409).json({verified:true,status:'success',feePending:true,error:e.message || 'Fund your NEXA Wallet and try again.',order:db.prepare("SELECT * FROM yaayz_ticket_orders WHERE id=?").get(order.id)});
    }
  }catch(e){return res.status(502).json({error:'Could not verify ticket payment right now.'});}
});

app.post("/api/yaayz/orders/:orderId/fee-retry", auth.authMiddleware, (req,res)=>{
  const orderId=String(req.params.orderId||'').trim();
  const order=db.prepare("SELECT * FROM yaayz_ticket_orders WHERE id=? AND buyerId=?").get(orderId,req.user.id);
  if(!order)return res.status(404).json({error:'Ticket order not found.'});
  if(order.status!=='paid' || !order.providerVerified)return res.status(409).json({error:'The ticket payment must be verified before the NEXA service fee can be settled.'});
  try {
    const fee=db.transaction(()=>settleYaayzFee(db,req.user.id,orderId))();
    return res.json({settled:true,fee,order:db.prepare("SELECT * FROM yaayz_ticket_orders WHERE id=?").get(orderId)});
  } catch(e) { const st=/Insufficient|monthly cap/.test(e.message||'')?409:500; return res.status(st).json({error:clientErrorMessage(e,st,'Could not settle the Yaayz service fee.')}); }
});

// -- Online payment: Paystack (V3.21). Secret key stays server-side; fulfillment is driven by
// verified Paystack events and amount/reference checks. Paystack recommends webhooks for final status.
app.post("/api/mall/payments/verify", auth.authMiddleware, async (req, res) => {
  const reference = String(req.body?.reference || "").trim();
  if (!reference) return res.status(400).json({ error: "Payment reference is required." });
  const order = db.prepare("SELECT * FROM mall_orders WHERE paymentRef = ? AND userId = ?").get(reference, req.user.id);
  const orderValidation = payments.validatePaymentVerificationOrder(order, reference);
  if (!orderValidation.ok) return res.status(orderValidation.status).json({ error: orderValidation.error });
  try {
    let providerVerified = Boolean(order.providerVerified);
    let providerStatus = "success";
    if (!providerVerified) {
      const result = String(process.env.PAYMENT_MODE || "live").toLowerCase() === "mock"
        ? { status: "success", reference, currency: order.currency, amount: Math.round(Number(order.total) * 100) }
        : await payments.verify(reference);
      const ok = payments.matchesExpectedPayment(result, order, reference);
      providerStatus = result.status;
      if (!ok) return res.json({ verified: false, status: result.status, order: loadOrder(order.id) });
      providerVerified = true;
    }
    const settled = db.transaction(() => {
      const current = db.prepare("SELECT status, paymentMethod, paymentRef FROM mall_orders WHERE id = ? AND userId = ?").get(order.id, req.user.id);
      const feeState = db.prepare("SELECT providerVerified,feeStatus,feeChargeId FROM mall_orders WHERE id = ? AND userId = ?").get(order.id, req.user.id);
      if (!current || String(current.status || "").toLowerCase() === "cancelled") return { cancelled: true };
      if (String(current.paymentMethod || "").toLowerCase() !== "online" || String(current.paymentRef || "") !== reference) return { boundaryMismatch: true };
      if (!feeState?.providerVerified) db.prepare("UPDATE mall_orders SET providerVerified=1 WHERE id=? AND userId=?").run(order.id, req.user.id);
      try {
        const fee = settleMarketplaceFee(db, req.user.id, order.id);
        const updated = db.prepare("UPDATE mall_order_items SET paid = 1, paidAt = ? WHERE orderId = ? AND status != 'cancelled' AND paid = 0").run(new Date().toISOString(), order.id);
        return { changes: updated.changes, fee, feePending: false };
      } catch (e) {
        db.prepare("UPDATE mall_orders SET providerVerified=1,feeStatus='pending',feeChargeId=NULL WHERE id=? AND userId=?").run(order.id, req.user.id);
        return { changes: 0, feePending: true, feeError: e.message || "Wallet service fee is pending." };
      }
    })();
    if (settled.cancelled) return res.status(409).json({ verified: false, error: "This order has already been cancelled." });
    if (settled.boundaryMismatch) return res.status(409).json({ verified: false, error: "The payment boundary for this order changed. Refresh and retry." });
    if (settled.feePending) return res.status(409).json({ verified: false, providerVerified: true, feePending: true, status: providerStatus, error: settled.feeError || "Payment was verified, but the NEXA service fee could not be settled. Fund your Wallet and verify again.", order: loadOrder(order.id) });
    if (settled.changes) sendPush(order.userId, "Payment confirmed", `Payment for order ${order.id} was confirmed.`, { screen: "mall_orders", orderId: order.id });
    return res.json({ verified: true, providerVerified: true, status: providerStatus, fee: settled.fee?.fee, order: loadOrder(order.id) });
  } catch (e) { return res.status(502).json({ error: "Could not verify payment right now." }); }
});

const WEBHOOK_RETRYABLE_OUTCOMES = new Set(["received", "vendor_activation_failed"]);
app.post("/api/payments/paystack/webhook", (req, res) => {
  if (!payments.verifyWebhookSignature(req.rawBody, req.headers["x-paystack-signature"])) return res.status(401).end();
  const event = req.body || {};
  const data = event.data || {};
  const reference = String(data.reference || "");
  // Paystack may retry delivery. Persist a deterministic event key so a repeated
  // webhook cannot repeat fulfillment or customer notifications.
  const eventKey = String(data.id || "").trim() || crypto.createHash("sha256").update(req.rawBody || Buffer.from("{}")).digest("hex");
  try {
    const bodyHash = crypto.createHash("sha256").update(req.rawBody || Buffer.from("{}")).digest("hex");
    const inserted = db.prepare("INSERT OR IGNORE INTO mall_payment_events(eventKey,reference,eventType,receivedAt,outcome,bodyHash) VALUES(?,?,?,?,?,?)")
      .run(eventKey, reference, String(event.event || "unknown"), new Date().toISOString(), "received", bodyHash);
    if (!inserted.changes) {
      // V5.54.3: a retry of an event whose earlier attempt never finished ("received", i.e. the handler threw)
      // or whose vendor activation failed must be processed again; every other outcome is final -> ack duplicate.
      const prior = db.prepare("SELECT outcome FROM mall_payment_events WHERE eventKey = ?").get(eventKey);
      if (!WEBHOOK_RETRYABLE_OUTCOMES.has(String(prior?.outcome || ""))) return res.sendStatus(200);
    }
  } catch (e) { console.error("payment webhook event persistence failed", e); return res.sendStatus(500); }
  // V3.50.4: reconcile Paystack refund lifecycle events idempotently.
  const refundEvents = { "refund.pending": "pending", "refund.processing": "processing", "refund.processed": "processed", "refund.failed": "failed" };
  if (refundEvents[event.event]) {
    const providerId = String(data.id || "");
    const refund = db.prepare("SELECT id FROM mall_refunds WHERE providerReference = ? OR reference = ? ORDER BY createdAt DESC LIMIT 1").get(providerId, reference);
    if (!refund) {
      db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("unmatched_refund", eventKey);
      return res.sendStatus(200);
    }
    const now = new Date().toISOString();
    const lifecycle = payments.applyRefundEvent(db, { id: refund.id, status: refundEvents[event.event], providerReference: providerId, updatedAt: now });
    db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("refund_" + (lifecycle.status || refundEvents[event.event]), eventKey);
    return res.sendStatus(200);
  }
  if (event.event !== "charge.success" || !reference) {
    db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("ignored", eventKey);
    return res.sendStatus(200);
  }
  // B144: wallet top-up. The wallet is credited once, only for a confirmed, matching payment.
  const walletTopup = db.prepare("SELECT id FROM wallet_topups WHERE reference=?").get(reference);
  if (walletTopup) {
    const settled = require("./walletTopup").settleTopup(db, reference, { status: data.status, reference, currency: data.currency, amount: data.amount });
    db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("wallet_topup_" + settled.outcome, eventKey);
    if (settled.outcome === "credited") sendPush(settled.topup.userId, "Wallet funded", "Your NEXA Wallet top-up was confirmed.", { screen: "wallet" });
    return res.sendStatus(200);
  }
  const kitchenOrder = db.prepare("SELECT * FROM kitchen_orders WHERE paymentRef=?").get(reference);
  if (kitchenOrder) {
    if (String(kitchenOrder.status || "").toLowerCase() === "cancelled") { db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("cancelled_kitchen_order", eventKey); return res.sendStatus(200); }
    if (!payments.matchesExpectedPayment({ status:data.status, reference, currency:data.currency, amount:data.amount }, { currency:kitchenOrder.currency, total:kitchenOrder.total, paymentRef:reference }, reference)) {
      db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("kitchen_mismatch", eventKey); return res.sendStatus(200);
    }
    const now = new Date().toISOString();
    const fulfilled = db.transaction(() => {
      const current=db.prepare("SELECT status,paymentRef,providerVerified FROM kitchen_orders WHERE id=?").get(kitchenOrder.id);
      if(!current || current.status==='cancelled' || current.paymentRef!==reference) return {changes:0,outcome:'kitchen_boundary_mismatch'};
      if(current.status==='paid' && current.providerVerified) return {changes:0,outcome:'kitchen_already_paid'};
      const changed=db.prepare("UPDATE kitchen_orders SET status='paid',providerVerified=1,updatedAt=? WHERE id=? AND status='pending_payment' AND paymentRef=?").run(now,kitchenOrder.id,reference);
      if(changed.changes){ try { settleKitchenFee(db,kitchenOrder.userId,kitchenOrder.id); } catch { db.prepare("UPDATE kitchen_orders SET feeStatus='pending',feeChargeId=NULL,updatedAt=? WHERE id=?").run(now,kitchenOrder.id); } }
      return {changes:changed.changes,outcome:changed.changes?'kitchen_confirmed':'kitchen_race_lost'};
    })();
    db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run(fulfilled.outcome,eventKey);
    if(fulfilled.changes){ kitchenUserCode(db,kitchenOrder.userId,kitchenOrder.id); settleKitchenReferral(db,kitchenOrder.id); generateKitchenReceipt(db.prepare("SELECT * FROM kitchen_orders WHERE id=?").get(kitchenOrder.id)).catch(()=>{}); sendPush(kitchenOrder.userId,'Kitchen payment confirmed',`Your NEXA Kitchen order ${kitchenOrder.id} is paid.`,{screen:'leisure_kitchen',orderId:kitchenOrder.id}).catch(()=>{}); }
    return res.sendStatus(200);
  }
  const yaayzOrder = db.prepare("SELECT o.*, t.currency AS ticketCurrency FROM yaayz_ticket_orders o JOIN yaayz_ticket_listings t ON t.id=o.ticketId WHERE o.paymentRef=?").get(reference);
  if (yaayzOrder) {
    if (String(yaayzOrder.status || "").toLowerCase() === "cancelled") { db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("cancelled_ticket_order", eventKey); return res.sendStatus(200); }
    if (!payments.matchesExpectedPayment({ status:data.status, reference, currency:data.currency, amount:data.amount }, { currency:yaayzOrder.currency, total:yaayzOrder.total, paymentRef:reference }, reference)) {
      db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("ticket_mismatch", eventKey); return res.sendStatus(200);
    }
    const now = new Date().toISOString();
    const fulfilled = db.transaction(() => {
      const current=db.prepare("SELECT status,paymentRef FROM yaayz_ticket_orders WHERE id=?").get(yaayzOrder.id);
      if(!current || current.status==='cancelled' || current.paymentRef!==reference) return {changes:0,outcome:'ticket_boundary_mismatch'};
      if(current.status==='paid') return {changes:0,outcome:'ticket_already_paid'};
      const code=issueYaayzTicketCode(yaayzOrder.id);
      const changed=db.prepare("UPDATE yaayz_ticket_orders SET status='paid',providerVerified=1,ticketCode=?,updatedAt=? WHERE id=? AND status='pending_payment' AND paymentRef=?").run(code,now,yaayzOrder.id,reference);
      if (changed.changes) { try { settleYaayzFee(db, yaayzOrder.buyerId, yaayzOrder.id); } catch {} }
      return {changes:changed.changes,outcome:changed.changes?'ticket_confirmed':'ticket_race_lost'};
    })();
    db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run(fulfilled.outcome,eventKey);
    if(fulfilled.changes) sendPush(yaayzOrder.buyerId,'Ticket payment confirmed',`Your Yaayz ticket for order ${yaayzOrder.id} is ready.`,{screen:'yaayz',ticketOrderId:yaayzOrder.id});
    return res.sendStatus(200);
  }
  const vendorPayment = db.prepare("SELECT * FROM vendor_subscription_payments WHERE reference=?").get(reference);
  if (vendorPayment) {
    if (!payments.matchesExpectedPayment({ status: data.status, reference, currency: data.currency, amount: data.amount }, { currency: vendorPayment.currency, total: Number(vendorPayment.amountMinor) / 100, paymentRef: reference }, reference)) {
      db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("vendor_mismatch", eventKey);
      return res.sendStatus(200);
    }
    try {
      const activated = vendorSubscriptions.activateVerifiedPayment(db, vendorPayment);
      db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run(activated.alreadyVerified ? "vendor_already_active" : "vendor_confirmed", eventKey);
      if (!activated.alreadyVerified) sendPush(vendorPayment.userId, "Vendor payment confirmed", "Your NEXA vendor access is active for 30 days.", { screen: "mall_vendor", type: "marketplace", vendorId: vendorPayment.vendorId, dedupeKey: `vendor-subscription-activated:${vendorPayment.reference}` }).catch(()=>{});
      return res.sendStatus(200);
    } catch (e) {
      db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("vendor_activation_failed", eventKey);
      return res.sendStatus(500);
    }
  }
  const order = db.prepare("SELECT * FROM mall_orders WHERE paymentRef = ?").get(reference);
  if (!order) {
    db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("unmatched", eventKey);
    return res.sendStatus(200);
  }
  if (String(order.paymentMethod || "").toLowerCase() !== "online") {
    db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("wrong_payment_method", eventKey);
    return res.sendStatus(200);
  }
  if (String(order.status || "").toLowerCase() === "cancelled") {
    db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("cancelled_order", eventKey);
    return res.sendStatus(200);
  }
  if (!payments.matchesExpectedPayment({ status: data.status, reference, currency: data.currency, amount: data.amount }, order, reference)) {
    console.warn("Paystack webhook amount/currency/status mismatch", reference);
    db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run("mismatch", eventKey);
    return res.sendStatus(200);
  }
  const now = new Date().toISOString();
  const fulfillment = db.transaction(() => {
    const current = db.prepare("SELECT status, paymentMethod, paymentRef FROM mall_orders WHERE id = ?").get(order.id);
    const feeState = db.prepare("SELECT providerVerified,feeStatus FROM mall_orders WHERE id = ?").get(order.id);
    if (!current) return { changes: 0, outcome: "unmatched" };
    if (String(current.status || "").toLowerCase() === "cancelled") return { changes: 0, outcome: "cancelled_order" };
    if (String(current.paymentMethod || "").toLowerCase() !== "online" || String(current.paymentRef || "") !== reference) return { changes: 0, outcome: "payment_boundary_mismatch" };
    if (!feeState?.providerVerified) db.prepare("UPDATE mall_orders SET providerVerified=1 WHERE id=?").run(order.id);
    try {
      const fee = settleMarketplaceFee(db, order.userId, order.id);
      const changed = db.prepare("UPDATE mall_order_items SET paid = 1, paidAt = ? WHERE orderId = ? AND status != 'cancelled' AND paid = 0").run(now, order.id);
      return { changes: changed.changes, outcome: "confirmed", fee };
    } catch (e) {
      db.prepare("UPDATE mall_orders SET providerVerified=1,feeStatus='pending',feeChargeId=NULL WHERE id=?").run(order.id);
      return { changes: 0, outcome: "fee_pending" };
    }
  })();
  db.prepare("UPDATE mall_payment_events SET outcome = ? WHERE eventKey = ?").run(fulfillment.outcome, eventKey);
  if (fulfillment.changes) {
    try { if (String(order.paymentMethod||'').toLowerCase() !== 'aami') aamiEconomy.awardActivity(db,order.userId,'marketplace_purchase',order.id,{totalMinor:Math.round(Number(order.total||0)*100),currency:order.currency}); } catch (_) {}
    sendPush(order.userId, "Payment confirmed", `Payment for order ${order.id} was confirmed.`, { screen: "mall_orders", orderId: order.id });
  }
  return res.sendStatus(200);
});

// V3.50.3 — buyer payment history, refund requests, and checkout dispute intake.
app.get("/api/mall/payments/history", auth.authMiddleware, (req, res) => {
  const orders = db.prepare("SELECT id, total, currency, status, paymentMethod, paymentRef, providerVerified, feeStatus, feeChargeId, createdAt FROM mall_orders WHERE userId = ? ORDER BY createdAt DESC LIMIT 100").all(req.user.id).map(o => ({...o, paymentStatus: o.paymentStatus || derivePaymentStatus(db.prepare("SELECT * FROM mall_order_items WHERE orderId = ?").all(o.id)), refunds: db.prepare("SELECT id, amount, currency, status, reason, createdAt, updatedAt FROM mall_refunds WHERE orderId = ? ORDER BY createdAt DESC").all(o.id)}));
  res.json({payments: orders});
});
app.post("/api/mall/orders/:orderId/refunds", auth.authMiddleware, async (req, res) => {
  const order = db.prepare("SELECT * FROM mall_orders WHERE id = ? AND userId = ?").get(req.params.orderId, req.user.id);
  const paid = order ? db.prepare("SELECT COUNT(*) AS n FROM mall_order_items WHERE orderId = ? AND paid = 1 AND status != 'cancelled'").get(order.id).n : 0;
  const existing = order ? db.prepare("SELECT id,status FROM mall_refunds WHERE orderId = ? AND status IN ('pending','processing','processed') LIMIT 1").get(order.id) : null;
  const validation = payments.validateRefundRequest(order, paid, existing, req.body?.reason);
  if (!validation.ok) return res.status(validation.status).json({error:validation.error, ...(validation.refund ? {refund:validation.refund} : {})});
  const {reason, amountMinor} = validation;
  const existingRefunds = order ? db.prepare("SELECT amount,status FROM mall_refunds WHERE orderId=?").all(order.id) : [];
  const refundInvariant = criticalControls.refundCapInvariant(order?.total, existingRefunds);
  if (!refundInvariant.ok) return res.status(409).json({error:"Refund state requires reconciliation before another refund can be submitted."});
  let refundMajorAmount;
  try { refundMajorAmount = currencyModel.minorToMajorUnits(amountMinor, order.currency); }
  catch { return res.status(409).json({error:"Refund currency is unsupported; reconcile this order before submitting a refund."}); }
  if (refundInvariant.reservedRefunds + refundMajorAmount > Number(order.total) + (0.5 / (10 ** currencyModel.minorUnitDigits(order.currency)))) return res.status(409).json({error:"Refund amount exceeds the remaining refundable order balance."});
  const id=genRowId(), now=new Date().toISOString();
  const claim = payments.claimRefund(db, { id, orderId:order.id, buyerId:req.user.id, reference:order.paymentRef, amount:order.total, currency:order.currency, reason, createdAt:now });
  if (!claim.created) return res.status(409).json({error:"A refund is already recorded for this order.",refund:claim.refund});
  try {
    const result=await payments.refund({transaction:order.paymentRef,amountMinor,reason});
    const providerCheck=payments.validateRefundProviderResult(result, order.paymentRef, amountMinor);
    if (!providerCheck.ok) {
      console.error("refund provider response failed integrity validation", providerCheck.error);
      return res.status(202).json({error:"The refund request is being reconciled with the payment provider. Please check payment history before retrying.",refund:{id,orderId:order.id,status:"processing",reason,createdAt:now}});
    }
    const status=providerCheck.status === "processed" ? "processed" : providerCheck.status;
    payments.finalizeRefund(db, { id, status, providerReference:result?.id, updatedAt:new Date().toISOString() });
    res.status(201).json({refund:{id,orderId:order.id,amount:order.total,currency:order.currency,status,reason,createdAt:now}});
  } catch(e) {
    // Keep the reservation in processing: a network/provider error can be ambiguous, and
    // marking it failed would allow a retry that could submit a duplicate real refund.
    res.status(202).json({error:"The refund request is being reconciled with the payment provider. Please check payment history before retrying.",refund:{id,orderId:order.id,status:"processing",reason,createdAt:now}});
  }
});
app.post("/api/mall/orders/:orderId/disputes", auth.authMiddleware, (req,res) => {
  const order=db.prepare("SELECT id FROM mall_orders WHERE id=? AND userId=?").get(req.params.orderId,req.user.id);
  const validation=payments.validateDisputeRequest(order, req.body?.reason);
  if(!validation.ok) return res.status(validation.status).json({error:validation.error});
  const reason=validation.reason, details=String(req.body?.details||"").trim().slice(0,1500);
  const id=genRowId(),now=new Date().toISOString();
  const claim=payments.claimDispute(db,{id,orderId:order.id,buyerId:req.user.id,reason,details,createdAt:now});
  if(!claim.created) return res.status(409).json({error:"An open dispute already exists for this order.",dispute:claim.dispute});
  res.status(201).json({dispute:{id,orderId:order.id,reason,details,status:'open',createdAt:now}});
});
app.get("/api/mall/orders/:orderId/disputes", auth.authMiddleware, (req,res) => {
  const order=db.prepare("SELECT id FROM mall_orders WHERE id=? AND userId=?").get(req.params.orderId,req.user.id);
  if(!order) return res.status(404).json({error:"Order not found."});
  res.json({disputes:db.prepare("SELECT id,orderId,reason,details,status,resolution,createdAt,updatedAt FROM mall_checkout_disputes WHERE orderId=? AND buyerId=? ORDER BY createdAt DESC").all(order.id,req.user.id)});
});

// V3.50.4 — seller response and buyer confirmation for checkout disputes.
app.get("/api/mall/vendor/disputes", auth.authMiddleware, requireVendorAccess, (req, res) => {
  const rows = db.prepare(`SELECT d.*, o.name AS itemName, o.currency FROM mall_checkout_disputes d
    JOIN mall_orders m ON m.id=d.orderId JOIN mall_order_items o ON o.orderId=m.id
    WHERE o.vendorId=? ORDER BY d.updatedAt DESC LIMIT 100`).all(req.vendor.id);
  res.json({ disputes: rows });
});
app.post("/api/mall/vendor/disputes/:disputeId/respond", auth.authMiddleware, requireVendorAccess, (req, res) => {
  const dispute = db.prepare(`SELECT d.* FROM mall_checkout_disputes d JOIN mall_order_items i ON i.orderId=d.orderId
    WHERE d.id=? AND i.vendorId=?`).get(req.params.disputeId, req.vendor.id);
  if (!dispute) return res.status(404).json({error:"Dispute not found."});
  if (dispute.status !== "open") return res.status(409).json({error:"Only open disputes can receive a seller response."});
  const response = String(req.body?.response || "").trim().slice(0,1500);
  if (response.length < 4) return res.status(400).json({error:"Please provide a response (at least 4 characters)."});
  const now = new Date().toISOString();
  const changed = payments.transitionDispute(db, {
    id: dispute.id, fromStatuses: ["open"], toStatus: "pending_buyer_confirmation", resolution: response, updatedAt: now
  });
  if (!changed.changes) return res.status(409).json({error:"This dispute was updated before your response was saved."});
  res.json({dispute:{id:dispute.id,status:"pending_buyer_confirmation",resolution:response,updatedAt:now}});
});
app.post("/api/mall/orders/:orderId/disputes/:disputeId/confirm", auth.authMiddleware, (req,res) => {
  const dispute = db.prepare("SELECT * FROM mall_checkout_disputes WHERE id=? AND orderId=? AND buyerId=?").get(req.params.disputeId, req.params.orderId, req.user.id);
  if (!dispute) return res.status(404).json({error:"Dispute not found."});
  if (dispute.status !== "pending_buyer_confirmation") return res.status(409).json({error:"This dispute is not awaiting your confirmation."});
  const now = new Date().toISOString();
  const changed = payments.transitionDispute(db, {
    id: dispute.id, fromStatuses: ["pending_buyer_confirmation"], toStatus: "resolved", updatedAt: now
  });
  if (!changed.changes) return res.status(409).json({error:"This dispute was updated before your confirmation was saved."});
  res.json({dispute:{id:dispute.id,status:"resolved",updatedAt:now}});
});

// V3.50.9 — administrator dispute queue and resolution controls.
// Admin access is deliberately server-side and configuration-driven. Set
// NEXA_ADMIN_EMAILS and/or NEXA_ADMIN_USER_IDS as comma-separated values.
function requireMallAdmin(req, res, next) {
  if (!isConfiguredAdmin(req.user)) return res.status(403).json({error:"Administrator access required."});
  return next();
}
// V6.2.6: the same routes also serve a verified Admin AAMI grant (via /api/admin-aami/nexa/x/...). A scoped request is decided only by its
// grant's permission; an unscoped request keeps the owner-list check above. Writes also get the step-up check and the grant's role on audit.
const mallAdminFor = (permission) => (req, res, next) => (adminAccess.allowRoute(req, permission, isConfiguredAdmin(req.user)) ? next() : res.status(403).json({error:"Administrator access required."}));
const scopedAudit = (req, action, targetType, targetId, detail) => { if (Object.hasOwn(req, "adminAamiAccess")) adminAccess.audit(req, action, targetType, targetId, detail); };
app.get("/api/mall/admin/status", auth.authMiddleware, (req,res) => {
  res.json({isAdmin:adminAccess.allowRoute(req,"mall",isConfiguredAdmin(req.user))});
});
app.get("/api/mall/admin/reviews", auth.authMiddleware, mallAdminFor("mall"), (req,res) => {
  const status = String(req.query?.status || "all").trim();
  const allowed = new Set(["all","published","removed","pending"]);
  const filter = allowed.has(status) && status !== "all" ? "WHERE r.moderationStatus = ?" : "";
  const params = filter ? [status] : [];
  const rows = db.prepare(`SELECT r.id,r.productId,r.vendorId,r.userId,r.rating,r.comment,r.createdAt,r.updatedAt,r.sellerReply,r.moderationStatus,u.name AS reviewerName,v.shopName
    FROM mall_reviews r JOIN users u ON u.id=r.userId LEFT JOIN vendors v ON v.id=r.vendorId ${filter}
    ORDER BY r.updatedAt DESC,r.id DESC LIMIT 200`).all(...params);
  res.json({reviews:rows});
});
app.patch("/api/mall/admin/reviews/:reviewId/moderation", auth.authMiddleware, adminAccess.scopedGate("mall_reviews_write"), mallAdminFor("mall_reviews_write"), (req,res) => {
  const toStatus=String(req.body?.status||"").trim().toLowerCase();
  const reason=String(req.body?.reason||"").trim().slice(0,500);
  const allowed=new Set(["published","removed","pending"]);
  if(!allowed.has(toStatus)) return res.status(400).json({error:"Choose a valid review moderation status."});
  const review=db.prepare("SELECT * FROM mall_reviews WHERE id=?").get(req.params.reviewId);
  if(!review) return res.status(404).json({error:"Review not found."});
  if(review.moderationStatus===toStatus) return res.json({review:{id:review.id,moderationStatus:toStatus},unchanged:true});
  const now=new Date().toISOString();
  try {
    db.transaction(()=>{
      const changed=db.prepare("UPDATE mall_reviews SET moderationStatus=?,updatedAt=? WHERE id=? AND moderationStatus=?").run(toStatus,now,review.id,review.moderationStatus);
      if(!changed.changes) throw Object.assign(new Error("REVIEW_CHANGED"),{status:409});
      db.prepare("INSERT INTO mall_review_moderation_events(id,reviewId,actorId,fromStatus,toStatus,reason,createdAt) VALUES(?,?,?,?,?,?,?)").run(genRowId("rme"),review.id,req.user.id,review.moderationStatus,toStatus,reason||null,now);
      db.prepare("UPDATE mall_interaction_reports SET status='reviewed' WHERE targetType='review' AND targetId=? AND status='open'").run(review.id);
    })();
  } catch(e) { if(e.status===409) return res.status(409).json({error:"This review changed before moderation was saved."}); throw e; }
  scopedAudit(req, "mall_review_moderated", "mall_review", review.id, `to ${toStatus}${reason?`: ${reason}`:""}`);
  res.json({review:{id:review.id,moderationStatus:toStatus,updatedAt:now}});
});

app.get("/api/mall/admin/review-reports", auth.authMiddleware, mallAdminFor("mall"), (req,res) => {
  const status=String(req.query?.status||"open").trim().toLowerCase();
  const allowed=new Set(["open","reviewed","dismissed","all"]);
  if(!allowed.has(status)) return res.status(400).json({error:"Choose a valid report status."});
  const filter=status==="all"?"":"WHERE r.status=?";
  const params=status==="all"?[]:[status];
  const rows=db.prepare(`SELECT r.id,r.targetId AS reviewId,r.reason,r.details,r.createdAt,r.status,
      v.shopName,p.name AS productName,rv.rating,rv.createdAt AS reviewCreatedAt
    FROM mall_interaction_reports r
    JOIN mall_reviews rv ON rv.id=r.targetId AND r.targetType='review'
    LEFT JOIN vendors v ON v.id=rv.vendorId
    LEFT JOIN mall_products p ON p.id=rv.productId
    ${filter}
    ORDER BY r.createdAt DESC,r.id DESC LIMIT 200`).all(...params);
  res.json({reports:rows});
});
app.patch("/api/mall/admin/review-reports/:reportId/status", auth.authMiddleware, adminAccess.scopedGate("mall_reviews_write"), mallAdminFor("mall_reviews_write"), (req,res) => {
  const toStatus=String(req.body?.status||"").trim().toLowerCase();
  const allowed=new Set(["reviewed","dismissed"]);
  if(!allowed.has(toStatus)) return res.status(400).json({error:"Choose a valid report resolution."});
  const reason=String(req.body?.reason||"").trim().slice(0,500);
  const current=db.prepare("SELECT id,status,targetType,targetId FROM mall_interaction_reports WHERE id=? AND targetType='review'").get(req.params.reportId);
  if(!current) return res.status(404).json({error:"Review report not found."});
  if(current.status===toStatus) return res.json({report:{id:current.id,status:toStatus},unchanged:true});
  if(current.status!=="open") return res.status(409).json({error:"This review report is already resolved."});
  const changed=db.prepare("UPDATE mall_interaction_reports SET status=? WHERE id=? AND status='open' AND targetType='review'").run(toStatus,current.id);
  if(!changed.changes) return res.status(409).json({error:"This review report changed before resolution was saved."});
  scopedAudit(req, "mall_review_report_resolved", "mall_review_report", current.id, `to ${toStatus}${reason?`: ${reason}`:""}`);
  res.json({report:{id:current.id,status:toStatus,reason:reason||null}});
});

app.get("/api/mall/admin/disputes", auth.authMiddleware, mallAdminFor("mall_disputes"), (req,res) => {
  const status = String(req.query?.status || "all").trim();
  const allowed = new Set(["all","open","pending_buyer_confirmation","resolved"]);
  const filter = allowed.has(status) && status !== "all" ? "WHERE d.status = ?" : "";
  const params = filter ? [status] : [];
  const rows = db.prepare(`SELECT d.*, u.email AS buyerEmail, u.name AS buyerName,
      m.total AS orderTotal, m.currency AS orderCurrency,
      i.name AS itemName, i.vendorId, v.shopName
    FROM mall_checkout_disputes d
    JOIN users u ON u.id=d.buyerId
    JOIN mall_orders m ON m.id=d.orderId
    LEFT JOIN mall_order_items i ON i.orderId=d.orderId
    LEFT JOIN vendors v ON v.id=i.vendorId
    ${filter}
    ORDER BY d.updatedAt DESC LIMIT 200`).all(...params);
  res.json({disputes:rows});
});
app.post("/api/mall/admin/disputes/:disputeId/resolve", auth.authMiddleware, adminAccess.scopedGate("mall_disputes"), mallAdminFor("mall_disputes"), (req,res) => {
  const dispute = db.prepare("SELECT * FROM mall_checkout_disputes WHERE id=?").get(req.params.disputeId);
  if (!dispute) return res.status(404).json({error:"Dispute not found."});
  if (dispute.status === "resolved") return res.status(409).json({error:"This dispute is already resolved."});
  const resolution = String(req.body?.resolution || "").trim().slice(0,1500);
  if (resolution.length < 4) return res.status(400).json({error:"Please provide a resolution (at least 4 characters)."});
  const now = new Date().toISOString();
  const changed = payments.transitionDispute(db, {
    id: dispute.id, fromStatuses: ["open", "pending_buyer_confirmation"], toStatus: "resolved", resolution, updatedAt: now
  });
  if (!changed.changes) return res.status(409).json({error:"This dispute was updated before the resolution was saved."});
  const buyer = db.prepare("SELECT userId FROM mall_orders WHERE id=?").get(dispute.orderId);
  const seller = db.prepare("SELECT v.userId FROM mall_order_items i JOIN vendors v ON v.id=i.vendorId WHERE i.orderId=? LIMIT 1").get(dispute.orderId);
  if (buyer?.userId) sendPush(buyer.userId, "Marketplace dispute resolved", "An NEXA Admin moderator resolved your buyer dispute.", {screen:"mall_orders", orderId:dispute.orderId, disputeId:dispute.id});
  if (seller?.userId && seller.userId !== buyer?.userId) sendPush(seller.userId, "Marketplace dispute resolved", "An NEXA Admin moderator resolved a buyer/seller dispute involving your shop.", {screen:"mall_orders", orderId:dispute.orderId, disputeId:dispute.id});
  scopedAudit(req, "mall_dispute_resolved", "mall_dispute", dispute.id, `order ${dispute.orderId}`);
  res.json({dispute:{id:dispute.id,status:"resolved",resolution,updatedAt:now}});
});

// -- Payment: config, vendor "mark as paid" (V3.7) --
app.get("/api/mall/config", (req, res) => {
  res.json({ paymentsEnabled: payments.isEnabled(), paymentMethods: payments.isEnabled() ? ["pay_seller", "online", "aami"] : ["pay_seller", "aami"], lowStockThreshold: LOW_STOCK_THRESHOLD, autoConfirmDays: AUTO_CONFIRM_DAYS });
});

// Buyers currently pay the seller directly, so the seller confirms it here.
app.patch("/api/mall/vendor/orders/:orderId/payment", auth.authMiddleware, requireVendorAccess, (req, res) => {
  if (typeof req.body?.paid !== "boolean") return res.status(400).json({ error: "paid must be true or false." });
  const paid = req.body.paid;
  let changed = false;
  let buyerId = null;
  try {
    const result = db.transaction(() => {
      const orderPayment = db.prepare("SELECT paymentMethod, paymentRef, status FROM mall_orders WHERE id = ?").get(req.params.orderId);
      if (!orderPayment) { const e = new Error("Order not found."); e.statusCode = 404; throw e; }
      if (!payments.canVendorSetPaid(orderPayment.paymentMethod)) {
        const e = new Error("Online payment status is controlled by verified payment events and cannot be changed by a seller."); e.statusCode = 409; throw e;
      }
      if (String(orderPayment.status || "").toLowerCase() === "cancelled") {
        const e = new Error("This order is cancelled."); e.statusCode = 409; throw e;
      }
      const all = db.prepare("SELECT * FROM mall_order_items WHERE orderId = ? AND vendorId = ?").all(req.params.orderId, req.vendor.id);
      if (!all.length) { const e = new Error("Order not found."); e.statusCode = 404; throw e; }
      const live = all.filter((r) => r.status !== "cancelled");
      if (!live.length) { const e = new Error("This order is cancelled."); e.statusCode = 409; throw e; }
      const changing = live.filter((r) => !!r.paid !== paid);
      if (!changing.length) return { changed: false, buyerId: null };
      const now = new Date().toISOString();
      const mutation = db.prepare("UPDATE mall_order_items SET paid = ?, paidAt = ? WHERE orderId = ? AND vendorId = ? AND status != 'cancelled' AND paid != ?")
        .run(paid ? 1 : 0, paid ? now : null, req.params.orderId, req.vendor.id, paid ? 1 : 0);
      if (!mutation.changes) return { changed: false, buyerId: null };
      const buyer = db.prepare("SELECT userId FROM mall_orders WHERE id = ?").get(req.params.orderId);
      return { changed: true, buyerId: buyer?.userId || null };
    })();
    changed = result.changed;
    buyerId = result.buyerId;
  } catch (e) {
    if (e?.statusCode) return res.status(e.statusCode).json({ error: e.message });
    throw e;
  }
  if (changed && paid && buyerId) {
    sendPush(buyerId, "Payment received", `${req.vendor.shopName} confirmed your payment.`, { screen: "mall_orders", orderId: req.params.orderId });
  }
  res.json({ ok: true, paid });
});

// -- Vendor business summary & manual income (V3.7) --
const r2 = (n) => Math.round(n * 100) / 100;

app.get("/api/mall/vendor/summary", auth.authMiddleware, requireVendor, (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query?.days, 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const sinceDay = since.slice(0, 10);

  const rows = db.prepare(
    `SELECT i.orderId, i.productId, i.name, i.price, i.quantity, i.paid, o.currency
     FROM mall_order_items i JOIN mall_orders o ON o.id = i.orderId
     WHERE i.vendorId = ? AND i.status != 'cancelled' AND o.createdAt >= ?`
  ).all(req.vendor.id, since);

  const cur = new Map();
  const bucket = (c) => {
    if (!cur.has(c)) cur.set(c, { currency: c, revenue: 0, paid: 0, unpaid: 0, orderIds: new Set(), units: 0, otherIncome: 0, businessExpenses: 0 });
    return cur.get(c);
  };
  bucket("NGN");
  const sellers = new Map();
  for (const r of rows) {
    const amt = r.price * r.quantity;
    const c = bucket(r.currency);
    c.revenue += amt;
    if (r.paid) c.paid += amt; else c.unpaid += amt;
    c.orderIds.add(r.orderId);
    c.units += r.quantity;
    const key = `${r.productId}|${r.currency}`;
    const b = sellers.get(key) || { productId: r.productId, name: r.name, currency: r.currency, units: 0, revenue: 0 };
    b.units += r.quantity; b.revenue += amt;
    sellers.set(key, b);
  }
  for (const r of db.prepare("SELECT currency, SUM(amount) AS total FROM vendor_incomes WHERE vendorId = ? AND date >= ? GROUP BY currency").all(req.vendor.id, sinceDay)) {
    bucket(r.currency).otherIncome += r.total || 0;
  }
  // Business expenses come from the user's own Money log (category "business").
  for (const r of db.prepare("SELECT currency, SUM(amount) AS total FROM expenses WHERE userId = ? AND category = 'business' AND date >= ? GROUP BY currency").all(req.user.id, sinceDay)) {
    bucket(r.currency).businessExpenses += r.total || 0;
  }

  const byCurrency = [...cur.values()].map((c) => {
    const orders = c.orderIds.size;
    const income = c.paid + c.otherIncome;
    return {
      currency: c.currency, revenue: r2(c.revenue), paid: r2(c.paid), unpaid: r2(c.unpaid), orders, units: c.units,
      avgOrder: orders ? r2(c.revenue / orders) : 0, otherIncome: r2(c.otherIncome), income: r2(income),
      businessExpenses: r2(c.businessExpenses), profit: r2(income - c.businessExpenses),
    };
  }).sort((a, b) => (a.currency === "NGN" ? -1 : b.currency === "NGN" ? 1 : a.currency.localeCompare(b.currency)));

  const bestSellers = [...sellers.values()]
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 5).map((b) => ({ ...b, revenue: r2(b.revenue) }));
  const lowStock = db.prepare(
    "SELECT id, name, stock FROM mall_products WHERE vendorId = ? AND active = 1 AND stock <= ? ORDER BY stock ASC, name ASC LIMIT 20"
  ).all(req.vendor.id, LOW_STOCK_THRESHOLD);

  res.json({ days, since, byCurrency, bestSellers, lowStock, lowStockThreshold: LOW_STOCK_THRESHOLD });
});

app.get("/api/mall/vendor/incomes", auth.authMiddleware, requireVendor, (req, res) => {
  res.json({ incomes: db.prepare("SELECT * FROM vendor_incomes WHERE vendorId = ? ORDER BY date DESC, createdAt DESC LIMIT 50").all(req.vendor.id) });
});

app.post("/api/mall/vendor/incomes", auth.authMiddleware, requireVendor, (req, res) => {
  const b = req.body || {};
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) return res.status(400).json({ error: "Enter a valid amount." });
  const currency = /^[A-Za-z]{3}$/.test(String(b.currency || "NGN")) ? String(b.currency || "NGN").toUpperCase() : "NGN";
  const date = b.date ? String(b.date) : new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return res.status(400).json({ error: "Date must look like 2026-09-24." });
  const note = b.note ? String(b.note).trim().slice(0, 120) : "";
  const id = genRowId("inc");
  db.prepare("INSERT INTO vendor_incomes (id, vendorId, amount, currency, note, date, createdAt) VALUES (?,?,?,?,?,?,?)")
    .run(id, req.vendor.id, amount, currency, note, date, new Date().toISOString());
  res.json({ income: db.prepare("SELECT * FROM vendor_incomes WHERE id = ?").get(id) });
});

app.delete("/api/mall/vendor/incomes/:id", auth.authMiddleware, requireVendor, (req, res) => {
  const r = db.prepare("DELETE FROM vendor_incomes WHERE id = ? AND vendorId = ?").run(req.params.id, req.vendor.id);
  if (!r.changes) return res.status(404).json({ error: "Entry not found." });
  res.json({ ok: true });
});

// -- Sample vendor & catalog, seeded once so the Mall isn't empty on first
//    run. Real vendors upload their own products from the app; nothing here
//    is bundled with the app itself. Safe to re-run — no-ops if already seeded. --
(function seedSampleMallVendor() {
  const demoEmail = "demo.store@nexa.local";
  let demoUser = db.prepare("SELECT id FROM users WHERE email = ?").get(demoEmail);
  if (!demoUser) {
    const id = genRowId("u");
    // Preview mode may use the documented deterministic fixture password. Normal
    // development/production startup deliberately keeps this account non-loginable
    // with a known password so preview credentials cannot accidentally become real.
    const previewPassword = process.env.NEXA_PREVIEW_MODE === "1" ? "NexaPreview!2026Vendor" : null;
    const passwordHash = require("bcryptjs").hashSync(previewPassword || crypto.randomBytes(16).toString("hex"), 10);
    db.prepare("INSERT INTO users (id, email, passwordHash, name, createdAt) VALUES (?,?,?,?,?)")
      .run(id, demoEmail, passwordHash, "NEXA Demo Store", new Date().toISOString());
    demoUser = { id };
  }
  let vendor = getVendorForUser(demoUser.id);
  if (!vendor) {
    const id = genRowId("v");
    db.prepare("INSERT INTO vendors (id, userId, shopName, bio, createdAt) VALUES (?,?,?,?,?)")
      .run(id, demoUser.id, "NEXA Demo Store", "Sample listings so the Mall isn't empty on first run.", new Date().toISOString());
    vendor = { id };
  }
  const already = db.prepare("SELECT COUNT(*) as c FROM mall_products WHERE vendorId = ?").get(vendor.id).c;
  if (already > 0) return;

  const sample = [
    { name: "Wireless Earbuds Pro", category: "electronics", price: 18500, description: "Bluetooth 5.3, 30hr battery, touch controls." },
    { name: "Fast Charger 65W", category: "electronics", price: 9500, description: "USB-C GaN charger, laptop-capable." },
    { name: "Ankara Print Shirt", category: "fashion", price: 12000, description: "Men's slim-fit, breathable cotton blend." },
    { name: "Leather Handbag", category: "fashion", price: 27500, description: "Genuine leather, adjustable strap." },
    { name: "Non-Stick Cookware Set", category: "home", price: 34000, description: "5-piece set, induction-safe." },
    { name: "LED Desk Lamp", category: "home", price: 8200, description: "3 brightness modes, USB powered." },
    { name: "Shea Butter Cream", category: "beauty", price: 4500, description: "100% raw, unrefined, 250g." },
    { name: "Matte Lipstick Set", category: "beauty", price: 7000, description: "Pack of 4, long-wear formula." },
  ];
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO mall_products
     (id, vendorId, name, description, price, currency, category, stock, imageUrl, imageEmoji, imageColor, active, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  for (const p of sample) {
    const ph = CATEGORY_PLACEHOLDER[p.category] || { emoji: "🛍️", color: "#C9A227" };
    insert.run(genRowId("mp"), vendor.id, p.name, p.description, p.price, "NGN", p.category, 25, null, ph.emoji, ph.color, 1, now, now);
  }
  console.log(`[NEXA] Seeded sample Mall vendor "NEXA Demo Store" with ${sample.length} products.`);
})();

// V3.29: centralized fallback error response. Route handlers should still handle
// expected failures locally; this prevents unexpected exceptions from leaking stacks.
// V3.40.2: functional workflow, calendar/task, and personal knowledge APIs.
aiHub.mount(app, auth);

sentry.setupExpressErrorHandler(app);

app.use(httpSurface.notFoundHandler); // V5.54.0 / B91: JSON 404 after every route, before the error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  // Multer can fail before the route handler runs; clean managed audio files at the global boundary too.
  audioUploadLifecycle.cleanupRequestFiles(audioUploadManager, req);
  const result = errorPayload(err, req.requestId);
  if (result.status >= 500) {
    console.error(`[NEXA] Unhandled request error (${req.requestId || "no-request-id"}):`, err && err.message ? err.message : "unknown error");
  } else {
    console.warn(`[NEXA] Request rejected (${req.requestId || "no-request-id"}): HTTP ${result.status}`);
  }
  res.status(result.status).json(result.body);
});

// V3.63 maintenance: bounded startup cleanup of expired user/session/workflow/event records.
try { console.log("[NEXA] Maintenance:", maintenance.runMaintenance(db)); } catch (e) { console.warn("[NEXA] Maintenance cleanup skipped:", e.message); }
try { console.log("[NEXA] Audio temp cleanup:", audioUploadManager.cleanupStale()); } catch (e) { console.warn("[NEXA] Audio temp cleanup skipped:", e.message); }
try { notificationDelivery.recoverStaleSending(db); notificationDelivery.recoverStaleReceiptChecks(db); notificationDelivery.deliverDue(db).then((result) => console.log("[NEXA] Notification delivery retry:", result)).catch((e) => console.warn("[NEXA] Notification delivery retry skipped:", e.message)); } catch (e) { console.warn("[NEXA] Notification delivery retry skipped:", e.message); }
try {
  vendorSubscriptionScheduler.tick(db, { sendPush }).then((result) => console.log("[NEXA] Vendor subscription scheduler:", result.length)).catch((e) => console.warn("[NEXA] Vendor subscription scheduler tick skipped:", e.message));
  setInterval(() => vendorSubscriptionScheduler.tick(db, { sendPush }).catch((e) => console.warn("[NEXA] Vendor subscription scheduler tick skipped:", e.message)), 60_000).unref();
} catch (e) { console.warn("[NEXA] Vendor subscription scheduler startup skipped:", e.message); }

// V5.98.5 / B143: re-verify stale pending Kitchen/Yaayz orders with Paystack and confirm the ones that were paid.
// Live mode only; PAYMENT_RECONCILE_DISABLED=1 is the kill switch.
try {
  const reconcilerEnabled = String(process.env.PAYMENT_RECONCILE_DISABLED || "") !== "1"
    && String(process.env.PAYMENT_MODE || "live").toLowerCase() === "live"
    && Boolean(process.env.PAYSTACK_SECRET_KEY)
    && String(process.env.NODE_ENV || "") !== "test";
  if (reconcilerEnabled) {
    const reconcilerDeps = {
      verify: (reference) => payments.verify(reference),
      matchesExpectedPayment: payments.matchesExpectedPayment,
      issueYaayzTicketCode, settleYaayzFee, settleKitchenFee, kitchenUserCode, settleKitchenReferral, generateKitchenReceipt, sendPush,
      settleTopup: (...args) => require("./walletTopup").settleTopup(...args),
    };
    const reconcilerTick = () => paymentReconciler.tick(db, reconcilerDeps)
      .then(async (r) => { try { const t = await paymentReconciler.reconcileTopups(db, reconcilerDeps); if (t && (t.checked || t.providerErrors)) console.log("[NEXA] Wallet top-up reconciler:", JSON.stringify({ checked: t.checked, confirmed: t.confirmed, flagged: t.flagged, providerErrors: t.providerErrors })); } catch (e) { console.warn("[NEXA] Wallet top-up reconciler skipped:", e.message); } return r; })
      .then((r) => { if (r && !r.skipped && (r.checked || r.providerErrors)) console.log("[NEXA] Payment reconciler:", JSON.stringify({ checked: r.checked, confirmed: r.confirmed, flagged: r.flagged, providerErrors: r.providerErrors })); })
      .catch((e) => console.warn("[NEXA] Payment reconciler tick skipped:", e.message));
    setTimeout(reconcilerTick, 30_000).unref();
    setInterval(reconcilerTick, 5 * 60_000).unref();
  }
} catch (e) { console.warn("[NEXA] Payment reconciler startup skipped:", e.message); }

// ---- Boot validation ----
(function validateEnv() {
  const productionConfig = require("./productionConfig");
  const configurationReadiness = productionConfig.inspectConfiguration(process.env);
  console.log(productionConfig.safeReadinessSummary(configurationReadiness));
  if (!grokProvider.isConfigured(process.env)) {
    console.error("\n[NEXA] XAI_API_KEY is missing or still the placeholder. AI calls will say Grok is not set up yet.");
    console.error("[NEXA] Copy server/.env.example → server/.env and add a real key.\n");
  } else {
    console.log("[NEXA] XAI_API_KEY: set");
  }
  if (process.env.OPENAI_API_KEY) console.warn("[NEXA] OPENAI_API_KEY is set but OpenAI is no longer used; NEXA uses Grok (XAI_API_KEY).");
  if (/^openai$/i.test(String(process.env.DAMI_AI_PROVIDER || process.env.NEXA_AI_PROVIDER || ""))) console.warn("[NEXA] AI provider 'openai' is a legacy value and now means Grok.");
  console.log("[NEXA] XAI_MODEL:", MODEL);
  console.log("[NEXA] Version:", require("./package.json").version);
  console.log("[NEXA] Release:", require("./releaseIdentity").label());
})();

const PORT = Number(process.env.PORT || 3000);
{
  const launchReport = launchReadiness.evaluateLaunchReadiness({ env: process.env, packageVersion: require("./package.json").version });
  if (launchReport.production) console.log(`[NEXA] ${launchReadiness.summarizeForLog(launchReport)}`);
  const productionContract = productionIntegrity.evaluate({ env: process.env, root: process.cwd() });
  const productionCertification = productionLaunchCertification.evaluateProductionCertification({ env: process.env, root: process.cwd(), packageVersion: require("./package.json").version });
  if (launchReport.production) console.log(`[NEXA] production integrity: ${productionContract.pass} pass, ${productionContract.fail} fail`);
  if (launchReport.production) console.log(`[NEXA] production certification: ${productionCertification.ok ? "PASS" : "BLOCKED"}`);
  if (productionCertification.shouldBlockStart) { console.error("[NEXA] Production launch certification failed; refusing to start."); process.exit(1); }
}
if (process.env.BACKUP_DIR) {
  try { const st = recoveryOps.recoveryStatus({ db, env: process.env, packageVersion: require("./package.json").version }); console.log(`[NEXA] backups: ${st.backups.count} on disk, freshness ${st.backups.freshness.status}`); }
  catch (_) { console.warn("[NEXA] backup status unavailable at startup"); }
}
// Blaca Essentials fashion vendor: created on first start if missing (idempotent, never throws). See seedFashionVendors.js.
const previewSeedEnv = { ...process.env, NEXA_SEED_DEMO_VENDORS: process.env.NEXA_PREVIEW_MODE === "1" ? "1" : process.env.NEXA_SEED_DEMO_VENDORS };
require("./seedFashionVendors").ensureBlacaAtStartup(previewSeedEnv);
// B371: preview-only demo pack. Production certification rejects preview mode, so this data cannot seed production.
if (process.env.NEXA_PREVIEW_MODE === "1") { try { require("./previewFixtures"); require("./demoFixtures").apply(); } catch (e) { console.warn(`[NEXA] Preview demo pack skipped: ${e.message}`); } }
const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`[NEXA] ${require("./package.json").version} server listening on ${PORT}`);
});
httpSurface.applyServerTimeouts(server, process.env); // V5.54.0 / B91

function shutdown(signal) {
  console.log(`[NEXA] ${signal} received; closing HTTP server...`);
  try { audioUploadCleanupTimer && clearInterval(audioUploadCleanupTimer); } catch (_) {}
  server.close((err) => {
    if (err) { console.error("[NEXA] Error during shutdown:", err.message); process.exitCode = 1; }
    try { if (db && typeof db.close === "function") db.close(); } catch (e) { console.error("[NEXA] Database close error:", e.message); }
  });
  setTimeout(() => { console.error("[NEXA] Shutdown timeout; forcing exit."); process.exit(1); }, 10000).unref();
}
// A failed fire-and-forget promise (e.g. a push notification) must not take the whole server down on Node 20.
process.on("unhandledRejection", (reason) => {
  console.error("[NEXA] Unhandled promise rejection:", reason && reason.message ? reason.message : String(reason));
  // Only the error type name goes to monitoring: the message and stack can hold user data, SQL values or tokens.
  try { operationalTelemetry.reportException(reason, { domain: "process", action: "unhandled_rejection", severity: "error", requestId: eventCorrelation.currentRequestId() }); } catch (_) {}
});
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
const publicMarketVisibility = require("./v5_79_0_public_market_visibility");

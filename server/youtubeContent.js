"use strict";

const crypto = require("crypto");

const SHORT_FREE_LIMIT = 5;
const SHORT_ADDON_TIERS = Object.freeze([15,25,45]);
const ADDITIONAL_VIDEO_TYPES = Object.freeze(['short','long']);
const VIEWER_AAMI_PER_QUALIFIED_SHORT = 1;
const MAX_LONG_PER_MONTH = 100;
const LONG_PACKAGES = Object.freeze({
  25: 500000,
  50: 1300000,
  100: 2500000,
});
const DEFAULT_DURATION_DAYS = 90;
const NARRATIVIA_DURATION_DAYS = 120;
const CREATOR_AAMI_PER_1000_VIEWS = 20;
const QUALIFIED_VIEW_MS = 3000;
const SYNC_INTERVAL_MS = 15 * 60 * 1000;
const NARRATIVIA_URL = "https://youtube.com/@narrativia-story";

function id(prefix = "yt") { return `${prefix}_${Date.now()}_${crypto.randomBytes(7).toString("hex")}`; }
function now() { return new Date().toISOString(); }
function addDays(iso, days) { return new Date(new Date(iso).getTime() + Number(days) * 86400000).toISOString(); }
function monthKey(date = new Date()) { return new Date(date).toISOString().slice(0, 7); }
function isNarrativiaChannelUrl(value) { return normalizeUrl(value).toLowerCase() === NARRATIVIA_URL.toLowerCase(); }
function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^https:\/\/(www\.)?youtube\.com\//i.test(raw)) throw Object.assign(new Error("Enter a valid YouTube channel URL."), { status: 400 });
  return raw.split("?")[0].replace(/\/$/, "");
}
function packageForLongCount(count) {
  const n = Number(count);
  return Object.prototype.hasOwnProperty.call(LONG_PACKAGES, n) ? { count: n, amountMinor: LONG_PACKAGES[n], currency: "NGN" } : null;
}
function durationDaysForVendor(vendor) { return String(vendor?.businessType || "").split(",").includes("youtube_narrativia") ? NARRATIVIA_DURATION_DAYS : DEFAULT_DURATION_DAYS; }
function isShort(video) { return Number(video?.durationSeconds || 0) > 0 && Number(video.durationSeconds) <= 180; }
function damiScreenContent(video) {
  const duration=Number(video?.durationSeconds||0);
  if(!Number.isFinite(duration)||duration<=0) return {approved:false,reason:"Dami needs a verified YouTube duration before Yaayz placement."};
  const text=`${video?.title||""} ${video?.description||""}`.toLowerCase();
  const safety=require("./contentSafety").checkText(text);
  if(!safety.allowed) return {approved:false,reason:safety.reason};
  const blocked=["child sexual abuse","sexual exploitation of children","explicit pornography","pornographic sex with minors","terrorist recruitment","suicide instructions","self-harm instructions"];
  const hit=blocked.find(x=>text.includes(x));
  if(hit) return {approved:false,reason:`Dami flagged prohibited content: ${hit}.`};
  return {approved:true,reason:`Dami content screen passed; verified duration ${duration}s.`};
}

function screenPendingVideos(db, channelId) {
  const rows=db.prepare("SELECT * FROM youtube_content WHERE channelId=? AND moderationStatus='pending'").all(channelId);
  let approved=0;
  for(const row of rows){const result=damiScreenContent(row); if(result.approved){const approvedAt=now(); const days=Number(db.prepare("SELECT isNarrativia FROM youtube_channels WHERE id=?").get(channelId)?.isNarrativia)?NARRATIVIA_DURATION_DAYS:DEFAULT_DURATION_DAYS; db.prepare("UPDATE youtube_content SET moderationStatus='approved',eligibilityReason=?,activeFrom=?,activeUntil=?,updatedAt=? WHERE id=?").run(result.reason,approvedAt,addDays(approvedAt,days),approvedAt,row.id);approved++;}else{db.prepare("UPDATE youtube_content SET eligibilityReason=?,updatedAt=? WHERE id=?").run(result.reason,now(),row.id);}}
  return {reviewed:rows.length,approved};
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS youtube_channels (
      id TEXT PRIMARY KEY,
      vendorId TEXT NOT NULL UNIQUE,
      channelUrl TEXT NOT NULL,
      channelId TEXT,
      channelHandle TEXT,
      channelTitle TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','suspended','rejected')),
      isNarrativia INTEGER NOT NULL DEFAULT 0,
      lastSyncAt TEXT,
      lastSyncError TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS yaayz_preferences (
      userId TEXT PRIMARY KEY,
      autoplayVideos INTEGER NOT NULL DEFAULT 1 CHECK(autoplayVideos IN (0,1)),
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_youtube_channels_status_sync ON youtube_channels(status,lastSyncAt);
    CREATE TABLE IF NOT EXISTS youtube_content (
      id TEXT PRIMARY KEY,
      channelId TEXT NOT NULL,
      vendorId TEXT NOT NULL,
      youtubeVideoId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      thumbnailUrl TEXT,
      videoUrl TEXT NOT NULL,
      publishedAt TEXT,
      durationSeconds INTEGER NOT NULL DEFAULT 0,
      contentType TEXT NOT NULL CHECK(contentType IN ('short','long')),
      moderationStatus TEXT NOT NULL DEFAULT 'pending' CHECK(moderationStatus IN ('pending','approved','rejected','expired','suspended')),
      eligibilityReason TEXT,
      qualifiedViews INTEGER NOT NULL DEFAULT 0,
      creatorRewardBlocks INTEGER NOT NULL DEFAULT 0,
      activeFrom TEXT,
      activeUntil TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(channelId,youtubeVideoId)
    );
    CREATE INDEX IF NOT EXISTS idx_youtube_content_feed ON youtube_content(moderationStatus,activeUntil,contentType,publishedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_youtube_content_vendor_month ON youtube_content(vendorId,createdAt DESC);
    CREATE TABLE IF NOT EXISTS youtube_content_monthly_usage (
      vendorId TEXT NOT NULL,
      monthKey TEXT NOT NULL,
      shortsCount INTEGER NOT NULL DEFAULT 0,
      longCount INTEGER NOT NULL DEFAULT 0,
      paidLongLimit INTEGER NOT NULL DEFAULT 0,
      packagePaymentId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      PRIMARY KEY(vendorId,monthKey)
    );
    CREATE TABLE IF NOT EXISTS youtube_content_payments (
      id TEXT PRIMARY KEY,
      vendorId TEXT NOT NULL,
      userId TEXT NOT NULL,
      packageCount INTEGER NOT NULL CHECK(packageCount IN (25,50,100)),
      amountMinor INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      reference TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VERIFIED','FAILED','CANCELLED')),
      providerReference TEXT,
      authorizationUrl TEXT,
      createdAt TEXT NOT NULL,
      verifiedAt TEXT,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS youtube_content_view_events (
      id TEXT PRIMARY KEY,
      contentId TEXT NOT NULL,
      viewerId TEXT NOT NULL,
      watchMs INTEGER NOT NULL DEFAULT 0,
      qualified INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      UNIQUE(contentId,viewerId,createdAt)
    );
    CREATE INDEX IF NOT EXISTS idx_youtube_views_content ON youtube_content_view_events(contentId,createdAt DESC);
  `);
  const cols = db.prepare("PRAGMA table_info(vendors)").all().map(c => c.name);
  if (!cols.includes("businessType")) db.exec("ALTER TABLE vendors ADD COLUMN businessType TEXT NOT NULL DEFAULT 'marketplace'");
  if (!cols.includes("youtubeChannelUrl")) db.exec("ALTER TABLE vendors ADD COLUMN youtubeChannelUrl TEXT");
}

function ensureChannel(db, vendor, channelUrl, { narrativia = false } = {}) {
  ensureSchema(db);
  const url = normalizeUrl(channelUrl);
  const at = now();
  const existing = db.prepare("SELECT * FROM youtube_channels WHERE vendorId=?").get(vendor.id);
  if (existing) {
    db.prepare("UPDATE youtube_channels SET channelUrl=?,isNarrativia=?,updatedAt=? WHERE id=?").run(url, narrativia ? 1 : existing.isNarrativia, at, existing.id);
    const type=narrativia ? "youtube_narrativia" : "youtube_creator";
    const currentType=String(vendor.businessType||"");
    const nextType=currentType ? (currentType.split(",").includes(type)?currentType:`${currentType},${type}`) : type;
    db.prepare("UPDATE vendors SET businessType=?,youtubeChannelUrl=? WHERE id=?").run(nextType,url,vendor.id);
    return db.prepare("SELECT * FROM youtube_channels WHERE id=?").get(existing.id);
  }
  const row = { id:id("ytc"), vendorId:vendor.id, channelUrl:url, status:narrativia ? "approved" : "pending", isNarrativia:narrativia ? 1 : 0, createdAt:at, updatedAt:at };
  db.prepare("INSERT INTO youtube_channels(id,vendorId,channelUrl,status,isNarrativia,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)").run(row.id,row.vendorId,row.channelUrl,row.status,row.isNarrativia,row.createdAt,row.updatedAt);
  const type=narrativia ? "youtube_narrativia" : "youtube_creator";
    const currentType=String(vendor.businessType||"");
    const nextType=currentType ? (currentType.split(",").includes(type)?currentType:`${currentType},${type}`) : type;
    db.prepare("UPDATE vendors SET businessType=?,youtubeChannelUrl=? WHERE id=?").run(nextType,url,vendor.id);
  return db.prepare("SELECT * FROM youtube_channels WHERE id=?").get(row.id);
}

async function resolveChannelId(channelUrl, apiKey = process.env.YOUTUBE_API_KEY) {
  const url = normalizeUrl(channelUrl);
  const key = String(apiKey || "").trim();
  const handle = (url.match(/youtube\.com\/@([^/]+)/i) || [])[1] || "";
  if (key && handle) {
    const params = new URLSearchParams({ part: "snippet,contentDetails", forHandle: `@${handle}`, key });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params.toString()}`);
    if (!response.ok) throw new Error(`YouTube channel lookup returned ${response.status}.`);
    const payload = await response.json();
    const item = payload.items?.[0];
    if (item?.id) return { channelId: item.id, uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || null, channelTitle: item.snippet?.title || null };
  }
  const response = await fetch(url, { headers: { "user-agent": "NEXA-Yaayz/1.0" } });
  if (!response.ok) throw new Error(`YouTube channel page returned ${response.status}.`);
  const html = await response.text();
  const patterns = [
    /"channelId":"(UC[a-zA-Z0-9_-]{20,})"/,
    /\\"externalId\\":\\"(UC[a-zA-Z0-9_-]{20,})\\"/,
    /channel_id=([a-zA-Z0-9_-]{20,})/,
  ];
  for (const pattern of patterns) { const m = html.match(pattern); if (m) return { channelId: m[1], uploadsPlaylistId: null, channelTitle: null }; }
  throw new Error("YouTube channel ID could not be resolved from the channel URL.");
}

async function fetchUploadsPlaylistVideos(uploadsPlaylistId, apiKey, maxResults = 500) {
  const key = String(apiKey || "").trim();
  if (!key || !uploadsPlaylistId) return null;
  const wanted = Math.max(1, Math.min(500, Number(maxResults) || 500));
  const ids = [];
  let pageToken = "";
  while (ids.length < wanted) {
    const params = new URLSearchParams({ part: "snippet,contentDetails,status", playlistId: uploadsPlaylistId, maxResults: String(Math.min(50, wanted - ids.length)), key });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`);
    if (!response.ok) throw new Error(`YouTube uploads playlist returned ${response.status}.`);
    const payload = await response.json();
    for (const item of (payload.items || [])) {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (videoId && !ids.includes(videoId) && item.status?.privacyStatus !== "private") ids.push(videoId);
    }
    pageToken = payload.nextPageToken || "";
    if (!pageToken || !(payload.items || []).length) break;
  }
  if (!ids.length) return [];
  const out=[];
  for (let i=0;i<ids.length;i+=50) {
    const batch=ids.slice(i,i+50);
    const details = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status&id=${batch.join(",")}&key=${encodeURIComponent(key)}`);
    if (!details.ok) throw new Error(`YouTube video details returned ${details.status}.`);
    const data = await details.json();
    out.push(...(data.items || []).map(x => ({
      youtubeVideoId:x.id,title:x.snippet?.title||"Untitled",description:x.snippet?.description||"",publishedAt:x.snippet?.publishedAt||null,
      videoUrl:`https://www.youtube.com/watch?v=${x.id}`,thumbnailUrl:x.snippet?.thumbnails?.high?.url||x.snippet?.thumbnails?.medium?.url||x.snippet?.thumbnails?.default?.url||null,
      durationSeconds:parseDuration(x.contentDetails?.duration), privacyStatus:x.status?.privacyStatus||"unknown",
    })).filter(x => x.privacyStatus !== "private"));
  }
  return out;
}

async function fetchDataApiVideos(channelId, apiKey, maxResults = 500) {
  const key = String(apiKey || "").trim();
  if (!key) return null;
  const resolved = await resolveChannelId(`https://www.youtube.com/channel/${channelId}`, key);
  return fetchUploadsPlaylistVideos(resolved.uploadsPlaylistId, key, maxResults);
}
function parseDuration(value) { const m=String(value||"").match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/); return m ? Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0) : 0; }

function monthlyUsage(db, vendorId, month = monthKey()) {
  ensureSchema(db);
  const existing = db.prepare("SELECT * FROM youtube_content_monthly_usage WHERE vendorId=? AND monthKey=?").get(vendorId,month);
  if (existing) return existing;
  const at=now(); db.prepare("INSERT INTO youtube_content_monthly_usage(vendorId,monthKey,createdAt,updatedAt) VALUES(?,?,?,?)").run(vendorId,month,at,at);
  return db.prepare("SELECT * FROM youtube_content_monthly_usage WHERE vendorId=? AND monthKey=?").get(vendorId,month);
}
function countMonthlySubmitted(db,vendorId,type,month=monthKey()) {
  const col=type==='short'?'shortsCount':'longCount'; return Number(db.prepare(`SELECT ${col} AS n FROM youtube_content_monthly_usage WHERE vendorId=? AND monthKey=?`).get(vendorId,month)?.n||0);
}
function expireContent(db, nowDate = new Date()) {
  ensureSchema(db); const iso=nowDate.toISOString();
  return db.prepare("UPDATE youtube_content SET moderationStatus='expired',updatedAt=? WHERE moderationStatus='approved' AND activeUntil IS NOT NULL AND activeUntil<=?").run(iso,iso).changes;
}

async function syncChannel(db, channelRow, { apiKey = process.env.YOUTUBE_API_KEY } = {}) {
  ensureSchema(db);
  if (!String(apiKey || "").trim()) throw Object.assign(new Error("YOUTUBE_API_KEY is required for live YouTube sync."),{status:503});
  const channel = db.prepare("SELECT * FROM youtube_channels WHERE id=?").get(channelRow.id);
  if (!channel) throw Object.assign(new Error("YouTube channel is not registered."), { status:404 });
  let channelId = channel.channelId;
  const at=now();
  try {
    const resolved = await resolveChannelId(channel.channelUrl, apiKey);
    channelId = channelId || resolved.channelId;
    const dataApi = await fetchUploadsPlaylistVideos(resolved.uploadsPlaylistId, apiKey, channel.isNarrativia ? 500 : 50);
    if (!dataApi) throw Object.assign(new Error("YouTube Data API uploads could not be loaded."),{status:502});
    const videos = dataApi;
    db.prepare("UPDATE youtube_channels SET channelId=?,channelTitle=COALESCE(?,channelTitle),lastSyncAt=?,lastSyncError=NULL,updatedAt=? WHERE id=?").run(channelId,resolved.channelTitle,at,at,channel.id);
    const vendor=db.prepare("SELECT * FROM vendors WHERE id=?").get(channel.vendorId);
    const usage=monthlyUsage(db,vendor.id);
    const narrativia=Number(channel.isNarrativia)===1;
    const shortsCap=narrativia?Number.MAX_SAFE_INTEGER:SHORT_FREE_LIMIT;
    const longCap=narrativia?Number.MAX_SAFE_INTEGER:Math.min(MAX_LONG_PER_MONTH,Number(usage.paidLongLimit||0));
    let shorts=Number(usage.shortsCount||0), longs=Number(usage.longCount||0), imported=0, skipped=0;
    for(const v of videos) {
      const short=isShort(v), type=short?'short':'long';
      const exists=db.prepare("SELECT id FROM youtube_content WHERE channelId=? AND youtubeVideoId=?").get(channel.id,v.youtubeVideoId);
      if(exists){skipped++;continue;}
      if(short && shorts>=shortsCap){skipped++;continue;}
      if(!short && longs>=longCap){skipped++;continue;}
      const created=at; const durationDays=durationDaysForVendor(vendor); const until=addDays(created,durationDays);
      const screen=damiScreenContent(v); const status=(channel.status==='approved' && screen.approved) ? 'approved' : 'pending';
      db.prepare(`INSERT INTO youtube_content(id,channelId,vendorId,youtubeVideoId,title,description,thumbnailUrl,videoUrl,publishedAt,durationSeconds,contentType,moderationStatus,eligibilityReason,activeFrom,activeUntil,createdAt,updatedAt)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id("ytv"),channel.id,vendor.id,v.youtubeVideoId,String(v.title).slice(0,240),String(v.description||"").slice(0,5000),v.thumbnailUrl||null,v.videoUrl,v.publishedAt||null,Number(v.durationSeconds||0),type,status,screen.reason,created,until,created,created);
      if(short)shorts++;else longs++;imported++;
    }
    db.prepare("UPDATE youtube_content_monthly_usage SET shortsCount=?,longCount=?,updatedAt=? WHERE vendorId=? AND monthKey=?").run(shorts,longs,at,vendor.id,monthKey());
    const dami=screenPendingVideos(db,channel.id);
    return { channelId, imported, skipped, shortsCount:shorts, longCount:longs, longLimit:longCap, source:dataApi?'youtube_data_api':'youtube_rss', dami };
  } catch (error) {
    db.prepare("UPDATE youtube_channels SET lastSyncAt=?,lastSyncError=?,updatedAt=? WHERE id=?").run(at,String(error.message||"Sync failed").slice(0,500),at,channel.id);
    throw error;
  }
}

function recordQualifiedView(db, { contentId, viewerId, watchMs = 0 }) {
  ensureSchema(db); expireContent(db);
  const content=db.prepare("SELECT * FROM youtube_content WHERE id=? AND moderationStatus='approved' AND (activeUntil IS NULL OR activeUntil>?)").get(contentId,now());
  if(!content) throw Object.assign(new Error("This Yaayz video is no longer active."),{status:404});
  const qualified=Number(watchMs)>=QUALIFIED_VIEW_MS;
  const day=new Date().toISOString().slice(0,10);
  return db.transaction(()=>{
    const already=db.prepare("SELECT 1 FROM youtube_content_view_events WHERE contentId=? AND viewerId=? AND createdAt LIKE ? LIMIT 1").get(contentId,viewerId,`${day}%`);
    if(already) return {qualified:false,duplicate:true,creatorAami:0,qualifiedViews:Number(content.qualifiedViews)};
    const at=now(); db.prepare("INSERT INTO youtube_content_view_events(id,contentId,viewerId,watchMs,qualified,createdAt) VALUES(?,?,?,?,?,?)").run(id("ytview"),contentId,viewerId,Number(watchMs)||0,qualified?1:0,at);
    if(!qualified) return {qualified:false,duplicate:false,creatorAami:0,qualifiedViews:Number(content.qualifiedViews)};
    const nextViews=Number(content.qualifiedViews||0)+1;
    let viewerAami=0;
    if(content.contentType === "short"){ const aami=require("./aamiEconomy"); const gate=aami.aamiEarningEligibility(db,viewerId); if(gate.unlocked){ viewerAami=VIEWER_AAMI_PER_QUALIFIED_SHORT; aami.credit(db,viewerId,viewerAami,"yaayz_short_viewer_reward",`${contentId}:${day}`,`aami-yaayz-short-viewer:${contentId}:${viewerId}:${day}`,{contentId,qualifiedViews:nextViews}); } }
    const oldBlocks=Number(content.creatorRewardBlocks||0); const newBlocks=Math.floor(nextViews/1000);
    db.prepare("UPDATE youtube_content SET qualifiedViews=?,creatorRewardBlocks=?,updatedAt=? WHERE id=?").run(nextViews,newBlocks,at,contentId);
    const earnedBlocks=Math.max(0,newBlocks-oldBlocks); let creatorAami=0;
    if(earnedBlocks){
      const aami=require("./aamiEconomy"); const vendor=db.prepare("SELECT userId FROM vendors WHERE id=?").get(content.vendorId);
      if(vendor?.userId){ const gate=aami.aamiEarningEligibility(db,vendor.userId); if(gate.unlocked){ creatorAami=earnedBlocks*CREATOR_AAMI_PER_1000_VIEWS; aami.credit(db,vendor.userId,creatorAami,"yaayz_creator_qualified_views",`${contentId}:${newBlocks}`,`aami-yaayz-creator:${contentId}:${newBlocks}`,{qualifiedViews:nextViews,blocks:earnedBlocks}); } }
    }
    return {qualified:true,duplicate:false,creatorAami,viewerAami,qualifiedViews:nextViews};
  })();
}

async function autoSyncNarrativia(db) {
  ensureSchema(db);
  if(!youtubeApiConfigured()) return {skipped:true,reason:"YOUTUBE_API_KEY not configured."};
  const channel=db.prepare("SELECT * FROM youtube_channels WHERE isNarrativia=1 AND status='approved' ORDER BY updatedAt ASC LIMIT 1").get();
  if(!channel) return null;
  const last=channel.lastSyncAt?Date.parse(channel.lastSyncAt):0;
  if(last && Date.now()-last<SYNC_INTERVAL_MS) return null;
  try{return await syncChannel(db,channel);}catch(_){return null;}
}

function startNarrativiaAutoSync(db) {
  const timer = setInterval(() => { autoSyncNarrativia(db).catch(() => {}); }, SYNC_INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
  return timer;
}

function feed(db,{limit=12,autoplay=true}={}) {
  ensureSchema(db); expireContent(db);
  const n=Math.max(1,Math.min(50,Number(limit)||12));
  return db.prepare(`SELECT id,vendorId,youtubeVideoId,title,description,thumbnailUrl,videoUrl,publishedAt,durationSeconds,contentType,qualifiedViews,activeUntil FROM youtube_content WHERE moderationStatus='approved' AND activeUntil>? ORDER BY publishedAt DESC,createdAt DESC LIMIT ?`).all(now(),n).map(v=>({...v,embedUrl:`https://www.youtube.com/embed/${encodeURIComponent(v.youtubeVideoId)}?autoplay=${autoplay?1:0}&playsinline=1&rel=0` }));
}

function usageState(db,vendorId,month=monthKey()) { const row=monthlyUsage(db,vendorId,month); return {...row,shortFreeRemaining:Math.max(0,SHORT_FREE_LIMIT-Number(row.shortsCount||0)),longRemaining:Math.max(0,Number(row.paidLongLimit||0)-Number(row.longCount||0)),packages:LONG_PACKAGES}; }

function packagePrice(count) { const p=packageForLongCount(count); if(!p) throw Object.assign(new Error("Choose 25, 50 or 100 long-form videos."),{status:400}); return p; }

function youtubeApiConfigured(env = process.env) { return Boolean(String(env.YOUTUBE_API_KEY || "").trim()); }
function youtubeIntegrationState(env = process.env) { const configured=youtubeApiConfigured(env); return {configured,source:configured?"youtube_data_api":"credential_required",requiredSecrets:["YOUTUBE_API_KEY"],oauthNotRequiredForPublicChannelReads:true}; }
function getYaayzPreferences(db, userId) { ensureSchema(db); return db.prepare("SELECT autoplayVideos,updatedAt FROM yaayz_preferences WHERE userId=?").get(userId) || { autoplayVideos: 1, updatedAt: null }; }
function updateYaayzPreferences(db, userId, autoplayVideos) { ensureSchema(db); const value = autoplayVideos === false ? 0 : 1; const at = now(); db.prepare("INSERT INTO yaayz_preferences(userId,autoplayVideos,updatedAt) VALUES(?,?,?) ON CONFLICT(userId) DO UPDATE SET autoplayVideos=excluded.autoplayVideos,updatedAt=excluded.updatedAt").run(userId,value,at); return getYaayzPreferences(db,userId); }

function publicConstants(){ return {shortFreePerMonth:SHORT_FREE_LIMIT,shortAddonTiers:[...SHORT_ADDON_TIERS],additionalVideoTypes:[...ADDITIONAL_VIDEO_TYPES],viewerAamiPerQualifiedShort:VIEWER_AAMI_PER_QUALIFIED_SHORT,longPackages:Object.fromEntries(Object.entries(LONG_PACKAGES).map(([k,v])=>[k,{videos:Number(k),amount:Number(v)/100,currency:'NGN'}])),maxLongPerMonth:MAX_LONG_PER_MONTH,defaultDurationDays:DEFAULT_DURATION_DAYS,narrativiaDurationDays:NARRATIVIA_DURATION_DAYS,creatorAamiPer1000Views:CREATOR_AAMI_PER_1000_VIEWS,qualifiedViewMinimumMs:QUALIFIED_VIEW_MS}; }

function register({app,auth,db,rateLimit,payments,isConfiguredAdmin,admin}) {
  ensureSchema(db);
  const syncLimit=rateLimit({windowMs:15*60*1000,max:3,keyFn:req=>String(req.user?.id||req.ip),message:"YouTube sync is limited. Try again later."});
  app.get("/api/yaayz/youtube/feed",auth.authMiddleware,async(req,res)=>{ try { const sync=await autoSyncNarrativia(db); const preferences=getYaayzPreferences(db,req.user.id); res.json({videos:feed(db,{limit:req.query?.limit,autoplay:preferences.autoplayVideos!==0}),preferences,rules:publicConstants(),integration:youtubeIntegrationState(),sync}); } catch(e){res.status(400).json({error:e.message||"Yaayz video feed unavailable."});} });
  app.get("/api/yaayz/preferences",auth.authMiddleware,(req,res)=>res.json({preferences:getYaayzPreferences(db,req.user.id)}));
  app.patch("/api/yaayz/preferences",auth.authMiddleware,(req,res)=>res.json({preferences:updateYaayzPreferences(db,req.user.id,req.body?.autoplayVideos)}));
  app.get("/api/business/youtube/config",auth.authMiddleware,admin?.require ? admin.require("creator_content") : (_req,_res,next)=>next(),(req,res)=>res.json(youtubeIntegrationState()));
  app.post("/api/yaayz/youtube/videos/:id/view",auth.authMiddleware,(req,res)=>{try{res.json(recordQualifiedView(db,{contentId:String(req.params.id),viewerId:req.user.id,watchMs:Number(req.body?.watchMs||0)}));}catch(e){res.status(e.status||400).json({error:e.message||"Video view could not be recorded."});}});
  app.get("/api/business/youtube/me",auth.authMiddleware,(req,res)=>{ const vendor=db.prepare("SELECT * FROM vendors WHERE userId=?").get(req.user.id); const channel=vendor?db.prepare("SELECT * FROM youtube_channels WHERE vendorId=?").get(vendor.id):null; res.json({vendor,channel,usage:vendor?usageState(db,vendor.id):null,integration:youtubeIntegrationState(),rules:publicConstants()}); });
  app.post("/api/business/youtube/register",auth.authMiddleware,async(req,res)=>{try{
    const channelUrl=normalizeUrl(req.body?.channelUrl); if(!channelUrl)return res.status(400).json({error:"YouTube channel URL is required."});
    let vendor=db.prepare("SELECT * FROM vendors WHERE userId=?").get(req.user.id);
    if(!vendor){const shopName=String(req.body?.businessName||req.user.name||"YouTube Creator").trim().slice(0,120)||"YouTube Creator"; const at=now(); vendor={id:id("v"),userId:req.user.id,shopName,bio:"YouTube creator on NEXA Business Hub.",createdAt:at}; db.prepare("INSERT INTO vendors(id,userId,shopName,bio,createdAt,businessType,youtubeChannelUrl) VALUES(?,?,?,?,?,?,?)").run(vendor.id,vendor.userId,vendor.shopName,vendor.bio,vendor.createdAt,"youtube_creator",channelUrl);}
    const narrativia=isNarrativiaChannelUrl(channelUrl);
    if(narrativia && !isConfiguredAdmin(req.user)) return res.status(403).json({error:"Narrativia founding-channel activation is administrator controlled."});
    const channel=ensureChannel(db,vendor,channelUrl,{narrativia});
    if(narrativia){ try { const result=await syncChannel(db,channel); return res.status(201).json({channel:db.prepare("SELECT * FROM youtube_channels WHERE id=?").get(channel.id),usage:usageState(db,vendor.id),sync:result,rules:publicConstants()}); } catch(e){ return res.status(202).json({channel,usage:usageState(db,vendor.id),syncPending:true,syncError:e.message,rules:publicConstants()}); }}
    res.status(201).json({channel,usage:usageState(db,vendor.id),rules:publicConstants()});
  }catch(e){res.status(e.status||400).json({error:e.message||"Could not register the YouTube channel."});}});
  app.post("/api/business/youtube/sync",auth.authMiddleware,syncLimit,async(req,res)=>{try{const vendor=db.prepare("SELECT * FROM vendors WHERE userId=?").get(req.user.id);if(!vendor)return res.status(404).json({error:"Create your YouTube business profile first."});const ch=db.prepare("SELECT * FROM youtube_channels WHERE vendorId=?").get(vendor.id);if(!ch)return res.status(404).json({error:"Connect a YouTube channel first."});const result=await syncChannel(db,ch);res.json({sync:result,usage:usageState(db,vendor.id)});}catch(e){res.status(e.status||502).json({error:e.message||"YouTube sync failed."});}});
  app.get("/api/business/youtube/pricing",auth.authMiddleware,(req,res)=>res.json(publicConstants()));
  app.post("/api/business/youtube/package/payment",auth.authMiddleware,async(req,res)=>{try{const count=Number(req.body?.count);const p=packagePrice(count);const vendor=db.prepare("SELECT * FROM vendors WHERE userId=?").get(req.user.id);if(!vendor)return res.status(404).json({error:"Create your YouTube business profile first."});if(!String(vendor.businessType||"").split(',').includes('youtube_narrativia')&&!String(vendor.businessType||"").split(',').includes('youtube_creator'))return res.status(403).json({error:"This account is not a YouTube business."});const month=monthKey();const usage=usageState(db,vendor.id,month);if(Number(usage.longCount||0)>0&&Number(usage.paidLongLimit||0)>=count)return res.status(409).json({error:"This monthly long-form allocation is already at least that size."});const reference=`yt-${vendor.id}-${month}-${count}-${Date.now()}`;const at=now();const paymentId=id("ytpay");db.prepare("INSERT INTO youtube_content_payments(id,vendorId,userId,packageCount,amountMinor,reference,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)").run(paymentId,vendor.id,req.user.id,count,p.amountMinor,reference,at,at);if(!payments.isEnabled())return res.status(409).json({error:"Online payment is not enabled yet."});const pay=await payments.initialize({email:String(req.user.email||""),amountMinor:p.amountMinor,currency:'NGN',reference,metadata:{youtubeContentPaymentId:paymentId,vendorId:vendor.id,userId:req.user.id,packageCount:count}});db.prepare("UPDATE youtube_content_payments SET authorizationUrl=?,providerReference=?,updatedAt=? WHERE id=?").run(pay.authorizationUrl||pay.authorization_url||null,pay.reference||null,now(),paymentId);return res.status(201).json({payment:{id:paymentId,reference,amount:Number(p.amountMinor)/100,authorizationUrl:pay.authorizationUrl||pay.authorization_url||null},rules:publicConstants()});}catch(e){res.status(e.status||502).json({error:e.message||"Could not start the YouTube content payment."});}});
  app.post("/api/business/youtube/package/payment/verify",auth.authMiddleware,async(req,res)=>{try{const reference=String(req.body?.reference||"").trim();const row=db.prepare("SELECT * FROM youtube_content_payments WHERE reference=? AND userId=?").get(reference,req.user.id);if(!row)return res.status(404).json({error:"YouTube content payment not found."});if(row.status==='VERIFIED')return res.json({verified:true,usage:usageState(db,row.vendorId)});const result=String(process.env.PAYMENT_MODE||'live').toLowerCase()==='mock'?{status:'success',reference,currency:'NGN',amount:row.amountMinor}:await payments.verify(reference);if(!payments.matchesExpectedPayment(result,{status:'pending',currency:'NGN',total:Number(row.amountMinor)/100,paymentRef:reference},reference))return res.json({verified:false,status:result.status});const at=now();db.transaction(()=>{db.prepare("UPDATE youtube_content_payments SET status='VERIFIED',verifiedAt=?,updatedAt=? WHERE id=? AND status='PENDING'").run(at,at,row.id);const u=monthlyUsage(db,row.vendorId);const next=Math.min(MAX_LONG_PER_MONTH,Math.max(Number(u.paidLongLimit||0),Number(row.packageCount)));db.prepare("UPDATE youtube_content_monthly_usage SET paidLongLimit=?,packagePaymentId=?,updatedAt=? WHERE vendorId=? AND monthKey=?").run(next,row.id,at,row.vendorId,monthKey());})();res.json({verified:true,usage:usageState(db,row.vendorId)});}catch(e){res.status(502).json({error:"Could not verify the YouTube content payment."});}});
  if(admin){
    app.get("/api/admin/youtube/channels",auth.authMiddleware,admin.require("creator_content"),(req,res)=>{const rows=db.prepare(`SELECT c.*,v.shopName,v.userId,(SELECT COUNT(*) FROM youtube_content x WHERE x.channelId=c.id) AS videoCount,(SELECT COUNT(*) FROM youtube_content x WHERE x.channelId=c.id AND x.moderationStatus='approved' AND x.activeUntil>?) AS activeVideoCount FROM youtube_channels c JOIN vendors v ON v.id=c.vendorId ORDER BY c.createdAt DESC LIMIT 200`).all(now());res.json({channels:rows});});
    app.post("/api/admin/youtube/channels/:id/decision",auth.authMiddleware,admin.require("creator_content"),(req,res)=>{const decision=String(req.body?.decision||"");if(!['approve','reject','suspend'].includes(decision))return res.status(400).json({error:"Unsupported channel decision."});const status=decision==='approve'?'approved':decision==='reject'?'rejected':'suspended';const at=now();const r=db.prepare("UPDATE youtube_channels SET status=?,updatedAt=? WHERE id=?").run(status,at,req.params.id);if(!r.changes)return res.status(404).json({error:"Channel not found."});admin.audit(req,`youtube_channel_${decision}`,"youtube_channel",req.params.id,req.body?.reason||"");const screened=status==='approved'?screenPendingVideos(db,req.params.id):{reviewed:0,approved:0}; res.json({ok:true,status,screened});});
    app.get("/api/admin/youtube/videos",auth.authMiddleware,admin.require("creator_content"),(req,res)=>{expireContent(db);const rows=db.prepare(`SELECT x.*,v.shopName,c.channelTitle FROM youtube_content x JOIN vendors v ON v.id=x.vendorId JOIN youtube_channels c ON c.id=x.channelId WHERE x.moderationStatus IN ('pending','approved','rejected','suspended') ORDER BY x.createdAt DESC LIMIT 300`).all();res.json({videos:rows});});
    app.post("/api/admin/youtube/videos/:id/decision",auth.authMiddleware,admin.require("creator_content"),(req,res)=>{const decision=String(req.body?.decision||"");if(!['approve','reject','suspend'].includes(decision))return res.status(400).json({error:"Unsupported video decision."});const status=decision==='approve'?'approved':decision==='reject'?'rejected':'suspended';const at=now();const existing=db.prepare("SELECT x.*,c.isNarrativia FROM youtube_content x JOIN youtube_channels c ON c.id=x.channelId WHERE x.id=?").get(req.params.id);if(!existing)return res.status(404).json({error:"Video not found."});const duration=Number(existing.isNarrativia)?NARRATIVIA_DURATION_DAYS:DEFAULT_DURATION_DAYS;const r=db.prepare("UPDATE youtube_content SET moderationStatus=?,activeFrom=CASE WHEN ?='approved' THEN ? ELSE activeFrom END,activeUntil=CASE WHEN ?='approved' THEN ? ELSE activeUntil END,updatedAt=? WHERE id=?").run(status,status,at,status,addDays(at,duration),at,req.params.id);admin.audit(req,`youtube_video_${decision}`,"youtube_content",req.params.id,req.body?.reason||"");res.json({ok:true,status});});
    app.post("/api/admin/youtube/channels/:id/sync",auth.authMiddleware,admin.require("creator_content"),async(req,res)=>{try{const c=db.prepare("SELECT * FROM youtube_channels WHERE id=?").get(req.params.id);if(!c)return res.status(404).json({error:"Channel not found."});const result=await syncChannel(db,c);admin.audit(req,"youtube_channel_sync","youtube_channel",c.id,JSON.stringify(result));res.json({ok:true,result});}catch(e){res.status(502).json({error:e.message||"Channel sync failed."});}});
  }
}

module.exports = { youtubeIntegrationState, SHORT_FREE_LIMIT, SHORT_ADDON_TIERS, ADDITIONAL_VIDEO_TYPES, VIEWER_AAMI_PER_QUALIFIED_SHORT, MAX_LONG_PER_MONTH, LONG_PACKAGES, DEFAULT_DURATION_DAYS, NARRATIVIA_DURATION_DAYS, CREATOR_AAMI_PER_1000_VIEWS, NARRATIVIA_URL, QUALIFIED_VIEW_MS, ensureSchema, packageForLongCount, durationDaysForVendor, parseDuration, monthlyUsage, usageState, expireContent, recordQualifiedView, feed, autoSyncNarrativia, startNarrativiaAutoSync, syncChannel, ensureChannel, register, publicConstants, getYaayzPreferences, updateYaayzPreferences, youtubeApiConfigured };

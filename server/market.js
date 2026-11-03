"use strict";

// Money market layer. NEXA does not execute trades or hold investment funds.
// Live providers are optional and server-side only; provider timestamps/source labels
// are returned to clients so preview/stale data cannot be mistaken for live data.
const MOCK = [
  { symbol: "NGX", name: "NGX All-Share Index", currency: "NGN", price: 103421.22, change: 0.84, kind: "index" },
  { symbol: "DANGCEM", name: "Dangote Cement (preview)", currency: "NGN", price: 0, change: 0, kind: "equity" },
  { symbol: "GTCO", name: "Guaranty Trust Holding (preview)", currency: "NGN", price: 0, change: 0, kind: "equity" },
  { symbol: "SPX", name: "S&P 500", currency: "USD", price: 6124.18, change: 0.31, kind: "index" },
  { symbol: "GOLD", name: "Gold", currency: "USD", price: 2678.4, change: 0.17, kind: "commodity" },
  { symbol: "USDNGN", name: "US Dollar / Nigerian Naira", currency: "NGN", price: 0, change: 0, kind: "fx" },
];

function mockPoint(base, i) {
  const wave = Math.sin(i / 2.7) * base * 0.004;
  const drift = i * base * 0.00008;
  return Math.max(0, base + wave + drift);
}
function series(item, points = 30) {
  if (!Number(item.price)) return [];
  return Array.from({ length: points }, (_, i) => ({ t: i, price: Number(mockPoint(item.price, i).toFixed(2)) }));
}
function list(query = "", rows = MOCK) {
  const q = String(query || "").trim().toLowerCase();
  return rows.filter((x) => !q || x.symbol.toLowerCase().includes(q) || x.name.toLowerCase().includes(q));
}

function providerMeta(mode, source, fetchedAt = new Date().toISOString()) {
  if (mode === "ngx") return { mode, source: source || "Nigerian Exchange Group market-data API", fetchedAt, dataStatus: "provider", freshness: "fresh_at_fetch", disclaimer: "Market information only; not investment advice. Verify the provider timestamp and disclosures before making decisions." };
  if (mode === "cbn") return { mode, source: source || "Central Bank of Nigeria FX data adapter", fetchedAt, dataStatus: "provider", freshness: "fresh_at_fetch", disclaimer: "FX reference information only; verify the source timestamp and applicable market rate." };
  if (mode === "gold") return { mode, source: source || "Approved gold-data adapter", fetchedAt, dataStatus: "provider", freshness: "fresh_at_fetch", disclaimer: "Gold market information only; verify the source timestamp and methodology." };
  if (mode === "live") return { mode, source: source || "Live free providers (ExchangeRate-API open access; gold-api.com)", fetchedAt, dataStatus: "provider", freshness: "fresh_at_fetch", disclaimer: "Market information only; not investment advice. FX is a daily reference rate from ExchangeRate-API (https://www.exchangerate-api.com), not a parallel-market rate. Verify each quote's source and timestamp before deciding." };
  if (mode === "provider_unavailable") return { mode, source: source || "Configured market-data provider", fetchedAt, dataStatus: "provider_unavailable", freshness: "unavailable", disclaimer: "The configured market-data provider could not be reached. NEXA is not substituting synthetic prices for a failed provider." };
  return { mode: "mock", source: "NEXA development preview", fetchedAt, dataStatus: "preview", freshness: "preview", disclaimer: "Preview data only; not live market prices." };
}

async function fetchJson(url, token, headers = {}) {
  const response = await fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers } });
  if (!response.ok) throw new Error(`Market data request failed: ${response.status}`);
  return response.json();
}

async function ngxQuotes() {
  const token = String(process.env.MARKET_DATA_TOKEN || "").trim();
  if (!token) return null;
  const base = String(process.env.NGX_MARKET_DATA_URL || "https://marketdataapiv3.ngxgroup.com/v3/api/price/pricetickers.json").trim();
  const response = await fetch(`${base}?_t=${encodeURIComponent(token)}&a=EQUITY`);
  if (!response.ok) throw new Error(`NGX data request failed: ${response.status}`);
  const body = await response.json();
  const raw = Array.isArray(body) ? body : (body.data || body.result || body.records || []);
  const rows = raw.map((x) => {
    const symbol = String(x.symbol || x.Symbol || x.ticker || x.Ticker || "").trim().toUpperCase();
    const price = Number(x.price ?? x.Price ?? x.close ?? x.Close ?? x.currentValue ?? x.CurrentValue);
    const change = Number(x.changePercent ?? x.ChangePercent ?? x.percentageChange ?? x.PercentageChange ?? x.change ?? 0);
    const name = String(x.securityName || x.SecurityName || x.name || x.Name || symbol);
    return { symbol, name, currency: "NGN", price, change: Number.isFinite(change) ? change : 0, kind: "equity" };
  }).filter(x => x.symbol && Number.isFinite(x.price) && x.price > 0);
  return rows.length ? rows : null;
}

async function configuredFxQuotes() {
  const url = String(process.env.CBN_FX_URL || "").trim();
  if (!url) return null;
  const body = await fetchJson(url, String(process.env.CBN_FX_TOKEN || "").trim());
  const raw = Array.isArray(body) ? body : (body.data || body.result || body.records || []);
  const row = raw.find(x => String(x.symbol || x.code || x.currency || "").toUpperCase().replace(/[\\/ -]/g, "") === "USDNGN") || raw[0];
  const price = Number(row?.rate ?? row?.Rate ?? row?.value ?? row?.Value ?? row?.mid ?? row?.Mid);
  if (!Number.isFinite(price) || price <= 0) return null;
  return [{ symbol: "USDNGN", name: "US Dollar / Nigerian Naira", currency: "NGN", price, change: Number(row?.changePercent ?? row?.change ?? 0) || 0, kind: "fx" }];
}

async function configuredGoldQuotes() {
  const url = String(process.env.GOLD_DATA_URL || "").trim();
  if (!url) return null;
  const body = await fetchJson(url, String(process.env.GOLD_DATA_TOKEN || "").trim());
  const raw = Array.isArray(body) ? body : (body.data || body.result || body.records || []);
  const row = raw.find(x => /gold|xau/i.test(String(x.symbol || x.code || x.name || x.instrument || ""))) || raw[0];
  const price = Number(row?.price ?? row?.Price ?? row?.value ?? row?.Value ?? row?.close ?? row?.Close);
  if (!Number.isFinite(price) || price <= 0) return null;
  return [{ symbol: "GOLD", name: "Gold", currency: String(row?.currency || "USD").toUpperCase(), price, change: Number(row?.changePercent ?? row?.change ?? 0) || 0, kind: "commodity" }];
}


// Live mode: free, key-less public sources fetched server-side and cached so the app never
// hammers them (ExchangeRate-API open access asks for at most ~hourly requests and requires
// attribution). A failed leg is simply omitted; NEXA never substitutes synthetic prices.
const LIVE_TTL_MS = Math.max(60_000, Number(process.env.MARKET_LIVE_TTL_MS) || 3_600_000);
const liveCache = { fx: { at: 0, rows: null }, gold: { at: 0, rows: null } };
async function fetchJsonTimeout(url, ms = 8000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const response = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Market data request failed: ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}
async function cached(slot, loader) {
  const entry = liveCache[slot];
  if (entry.rows && Date.now() - entry.at < LIVE_TTL_MS) return entry.rows;
  try {
    const rows = await loader();
    if (rows && rows.length) { entry.rows = rows; entry.at = Date.now(); return rows; }
  } catch (_) { /* fall through to stale-or-null */ }
  // Serve the previous good value for up to 6 TTLs rather than showing nothing; it keeps its own timestamp.
  return entry.rows && Date.now() - entry.at < LIVE_TTL_MS * 6 ? entry.rows : null;
}
async function liveFxRows() {
  const url = String(process.env.LIVE_FX_URL || "https://open.er-api.com/v6/latest/USD").trim();
  const body = await fetchJsonTimeout(url);
  const price = Number(body && body.rates && body.rates.NGN);
  if (body && body.result && body.result !== "success") return null;
  if (!Number.isFinite(price) || price <= 0) return null;
  return [{ symbol: "USDNGN", name: "US Dollar / Nigerian Naira", currency: "NGN", price, change: 0, kind: "fx",
    source: "ExchangeRate-API open access (daily reference rate) - https://www.exchangerate-api.com", asOf: body.time_last_update_utc || null }];
}
async function liveGoldRows() {
  const url = String(process.env.LIVE_GOLD_URL || process.env.GOLD_DATA_URL || "https://api.gold-api.com/price/XAU").trim();
  const body = await fetchJsonTimeout(url);
  const row = Array.isArray(body) ? body[0] : (body && (body.data && !Array.isArray(body.data) ? body.data : body));
  const price = Number(row && (row.price ?? row.Price ?? row.value ?? row.close));
  if (!Number.isFinite(price) || price <= 0) return null;
  return [{ symbol: "GOLD", name: "Gold (XAU spot)", currency: "USD", price, change: Number(row.changePercent ?? row.chp ?? 0) || 0, kind: "commodity",
    source: "gold-api.com spot price", asOf: row.updatedAt || row.timestamp || null }];
}
async function liveQuotes() {
  const [fx, gold, equities] = await Promise.all([
    cached("fx", liveFxRows), cached("gold", liveGoldRows),
    String(process.env.MARKET_DATA_TOKEN || "").trim() ? ngxQuotes().catch(() => null) : Promise.resolve(null),
  ]);
  const rows = [...(equities || []), ...(gold || []), ...(fx || [])];
  return rows.length ? rows : null;
}

function historyStats(points) {
  const prices = (points || []).map(p => Number(p.price)).filter(Number.isFinite);
  if (prices.length < 2) return { points: prices.length, change: null, high: prices[0] || null, low: prices[0] || null, volatility: null };
  const first = prices[0], last = prices[prices.length - 1];
  const returns = [];
  for (let i = 1; i < prices.length; i++) returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  const mean = returns.reduce((a,b)=>a+b,0)/returns.length;
  const variance = returns.reduce((a,b)=>a + (b-mean)*(b-mean),0)/returns.length;
  return { points: prices.length, change: first ? Number((((last-first)/first)*100).toFixed(2)) : null, high: Math.max(...prices), low: Math.min(...prices), volatility: Number((Math.sqrt(variance)*100).toFixed(2)) };
}

function enrichQuote(x, fetchedAt, mode) {
  // Synthetic history is useful for the development preview only. Never label generated
  // points as historical provider data.
  const history = mode === "mock" ? series(x, 30) : [];
  const meta = providerMeta(mode);
  return { ...x, series: history, history30d: historyStats(history), timestamp: fetchedAt, source: x.source || meta.source, dataStatus: meta.dataStatus, freshness: meta.freshness };
}

function marketSummary(rows) {
  const priced = rows.filter(x => Number.isFinite(x.price) && x.price > 0 && x.kind === "equity");
  const gainers = [...priced].sort((a,b)=>b.change-a.change).slice(0,5);
  const losers = [...priced].sort((a,b)=>a.change-b.change).slice(0,5);
  return { gainers, losers, equityCount: priced.length };
}

function makeInsights(rows, meta = {}) {
  const equities = rows.filter(x => x.kind === "equity" && x.price > 0).slice(0, 8);
  const livePriced = meta.mode === "live" ? rows.filter(x => x.price > 0).slice(0, 6) : [];
  const candidates = equities.length ? equities : livePriced.length ? livePriced : [
    { symbol: "NGX EQUITIES", name: "NGX equity market", currency: "NGN", price: 0, change: 0, kind: "equity" },
    { symbol: "GOLD", name: "Gold", currency: "USD", price: 2678.4, change: 0.17, kind: "commodity" },
    { symbol: "USDNGN", name: "US Dollar / Nigerian Naira", currency: "NGN", price: 0, change: 0, kind: "fx" },
  ];
  return candidates.slice(0, 6).map(x => {
    const positive = x.change > 0.5;
    const negative = x.change < -0.5;
    return {
      symbol: x.symbol, name: x.name, kind: x.kind,
      signal: positive ? "Research momentum" : negative ? "Research caution" : "Research / watch",
      headline: positive ? "Recent price movement is positive; review the underlying fundamentals before acting." : negative ? "Recent price movement is weaker; review what is driving the move before acting." : "No strong directional signal from this snapshot; keep it on the watchlist if relevant.",
      reasons: [
        Number.isFinite(x.change) && x.change !== 0 ? `Latest reported change: ${x.change > 0 ? "+" : ""}${x.change.toFixed(2)}%.` : "A live quote/change is not available in this environment.",
        "NEXA presents the market information so the user can research it independently with their own broker or adviser."
      ],
      risks: ["Prices can fall and past movement does not predict future returns.", "Corporate, currency, liquidity and macroeconomic risks may materially change the picture."],
      price: x.price || undefined, currency: x.currency, change: x.change,
      freshness: meta.fetchedAt ? `${meta.source}; ${meta.fetchedAt}` : (process.env.MARKET_DATA_MODE === "ngx" ? "NGX feed; verify timestamp before acting." : "Development/preview data; not live.")
    };
  });
}

function buildResearchSignals(rows, expenses = []) {
  const recent = (expenses || []).filter(e => String(e.date || '').slice(0, 10) >= new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const byCategory = {};
  for (const e of recent) { const category = String(e.category || 'other').trim() || 'other'; byCategory[category] = (byCategory[category] || 0) + Math.max(0, Number(e.amount) || 0); }
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const themeByCategory = { shopping: ['consumer goods', 'retail'], food: ['consumer goods', 'agriculture', 'consumer staples'], transport: ['energy', 'mobility', 'logistics'], business: ['financials', 'industrial', 'technology'], utilities: ['utilities', 'energy'], education: ['education', 'technology'], health: ['healthcare'], entertainment: ['media', 'consumer discretionary'] };
  const themes = new Set(themeByCategory[topCategory] || []);
  const ranked = rows.filter(x => x.kind === 'equity' && x.price > 0).map(x => {
    const text = `${x.symbol} ${x.name}`.toLowerCase();
    let relevance = themes.size ? 'General market research' : 'Market research';
    if ((themes.has('consumer goods') || themes.has('consumer staples')) && /(dang|consumer|nestle|unilever|flour|pzc|nb)/i.test(text)) relevance = `Relevant to your logged ${topCategory} spending theme`;
    else if (themes.has('financials') && /(bank|gtco|zenith|uba|access|stanbic|fidelity|first)/i.test(text)) relevance = `Relevant to your logged ${topCategory} spending theme`;
    else if (themes.has('energy') && /(seplat|total|oando|energy|conoil)/i.test(text)) relevance = `Relevant to your logged ${topCategory} spending theme`;
    return { ...x, relevance };
  });
  return { spendingContext: topCategory ? `Highest logged spending category in the last 90 days: ${topCategory}.` : 'There is not enough recent spending data to create a spending-theme context.', topSpendingCategory: topCategory, candidates: ranked.slice(0, 6).map(x => ({ symbol:x.symbol,name:x.name,currency:x.currency,price:x.price,change:x.change,relevance:x.relevance,action:x.change > 1 ? 'Research / watch' : x.change < -1 ? 'Review the decline' : 'Research',why:x.relevance,checks:['Review current company disclosures and valuation.','Check liquidity and recent price history.','Compare the asset with alternatives before acting.'] })), disclaimer:'These are research prompts derived from market data and the user’s own logged spending themes. They are not guaranteed returns, trade instructions, or a determination that an asset is suitable for the user.' };
}

function defaultPreferences() { return { insightsEnabled: 1, spendingContextEnabled: 1, showFx: 1, showGold: 1, showEquities: 1, updatedAt: null }; }
function getPreferences(db, userId) { return db.prepare("SELECT insightsEnabled,spendingContextEnabled,showFx,showGold,showEquities,updatedAt FROM market_insight_preferences WHERE userId=?").get(userId) || defaultPreferences(); }

function createMarketRouter({ app, auth, db }) {
  app.get("/api/market/quotes", async (req, res) => {
    const mode = String(process.env.MARKET_DATA_MODE || "mock").toLowerCase();
    let rows = MOCK, actualMode = "mock";
    try {
      if (mode === "live") { const q = await liveQuotes(); if (!q) { rows = []; actualMode = "provider_unavailable"; } else { rows = q; actualMode = "live"; } }
      else if (mode === "ngx") { const q = await ngxQuotes(); if (!q) { rows = []; actualMode = "provider_unavailable"; } else { rows = q; actualMode = "ngx"; } }
      else if (mode === "cbn") { const fx = await configuredFxQuotes(); if (!fx) { rows = []; actualMode = "provider_unavailable"; } else { rows = [...MOCK.filter(x=>x.kind !== "fx"), ...fx]; actualMode = "cbn"; } }
      else if (mode === "gold") { const gold = await configuredGoldQuotes(); if (!gold) { rows = []; actualMode = "provider_unavailable"; } else { rows = [...MOCK.filter(x=>x.symbol !== "GOLD"), ...gold]; actualMode = "gold"; } }
    } catch (_) { rows = []; actualMode = mode === "mock" ? "mock" : "provider_unavailable"; }
    const fetchedAt = new Date().toISOString();
    const selected = list(req.query.q, rows).map(x => enrichQuote(x, fetchedAt, actualMode));
    const meta = providerMeta(actualMode, providerMeta(actualMode).source, fetchedAt);
    res.json({ ...meta, quotes: selected, summary: marketSummary(rows), disclaimer: meta.disclaimer });
  });

  app.get("/api/market/insights", auth.authMiddleware, async (req, res) => {
    const prefs = getPreferences(db, req.user.id);
    if (!prefs.insightsEnabled) return res.json({ enabled:false, insights:[], research:null, preferences:prefs, disclaimer:"Market insights are disabled in your NEXA preferences." });
    const mode = String(process.env.MARKET_DATA_MODE || "mock").toLowerCase();
    let rows = MOCK, actualMode = "mock";
    try { if (mode === "live") { const q=await liveQuotes(); if(q){rows=q;actualMode="live";} else {rows=[];actualMode="provider_unavailable";} } else if (mode === "ngx") { const q=await ngxQuotes(); if(q){rows=q;actualMode="ngx";} else {rows=[];actualMode="provider_unavailable";} } else if(mode === "cbn"){const q=await configuredFxQuotes();if(q){rows=[...MOCK.filter(x=>x.kind!=="fx"),...q];actualMode="cbn";} else {rows=[];actualMode="provider_unavailable";}} else if(mode === "gold"){const q=await configuredGoldQuotes();if(q){rows=[...MOCK.filter(x=>x.symbol!=="GOLD"),...q];actualMode="gold";} else {rows=[];actualMode="provider_unavailable";}} } catch (_) { if (mode !== "mock") { rows=[]; actualMode="provider_unavailable"; } }
    if (!prefs.showFx) rows = rows.filter(x=>x.kind !== "fx");
    if (!prefs.showGold) rows = rows.filter(x=>x.kind !== "commodity");
    if (!prefs.showEquities) rows = rows.filter(x=>x.kind !== "equity" && x.kind !== "index");
    const expenses = prefs.spendingContextEnabled ? db.prepare("SELECT amount,currency,category,date FROM expenses WHERE userId = ? AND date >= ? ORDER BY date DESC").all(req.user.id, new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)) : [];
    const fetchedAt = new Date().toISOString();
    const meta = providerMeta(actualMode, providerMeta(actualMode).source, fetchedAt);
    res.json({ enabled:true, mode:actualMode, ...meta, insights:makeInsights(rows,meta), research:prefs.spendingContextEnabled ? buildResearchSignals(rows, expenses) : null, summary:marketSummary(rows), preferences:prefs, disclaimer:"Research signals only. NEXA does not execute trades, hold investment funds, open broker accounts, or provide personalized investment advice." });
  });

  app.get("/api/market/preferences", auth.authMiddleware, (req,res)=>res.json({preferences:getPreferences(db, req.user.id)}));
  app.patch("/api/market/preferences", auth.authMiddleware, (req,res)=>{
    const current=getPreferences(db, req.user.id), body=req.body || {};
    const bool=(v,f)=>typeof v === "boolean" ? (v?1:0) : f;
    const next={insightsEnabled:bool(body.insightsEnabled,current.insightsEnabled),spendingContextEnabled:bool(body.spendingContextEnabled,current.spendingContextEnabled),showFx:bool(body.showFx,current.showFx),showGold:bool(body.showGold,current.showGold),showEquities:bool(body.showEquities,current.showEquities)};
    const now=new Date().toISOString();
    db.prepare("INSERT INTO market_insight_preferences(userId,insightsEnabled,spendingContextEnabled,showFx,showGold,showEquities,updatedAt) VALUES(?,?,?,?,?,?,?) ON CONFLICT(userId) DO UPDATE SET insightsEnabled=excluded.insightsEnabled,spendingContextEnabled=excluded.spendingContextEnabled,showFx=excluded.showFx,showGold=excluded.showGold,showEquities=excluded.showEquities,updatedAt=excluded.updatedAt").run(req.user.id,next.insightsEnabled,next.spendingContextEnabled,next.showFx,next.showGold,next.showEquities,now);
    res.json({preferences:{...next,updatedAt:now}});
  });
}

module.exports = { createMarketRouter, makeInsights, buildResearchSignals, historyStats, marketSummary, providerMeta, getPreferences };

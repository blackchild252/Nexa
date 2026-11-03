"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

function makeApp() {
  const routes = {};
  return { get: (p, ...h) => { routes[p] = h[h.length - 1]; }, patch() {}, routes };
}
function call(handler) {
  return new Promise((resolve) => handler({ query: {} }, { json: resolve }));
}

test("live mode returns keyless FX + gold with honest per-row sources", async () => {
  process.env.MARKET_DATA_MODE = "live";
  delete process.env.MARKET_DATA_TOKEN;
  const realFetch = global.fetch;
  global.fetch = async (url) => ({
    ok: true,
    json: async () => String(url).includes("er-api")
      ? { result: "success", time_last_update_utc: "Tue, 29 Sep 2026 00:00:01 +0000", rates: { NGN: 1500.5 } }
      : { price: 3300.25, updatedAt: "2026-09-29T09:00:00Z" },
  });
  try {
    const { createMarketRouter } = require("./market");
    const app = makeApp();
    createMarketRouter({ app, auth: { authMiddleware: (_q, _r, n) => n() }, db: {} });
    const out = await call(app.routes["/api/market/quotes"]);
    assert.equal(out.mode, "live");
    assert.equal(out.dataStatus, "provider");
    const fx = out.quotes.find((q) => q.symbol === "USDNGN");
    const gold = out.quotes.find((q) => q.symbol === "GOLD");
    assert.equal(fx.price, 1500.5);
    assert.match(fx.source, /ExchangeRate-API/);
    assert.equal(gold.price, 3300.25);
    assert.match(gold.source, /gold-api\.com/);
    assert.ok(!out.quotes.some((q) => q.symbol === "SPX" || q.symbol === "NGX"), "no mock rows in live mode");
    assert.deepEqual(fx.series, [], "no synthetic history in live mode");
  } finally { global.fetch = realFetch; }
});

test("live mode reports provider_unavailable (never mock prices) when providers fail", async () => {
  process.env.MARKET_DATA_MODE = "live";
  process.env.MARKET_LIVE_TTL_MS = "60000";
  delete require.cache[require.resolve("./market")];
  const realFetch = global.fetch;
  global.fetch = async () => { throw new Error("offline"); };
  try {
    const { createMarketRouter } = require("./market");
    const app = makeApp();
    createMarketRouter({ app, auth: { authMiddleware: (_q, _r, n) => n() }, db: {} });
    const out = await call(app.routes["/api/market/quotes"]);
    assert.equal(out.mode, "provider_unavailable");
    assert.equal(out.quotes.length, 0);
  } finally { global.fetch = realFetch; }
});

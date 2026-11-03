"use strict";

// Repeatable HTTP smoke harness for the development preview. It intentionally requires
// explicit preview credentials and never creates accounts itself.
const BASE_URL = String(process.env.NEXA_PREVIEW_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const users = [
  { role: "buyer", email: "preview.buyer@nexa.local", password: "NexaPreview!2026Buyer" },
  { role: "vendor", email: "preview.vendor@nexa.local", password: "NexaPreview!2026Vendor" },
  { role: "admin", email: "preview.admin@nexa.local", password: "NexaPreview!2026Admin" },
];

async function request(path, options = {}) {
  const result = await requestRaw(path, options);
  if (!result.res.ok) throw new Error(`${options.method || "GET"} ${path} -> ${result.res.status}: ${result.body.error || result.text}`);
  return result.body;
}

async function requestRaw(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  const text = await res.text();
  let body; try { body = text ? JSON.parse(text) : {}; } catch (_) { body = { raw: text }; }
  return { res, text, body };
}

(async () => {
  const health = await request("/health");
  const results = [{ check: "health", version: health.version || health.release || null }];
  const tokens = {};
  for (const u of users) {
    const login = await request("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: u.email, password: u.password }) });
    if (!login.token) throw new Error(`${u.role} login returned no token`);
    tokens[u.role] = login.token;
    results.push({ check: `${u.role}-login`, ok: true });
  }
  const catalog = await request("/api/mall/products?category=fashion", { headers: { authorization: `Bearer ${tokens.buyer}` } });
  const products = Array.isArray(catalog.products) ? catalog.products : [];
  if (!products.length) throw new Error("Fashion preview catalog is empty");
  const tops = products.filter(p => /top/i.test(`${p.name || ""} ${p.description || ""}`));
  if (!tops.length) throw new Error("Preview catalog has no top product for Dami/Mall testing");
  const cheapest = [...tops].sort((a,b) => Number(a.price) - Number(b.price))[0];
  results.push({ check: "dami-mall-cheapest-top-fixture", ok: true, product: cheapest.name, price: cheapest.price, currency: cheapest.currency });
  const admin = await request("/api/mall/admin/status", { headers: { authorization: `Bearer ${tokens.admin}` } });
  if (!admin.isAdmin) throw new Error("Preview admin is not recognized by NEXA_ADMIN_EMAILS");
  results.push({ check: "admin-status", ok: true });
  const buyerAdmin = await requestRaw("/api/mall/admin/status", { headers: { authorization: `Bearer ${tokens.buyer}` } });
  if (buyerAdmin.res.status !== 403) throw new Error(`Buyer admin boundary returned ${buyerAdmin.res.status}, expected 403`);
  results.push({ check: "buyer-admin-denied", ok: true, status: buyerAdmin.res.status });
  console.log(JSON.stringify({ ok: true, baseUrl: BASE_URL, results }, null, 2));
})().catch((err) => { console.error(JSON.stringify({ ok: false, error: err.message }, null, 2)); process.exitCode = 1; });

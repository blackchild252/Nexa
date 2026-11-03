"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const hub = require("./kitchenHub");

function openDb() { try { const D = require("better-sqlite3"); return new D(":memory:"); } catch (_) { const { DatabaseSync } = require("node:sqlite"); return new DatabaseSync(":memory:"); } }
function makeApp() {
  const routes = []; const add = (m) => (p, ...h) => routes.push({ m, p, h });
  const app = { get: add("GET"), post: add("POST"), put: add("PUT"), delete: add("DELETE") };
  app.call = async (m, url, { user, body, query } = {}) => {
    for (const r of routes) {
      if (r.m !== m) continue; const names = [];
      const re = new RegExp("^" + r.p.replace(/:([A-Za-z]+)/g, (_, n) => { names.push(n); return "([^/]+)"; }) + "$"); const mm = re.exec(url); if (!mm) continue;
      const params = {}; names.forEach((n, i) => { params[n] = decodeURIComponent(mm[i + 1]); });
      const req = { user, body: body || {}, query: query || {}, params }; const out = { status: 200, body: null };
      const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
      let i = 0; const next = () => { const f = r.h[i++]; if (f) return f(req, res, next); }; await next(); return out;
    }
    throw new Error("no route " + m + " " + url);
  }; return app;
}
const goodApp = (o = {}) => ({ name: "Mama Ngozi Kitchen", country: "NG", city: "Ilorin", contactName: "N", phone: "1", payoutDetails: "GTBank 0123", weightUnit: "kg", weightRate: 1000, minimumCharge: 500, acceptsHubRules: true, acceptsCountryDisclaimer: true, ...o });
const U = (id) => ({ id });
function setup() {
  const db = openDb(); const app = makeApp(); const pings = [];
  hub.register(app, { db, auth: { authMiddleware: (q, r, n) => n() }, isConfiguredAdmin: (u) => u && u.id === "owner", notify: async (...a) => { pings.push(a); } });
  return { db, app, pings };
}
async function liveShop(app, over, item = { name: "Jollof", price: 2000, weightGrams: 500 }) {
  const a = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: U("v1"), body: goodApp(over) });
  await app.call("POST", `/api/leisure/kitchen/hub/admin/shops/${a.body.id}/decision`, { user: U("owner"), body: { decision: "approve" } });
  const it = await app.call("POST", "/api/leisure/kitchen/hub/my-shop/items", { user: U("v1"), body: item });
  return { id: a.body.id, itemId: it.body.id, slug: "mama-ngozi-kitchen" };
}
const order = (app, s, q = 2, extra = {}) => app.call("POST", `/api/leisure/kitchen/hub/shops/${s.slug}/orders`, { user: U("b1"), body: { deliveryCountry: "NG", deliveryAddress: "12 Unity Rd", items: [{ id: s.itemId, quantity: q }], ...extra } });

test("weight charge: kg, g, lb, oz, flat, per item, minimum", () => {
  const L = [{ quantity: 2, weightGrams: 500 }]; const w = (l) => l.weightGrams;
  assert.equal(hub.deliveryCharge({ unit: "kg", rate: 1000 }, L, w), 1000);
  assert.equal(hub.deliveryCharge({ unit: "g", rate: 2 }, L, w), 2000);
  assert.equal(hub.deliveryCharge({ unit: "lb", rate: 100 }, L, w), 220.46);
  assert.equal(hub.deliveryCharge({ unit: "oz", rate: 10 }, L, w), 352.74);
  assert.equal(hub.deliveryCharge({ unit: "flat_rate", rate: 700 }, L, w), 700);
  assert.equal(hub.deliveryCharge({ unit: "per_item", rate: 50 }, L, w), 100);
  assert.equal(hub.deliveryCharge({ unit: "kg", rate: 100, minimumCharge: 500 }, L, w), 500);
  assert.equal(hub.deliveryCharge({ unit: "kg", rate: null }, L, w), 0);
});

test("order total = items + server-computed delivery charge; client cannot set it", async () => {
  const { app } = setup(); const s = await liveShop(app);
  const o = await order(app, s, 2, { total: 1, deliveryCharge: 0 });
  assert.equal(o.status, 201); assert.equal(o.body.itemsTotal, 4000); assert.equal(o.body.deliveryCharge, 1000); assert.equal(o.body.total, 5000);
});

test("delivery address and country are required; ship-to list is enforced", async () => {
  const { app } = setup(); const s = await liveShop(app, { shipsToCountries: ["GH"] });
  assert.equal((await order(app, s, 1, { deliveryAddress: "" })).status, 400);
  assert.equal((await order(app, s, 1, { deliveryCountry: "Nigeria" })).status, 400);
  assert.equal((await order(app, s, 1, { deliveryCountry: "US" })).status, 400);
  assert.equal((await order(app, s, 1, { deliveryCountry: "GH" })).status, 201);
  assert.equal((await order(app, s, 1, { deliveryCountry: "NG" })).status, 201); // shop's own country always allowed
});

test("order lifecycle: buyer marks paid, seller confirms, ships, buyer confirms delivery", async () => {
  const { app } = setup(); const s = await liveShop(app); const o = (await order(app, s)).body;
  const st = (u, status) => app.call("POST", `/api/leisure/kitchen/hub/orders/${o.id}/status`, { user: U(u), body: { status } });
  assert.equal((await st("b1", "paid")).status, 409);           // buyer cannot confirm own payment
  assert.equal((await st("b1", "buyer_marked_paid")).status, 200);
  assert.equal((await st("b1", "paid")).status, 409);
  assert.equal((await st("v1", "paid")).status, 200);
  assert.equal((await st("b1", "cancelled")).status, 409);      // too late to cancel
  assert.equal((await st("v1", "shipped")).status, 200);
  assert.equal((await st("b1", "delivered")).status, 200);
  assert.equal((await st("v1", "shipped")).status, 409);        // finished orders do not move
});

test("strangers cannot read or change an order", async () => {
  const { app } = setup(); const s = await liveShop(app); const o = (await order(app, s)).body;
  const r = await app.call("POST", `/api/leisure/kitchen/hub/orders/${o.id}/status`, { user: U("zzz"), body: { status: "cancelled" } });
  assert.equal(r.status, 404);
  const mine = await app.call("GET", "/api/leisure/kitchen/hub/orders", { user: U("zzz") });
  assert.equal(mine.body.orders.length, 0);
});

test("seller inbox lists only that shop's orders, with the delivery address", async () => {
  const { app } = setup(); const s = await liveShop(app); await order(app, s);
  const inbox = await app.call("GET", "/api/leisure/kitchen/hub/my-shop/orders", { user: U("v1") });
  assert.equal(inbox.body.orders.length, 1); assert.equal(inbox.body.orders[0].deliveryAddress, "12 Unity Rd");
  const other = await app.call("GET", "/api/leisure/kitchen/hub/my-shop/orders", { user: U("v2") });
  assert.equal(other.body.orders.length, 0);
});

test("reject needs a reason, rejected owner can apply again, Iceland cannot be rejected, decisions are audited", async () => {
  const { app } = setup();
  const a = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: U("v1"), body: goodApp() });
  const d = (id, body) => app.call("POST", `/api/leisure/kitchen/hub/admin/shops/${id}/decision`, { user: U("owner"), body });
  assert.equal((await d(a.body.id, { decision: "reject" })).status, 400);
  assert.equal((await d(a.body.id, { decision: "reject", note: "Need a food licence" })).status, 200);
  const again = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: U("v1"), body: goodApp() });
  assert.equal(again.status, 201);
  const list = await app.call("GET", "/api/leisure/kitchen/hub/shops", { user: U("b") });
  const ice = list.body.shops.find((x) => x.slug === "iceland");
  const all = await app.call("GET", "/api/leisure/kitchen/hub/admin/applications", { user: U("owner"), query: { status: "approved" } });
  const iceId = all.body.applications.find((x) => x.slug === "iceland").id;
  assert.ok(ice); assert.equal((await d(iceId, { decision: "suspend", note: "x" })).status, 400);
  const log = await app.call("GET", "/api/leisure/kitchen/hub/admin/audit", { user: U("owner") });
  assert.ok(log.body.entries.some((e) => e.action === "shop_rejected" && /licence/.test(e.note)));
  assert.equal(all.body.counts.approved >= 1, true);
});

test("suspended shop disappears and stops taking orders", async () => {
  const { app } = setup(); const s = await liveShop(app);
  await app.call("POST", `/api/leisure/kitchen/hub/admin/shops/${s.id}/decision`, { user: U("owner"), body: { decision: "suspend", note: "Complaint" } });
  assert.equal((await order(app, s, 1)).status, 404);
  const list = await app.call("GET", "/api/leisure/kitchen/hub/shops", { user: U("b") });
  assert.ok(!list.body.shops.some((x) => x.slug === s.slug));
});

test("seller can edit, hide and photograph items; photo is validated", async () => {
  const { app } = setup(); const s = await liveShop(app);
  const put = (body) => app.call("PUT", `/api/leisure/kitchen/hub/my-shop/items/${s.itemId}`, { user: U("v1"), body });
  assert.equal((await put({ price: 2500 })).status, 200);
  assert.equal((await put({ price: -1 })).status, 400);
  const img = (dataUrl) => app.call("POST", `/api/leisure/kitchen/hub/my-shop/items/${s.itemId}/image`, { user: U("v1"), body: { dataUrl } });
  assert.equal((await img("data:text/html;base64,AAAA")).status, 400);
  assert.equal((await img("data:image/png;base64," + "A".repeat(400001))).status, 413);
  assert.equal((await img("data:image/png;base64,iVBORw0KGgo=")).status, 200);
  const pub = await app.call("GET", `/api/leisure/kitchen/hub/shops/${s.slug}`, { user: U("b") });
  assert.equal(pub.body.items[0].price, 2500); assert.match(pub.body.items[0].imageUrl, /^data:image\/png/);
  const stranger = await app.call("PUT", `/api/leisure/kitchen/hub/my-shop/items/${s.itemId}`, { user: U("v2"), body: { price: 1 } });
  assert.equal(stranger.status, 404);
  await app.call("DELETE", `/api/leisure/kitchen/hub/my-shop/items/${s.itemId}`, { user: U("v1") });
  assert.equal((await order(app, s, 1)).status, 400);
});

test("country filter and new country requirements", async () => {
  const { app } = setup();
  const r = await app.call("GET", "/api/leisure/kitchen/hub/shops", { user: U("b"), query: { country: "NG" } });
  assert.deepEqual(r.body.shops.map((x) => x.slug), ["iceland"]);
  const none = await app.call("GET", "/api/leisure/kitchen/hub/shops", { user: U("b"), query: { country: "FR" } });
  assert.equal(none.body.shops.length, 0);
  for (const c of ["FR", "DE", "CA", "ZA", "KE", "AE", "IN"]) assert.equal(hub.requirementsFor(c).code, c);
});

test("new application and decisions notify the right people", async () => {
  process.env.NEXA_ADMIN_USER_IDS = "owner";
  const { app, pings } = setup();
  const a = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: U("v1"), body: goodApp() });
  assert.ok(pings.some((p) => p[0] === "owner" && /waiting/i.test(p[1])));
  await app.call("POST", `/api/leisure/kitchen/hub/admin/shops/${a.body.id}/decision`, { user: U("owner"), body: { decision: "approve" } });
  assert.ok(pings.some((p) => p[0] === "v1" && /approved/.test(p[2])));
  delete process.env.NEXA_ADMIN_USER_IDS;
});

test("Hub screens exist: approval queue, seller inbox, weight and delivery fields", () => {
  const f = fs.readFileSync(path.join(__dirname, "..", "src", "KitchenHub.tsx"), "utf8");
  for (const needle of ["Approve shop", "Reject shop", "Seller orders", "deliveryAddress", "Confirm payment received", "I have paid"]) assert.ok(f.includes(needle), needle);
});

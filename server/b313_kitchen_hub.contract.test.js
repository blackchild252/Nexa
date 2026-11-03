"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const hub = require("./kitchenHub");

function openDb() {
  try { const D = require("better-sqlite3"); return new D(":memory:"); } catch (_) {
    const { DatabaseSync } = require("node:sqlite"); return new DatabaseSync(":memory:");
  }
}
// Minimal fake express: records routes, runs middleware chain, returns {status, body}.
function makeApp() {
  const routes = [];
  const add = (method) => (p, ...handlers) => routes.push({ method, p, handlers });
  const app = { get: add("GET"), post: add("POST"), put: add("PUT"), delete: add("DELETE") };
  app.call = async (method, url, { user, body, query } = {}) => {
    for (const r of routes) {
      if (r.method !== method) continue;
      const names = []; const re = new RegExp("^" + r.p.replace(/:([A-Za-z]+)/g, (_, n) => { names.push(n); return "([^/]+)"; }) + "$");
      const m = re.exec(url); if (!m) continue;
      const params = {}; names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
      const req = { user, body: body || {}, query: query || {}, params };
      let out = { status: 200, body: null };
      const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
      let i = 0; const next = () => { const h = r.handlers[i++]; if (h) return h(req, res, next); };
      await next(); return out;
    }
    throw new Error("no route " + method + " " + url);
  };
  return app;
}
const goodApp = (over = {}) => ({
  name: "Mama Ngozi Kitchen", country: "NG", city: "Ilorin", contactName: "Ngozi", phone: "+2348000000000", email: "n@example.com",
  payoutDetails: "GTBank 0123456789 Ngozi A.", weightUnit: "kg", weightRate: 1500, houseRules: "No cancellations after cooking.",
  courierName: "Local rider", courierRules: "Buyer confirms address.", acceptsHubRules: true, acceptsCountryDisclaimer: true, ...over
});
function setup() {
  const db = openDb(); const app = makeApp();
  const auth = { authMiddleware: (req, res, next) => next() };
  hub.register(app, { db, auth, isConfiguredAdmin: (u) => u && u.id === "owner" });
  return { db, app };
}
const U = (id) => ({ id });

test("the ice cream demo shop is a normal approved hub shop and appears in the list", async () => {
  const { app } = setup();
  const r = await app.call("GET", "/api/leisure/kitchen/hub/shops", { user: U("b1") });
  const ice = r.body.shops.find((s) => s.slug === "iceland");
  assert.ok(ice); assert.equal(ice.status, "approved"); assert.equal(ice.country, "NG"); assert.match(ice.name, /ice cream/i);
});

test("a new vendor starts pending, is hidden from buyers, and the caller cannot pick the status", async () => {
  const { app } = setup();
  const a = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: U("v1"), body: { ...goodApp(), status: "approved" } });
  assert.equal(a.status, 201); assert.equal(a.body.status, "pending");
  const list = await app.call("GET", "/api/leisure/kitchen/hub/shops", { user: U("b1") });
  assert.ok(!list.body.shops.some((s) => s.name === "Mama Ngozi Kitchen"));
  const mine = await app.call("GET", "/api/leisure/kitchen/hub/my-shop", { user: U("v1") });
  assert.equal(mine.body.shop.status, "pending");
});

test("pending shop cannot add items or take orders; a second application is refused", async () => {
  const { app } = setup();
  await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: U("v1"), body: goodApp() });
  const add = await app.call("POST", "/api/leisure/kitchen/hub/my-shop/items", { user: U("v1"), body: { name: "Jollof", price: 2000 } });
  assert.equal(add.status, 403);
  const again = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: U("v1"), body: goodApp() });
  assert.equal(again.status, 409);
  const order = await app.call("POST", "/api/leisure/kitchen/hub/shops/mama-ngozi-kitchen/orders", { user: U("b1"), body: { items: [{ id: "x", quantity: 1 }] } });
  assert.equal(order.status, 404);
});

test("only the owner can approve; after approval the shop is listed and can sell", async () => {
  const { app } = setup();
  const a = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: U("v1"), body: goodApp() });
  const denied = await app.call("POST", `/api/leisure/kitchen/hub/admin/shops/${a.body.id}/decision`, { user: U("v1"), body: { decision: "approve" } }).catch((e) => e);
  assert.equal(denied.status, 403);
  const queue = await app.call("GET", "/api/leisure/kitchen/hub/admin/applications", { user: U("owner") });
  assert.equal(queue.body.applications.length, 1);
  const ok = await app.call("POST", `/api/leisure/kitchen/hub/admin/shops/${a.body.id}/decision`, { user: U("owner"), body: { decision: "approve" } });
  assert.equal(ok.body.status, "approved");
  const list = await app.call("GET", "/api/leisure/kitchen/hub/shops", { user: U("b1") });
  assert.ok(list.body.shops.some((s) => s.slug === "mama-ngozi-kitchen"));
  const item = await app.call("POST", "/api/leisure/kitchen/hub/my-shop/items", { user: U("v1"), body: { name: "Jollof", price: 2000 } });
  assert.equal(item.status, 201);
});

test("buyer pays the seller directly: order shows the seller's payout details and no NEXA payment is created", async () => {
  const { app } = setup();
  const a = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: U("v1"), body: goodApp() });
  await app.call("POST", `/api/leisure/kitchen/hub/admin/shops/${a.body.id}/decision`, { user: U("owner"), body: { decision: "approve" } });
  const it = await app.call("POST", "/api/leisure/kitchen/hub/my-shop/items", { user: U("v1"), body: { name: "Jollof", price: 2000 } });
  const o = await app.call("POST", "/api/leisure/kitchen/hub/shops/mama-ngozi-kitchen/orders", { user: U("b1"), body: { deliveryCountry: "NG", deliveryAddress: "12 Unity Rd, Ilorin", items: [{ id: it.body.id, quantity: 3 }] } });
  assert.equal(o.status, 201); assert.equal(o.body.total, 6000);
  assert.equal(o.body.status, "awaiting_seller_payment");
  assert.match(o.body.payTo, /GTBank/);
  assert.equal(o.body.payment, undefined);
  const own = await app.call("POST", "/api/leisure/kitchen/hub/shops/mama-ngozi-kitchen/orders", { user: U("v1"), body: { deliveryCountry: "NG", deliveryAddress: "x", items: [{ id: it.body.id, quantity: 1 }] } });
  assert.equal(own.status, 400);
});

test("application validation: required details, rules and disclaimer, weight unit", () => {
  assert.ok(hub.normaliseApplication(goodApp({ name: "" })).error);
  assert.ok(hub.normaliseApplication(goodApp({ country: "Nigeria" })).error);
  assert.ok(hub.normaliseApplication(goodApp({ payoutDetails: "" })).error);
  assert.ok(hub.normaliseApplication(goodApp({ acceptsHubRules: false })).error);
  assert.ok(hub.normaliseApplication(goodApp({ acceptsCountryDisclaimer: false })).error);
  assert.ok(hub.normaliseApplication(goodApp({ weightUnit: "stone" })).error);
  const ok = hub.normaliseApplication(goodApp({ shipsToCountries: ["gb", "us", "bad"] }));
  assert.deepEqual(ok.value.details.shipsToCountries, ["GB", "US"]);
  assert.equal(ok.value.details.weight.unit, "kg");
});

test("country requirements exist for Nigeria and Iceland and fall back for others", () => {
  assert.equal(hub.requirementsFor("is").code, "IS");
  assert.equal(hub.requirementsFor("NG").code, "NG");
  assert.equal(hub.requirementsFor("ZZ").code, "GENERAL");
});

test("public shop never leaks ID, tax or contact fields", async () => {
  const { app } = setup();
  const a = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: U("v1"), body: goodApp({ idDocumentNumber: "A1234567", taxNumber: "TIN-99" }) });
  await app.call("POST", `/api/leisure/kitchen/hub/admin/shops/${a.body.id}/decision`, { user: U("owner"), body: { decision: "approve" } });
  const r = await app.call("GET", "/api/leisure/kitchen/hub/shops", { user: U("b1") });
  const txt = JSON.stringify(r.body);
  assert.ok(!txt.includes("A1234567")); assert.ok(!txt.includes("TIN-99")); assert.ok(!txt.includes("+2348000000000"));
});

test("label is Neighbouring country, never Nearby or Approximate country", () => {
  const f = fs.readFileSync(path.join(__dirname, "..", "src", "ZeezaProfile.tsx"), "utf8");
  assert.match(f, /Neighbouring country/);
  assert.doesNotMatch(f, />Nearby country</);
  assert.doesNotMatch(f, /Approximate country/);
});

test("vendor applications select only one of seven free storefront templates and persist the selection", async () => {
  const ids = ["restaurant", "bakery", "grocery", "butchery", "drinks", "catering", "meal-prep"];
  for (const storefrontTemplate of ids) {
    const result = hub.normaliseApplication(goodApp({ storefrontTemplate }));
    assert.equal(result.error, undefined);
    assert.equal(result.value.details.storefrontTemplate, storefrontTemplate);
  }
  assert.ok(hub.normaliseApplication(goodApp({ storefrontTemplate: "made-up-template" })).error);
  assert.equal(hub.normaliseApplication(goodApp()).value.details.storefrontTemplate, "restaurant");
  const { app } = setup();
  const submitted = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: U("template-vendor"), body: goodApp({ storefrontTemplate: "bakery" }) });
  assert.equal(submitted.status, 201);
  const mine = await app.call("GET", "/api/leisure/kitchen/hub/my-shop", { user: U("template-vendor") });
  assert.equal(mine.body.shop.details.storefrontTemplate, "bakery");
});

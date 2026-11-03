"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

// Pull the real buyer-cancel handler out of server/index.js so the test runs the
// shipped code, not a copy.
function cancelHandlerSource() {
  const start = source.indexOf('app.post("/api/mall/orders/:orderId/cancel"');
  const end = source.indexOf("// -- Vendor side: orders containing this vendor's items --", start);
  assert.ok(start >= 0 && end > start, "cancel route not found");
  return source.slice(start, end);
}

function makeDb() {
  const raw = new DatabaseSync(":memory:");
  raw.exec(`
    CREATE TABLE mall_orders (id TEXT PRIMARY KEY, userId TEXT, status TEXT, paymentMethod TEXT, paymentRef TEXT);
    CREATE TABLE mall_order_items (id TEXT PRIMARY KEY, orderId TEXT, productId TEXT, variantId TEXT, quantity INTEGER, status TEXT, paid INTEGER DEFAULT 0);
    CREATE TABLE mall_order_events (id TEXT PRIMARY KEY, orderId TEXT, actorId TEXT, fromStatus TEXT, toStatus TEXT, note TEXT, createdAt TEXT);
  `);
  // Minimal better-sqlite3 style wrapper: prepare + transaction.
  return {
    raw,
    prepare: (sql) => raw.prepare(sql),
    transaction: (fn) => () => {
      raw.exec("BEGIN");
      try { const r = fn(); raw.exec("COMMIT"); return r; } catch (e) { raw.exec("ROLLBACK"); throw e; }
    },
  };
}

function mountCancel(db) {
  const calls = { released: [], notified: [], pushed: [] };
  let handler;
  const app = { post: (route, _auth, fn) => { handler = fn; } };
  const social = { snapshotProducts: (ids) => ids, notifyProductChanges: (b) => calls.pushed.push(b) };
  const productStock = { release: (_db, args) => calls.released.push(args) };
  const loadOrder = (id) => db.prepare("SELECT * FROM mall_orders WHERE id=?").get(id);
  const notifyVendorsOfOrder = (id, msg) => calls.notified.push([id, msg]);
  let n = 0;
  const genRowId = (p) => `${p}-${++n}`;
  const factory = new Function("app", "auth", "db", "social", "productStock", "loadOrder", "notifyVendorsOfOrder", "genRowId", cancelHandlerSource());
  factory(app, { authMiddleware: () => {} }, db, social, productStock, loadOrder, notifyVendorsOfOrder, genRowId);
  return { handler, calls };
}

function call(handler, userId, orderId) {
  const out = { status: 200, body: null };
  const res = { status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; } };
  let thrown = null;
  try { handler({ user: { id: userId }, params: { orderId } }, res); } catch (e) { thrown = e; }
  return { ...out, thrown };
}

function seed(db, { status = "placed", paid = 0, method = "cash", ref = null } = {}) {
  db.raw.prepare("INSERT INTO mall_orders VALUES(?,?,?,?,?)").run("o1", "buyer1", "placed", method, ref);
  db.raw.prepare("INSERT INTO mall_order_items VALUES(?,?,?,?,?,?,?)").run("i1", "o1", "p1", null, 2, status, paid);
}

test("M7621/M7622: a successful buyer cancel returns the order, releases stock and notifies once (real SQLite)", () => {
  const db = makeDb(); seed(db);
  const { handler, calls } = mountCancel(db);
  const r = call(handler, "buyer1", "o1");
  assert.equal(r.thrown, null, "the handler must not throw after the transaction commits");
  assert.equal(r.status, 200);
  assert.equal(r.body.order.status, "cancelled");
  assert.equal(calls.released.length, 1);
  assert.equal(calls.released[0].qty, 2);
  assert.equal(calls.notified.length, 1);
  assert.equal(db.raw.prepare("SELECT status FROM mall_order_items WHERE id='i1'").get().status, "cancelled");
});

test("M7622: cancelling twice is idempotent and does not release stock or notify again", () => {
  const db = makeDb(); seed(db);
  const { handler, calls } = mountCancel(db);
  assert.equal(call(handler, "buyer1", "o1").status, 200);
  const again = call(handler, "buyer1", "o1");
  assert.equal(again.thrown, null);
  assert.equal(again.status, 200);
  assert.equal(calls.released.length, 1, "stock is released once only");
  assert.equal(calls.notified.length, 1, "vendor is notified once only");
  assert.equal(db.raw.prepare("SELECT COUNT(*) c FROM mall_order_events").get().c, 1);
});

test("M7620: another user cannot cancel the order and nothing changes", () => {
  const db = makeDb(); seed(db);
  const { handler, calls } = mountCancel(db);
  const r = call(handler, "intruder", "o1");
  assert.equal(r.status, 404);
  assert.equal(calls.released.length, 0);
  assert.equal(db.raw.prepare("SELECT status FROM mall_orders WHERE id='o1'").get().status, "placed");
});

test("M7621: fail closed when a seller already started, or online payment was initialized", () => {
  const started = makeDb(); seed(started, { status: "accepted" });
  const a = mountCancel(started);
  assert.equal(call(a.handler, "buyer1", "o1").status, 409);
  assert.equal(a.calls.released.length, 0);

  const online = makeDb(); seed(online, { method: "online", ref: "ref_123" });
  const b = mountCancel(online);
  assert.equal(call(b.handler, "buyer1", "o1").status, 409);
  assert.equal(b.calls.released.length, 0);
  assert.equal(online.raw.prepare("SELECT status FROM mall_orders WHERE id='o1'").get().status, "placed");
});

test("M7621: a seller-recorded cash payment blocks buyer cancel", () => {
  const cash = makeDb(); seed(cash, { paid: 1, method: "cash" });
  const c = mountCancel(cash);
  assert.equal(call(c.handler, "buyer1", "o1").status, 409);
});

test("M7635: the cancel handler never uses a try-scoped variable outside its try block", () => {
  const route = cancelHandlerSource();
  assert.ok(!/try\s*\{\s*const cancelled\b/.test(route), "const cancelled must not be declared inside try");
  assert.ok(/let cancelled\b/.test(route));
});

// ---- Vendor status route (same scope bug as buyer cancel) ----
function vendorHandlerSource() {
  const start = source.indexOf('app.patch("/api/mall/vendor/orders/:orderId/status"');
  const tail = "  res.json({ ok: true, status: next });\n});";
  const end = source.indexOf(tail, start);
  assert.ok(start >= 0 && end > start, "vendor status route not found");
  return source.slice(start, end + tail.length);
}
function pick(startMarker, endMarker) {
  const a = source.indexOf(startMarker); const b = source.indexOf(endMarker, a);
  assert.ok(a >= 0 && b > a, "marker missing: " + startMarker);
  return source.slice(a, b);
}

function mountVendor(db) {
  const calls = { released: [], pushes: [], rewards: [], stock: [] };
  let handler;
  const capture = (route, ...rest) => { if (route === "/api/mall/vendor/orders/:orderId/status") handler = rest[rest.length - 1]; };
  const app = { get: capture, post: capture, put: capture, delete: capture, patch: capture };
  const social = { snapshotProducts: (ids) => ids, notifyProductChanges: (b) => calls.stock.push(b) };
  const productStock = { release: (_db, args) => calls.released.push(args) };
  const aamiEconomy = { awardActivity: (...a) => calls.rewards.push(a) };
  const sendPush = (...a) => calls.pushes.push(a);
  let n = 0; const genRowId = (p) => `${p}-${++n}`;
  const helpers = pick("const ORDER_TRANSITIONS = {", "const STATUS_RANK") + pick("function deriveOrderStatus(items)", "function loadOrder");
  const body = helpers + "\nconst STATUS_RANK = { placed: 0, confirmed: 1, shipped: 2, delivered: 3 };\n" + vendorHandlerSource();
  const factory = new Function("app", "auth", "requireVendorAccess", "db", "social", "productStock", "aamiEconomy", "sendPush", "genRowId", body);
  factory(app, { authMiddleware: () => {} }, () => {}, db, social, productStock, aamiEconomy, sendPush, genRowId);
  return { handler, calls };
}
function callVendor(handler, orderId, status) {
  const out = { status: 200, body: null }; let thrown = null;
  const res = { status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; } };
  try { handler({ user: { id: "sellerUser" }, vendor: { id: "v1", shopName: "Shop" }, params: { orderId }, body: { status } }, res); } catch (e) { thrown = e; }
  return { ...out, thrown };
}
function seedVendor(db, itemStatus = "placed") {
  db.raw.prepare("INSERT INTO mall_orders VALUES(?,?,?,?,?)").run("o1", "buyer1", "placed", "cash", null);
  db.raw.exec("ALTER TABLE mall_order_items ADD COLUMN vendorId TEXT; ALTER TABLE mall_order_items ADD COLUMN deliveredAt TEXT;");
  db.raw.prepare("INSERT INTO mall_order_items(id,orderId,productId,variantId,quantity,status,paid,vendorId) VALUES(?,?,?,?,?,?,?,?)").run("i1", "o1", "p1", null, 3, itemStatus, 0, "v1");
}

test("M7621/M7622: a successful seller status change commits, then notifies the buyer (real SQLite)", () => {
  const db = makeDb(); seedVendor(db);
  const { handler, calls } = mountVendor(db);
  const r = callVendor(handler, "o1", "confirmed");
  assert.equal(r.thrown, null, "must not throw after the transaction commits");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, status: "confirmed" });
  assert.equal(calls.pushes.length, 1, "buyer gets exactly one push");
  assert.equal(calls.pushes[0][0], "buyer1");
  assert.equal(db.raw.prepare("SELECT status FROM mall_orders WHERE id='o1'").get().status, "confirmed");
});

test("M7622: repeating the same seller status is a no-op with no second push", () => {
  const db = makeDb(); seedVendor(db);
  const { handler, calls } = mountVendor(db);
  assert.equal(callVendor(handler, "o1", "confirmed").status, 200);
  const again = callVendor(handler, "o1", "confirmed");
  assert.equal(again.thrown, null);
  assert.equal(calls.pushes.length, 1);
  assert.equal(db.raw.prepare("SELECT COUNT(*) c FROM mall_order_events").get().c, 1);
});

test("M7621: seller cancel returns stock once; an invalid jump fails closed with 409", () => {
  const db = makeDb(); seedVendor(db);
  const { handler, calls } = mountVendor(db);
  const bad = callVendor(handler, "o1", "delivered");
  assert.equal(bad.status, 409);
  assert.equal(db.raw.prepare("SELECT status FROM mall_order_items WHERE id='i1'").get().status, "placed");
  const ok = callVendor(handler, "o1", "cancelled");
  assert.equal(ok.thrown, null);
  assert.equal(ok.status, 200);
  assert.equal(calls.released.length, 1);
  assert.equal(calls.released[0].qty, 3);
});

test("M7621: seller cancel is refused when online payment was already initialized", () => {
  const db = makeDb(); seedVendor(db);
  db.raw.prepare("UPDATE mall_orders SET paymentMethod='online', paymentRef='ref_9' WHERE id='o1'").run();
  const { handler, calls } = mountVendor(db);
  assert.equal(callVendor(handler, "o1", "cancelled").status, 409);
  assert.equal(calls.released.length, 0);
});

test("M7620: a seller with no line on the order gets 404 and nothing changes", () => {
  const db = makeDb(); seedVendor(db);
  db.raw.prepare("UPDATE mall_order_items SET vendorId='someoneElse'").run();
  const { handler, calls } = mountVendor(db);
  assert.equal(callVendor(handler, "o1", "confirmed").status, 404);
  assert.equal(calls.pushes.length, 0);
});

test("M7635: no route in index.js uses a try-scoped transaction result after its try block", () => {
  assert.ok(!/try\s*\{\s*const changed = db\.transaction/.test(source));
  assert.ok(!/try\s*\{\s*const cancelled = db\.transaction/.test(source));
});

// ---- M7619: sellers never receive the buyer's payment reference (v2 order routes) ----
const mo = require("./marketplaceOrders");

function mountV2(db) {
  const routes = {};
  const reg = (method) => (route, _a, fn) => { routes[method + " " + route] = fn; };
  const app = { get: reg("GET"), post: reg("POST"), patch: reg("PATCH") };
  let n = 0;
  mo.createMarketplaceOrders({ db, auth: { authMiddleware: () => {} }, genRowId: (p) => `${p}-${++n}` }).register(app);
  return routes;
}
function callV2(fn, userId, { params = {}, query = {}, body = {} } = {}) {
  const out = { status: 200, body: null };
  const res = { status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; } };
  fn({ user: { id: userId }, params, query, body }, res);
  return out;
}
function seedV2(db) {
  db.raw.exec(`
    DROP TABLE mall_orders;
    CREATE TABLE mall_orders (id TEXT PRIMARY KEY, userId TEXT, total REAL, currency TEXT, status TEXT, deliveryAddress TEXT, note TEXT, createdAt TEXT,
      paymentMethod TEXT, paymentRef TEXT, providerVerified INTEGER, feeStatus TEXT, feeChargeId TEXT, feePreviewId TEXT);
    CREATE TABLE vendors (id TEXT PRIMARY KEY, userId TEXT);
    ALTER TABLE mall_order_items ADD COLUMN vendorId TEXT;
  `);
  db.raw.prepare("INSERT INTO vendors VALUES('v1','seller1')").run();
  db.raw.prepare("INSERT INTO mall_orders VALUES('o1','buyer1',100,'NGN','placed','12 Road','note','2026-10-01T00:00:00Z','online','PSK_SECRET_REF',1,'charged','chg_1','prev_1')").run();
  db.raw.prepare("INSERT INTO mall_order_items(id,orderId,productId,quantity,status,paid,vendorId) VALUES('i1','o1','p1',1,'placed',0,'v1')").run();
}

test("M7619: orderForViewer strips payment and fee bookkeeping for non-buyers only", () => {
  const order = { id: "o1", userId: "buyer1", total: 5, paymentRef: "R", feeChargeId: "C", feePreviewId: "P", feeStatus: "x", providerVerified: 1 };
  const seller = mo.orderForViewer(order, "seller1");
  for (const k of mo.BUYER_ONLY_ORDER_FIELDS) assert.equal(k in seller, false, k + " must be hidden from the seller");
  assert.equal(seller.total, 5);
  assert.equal(mo.orderForViewer(order, "buyer1").paymentRef, "R", "the buyer still sees their own reference");
  assert.equal(order.paymentRef, "R", "the source row is not mutated");
  assert.equal(mo.orderForViewer(null, "x"), null);
});

test("M7619/M7620: v2 list, detail and status routes hide paymentRef from the seller, show it to the buyer (real SQLite)", () => {
  const db = makeDb(); seedV2(db);
  const routes = mountV2(db);
  const list = routes["GET /api/marketplace/orders"];
  const detail = routes["GET /api/marketplace/orders/:id"];

  const sellerList = callV2(list, "seller1");
  assert.equal(sellerList.body.orders.length, 1);
  assert.ok(!JSON.stringify(sellerList.body).includes("PSK_SECRET_REF"));
  assert.ok(!JSON.stringify(sellerList.body).includes("chg_1"));

  const buyerList = callV2(list, "buyer1");
  assert.equal(buyerList.body.orders[0].paymentRef, "PSK_SECRET_REF");

  const sellerDetail = callV2(detail, "seller1", { params: { id: "o1" } });
  assert.equal(sellerDetail.status, 200);
  assert.ok(!JSON.stringify(sellerDetail.body).includes("PSK_SECRET_REF"));
  assert.equal(callV2(detail, "buyer1", { params: { id: "o1" } }).body.order.paymentRef, "PSK_SECRET_REF");

  const stranger = callV2(detail, "stranger", { params: { id: "o1" } });
  assert.equal(stranger.status, 404, "a user who is neither buyer nor seller learns nothing");
});

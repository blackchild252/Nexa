"use strict";
// Kitchen Hub (B313): a hub of shops. Home Kitchen is NEXA's own menu; Iceland is a shop in the hub, like any
// shop that joins later. Every new shop is PENDING until the owner approves it. Until a third-party payment
// provider is added, the buyer pays the shop directly (NEXA does not touch this money).
const crypto = require("crypto");

const STATUSES = ["pending", "approved", "rejected", "suspended"];
const WEIGHT_UNITS = ["kg", "g", "lb", "oz", "flat_rate", "per_item"];
const STOREFRONT_TEMPLATES = ["restaurant", "bakery", "grocery", "butchery", "drinks", "catering", "meal-prep"];
const MAX = { short: 80, mid: 200, long: 2000 };

function ensureSchema(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS hub_shops (
  id TEXT PRIMARY KEY,
  ownerUserId TEXT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'shop',
  status TEXT NOT NULL DEFAULT 'pending',
  country TEXT,
  city TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  reviewNote TEXT,
  reviewedBy TEXT,
  reviewedAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hub_shops_status ON hub_shops(status, createdAt);
CREATE TABLE IF NOT EXISTS hub_items (
  id TEXT PRIMARY KEY,
  shopId TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  weightGrams REAL,
  active INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hub_items_shop ON hub_items(shopId, active);
CREATE TABLE IF NOT EXISTS hub_orders (
  id TEXT PRIMARY KEY,
  shopId TEXT NOT NULL,
  buyerId TEXT NOT NULL,
  items TEXT NOT NULL,
  total REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_seller_payment',
  payTo TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hub_orders_buyer ON hub_orders(buyerId, createdAt);
CREATE TABLE IF NOT EXISTS hub_audit (
  id TEXT PRIMARY KEY,
  shopId TEXT,
  orderId TEXT,
  actorId TEXT,
  action TEXT NOT NULL,
  note TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hub_audit_shop ON hub_audit(shopId, createdAt);
`);
  const addCols = (table, cols) => {
    const have = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    for (const [name, ddl] of cols) if (!have.includes(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
  };
  addCols("hub_items", [["imageUrl", "TEXT"], ["updatedAt", "TEXT"]]);
  addCols("hub_orders", [["itemsTotal", "REAL"], ["deliveryCharge", "REAL NOT NULL DEFAULT 0"], ["deliveryCountry", "TEXT"], ["deliveryAddress", "TEXT"], ["buyerNote", "TEXT"], ["updatedAt", "TEXT"]]);
}

const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const bool = (v) => v === true || v === "true" || v === 1 || v === "1";

// Country requirements. Short, honest starter list; the owner can extend it. Anything not listed gets the general text.
const COUNTRY_REQUIREMENTS = {
  NG: { name: "Nigeria", needs: ["Business name or CAC number (if registered)", "Valid ID (NIN, passport or driver's licence)", "Food sellers: NAFDAC number for packaged food"], disclaimer: "Food must be safe and honestly described. NAFDAC rules apply to packaged food." },
  GH: { name: "Ghana", needs: ["Business registration or trader ID", "Valid ID", "FDA Ghana approval for packaged food"], disclaimer: "Food must meet Ghana FDA rules." },
  IS: { name: "Iceland", needs: ["Kennitala (business or personal ID number)", "Food business registration with the local health authority (MAST / HEL)", "VAT number if turnover is above the limit"], disclaimer: "Food shipped from Iceland must follow Icelandic and destination-country food rules." },
  GB: { name: "United Kingdom", needs: ["Food business registration with your local council", "Food hygiene rating if available", "Allergen information for every item"], disclaimer: "Allergens must be declared." },
  US: { name: "United States", needs: ["State or county food business permit", "EIN or SSN (kept private)", "Allergen information for every item"], disclaimer: "Cottage-food and shipping rules differ by state." },
  FR: { name: "France", needs: ["SIRET number", "Food business declaration to the local authority (DDPP)", "Allergen information for every item"], disclaimer: "EU food labelling and allergen rules apply." },
  DE: { name: "Germany", needs: ["Gewerbeanmeldung (trade registration)", "Food business registration with the local Lebensmittelaufsicht", "Allergen information for every item"], disclaimer: "EU food labelling and allergen rules apply." },
  CA: { name: "Canada", needs: ["Business number (BN)", "Provincial food premises permit", "Allergen and bilingual labelling for packaged food"], disclaimer: "Rules differ by province." },
  ZA: { name: "South Africa", needs: ["CIPC registration or trader ID", "Certificate of Acceptability for food premises", "Valid ID"], disclaimer: "Food premises need a municipal certificate." },
  KE: { name: "Kenya", needs: ["Business permit from the county", "KRA PIN", "Public health food handler certificate"], disclaimer: "County licensing applies." },
  AE: { name: "United Arab Emirates", needs: ["Trade licence", "Food safety approval from the local municipality", "Emirates ID or passport"], disclaimer: "Halal and municipality rules apply." },
  IN: { name: "India", needs: ["FSSAI licence or registration", "GST number if above the limit", "Valid ID"], disclaimer: "FSSAI rules apply to all food sellers." },
  GENERAL: { name: "Other country", needs: ["Proof of identity", "Any local food or trade licence", "Allergen and ingredient information"], disclaimer: "You are responsible for local law where you sell and where you ship." }
};
function requirementsFor(code) {
  const c = String(code || "").trim().toUpperCase();
  return { code: COUNTRY_REQUIREMENTS[c] ? c : "GENERAL", ...(COUNTRY_REQUIREMENTS[c] || COUNTRY_REQUIREMENTS.GENERAL) };
}

// Validate and normalise a shop application. Returns {error} or {value}.
function normaliseApplication(body) {
  const b = body && typeof body === "object" ? body : {};
  const name = clean(b.name, MAX.short);
  const country = clean(b.country, 10).toUpperCase();
  const city = clean(b.city, MAX.short);
  if (name.length < 2) return { error: "Enter your shop name." };
  if (!/^[A-Z]{2}$/.test(country)) return { error: "Choose your country (2-letter code)." };
  if (!city) return { error: "Enter your city." };
  const contactName = clean(b.contactName, MAX.short);
  const phone = clean(b.phone, 30);
  const email = clean(b.email, 120);
  if (!contactName) return { error: "Enter the contact person's name." };
  if (!phone) return { error: "Enter a phone number." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email does not look right." };
  const payoutDetails = clean(b.payoutDetails, MAX.mid);
  if (!payoutDetails) return { error: "Tell buyers how to pay you (bank, mobile money or other)." };
  if (!bool(b.acceptsHubRules)) return { error: "You must accept the hub rules." };
  if (!bool(b.acceptsCountryDisclaimer)) return { error: "You must accept the country disclaimer." };
  const weightUnit = clean(b.weightUnit, 20).toLowerCase() || "kg";
  if (!WEIGHT_UNITS.includes(weightUnit)) return { error: "Weight billing unit must be one of: " + WEIGHT_UNITS.join(", ") + "." };
  const rate = b.weightRate === "" || b.weightRate == null ? null : Number(b.weightRate);
  if (rate != null && (!Number.isFinite(rate) || rate < 0 || rate > 1e9)) return { error: "Weight rate must be a number, zero or more." };
  const ships = Array.isArray(b.shipsToCountries) ? b.shipsToCountries.map((x) => clean(x, 10).toUpperCase()).filter((x) => /^[A-Z]{2}$/.test(x)).slice(0, 80) : [];
  const storefrontTemplate = clean(b.storefrontTemplate, 30) || "restaurant";
  if (!STOREFRONT_TEMPLATES.includes(storefrontTemplate)) return { error: "Choose one of the available free storefront templates." };
  const details = {
    storefrontTemplate,
    contactName, phone, email,
    address: clean(b.address, MAX.mid),
    businessType: clean(b.businessType, 40) || "individual",
    registrationNumber: clean(b.registrationNumber, 60),
    taxNumber: clean(b.taxNumber, 60),
    idDocumentType: clean(b.idDocumentType, 40),
    idDocumentNumber: clean(b.idDocumentNumber, 60),
    foodLicenceNumber: clean(b.foodLicenceNumber, 60),
    description: clean(b.description, MAX.long),
    currency: clean(b.currency, 3).toUpperCase() || "NGN",
    payoutDetails,
    weight: { unit: weightUnit, rate, minimumCharge: Number(b.minimumCharge) > 0 ? Number(b.minimumCharge) : 0, volumetricNote: clean(b.volumetricNote, MAX.mid) },
    shipsToCountries: ships,
    houseRules: clean(b.houseRules, MAX.long),
    courier: { name: clean(b.courierName, MAX.short), rules: clean(b.courierRules, MAX.long), handlingDays: clean(b.handlingDays, 20), restrictedItems: clean(b.restrictedItems, MAX.mid) },
    returnsPolicy: clean(b.returnsPolicy, MAX.long),
    customsNote: clean(b.customsNote, MAX.mid),
    acceptsHubRules: true,
    acceptsCountryDisclaimer: true,
    acceptedAt: new Date().toISOString()
  };
  return { value: { name, country, city, details } };
}

function slugify(name, taken) {
  const base = String(name).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "shop";
  let s = base; let i = 2;
  while (taken(s)) s = `${base}-${i++}`;
  return s;
}

// Public shape: never leaks ID numbers, tax numbers or contact details of a shop that is not approved.
function publicShop(row) {
  let d = {}; try { d = JSON.parse(row.details || "{}"); } catch (_) {}
  return { id: row.id, slug: row.slug, name: row.name, kind: row.kind, status: row.status, country: row.country, city: row.city, description: d.description || "", currency: d.currency || "NGN", weight: d.weight || null, shipsToCountries: d.shipsToCountries || [], houseRules: d.houseRules || "", courier: d.courier || null, returnsPolicy: d.returnsPolicy || "", customsNote: d.customsNote || "" };
}
function ownerShop(row) {
  let d = {}; try { d = JSON.parse(row.details || "{}"); } catch (_) {}
  return { ...publicShop(row), reviewNote: row.reviewNote || "", details: d };
}

// The shop the buyer is told to pay. This is only ever the shop's own payout details.
function payToText(row) {
  let d = {}; try { d = JSON.parse(row.details || "{}"); } catch (_) {}
  return d.payoutDetails || "";
}

function seedIceland(db) {
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT id, name, country FROM hub_shops WHERE slug='iceland'").get();
  if (existing) {
    // Older databases carry the Iceland placeholder. Turn it into the ice cream demo shop once.
    if (existing.name === "Iceland" && existing.country === "IS") {
      const row = db.prepare("SELECT details FROM hub_shops WHERE id=?").get(existing.id);
      let d = {}; try { d = JSON.parse(row.details || "{}"); } catch (_) {}
      d.contactName = "Scoop Haven demo shop"; d.description = "Demo ice cream shop in the Kitchen Hub: scoops, cones and sundaes."; d.payoutDetails = "Pay the Scoop Haven demo shop directly. The shop will send you its payment details after you order.";
      db.prepare("UPDATE hub_shops SET name=?, country=?, city=?, details=?, updatedAt=? WHERE id=?").run("Scoop Haven (demo ice cream shop)", "NG", "Lagos", JSON.stringify(d), new Date().toISOString(), existing.id);
    }
    return;
  }
  const details = {
    contactName: "Scoop Haven demo shop", phone: "", email: "", address: "", businessType: "shop", description: "Demo ice cream shop in the Kitchen Hub: scoops, cones and sundaes.",
    currency: "NGN", payoutDetails: "Pay the Scoop Haven demo shop directly. The shop will send you its payment details after you order.",
    weight: { unit: "kg", rate: null, minimumCharge: 0, volumetricNote: "" }, shipsToCountries: [], houseRules: "", courier: { name: "", rules: "", handlingDays: "", restrictedItems: "" },
    returnsPolicy: "", customsNote: "", acceptsHubRules: true, acceptsCountryDisclaimer: true, acceptedAt: now
  };
  // Seeded approved: Iceland is an existing hub shop, not a new applicant.
  db.prepare("INSERT INTO hub_shops(id,ownerUserId,slug,name,kind,status,country,city,details,createdAt,updatedAt,reviewedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(crypto.randomUUID(), null, "iceland", "Scoop Haven (demo ice cream shop)", "hub", "approved", "NG", "Lagos", JSON.stringify(details), now, now, now);
}

// Order lifecycle. Money moves outside NEXA for now, so the seller confirms receipt.
const TRANSITIONS = {
  awaiting_seller_payment: { buyer: ["buyer_marked_paid", "cancelled"], seller: ["cancelled"] },
  buyer_marked_paid: { seller: ["paid", "awaiting_seller_payment", "cancelled"] },
  paid: { seller: ["shipped"] },
  shipped: { seller: ["delivered"], buyer: ["delivered"] }
};
function canMove(from, to, role) { return !!(TRANSITIONS[from] && TRANSITIONS[from][role] && TRANSITIONS[from][role].includes(to)); }

// Delivery charge from the shop's own weight billing. Items with no weight count as zero grams.
function deliveryCharge(weight, lines, weightOf) {
  const w = weight || {};
  const rate = Number(w.rate); const min = Number(w.minimumCharge) || 0;
  const qty = lines.reduce((n, l) => n + l.quantity, 0);
  const grams = lines.reduce((n, l) => n + (Number(weightOf(l)) || 0) * l.quantity, 0);
  let c = 0;
  if (Number.isFinite(rate) && rate > 0) {
    switch (w.unit) {
      case "g": c = grams * rate; break;
      case "lb": c = (grams / 453.592) * rate; break;
      case "oz": c = (grams / 28.3495) * rate; break;
      case "flat_rate": c = rate; break;
      case "per_item": c = qty * rate; break;
      default: c = (grams / 1000) * rate;
    }
  }
  if (c > 0 || min > 0) c = Math.max(c, min);
  return Math.round(c * 100) / 100;
}

const IMG_RE = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;
const IMG_MAX = 400000;

function adminUserIds(db) {
  const ids = new Set(String(process.env.NEXA_ADMIN_USER_IDS || "").split(",").map((x) => x.trim()).filter(Boolean));
  const emails = String(process.env.NEXA_ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  for (const e of emails) { try { const u = db.prepare("SELECT id FROM users WHERE lower(email)=?").get(e); if (u) ids.add(u.id); } catch (_) {} }
  return [...ids];
}

function register(app, { db, auth, isConfiguredAdmin, notify, admin }) {
  ensureSchema(db);
  seedIceland(db);
  // V6.2.8: unscoped requests keep the owner-list check. A verified Admin AAMI grant is decided only by its own permission (kitchen_hub for reads, kitchen_hub_decide for the decision).
  const adminFor = (permission) => (req, res, next) => ((admin?.allowRoute ? admin.allowRoute(req, permission, isConfiguredAdmin(req.user)) : isConfiguredAdmin(req.user)) ? next() : res.status(403).json({ error: "Administrator access required." }));
  const scopedGate = (permission) => (admin?.scopedGate ? admin.scopedGate(permission) : (_q, _s, n) => n());
  const taken = (s) => !!db.prepare("SELECT 1 FROM hub_shops WHERE slug=?").get(s);
  const ping = (userId, title, body) => { try { if (notify && userId) Promise.resolve(notify(userId, title, body, { type: "leisure", action: "leisure_kitchen" })).catch(() => {}); } catch (_) {} };
  const audit = (shopId, orderId, actorId, action, note) => db.prepare("INSERT INTO hub_audit(id,shopId,orderId,actorId,action,note,createdAt) VALUES(?,?,?,?,?,?,?)").run(crypto.randomUUID(), shopId || null, orderId || null, actorId || null, action, clean(note, MAX.mid), new Date().toISOString());
  const myShop = (uid, onlyApproved) => db.prepare(`SELECT * FROM hub_shops WHERE ownerUserId=? ${onlyApproved ? "AND status='approved'" : ""} ORDER BY createdAt DESC`).get(uid);

  // ---- Buyer side -------------------------------------------------------------------------------------------------
  app.get("/api/leisure/kitchen/hub/shops", auth.authMiddleware, (req, res) => {
    const c = String(req.query?.country || "").trim().toUpperCase();
    const rows = /^[A-Z]{2}$/.test(c)
      ? db.prepare("SELECT * FROM hub_shops WHERE status='approved' AND country=? ORDER BY (slug='iceland') DESC, name").all(c)
      : db.prepare("SELECT * FROM hub_shops WHERE status='approved' ORDER BY (slug='iceland') DESC, name").all();
    res.json({ shops: rows.map(publicShop) });
  });
  app.get("/api/leisure/kitchen/hub/requirements/:country", auth.authMiddleware, (req, res) => res.json({ requirements: requirementsFor(req.params.country) }));
  app.get("/api/leisure/kitchen/hub/shops/:slug", auth.authMiddleware, (req, res) => {
    const row = db.prepare("SELECT * FROM hub_shops WHERE slug=? AND status='approved'").get(String(req.params.slug));
    if (!row) return res.status(404).json({ error: "Shop not found." });
    const items = db.prepare("SELECT id,name,price,currency,weightGrams,imageUrl FROM hub_items WHERE shopId=? AND active=1 ORDER BY rowid").all(row.id);
    res.json({ shop: publicShop(row), items });
  });

  // ---- Apply (always pending; a rejected shop can apply again) ----------------------------------------------------
  app.post("/api/leisure/kitchen/hub/apply", auth.authMiddleware, (req, res) => {
    const mine = db.prepare("SELECT id,status FROM hub_shops WHERE ownerUserId=? AND status IN ('pending','approved','suspended')").get(req.user.id);
    if (mine) return res.status(409).json({ error: mine.status === "pending" ? "Your application is already waiting for approval." : "You already have a shop in the hub." });
    const n = normaliseApplication(req.body);
    if (n.error) return res.status(400).json({ error: n.error });
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO hub_shops(id,ownerUserId,slug,name,kind,status,country,city,details,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
      .run(id, req.user.id, slugify(n.value.name, taken), n.value.name, "shop", "pending", n.value.country, n.value.city, JSON.stringify(n.value.details), now, now);
    audit(id, null, req.user.id, "apply", n.value.name);
    for (const a of adminUserIds(db)) ping(a, "New hub shop waiting", `${n.value.name} (${n.value.country}) is waiting for your approval.`);
    res.status(201).json({ ok: true, id, status: "pending", message: "Application received. Your shop stays PENDING until the owner approves it." });
  });
  app.get("/api/leisure/kitchen/hub/my-shop", auth.authMiddleware, (req, res) => {
    const row = myShop(req.user.id, false);
    res.json({ shop: row ? ownerShop(row) : null });
  });

  // ---- Seller: items ----------------------------------------------------------------------------------------------
  const readItem = (body, partial) => {
    const out = {};
    if (!partial || body.name !== undefined) { out.name = clean(body.name, MAX.short); if (!out.name) return { error: "Enter the item name." }; }
    if (!partial || body.price !== undefined) { out.price = Number(body.price); if (!Number.isFinite(out.price) || out.price <= 0 || out.price > 1e9) return { error: "Enter a price above zero." }; }
    if (body.weightGrams !== undefined) {
      const wg = body.weightGrams === null || body.weightGrams === "" ? null : Number(body.weightGrams);
      if (wg != null && (!Number.isFinite(wg) || wg < 0 || wg > 1e7)) return { error: "Weight must be zero or more." };
      out.weightGrams = wg;
    }
    if (body.active !== undefined) out.active = bool(body.active) ? 1 : 0;
    return { value: out };
  };
  app.get("/api/leisure/kitchen/hub/my-shop/items", auth.authMiddleware, (req, res) => {
    const row = myShop(req.user.id, false);
    if (!row) return res.json({ items: [] });
    res.json({ items: db.prepare("SELECT id,name,price,currency,weightGrams,active,imageUrl FROM hub_items WHERE shopId=? ORDER BY rowid").all(row.id) });
  });
  app.post("/api/leisure/kitchen/hub/my-shop/items", auth.authMiddleware, (req, res) => {
    const row = myShop(req.user.id, true);
    if (!row) return res.status(403).json({ error: "Your shop is not approved yet." });
    const r = readItem(req.body || {}, false);
    if (r.error) return res.status(400).json({ error: r.error });
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    db.prepare("INSERT INTO hub_items(id,shopId,name,price,currency,weightGrams,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)")
      .run(id, row.id, r.value.name, r.value.price, (JSON.parse(row.details || "{}").currency || "NGN"), r.value.weightGrams == null ? null : r.value.weightGrams, now, now);
    res.status(201).json({ ok: true, id });
  });
  const ownItem = (req) => { const shop = myShop(req.user.id, true); if (!shop) return {}; const item = db.prepare("SELECT * FROM hub_items WHERE id=? AND shopId=?").get(String(req.params.id), shop.id); return { shop, item }; };
  app.put("/api/leisure/kitchen/hub/my-shop/items/:id", auth.authMiddleware, (req, res) => {
    const { item } = ownItem(req);
    if (!item) return res.status(404).json({ error: "Item not found." });
    const r = readItem(req.body || {}, true);
    if (r.error) return res.status(400).json({ error: r.error });
    const v = r.value; const now = new Date().toISOString();
    db.prepare("UPDATE hub_items SET name=?,price=?,weightGrams=?,active=?,updatedAt=? WHERE id=?")
      .run(v.name ?? item.name, v.price ?? item.price, v.weightGrams === undefined ? item.weightGrams : v.weightGrams, v.active ?? item.active, now, item.id);
    res.json({ ok: true });
  });
  app.delete("/api/leisure/kitchen/hub/my-shop/items/:id", auth.authMiddleware, (req, res) => {
    const { item } = ownItem(req);
    if (!item) return res.status(404).json({ error: "Item not found." });
    db.prepare("UPDATE hub_items SET active=0,updatedAt=? WHERE id=?").run(new Date().toISOString(), item.id); // soft delete keeps old orders readable
    res.json({ ok: true });
  });
  app.post("/api/leisure/kitchen/hub/my-shop/items/:id/image", auth.authMiddleware, (req, res) => {
    const { item } = ownItem(req);
    if (!item) return res.status(404).json({ error: "Item not found." });
    const d = String(req.body?.dataUrl || "");
    if (!IMG_RE.test(d)) return res.status(400).json({ error: "Send a PNG, JPEG or WebP image." });
    if (d.length > IMG_MAX) return res.status(413).json({ error: "Image is too large. Use a smaller photo." });
    db.prepare("UPDATE hub_items SET imageUrl=?,updatedAt=? WHERE id=?").run(d, new Date().toISOString(), item.id);
    res.json({ ok: true });
  });

  // ---- Orders -----------------------------------------------------------------------------------------------------
  app.post("/api/leisure/kitchen/hub/shops/:slug/orders", auth.authMiddleware, (req, res) => {
    const shop = db.prepare("SELECT * FROM hub_shops WHERE slug=? AND status='approved'").get(String(req.params.slug));
    if (!shop) return res.status(404).json({ error: "Shop not found." });
    if (shop.ownerUserId && shop.ownerUserId === req.user.id) return res.status(400).json({ error: "You cannot order from your own shop." });
    const details = (() => { try { return JSON.parse(shop.details || "{}"); } catch (_) { return {}; } })();
    const dCountry = clean(req.body?.deliveryCountry, 10).toUpperCase();
    const dAddress = clean(req.body?.deliveryAddress, MAX.mid);
    if (!/^[A-Z]{2}$/.test(dCountry)) return res.status(400).json({ error: "Enter the delivery country (2-letter code)." });
    if (!dAddress) return res.status(400).json({ error: "Enter the delivery address." });
    const ships = details.shipsToCountries || [];
    if (ships.length && dCountry !== shop.country && !ships.includes(dCountry)) return res.status(400).json({ error: "This shop does not ship to that country." });
    const wanted = Array.isArray(req.body?.items) ? req.body.items.slice(0, 40) : [];
    if (!wanted.length) return res.status(400).json({ error: "Add at least one item." });
    let itemsTotal = 0; const lines = []; let currency = null;
    for (const w of wanted) {
      const q = Math.floor(Number(w?.quantity));
      if (!Number.isFinite(q) || q < 1 || q > 99) return res.status(400).json({ error: "Each quantity must be 1 to 99." });
      const it = db.prepare("SELECT id,name,price,currency,weightGrams FROM hub_items WHERE id=? AND shopId=? AND active=1").get(String(w?.id || ""), shop.id);
      if (!it) return res.status(400).json({ error: "An item is no longer available." });
      if (currency && currency !== it.currency) return res.status(400).json({ error: "Items must share one currency." });
      currency = it.currency; itemsTotal += it.price * q; lines.push({ id: it.id, name: it.name, quantity: q, price: it.price, weightGrams: it.weightGrams });
    }
    const charge = deliveryCharge(details.weight, lines, (l) => l.weightGrams);
    const total = Math.round((itemsTotal + charge) * 100) / 100;
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    db.prepare("INSERT INTO hub_orders(id,shopId,buyerId,items,total,currency,status,payTo,createdAt,itemsTotal,deliveryCharge,deliveryCountry,deliveryAddress,buyerNote,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(id, shop.id, req.user.id, JSON.stringify(lines), total, currency, "awaiting_seller_payment", payToText(shop), now, itemsTotal, charge, dCountry, dAddress, clean(req.body?.note, MAX.mid), now);
    audit(shop.id, id, req.user.id, "order_created", `${total} ${currency}`);
    ping(shop.ownerUserId, "New hub order", `New order of ${total} ${currency}. Check your Business Hub.`);
    res.status(201).json({ ok: true, id, itemsTotal, deliveryCharge: charge, total, currency, status: "awaiting_seller_payment", payTo: payToText(shop), notice: "Pay the shop directly. NEXA does not take this payment yet." });
  });
  const shapeOrder = (r) => ({ id: r.id, items: JSON.parse(r.items || "[]"), itemsTotal: r.itemsTotal, deliveryCharge: r.deliveryCharge, total: r.total, currency: r.currency, status: r.status, payTo: r.payTo, deliveryCountry: r.deliveryCountry, deliveryAddress: r.deliveryAddress, createdAt: r.createdAt, shopName: r.shopName });
  app.get("/api/leisure/kitchen/hub/orders", auth.authMiddleware, (req, res) => {
    const rows = db.prepare("SELECT o.*,s.name AS shopName FROM hub_orders o JOIN hub_shops s ON s.id=o.shopId WHERE o.buyerId=? ORDER BY o.createdAt DESC LIMIT 50").all(req.user.id);
    res.json({ orders: rows.map(shapeOrder) });
  });
  app.get("/api/leisure/kitchen/hub/my-shop/orders", auth.authMiddleware, (req, res) => {
    const shop = myShop(req.user.id, false);
    if (!shop) return res.json({ orders: [] });
    const rows = db.prepare("SELECT o.*,s.name AS shopName FROM hub_orders o JOIN hub_shops s ON s.id=o.shopId WHERE o.shopId=? ORDER BY o.createdAt DESC LIMIT 100").all(shop.id);
    // The seller sees the delivery address and buyer note, never the buyer's other data.
    res.json({ orders: rows.map((r) => ({ ...shapeOrder(r), buyerNote: r.buyerNote || "" })) });
  });
  app.post("/api/leisure/kitchen/hub/orders/:id/status", auth.authMiddleware, (req, res) => {
    const o = db.prepare("SELECT * FROM hub_orders WHERE id=?").get(String(req.params.id));
    if (!o) return res.status(404).json({ error: "Order not found." });
    const shop = db.prepare("SELECT * FROM hub_shops WHERE id=?").get(o.shopId);
    const role = o.buyerId === req.user.id ? "buyer" : (shop && shop.ownerUserId === req.user.id ? "seller" : null);
    if (!role) return res.status(404).json({ error: "Order not found." });
    const to = String(req.body?.status || "");
    if (!canMove(o.status, to, role)) return res.status(409).json({ error: `You cannot change this order from ${o.status} to ${to}.` });
    db.prepare("UPDATE hub_orders SET status=?,updatedAt=? WHERE id=?").run(to, new Date().toISOString(), o.id);
    audit(o.shopId, o.id, req.user.id, `order_${to}`, role);
    ping(role === "buyer" ? shop.ownerUserId : o.buyerId, "Hub order update", `Order is now: ${to.replace(/_/g, " ")}.`);
    res.json({ ok: true, status: to });
  });

  // ---- Owner (admin) ----------------------------------------------------------------------------------------------
  app.get("/api/leisure/kitchen/hub/admin/applications", auth.authMiddleware, adminFor("kitchen_hub"), (req, res) => {
    const status = STATUSES.includes(String(req.query?.status)) ? String(req.query.status) : "pending";
    const rows = db.prepare("SELECT * FROM hub_shops WHERE status=? ORDER BY createdAt").all(status);
    const counts = {}; for (const r of db.prepare("SELECT status,COUNT(*) AS n FROM hub_shops GROUP BY status").all()) counts[r.status] = r.n;
    res.json({ applications: rows.map(ownerShop), counts });
  });
  app.get("/api/leisure/kitchen/hub/admin/audit", auth.authMiddleware, adminFor("kitchen_hub"), (req, res) => {
    // B329: shop and actor names are added so the admin screen does not show bare ids. Same rows, same order, same limit. If the members table is not there (a bare test database), it falls back to the plain rows.
    let entries;
    try { entries = db.prepare("SELECT a.id,a.shopId,a.orderId,a.actorId,a.action,a.note,a.createdAt,s.name AS shopName,u.name AS actorName FROM hub_audit a LEFT JOIN hub_shops s ON s.id=a.shopId LEFT JOIN users u ON u.id=a.actorId ORDER BY a.createdAt DESC LIMIT 100").all(); }
    catch (_) { entries = db.prepare("SELECT a.id,a.shopId,a.orderId,a.actorId,a.action,a.note,a.createdAt,s.name AS shopName FROM hub_audit a LEFT JOIN hub_shops s ON s.id=a.shopId ORDER BY a.createdAt DESC LIMIT 100").all(); }
    res.json({ entries });
  });
  app.post("/api/leisure/kitchen/hub/admin/shops/:id/decision", auth.authMiddleware, scopedGate("kitchen_hub_decide"), adminFor("kitchen_hub_decide"), (req, res) => {
    const decision = String(req.body?.decision || "");
    const map = { approve: "approved", reject: "rejected", suspend: "suspended" };
    if (!map[decision]) return res.status(400).json({ error: "Decision must be approve, reject or suspend." });
    const note = clean(req.body?.note, MAX.mid);
    if (decision !== "approve" && !note) return res.status(400).json({ error: "Write a short reason for the shop owner." });
    const row = db.prepare("SELECT id,slug,ownerUserId,name FROM hub_shops WHERE id=?").get(String(req.params.id));
    if (!row) return res.status(404).json({ error: "Shop not found." });
    if (row.slug === "iceland" && decision !== "approve") return res.status(400).json({ error: "Iceland is a core hub shop and cannot be rejected or suspended here." });
    const now = new Date().toISOString();
    db.prepare("UPDATE hub_shops SET status=?,reviewNote=?,reviewedBy=?,reviewedAt=?,updatedAt=? WHERE id=?").run(map[decision], note, req.user.id, now, now, row.id);
    audit(row.id, null, req.user.id, `shop_${map[decision]}`, note);
    ping(row.ownerUserId, "Your hub shop", map[decision] === "approved" ? `${row.name} is approved and live in the hub.` : `${row.name}: ${map[decision]}. ${note}`);
    res.json({ ok: true, status: map[decision] });
  });
}

module.exports = { register, ensureSchema, seedIceland, normaliseApplication, requirementsFor, publicShop, deliveryCharge, canMove, COUNTRY_REQUIREMENTS, WEIGHT_UNITS, TRANSITIONS };

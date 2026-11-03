"use strict";

// Deterministic preview identities are intentionally opt-in and development-only.
// Refuse to run unless NEXA_PREVIEW_MODE=1 so these credentials cannot be seeded by
// an accidental production invocation.
if (process.env.NEXA_PREVIEW_MODE !== "1") {
  throw new Error("Preview fixtures require NEXA_PREVIEW_MODE=1. No deterministic credentials were seeded.");
}

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("./db");

const FIXTURES = Object.freeze([
  { key: "buyer", email: "preview.buyer@nexa.local", password: "NexaPreview!2026Buyer", name: "NEXA Preview Buyer" },
  { key: "vendor", email: "preview.vendor@nexa.local", password: "NexaPreview!2026Vendor", name: "NEXA Preview Store" },
  { key: "admin", email: "preview.admin@nexa.local", password: "NexaPreview!2026Admin", name: "NEXA Preview Admin" },
]);

function id(prefix) { return `${prefix}_${crypto.randomBytes(10).toString("hex")}`; }
function upsertUser(fixture) {
  const existing = db.prepare("SELECT id,passwordHash,name FROM users WHERE email=?").get(fixture.email);
  const hash = bcrypt.hashSync(fixture.password, 10);
  if (existing) {
    db.prepare("UPDATE users SET passwordHash=?, name=? WHERE id=?").run(hash, fixture.name, existing.id);
    return existing.id;
  }
  const userId = id("u");
  db.prepare("INSERT INTO users(id,email,passwordHash,name,createdAt) VALUES(?,?,?,?,?)")
    .run(userId, fixture.email, hash, fixture.name, new Date().toISOString());
  return userId;
}

const result = db.transaction(() => {
  const users = {};
  for (const fixture of FIXTURES) users[fixture.key] = upsertUser(fixture);

  const vendorUserId = users.vendor;
  let vendor = db.prepare("SELECT id FROM vendors WHERE userId=?").get(vendorUserId);
  if (!vendor) {
    const vendorId = id("v");
    db.prepare("INSERT INTO vendors(id,userId,shopName,bio,createdAt) VALUES(?,?,?,?,?)")
      .run(vendorId, vendorUserId, "NEXA Preview Store", "Deterministic development-only Mall fixture.", new Date().toISOString());
    vendor = { id: vendorId };
  }

  const products = [
    ["Preview Classic Tee", "fashion", 4500, "Cotton crew-neck top for deterministic Dami/Mall preview tests."],
    ["Preview Premium Tee", "fashion", 8500, "Higher-priced cotton top for cheapest-item sorting tests."],
    ["Preview Ankara Top", "fashion", 6500, "Patterned fashion top for category and price filtering."],
  ];
  const insert = db.prepare(`INSERT INTO mall_products
    (id,vendorId,name,description,price,currency,category,stock,imageUrl,imageEmoji,imageColor,active,createdAt,updatedAt)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const [name, category, price, description] of products) {
    const exists = db.prepare("SELECT id FROM mall_products WHERE vendorId=? AND name=?").get(vendor.id, name);
    if (!exists) insert.run(id("mp"), vendor.id, name, description, price, "NGN", category, 25, null, "👕", "#263238", 1, new Date().toISOString(), new Date().toISOString());
  }
  return { users, vendorId: vendor.id };
})();

console.log(JSON.stringify({
  mode: "development-preview-only",
  users: FIXTURES.map(({ key, email, password, name }) => ({ key, email, password, name })),
  vendorId: result.vendorId,
  adminEmail: "preview.admin@nexa.local",
  adminConfig: "NEXA_ADMIN_EMAILS=preview.admin@nexa.local",
}, null, 2));

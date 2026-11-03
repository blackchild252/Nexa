"use strict";

/**
 * Blaca Essentials + demo fashion vendors.
 *
 *   node server/seedFashionVendors.js status            -> report only, changes nothing
 *   node server/seedFashionVendors.js apply             -> create Blaca Essentials if missing
 *   node server/seedFashionVendors.js apply --demo      -> also create the demo vendors
 *
 * Safe to re-run: vendors are matched by shop name and products by (vendor, name), so nothing is duplicated.
 * Optional: BLACA_OWNER_EMAIL=<existing account email> attaches Blaca to that account (only if that account
 * has no shop yet - one account can own one shop). Otherwise a dedicated owner account is created and its
 * one-time password is printed.
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("./db");

const id = (p) => `${p}_${crypto.randomBytes(10).toString("hex")}`;
const now = () => new Date().toISOString();

// [name, category, price NGN, stock, emoji, color, description]
const BLACA = {
  shopName: "Blaca Essentials",
  bio: "Modern essentials for the sharp dresser: watches, suits, hats, shoes, pants and jackets.",
  products: [
    ["Blaca Chronograph Watch - Black Steel", "jewelry & accessories", 78000, 12, "⌚", "#111418", "Matte black steel chronograph watch with sapphire-style glass and a 5 ATM water rating."],
    ["Blaca Slim Watch - Rose Mesh", "jewelry & accessories", 54000, 15, "⌚", "#2a1f22", "Slim rose-gold dial on a milanese mesh strap."],
    ["Blaca Two-Piece Suit - Midnight", "fashion", 145000, 8, "🕴️", "#0e1421", "Tailored two-piece suit in midnight navy, half-lined, slim cut."],
    ["Blaca Three-Piece Suit - Charcoal", "fashion", 189000, 5, "🕴️", "#1d2126", "Charcoal three-piece suit with waistcoat, made for weddings and boardrooms."],
    ["Blaca Classic Fedora - Black", "fashion", 22000, 20, "🎩", "#15171a", "Wool-felt fedora with a grosgrain band."],
    ["Blaca Structured Cap - Stone", "fashion", 12500, 30, "🧢", "#2b2a26", "Six-panel structured cap with adjustable strap."],
    ["Blaca Oxford Shoes - Black Leather", "fashion", 68000, 14, "👞", "#101010", "Hand-finished leather oxfords with a cushioned insole."],
    ["Blaca Suede Loafers - Tan", "fashion", 52000, 16, "👞", "#3a2c1e", "Soft suede penny loafers, lightweight and flexible."],
    ["Blaca Tapered Chinos - Olive", "fashion", 24500, 40, "👖", "#2a3020", "Stretch-cotton tapered chinos."],
    ["Blaca Tailored Trousers - Black", "fashion", 31000, 25, "👖", "#0f1114", "High-rise tailored trousers with a sharp crease."],
    ["Blaca Bomber Jacket - Black", "fashion", 58000, 18, "🧥", "#121417", "Lightweight satin-finish bomber with ribbed cuffs."],
    ["Blaca Leather Biker Jacket", "fashion", 132000, 6, "🧥", "#1a1512", "Genuine leather biker jacket with a quilted lining."],
  ],
};

const DEMO = [
  {
    shopName: "Tempo Timepieces (demo)",
    bio: "Demo vendor: watches and straps for testing the Marketplace.",
    products: [
      ["Tempo Field Watch - Green Canvas", "jewelry & accessories", 36000, 20, "⌚", "#1f2a22", "Demo listing: field watch on a canvas strap."],
      ["Tempo Dress Watch - Silver", "jewelry & accessories", 91000, 9, "⌚", "#20262d", "Demo listing: silver dress watch with leather strap."],
    ],
  },
  {
    shopName: "Kicks & Soles NG (demo)",
    bio: "Demo vendor: sneakers, boots and sandals.",
    products: [
      ["Soles Runner Sneakers - White", "fashion", 43000, 30, "👟", "#22262b", "Demo listing: everyday white sneakers."],
      ["Soles Chelsea Boots - Brown", "fashion", 61000, 12, "🥾", "#33241a", "Demo listing: leather Chelsea boots."],
      ["Soles Slide Sandals - Black", "fashion", 9500, 50, "🩴", "#141518", "Demo listing: cushioned slide sandals."],
    ],
  },
  {
    shopName: "Crown & Cap Co. (demo)",
    bio: "Demo vendor: hats, caps and headwraps.",
    products: [
      ["Crown Bucket Hat - Sand", "fashion", 11000, 35, "👒", "#3a3326", "Demo listing: cotton bucket hat."],
      ["Crown Beanie - Charcoal", "fashion", 8000, 40, "🧢", "#23262a", "Demo listing: knit beanie."],
    ],
  },
  {
    shopName: "Lagos Loom Atelier (demo)",
    bio: "Demo vendor: Ankara and native wear, made to order.",
    products: [
      ["Loom Ankara Two-Piece - Ruby", "fashion", 47000, 14, "👘", "#3a1620", "Demo listing: matching Ankara top and trousers."],
      ["Loom Senator Set - Cream", "fashion", 65000, 10, "👘", "#3a3629", "Demo listing: senator-style native set."],
      ["Loom Agbada - Royal Blue", "fashion", 120000, 4, "👘", "#12213f", "Demo listing: three-piece agbada."],
    ],
  },
];

function findVendorByName(shopName) {
  return db.prepare("SELECT id, userId, shopName FROM vendors WHERE lower(shopName) = lower(?)").get(shopName);
}

function findBlacaLoose() {
  return db.prepare("SELECT id, userId, shopName, COALESCE(status,'active') AS status FROM vendors WHERE lower(shopName) LIKE '%blaca%' OR lower(shopName) LIKE '%blaka%'").all();
}

function status() {
  const rows = findBlacaLoose();
  const out = { blacaFound: rows.length > 0, shops: [] };
  for (const v of rows) {
    const c = db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN active=1 THEN 1 ELSE 0 END) AS live FROM mall_products WHERE vendorId=?").get(v.id);
    out.shops.push({ shopName: v.shopName, vendorId: v.id, vendorStatus: v.status, products: c.total || 0, visibleProducts: v.status === "active" ? c.live || 0 : 0, hidden: v.status !== "active" || !(c.live > 0) });
  }
  out.totalVendors = db.prepare("SELECT COUNT(*) AS n FROM vendors").get().n;
  return out;
}

function ensureOwner(email, name) {
  const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email);
  if (existing) return { userId: existing.id, password: null };
  const password = crypto.randomBytes(9).toString("base64url");
  const userId = id("u");
  db.prepare("INSERT INTO users(id,email,passwordHash,name,createdAt) VALUES(?,?,?,?,?)").run(userId, email, bcrypt.hashSync(password, 10), name, now());
  return { userId, password };
}

function ensureVendor({ shopName, bio }, ownerEmail, ownerUserId) {
  const found = findVendorByName(shopName);
  if (found) {
    db.prepare("UPDATE vendors SET bio=COALESCE(bio,?) WHERE id=?").run(bio, found.id);
    return { vendorId: found.id, created: false, password: null, ownerEmail: null };
  }
  let userId = ownerUserId, password = null;
  if (!userId) ({ userId, password } = ensureOwner(ownerEmail, shopName));
  const vendorId = id("v");
  db.prepare("INSERT INTO vendors(id,userId,shopName,bio,createdAt) VALUES(?,?,?,?,?)").run(vendorId, userId, shopName, bio, now());
  return { vendorId, created: true, password, ownerEmail };
}

function ensureProducts(vendorId, products) {
  const insert = db.prepare(`INSERT INTO mall_products
    (id,vendorId,name,description,price,currency,category,stock,imageUrl,imageEmoji,imageColor,active,createdAt,updatedAt)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  let added = 0;
  for (const [name, category, price, stock, emoji, color, description] of products) {
    if (db.prepare("SELECT id FROM mall_products WHERE vendorId=? AND name=?").get(vendorId, name)) continue;
    insert.run(id("mp"), vendorId, name, description, price, "NGN", category, stock, null, emoji, color, 1, now(), now());
    added += 1;
  }
  return added;
}

function apply({ demo, env = process.env }) {
  return db.transaction(() => {
    const report = { vendors: [] };
    // Blaca: attach to a chosen existing account when asked and possible, else a dedicated owner account.
    let ownerUserId = null;
    const wanted = env.BLACA_OWNER_EMAIL && String(env.BLACA_OWNER_EMAIL).trim().toLowerCase();
    if (wanted) {
      const u = db.prepare("SELECT id FROM users WHERE lower(email)=?").get(wanted);
      if (!u) throw new Error(`BLACA_OWNER_EMAIL ${wanted} is not a registered account.`);
      if (db.prepare("SELECT id FROM vendors WHERE userId=?").get(u.id)) throw new Error(`${wanted} already owns a shop (one shop per account). Leave BLACA_OWNER_EMAIL unset to create a dedicated owner account.`);
      ownerUserId = u.id;
    }
    const looseBlaca = findBlacaLoose()[0];
    const blaca = looseBlaca
      ? { vendorId: looseBlaca.id, created: false, password: null, ownerEmail: null }
      : ensureVendor(BLACA, "blaca.essentials@vendors.nexa.local", ownerUserId);
    if (looseBlaca && String(looseBlaca.status) !== "active") {
      report.note = `Existing "${looseBlaca.shopName}" has status "${looseBlaca.status}" (hidden from the Marketplace). Left unchanged - reactivate it deliberately if you want it visible.`;
    }
    report.vendors.push({ shopName: looseBlaca ? looseBlaca.shopName : BLACA.shopName, created: blaca.created, productsAdded: ensureProducts(blaca.vendorId, BLACA.products), ownerEmail: blaca.ownerEmail, oneTimePassword: blaca.password });
    if (demo) {
      DEMO.forEach((d, i) => {
        const v = ensureVendor(d, `demo.vendor${i + 1}@vendors.nexa.local`, null);
        report.vendors.push({ shopName: d.shopName, created: v.created, productsAdded: ensureProducts(v.vendorId, d.products) });
      });
    }
    return report;
  })();
}

if (require.main === module) {
  const cmd = process.argv[2] || "status";
  if (cmd === "status") console.log(JSON.stringify(status(), null, 2));
  else if (cmd === "apply") console.log(JSON.stringify({ ...apply({ demo: process.argv.includes("--demo") }), after: status() }, null, 2));
  else { console.error("Usage: node server/seedFashionVendors.js status|apply [--demo]"); process.exit(1); }
}

/**
 * Called once at server start. Never throws and never duplicates: if a Blaca shop already exists it is left as-is
 * (a paused shop stays paused - reactivate deliberately). Set NEXA_SKIP_BLACA_SEED=1 to disable.
 * Demo vendors are opt-in (NEXA_SEED_DEMO_VENDORS=1) so they never land in a real marketplace unasked.
 */
function ensureBlacaAtStartup(env = process.env, log = console) {
  if (env.NEXA_SKIP_BLACA_SEED === "1") return null;
  const demo = env.NEXA_SEED_DEMO_VENDORS === "1";
  try {
    let report;
    try {
      report = apply({ demo, env });
    } catch (e) {
      if (!env.BLACA_OWNER_EMAIL) throw e;
      log.warn(`[NEXA] Blaca owner attach skipped (${e.message}); creating a dedicated owner account instead.`);
      report = apply({ demo, env: { ...env, BLACA_OWNER_EMAIL: "" } });
    }
    for (const v of report.vendors) {
      if (v.created || v.productsAdded) log.log(`[NEXA] Marketplace seed: "${v.shopName}" ${v.created ? "created" : "present"}, ${v.productsAdded} product(s) added.`);
      if (v.oneTimePassword) log.warn(`[NEXA] Blaca Essentials owner login (shown once - save it now): ${v.ownerEmail} / ${v.oneTimePassword}`);
    }
    if (report.note) log.warn(`[NEXA] ${report.note}`);
    return report;
  } catch (e) {
    log.warn(`[NEXA] Blaca Essentials seed skipped: ${e.message}`);
    return null;
  }
}

module.exports = { status, apply, ensureBlacaAtStartup, BLACA, DEMO };

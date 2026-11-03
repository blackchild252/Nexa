"use strict";

// Controlled pre-production cleanup. Never invoke automatically during normal startup.
const db = require("./db");
const demo = require("./demoFixtures");
const SHOP_NAMES = ["Blaca Essentials", "NEXA Preview Store", "NEXA Demo Store", "NEXA Demo Atelier", "Tempo Timepieces (demo)", "Kicks & Soles NG (demo)", "Crown & Cap Co. (demo)", "Lagos Loom Atelier (demo)"];

function remove() {
  const vendors = db.prepare(`SELECT id,userId,shopName FROM vendors WHERE lower(shopName) IN (${SHOP_NAMES.map(()=>"?").join(",")})`).all(...SHOP_NAMES.map(x=>x.toLowerCase()));
  const report = { vendors: vendors.map(v=>v.shopName), products: 0, vendorsRemoved: 0, ownerAccountsRemoved: 0, demoRowsRemoved: 0 };
  db.transaction(() => {
    for (const v of vendors) {
      try { report.products += db.prepare("DELETE FROM mall_products WHERE vendorId=?").run(v.id).changes; } catch (_) {}
      try { report.vendorsRemoved += db.prepare("DELETE FROM vendors WHERE id=?").run(v.id).changes; } catch (_) {}
      const owner = db.prepare("SELECT id,email FROM users WHERE id=?").get(v.userId);
      if (owner && /@vendors\.nexa\.local$/i.test(String(owner.email || ""))) {
        try { report.ownerAccountsRemoved += db.prepare("DELETE FROM users WHERE id=?").run(owner.id).changes; } catch (_) {}
      }
    }
    report.demoRowsRemoved = demo.remove().removed;
    for (const email of ["preview.buyer@nexa.local", "preview.vendor@nexa.local", "preview.admin@nexa.local", "demo.store@nexa.local"]) {
      try { report.ownerAccountsRemoved += db.prepare("DELETE FROM users WHERE email=?").run(email).changes; } catch (_) {}
    }
  })();
  return report;
}

if (require.main === module) {
  if (process.env.NEXA_PREVIEW_MODE !== "1") {
    console.error("Refusing preview cleanup outside NEXA_PREVIEW_MODE=1. Run this only against the controlled preview database.");
    process.exit(1);
  }
  console.log(JSON.stringify(remove(), null, 2));
}

module.exports = { remove };

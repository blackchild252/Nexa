"use strict";

const MODES = Object.freeze(["flat", "per_item"]);
const DEFAULT_CURRENCY = "NGN";

function ensureSchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS mall_vendor_delivery_settings (
    vendorId TEXT PRIMARY KEY,
    mode TEXT NOT NULL DEFAULT 'flat',
    amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'NGN',
    updatedAt TEXT NOT NULL
  )`);
}

function normaliseMode(value) {
  const mode = String(value || "flat").trim().toLowerCase();
  return MODES.includes(mode) ? mode : null;
}

function normaliseAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) return null;
  return Math.round(amount * 100) / 100;
}

function readSettings(row) {
  if (!row) return { configured: false, mode: "flat", amount: 0, currency: DEFAULT_CURRENCY };
  return {
    configured: true,
    mode: normaliseMode(row.mode) || "flat",
    amount: Number(row.amount) || 0,
    currency: String(row.currency || DEFAULT_CURRENCY).toUpperCase(),
    updatedAt: row.updatedAt || null,
  };
}

function getSettings(db, vendorId) {
  return readSettings(db.prepare("SELECT vendorId,mode,amount,currency,updatedAt FROM mall_vendor_delivery_settings WHERE vendorId=?").get(vendorId));
}

function saveSettings(db, vendorId, input, now = new Date().toISOString()) {
  const mode = normaliseMode(input?.mode);
  if (!mode) {
    const e = new Error("Delivery estimate mode must be flat or per_item.");
    e.code = "invalid_mode";
    throw e;
  }
  const amount = normaliseAmount(input?.amount);
  if (amount === null) {
    const e = new Error("Delivery estimate amount must be a non-negative number up to 1,000,000.");
    e.code = "invalid_amount";
    throw e;
  }
  const currency = String(input?.currency || DEFAULT_CURRENCY).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    const e = new Error("Delivery estimate currency must be a 3-letter currency code.");
    e.code = "invalid_currency";
    throw e;
  }
  db.prepare(`INSERT INTO mall_vendor_delivery_settings(vendorId,mode,amount,currency,updatedAt)
    VALUES(?,?,?,?,?) ON CONFLICT(vendorId) DO UPDATE SET mode=excluded.mode,amount=excluded.amount,currency=excluded.currency,updatedAt=excluded.updatedAt`)
    .run(vendorId, mode, amount, currency, now);
  return getSettings(db, vendorId);
}

function estimateForLines(db, lines, productStock) {
  if (!Array.isArray(lines) || !lines.length) {
    const e = new Error("At least one Marketplace item is required for a delivery estimate.");
    e.code = "empty_items";
    throw e;
  }
  if (lines.length > 50) {
    const e = new Error("Too many Marketplace items for a delivery estimate.");
    e.code = "too_many_items";
    throw e;
  }

  const byVendor = new Map();
  for (const line of lines) {
    const productId = String(line?.productId || "").trim();
    const quantity = Number(line?.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      const e = new Error("Each delivery-estimate item must include a valid product and quantity.");
      e.code = "invalid_item";
      throw e;
    }
    const product = db.prepare(`SELECT p.id,p.vendorId,p.currency,p.active,p.stock,v.shopName AS vendorName
      FROM mall_products p JOIN vendors v ON v.id=p.vendorId WHERE p.id=? AND p.active=1 AND COALESCE(v.status,'active')='active'`).get(productId);
    if (!product) {
      const e = new Error("One of the selected Marketplace products is unavailable.");
      e.code = "product_unavailable";
      throw e;
    }
    const variantId = line?.variantId ? String(line.variantId).trim() : "";
    if (productStock?.hasVariants?.(db, product.id)) {
      if (!variantId) {
        const e = new Error(`Choose an option for ${product.id} before requesting a delivery estimate.`);
        e.code = "variant_required";
        throw e;
      }
      const variant = productStock.variantsOf(db, product.id).find(v => String(v.id) === variantId);
      if (!variant) {
        const e = new Error("The selected Marketplace option is no longer available.");
        e.code = "variant_unknown";
        throw e;
      }
    } else if (variantId) {
      const e = new Error("A variant was supplied for a product that has no variants.");
      e.code = "variant_not_supported";
      throw e;
    }
    const bucket = byVendor.get(product.vendorId) || { vendorId: product.vendorId, vendorName: product.vendorName, currency: String(product.currency || DEFAULT_CURRENCY).toUpperCase(), quantity: 0 };
    bucket.quantity += quantity;
    byVendor.set(product.vendorId, bucket);
  }

  const vendors = [...byVendor.values()].map(bucket => {
    const settings = getSettings(db, bucket.vendorId);
    const amount = settings.mode === "per_item" ? settings.amount * bucket.quantity : settings.amount;
    return {
      vendorId: bucket.vendorId,
      vendorName: bucket.vendorName,
      quantity: bucket.quantity,
      configured: settings.configured,
      mode: settings.mode,
      amount: Math.round(amount * 100) / 100,
      currency: settings.currency || bucket.currency,
      status: settings.configured ? "estimated" : "seller_not_configured",
    };
  });

  const currencies = [...new Set(vendors.map(v => v.currency))];
  return {
    currency: currencies.length === 1 ? currencies[0] : null,
    total: currencies.length === 1 ? Math.round(vendors.reduce((sum, v) => sum + Number(v.amount || 0), 0) * 100) / 100 : null,
    vendors,
    status: vendors.some(v => v.status === "seller_not_configured") ? "partially_configured" : "estimated",
    finalConfirmationRequired: true,
  };
}

module.exports = { MODES, DEFAULT_CURRENCY, ensureSchema, normaliseMode, normaliseAmount, getSettings, saveSettings, estimateForLines };

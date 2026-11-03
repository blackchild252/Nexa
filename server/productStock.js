"use strict";
/**
 * Product stock — the ONE place stock numbers change (B144 WIP9, checkpoint 2).
 *
 * Model
 *  - A product with no variants keeps its stock in mall_products.stock, exactly as before.
 *  - A product with variants (size and/or colour) keeps stock per variant in
 *    mall_product_variants.stock, and mall_products.stock is kept equal to the SUM of its
 *    variants. Every existing reader (in-stock filters, sold-out flags, low-stock warnings,
 *    vendor stats, storefront ranking) therefore keeps working unchanged.
 *
 * Every function must run inside the caller's transaction. They never open one themselves,
 * so they behave the same on better-sqlite3 and node:sqlite.
 */

const MAX_VARIANTS = 60;
const MAX_STOCK = 100000;
const MAX_LABEL = 30;

class VariantValidationError extends Error {}

function ensureSchema(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS mall_product_variants (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT '',
  colour TEXT NOT NULL DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (productId, size, colour)
);
CREATE INDEX IF NOT EXISTS idx_mallproductvariants_product ON mall_product_variants(productId, position);
`);
  const cols = db.prepare("PRAGMA table_info(mall_order_items)").all().map((c) => c.name);
  if (!cols.includes("variantId")) db.exec("ALTER TABLE mall_order_items ADD COLUMN variantId TEXT");
  if (!cols.includes("variantLabel")) db.exec("ALTER TABLE mall_order_items ADD COLUMN variantLabel TEXT");
}

function labelOf(v) {
  return [v?.size, v?.colour].map((s) => String(s || "").trim()).filter(Boolean).join(" / ");
}

function variantsOf(db, productId) {
  return db.prepare("SELECT id, size, colour, stock, position FROM mall_product_variants WHERE productId = ? ORDER BY position ASC, id ASC").all(productId);
}

function hasVariants(db, productId) {
  return Boolean(db.prepare("SELECT 1 AS x FROM mall_product_variants WHERE productId = ? LIMIT 1").get(productId));
}

/** Re-derive mall_products.stock from the variants (no-op when the product has none). */
function syncProductStock(db, productId, now = new Date().toISOString()) {
  if (!hasVariants(db, productId)) return null;
  const sum = db.prepare("SELECT COALESCE(SUM(stock), 0) AS s FROM mall_product_variants WHERE productId = ?").get(productId).s;
  db.prepare("UPDATE mall_products SET stock = ?, updatedAt = ? WHERE id = ?").run(sum, now, productId);
  return sum;
}

/**
 * Take `qty` units. Returns { ok:true, variantId, variantLabel, before, after } or
 * { ok:false, code, available, message }. On ok:false nothing has changed.
 * codes: unavailable | variant_required | variant_unknown | insufficient
 */
function reserve(db, { productId, variantId = null, qty, now = new Date().toISOString(), requireActive = true }) {
  const q = Math.floor(Number(qty));
  if (!Number.isInteger(q) || q < 1) return { ok: false, code: "insufficient", available: 0, message: "Invalid quantity." };
  const product = db.prepare("SELECT id, name, stock, active FROM mall_products WHERE id = ?").get(productId);
  if (!product || (requireActive && !product.active)) return { ok: false, code: "unavailable", available: 0, message: "This item is no longer available." };

  const variants = hasVariants(db, productId);
  let variant = null;
  if (variants) {
    if (!variantId) return { ok: false, code: "variant_required", available: 0, message: `Choose a size or colour for "${product.name}".` };
    variant = db.prepare("SELECT id, size, colour, stock FROM mall_product_variants WHERE id = ? AND productId = ?").get(String(variantId), productId);
    if (!variant) return { ok: false, code: "variant_unknown", available: 0, message: `That option of "${product.name}" is no longer available.` };
  } else if (variantId) {
    return { ok: false, code: "variant_unknown", available: 0, message: `That option of "${product.name}" is no longer available.` };
  }

  const available = variant ? Number(variant.stock) : Number(product.stock);
  const short = () => ({
    ok: false, code: "insufficient", available,
    message: available > 0
      ? `Only ${available} of "${product.name}${variant ? ` (${labelOf(variant)})` : ""}" left in stock.`
      : `"${product.name}${variant ? ` (${labelOf(variant)})` : ""}" is out of stock.`,
  });

  // Product row first (guarded), then the variant row (guarded). If the second guard fails the
  // first change is reversed, so a failed reserve leaves nothing behind.
  const activeGuard = requireActive ? " AND active = 1" : "";
  const p = db.prepare(`UPDATE mall_products SET stock = stock - ?, updatedAt = ? WHERE id = ? AND stock >= ?${activeGuard}`).run(q, now, productId, q);
  if (!p.changes) return short();
  if (variant) {
    const v = db.prepare("UPDATE mall_product_variants SET stock = stock - ?, updatedAt = ? WHERE id = ? AND productId = ? AND stock >= ?").run(q, now, variant.id, productId, q);
    if (!v.changes) {
      db.prepare("UPDATE mall_products SET stock = stock + ?, updatedAt = ? WHERE id = ?").run(q, now, productId);
      return short();
    }
  }
  return { ok: true, variantId: variant ? variant.id : null, variantLabel: variant ? labelOf(variant) : null, before: Number(product.stock), after: Number(product.stock) - q };
}

/**
 * Put `qty` units back. Safe on a deleted product (no rows match).
 * A variant that was removed by the vendor since the order was placed is NOT restocked, and
 * neither is a pre-variant order line on a product that has since gained variants: both would
 * make the product total drift from the sum of its variants.
 */
function release(db, { productId, variantId = null, qty, now = new Date().toISOString() }) {
  const q = Math.floor(Number(qty));
  if (!Number.isInteger(q) || q < 1) return { restored: false, reason: "invalid_quantity" };
  if (variantId) {
    const v = db.prepare("UPDATE mall_product_variants SET stock = stock + ?, updatedAt = ? WHERE id = ? AND productId = ?").run(q, now, String(variantId), productId);
    if (!v.changes) return { restored: false, reason: "variant_removed" };
    db.prepare("UPDATE mall_products SET stock = stock + ?, updatedAt = ? WHERE id = ?").run(q, now, productId);
    return { restored: true };
  }
  if (hasVariants(db, productId)) return { restored: false, reason: "no_variant" };
  const r = db.prepare("UPDATE mall_products SET stock = stock + ?, updatedAt = ? WHERE id = ?").run(q, now, productId);
  return r.changes ? { restored: true } : { restored: false, reason: "product_gone" };
}

function normKey(size, colour) { return `${size.toLowerCase()}\u0000${colour.toLowerCase()}`; }

/** Validate a vendor-supplied variant list. Throws VariantValidationError. */
function readVariantList(input) {
  if (!Array.isArray(input)) throw new VariantValidationError("Variants must be a list.");
  if (input.length > MAX_VARIANTS) throw new VariantValidationError(`A product can have up to ${MAX_VARIANTS} size/colour options.`);
  const seen = new Set();
  return input.map((raw) => {
    const size = String(raw?.size ?? "").trim();
    const colour = String(raw?.colour ?? "").trim();
    if (!size && !colour) throw new VariantValidationError("Each option needs a size, a colour, or both.");
    if (size.length > MAX_LABEL || colour.length > MAX_LABEL) throw new VariantValidationError(`Size and colour must be ${MAX_LABEL} characters or fewer.`);
    const stock = Number(raw?.stock ?? 0);
    if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) throw new VariantValidationError("Stock must be a whole number from 0 to 100,000.");
    const key = normKey(size, colour);
    if (seen.has(key)) throw new VariantValidationError(`"${labelOf({ size, colour })}" is listed twice.`);
    seen.add(key);
    return { size, colour, stock };
  });
}

/**
 * Replace a product's variants with `list` (already validated). An option that matches an
 * existing size+colour keeps its id, so carts and past orders that point at it stay valid.
 * An empty list removes all variants and leaves the product total as it is.
 */
function replaceVariants(db, productId, list, now = new Date().toISOString(), newId = () => `mv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`) {
  const existing = variantsOf(db, productId);
  const byKey = new Map(existing.map((v) => [normKey(v.size, v.colour), v]));
  const keep = new Set();
  list.forEach((item, position) => {
    const found = byKey.get(normKey(item.size, item.colour));
    if (found) {
      keep.add(found.id);
      db.prepare("UPDATE mall_product_variants SET size = ?, colour = ?, stock = ?, position = ?, updatedAt = ? WHERE id = ?")
        .run(item.size, item.colour, item.stock, position, now, found.id);
    } else {
      db.prepare("INSERT INTO mall_product_variants (id, productId, size, colour, stock, position, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)")
        .run(newId(), productId, item.size, item.colour, item.stock, position, now, now);
    }
  });
  for (const v of existing) if (!keep.has(v.id)) db.prepare("DELETE FROM mall_product_variants WHERE id = ?").run(v.id);
  syncProductStock(db, productId, now);
  return variantsOf(db, productId);
}

module.exports = {
  MAX_VARIANTS, MAX_STOCK, VariantValidationError,
  ensureSchema, labelOf, variantsOf, hasVariants, syncProductStock,
  reserve, release, readVariantList, replaceVariants,
};

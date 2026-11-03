"use strict";

const { normalizeCurrency, validateFxQuote } = require("./currencyModel");

// Stores only already-validated, fresh quotes. It never fetches rates and never moves money.
function validateRateText(value) {
  const rate = String(value ?? "");
  if (!/^\d+(?:\.\d{1,8})?$/.test(rate) || !Number.isFinite(Number(rate)) || Number(rate) <= 0) {
    throw new TypeError("FX rate must be a positive decimal with at most 8 fractional digits.");
  }
  return rate;
}

function saveVerifiedQuote(db, quote, { now = Date.now(), maxAgeMs = 5 * 60 * 1000 } = {}) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("A database connection is required.");
  validateRateText(quote?.rate);
  if (!String(quote?.source || "").trim()) throw new TypeError("A quote source is required for audit lineage.");
  const validated = validateFxQuote(quote, {
    fromCurrency: quote?.fromCurrency,
    toCurrency: quote?.toCurrency,
    now,
    maxAgeMs,
  });
  const storedAt = new Date(now).toISOString();
  db.prepare(`INSERT INTO fx_rate_quotes(fromCurrency,toCurrency,rate,source,asOf,storedAt)
    VALUES(?,?,?,?,?,?)
    ON CONFLICT(fromCurrency,toCurrency,source,asOf)
    DO UPDATE SET rate=excluded.rate,storedAt=excluded.storedAt`)
    .run(validated.fromCurrency, validated.toCurrency, validated.rate, validated.source, validated.asOf, storedAt);
  return { ...validated, storedAt };
}

function getFreshQuote(db, fromCurrency, toCurrency, { now = Date.now(), maxAgeMs = 5 * 60 * 1000 } = {}) {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (from === to) return null;
  const row = db.prepare(`SELECT fromCurrency,toCurrency,rate,source,asOf,storedAt
    FROM fx_rate_quotes WHERE fromCurrency=? AND toCurrency=? ORDER BY asOf DESC,storedAt DESC LIMIT 1`).get(from, to);
  if (!row) return null;
  try {
    validateRateText(row.rate);
    return { ...validateFxQuote(row, { fromCurrency: from, toCurrency: to, now, maxAgeMs }), storedAt: row.storedAt };
  } catch (_) {
    return null;
  }
}

module.exports = { saveVerifiedQuote, getFreshQuote };

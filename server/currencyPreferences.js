"use strict";

const { normalizeCurrency, currencyForCountry } = require("./currencyModel");

function cleanCountryCode(value) {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === "") return null;
  const code = String(value).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) throw Object.assign(new TypeError("Country must be a two-letter ISO country code."), { status: 400 });
  return code;
}

function get(db, userId) {
  const row = db.prepare("SELECT displayCurrency,countryCode,updatedAt FROM user_currency_preferences WHERE userId=?").get(userId);
  if (!row) return { displayCurrency: null, countryCode: null, suggestedCurrency: null, updatedAt: null, preferenceState: "not_set", affectsFinancialCurrency: false };
  let displayCurrency = null;
  let preferenceState = "set";
  try { displayCurrency = normalizeCurrency(row.displayCurrency); }
  catch (_) { preferenceState = "invalid_stored_value"; }
  const countryCode = /^[A-Z]{2}$/.test(String(row.countryCode || "")) ? row.countryCode : null;
  return { displayCurrency, countryCode, suggestedCurrency: countryCode ? currencyForCountry(countryCode) : null, updatedAt: row.updatedAt || null, preferenceState, affectsFinancialCurrency: false };
}

function update(db, userId, body = {}, { now = new Date() } = {}) {
  const current = get(db, userId);
  const displayCurrency = body.displayCurrency === undefined ? current.displayCurrency : normalizeCurrency(body.displayCurrency);
  if (!displayCurrency) throw Object.assign(new TypeError("Choose a supported display currency."), { status: 400 });
  const countryCode = body.countryCode === undefined ? current.countryCode : cleanCountryCode(body.countryCode);
  const updatedAt = now.toISOString();
  db.prepare(`INSERT INTO user_currency_preferences(userId,displayCurrency,countryCode,updatedAt) VALUES(?,?,?,?)
    ON CONFLICT(userId) DO UPDATE SET displayCurrency=excluded.displayCurrency,countryCode=excluded.countryCode,updatedAt=excluded.updatedAt`)
    .run(String(userId), displayCurrency, countryCode, updatedAt);
  return get(db, userId);
}

module.exports = { cleanCountryCode, get, update };

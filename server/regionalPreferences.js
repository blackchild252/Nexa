"use strict";
const fs = require("node:fs");
const path = require("node:path");
const COUNTRIES = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, "countries.json"), "utf8")).map((item) => item.code));
const LOCALES = new Set(["en", "en-GB", "fr", "es", "pt", "ar", "ha", "yo", "ig", "pcm", "sw"]);
const LANGUAGES = new Set(["en", "fr", "es", "pt", "ar", "ha", "yo", "ig", "pcm", "sw"]);
function normalize(body = {}) {
  const countryCode = body.countryCode == null || String(body.countryCode).trim() === "" ? null : String(body.countryCode).trim().toUpperCase();
  const locale = String(body.locale || "en"); const languageCode = String(body.languageCode || "en");
  if (countryCode && !COUNTRIES.has(countryCode)) throw Object.assign(new TypeError("Choose a supported country or territory."), { status: 400 });
  if (!LOCALES.has(locale)) throw Object.assign(new TypeError("Choose a supported locale."), { status: 400 });
  if (!LANGUAGES.has(languageCode)) throw Object.assign(new TypeError("Choose a supported language."), { status: 400 });
  return { countryCode, locale, languageCode };
}
function get(db, userId) {
  const row = db.prepare("SELECT countryCode,locale,languageCode,updatedAt FROM user_regional_preferences WHERE userId=?").get(String(userId));
  if (!row) return { countryCode: null, locale: "en", languageCode: "en", updatedAt: null, preferenceState: "not_set" };
  try { return { ...normalize(row), updatedAt: row.updatedAt || null, preferenceState: "set" }; }
  catch (_) { return { countryCode: null, locale: "en", languageCode: "en", updatedAt: row.updatedAt || null, preferenceState: "invalid_stored_value" }; }
}
function update(db, userId, body = {}, { now = new Date() } = {}) {
  const current = get(db, userId);
  const next = normalize({ countryCode: body.countryCode === undefined ? current.countryCode : body.countryCode, locale: body.locale === undefined ? current.locale : body.locale, languageCode: body.languageCode === undefined ? current.languageCode : body.languageCode });
  const updatedAt = now.toISOString();
  db.prepare(`INSERT INTO user_regional_preferences(userId,countryCode,locale,languageCode,updatedAt) VALUES(?,?,?,?,?) ON CONFLICT(userId) DO UPDATE SET countryCode=excluded.countryCode,locale=excluded.locale,languageCode=excluded.languageCode,updatedAt=excluded.updatedAt`).run(String(userId), next.countryCode, next.locale, next.languageCode, updatedAt);
  return { ...next, updatedAt, preferenceState: "set" };
}
module.exports = { normalize, get, update, LOCALES: [...LOCALES], LANGUAGES: [...LANGUAGES] };

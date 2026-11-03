const test = require("node:test");
const assert = require("node:assert/strict");
const preferences = require("./currencyPreferences");

function memoryDb() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      if (sql.startsWith("SELECT displayCurrency,countryCode,updatedAt")) return { get(userId) { return rows.get(userId) || null; } };
      if (sql.startsWith("INSERT INTO user_currency_preferences")) return { run(userId, displayCurrency, countryCode, updatedAt) { rows.set(userId, { displayCurrency, countryCode, updatedAt }); return { changes: 1 }; } };
      throw new Error(`Unexpected SQL in currency preference test: ${sql}`);
    },
  };
}

test("currency preference is absent by default and never claims to convert money", () => {
  const db = memoryDb();
  assert.deepEqual(preferences.get(db, "u1"), { displayCurrency: null, countryCode: null, suggestedCurrency: null, updatedAt: null, preferenceState: "not_set", affectsFinancialCurrency: false });
});

test("currency preference persists supported display currency and country hint separately", () => {
  const db = memoryDb();
  const saved = preferences.update(db, "u1", { displayCurrency: "usd", countryCode: "us" }, { now: new Date("2026-01-02T03:04:05.000Z") });
  assert.equal(saved.displayCurrency, "USD");
  assert.equal(saved.countryCode, "US");
  assert.equal(saved.suggestedCurrency, "USD");
  assert.equal(saved.updatedAt, "2026-01-02T03:04:05.000Z");
  assert.equal(saved.affectsFinancialCurrency, false);
  assert.equal(preferences.get(db, "u1").displayCurrency, "USD");
});

test("unsupported currencies and malformed country codes are rejected without saving", () => {
  const db = memoryDb();
  assert.throws(() => preferences.update(db, "u1", { displayCurrency: "XXX" }), /supported ISO currency/);
  assert.throws(() => preferences.update(db, "u1", { displayCurrency: "USD", countryCode: "USA" }), /two-letter ISO/);
  assert.equal(db.rows.size, 0);
});

test("country mapping is only a suggestion and changing country does not change chosen currency", () => {
  const db = memoryDb();
  preferences.update(db, "u1", { displayCurrency: "GBP", countryCode: "GB" });
  const saved = preferences.update(db, "u1", { countryCode: "NG" });
  assert.equal(saved.displayCurrency, "GBP");
  assert.equal(saved.suggestedCurrency, "NGN");
  assert.equal(saved.affectsFinancialCurrency, false);
});

const fs = require("node:fs");
const path = require("node:path");
test("currency preference is backed by a user-owned DB table and authenticated no-store routes", () => {
  const dbSchema = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");
  const routes = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  const portability = fs.readFileSync(path.join(__dirname, "accountPortability.js"), "utf8");
  assert.match(dbSchema, /CREATE TABLE IF NOT EXISTS user_currency_preferences/);
  assert.match(dbSchema, /displayCurrency TEXT NOT NULL CHECK \(length\(displayCurrency\) = 3\)/);
  assert.match(routes, /app\.get\("\/api\/currency\/preferences", auth\.authMiddleware/);
  assert.match(routes, /app\.put\("\/api\/currency\/preferences", auth\.authMiddleware/);
  assert.match(routes, /convertsMoney: false/);
  assert.match(portability, /user_currency_preferences/);
  assert.match(portability, /unsupported display currency/);
});

test("Profile & Settings exposes the persisted display preference without claiming conversion", () => {
  const api = fs.readFileSync(path.join(__dirname, "../src/api.ts"), "utf8");
  const profile = fs.readFileSync(path.join(__dirname, "../src/app/(tabs)/profile.tsx"), "utf8");
  assert.match(api, /getCurrencyPreferences/);
  assert.match(api, /updateCurrencyPreferences/);
  assert.match(profile, /Preferred display currency/);
  assert.match(profile, /Save display currency/);
  assert.match(profile, /does not convert funds/);
});

test("currency preference writes and reads against an actual SQLite table", () => {
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE user_currency_preferences (
    userId TEXT PRIMARY KEY,
    displayCurrency TEXT NOT NULL CHECK (length(displayCurrency) = 3),
    countryCode TEXT CHECK (countryCode IS NULL OR length(countryCode) = 2),
    updatedAt TEXT NOT NULL
  )`);
  const saved = preferences.update(db, "sqlite-user", { displayCurrency: "JPY", countryCode: "JP" }, { now: new Date("2026-10-09T00:00:00.000Z") });
  assert.equal(saved.displayCurrency, "JPY");
  assert.equal(saved.countryCode, "JP");
  assert.equal(saved.suggestedCurrency, "JPY");
  assert.equal(preferences.get(db, "sqlite-user").displayCurrency, "JPY");
  db.close();
});

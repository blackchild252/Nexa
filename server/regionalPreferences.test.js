const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const preferences = require('./regionalPreferences');
const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function memoryDb() {
  const rows = new Map();
  return { rows, prepare(sql) {
    if (sql.startsWith('SELECT countryCode,locale,languageCode,updatedAt')) return { get(id) { return rows.get(id) || null; } };
    if (sql.startsWith('INSERT INTO user_regional_preferences')) return { run(userId,countryCode,locale,languageCode,updatedAt) { rows.set(userId,{countryCode,locale,languageCode,updatedAt}); return {changes:1}; } };
    throw new Error(`Unexpected SQL: ${sql}`);
  } };
}

test('regional preference defaults are safe and do not infer a country or language', () => {
  assert.deepEqual(preferences.get(memoryDb(), 'u1'), { countryCode:null, locale:'en', languageCode:'en', updatedAt:null, preferenceState:'not_set' });
});

test('regional preferences persist country, locale and language independently', () => {
  const db=memoryDb();
  const saved=preferences.update(db,'u1',{countryCode:'ng',locale:'en-GB',languageCode:'yo'},{now:new Date('2026-10-09T00:00:00.000Z')});
  assert.equal(saved.countryCode,'NG'); assert.equal(saved.locale,'en-GB'); assert.equal(saved.languageCode,'yo');
  assert.equal(saved.updatedAt,'2026-10-09T00:00:00.000Z'); assert.equal(preferences.get(db,'u1').languageCode,'yo');
  const partial=preferences.update(db,'u1',{languageCode:'fr'});
  assert.equal(partial.countryCode,'NG'); assert.equal(partial.locale,'en-GB'); assert.equal(partial.languageCode,'fr');
});

test('unknown countries and unsupported locale/language values are rejected without persistence', () => {
  const db=memoryDb();
  assert.throws(()=>preferences.update(db,'u1',{countryCode:'ZZ'}),/supported country/);
  assert.throws(()=>preferences.update(db,'u1',{locale:'xx'}),/supported locale/);
  assert.throws(()=>preferences.update(db,'u1',{languageCode:'xx'}),/supported language/);
  assert.equal(db.rows.size,0);
});

test('regional preference service persists to SQLite', () => {
  const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE user_regional_preferences(userId TEXT PRIMARY KEY,countryCode TEXT,locale TEXT NOT NULL DEFAULT 'en',languageCode TEXT NOT NULL DEFAULT 'en',updatedAt TEXT NOT NULL)`);
  const saved=preferences.update(db,'sqlite-user',{countryCode:'GB',locale:'en-GB',languageCode:'en'},{now:new Date('2026-10-09T00:00:00.000Z')});
  assert.equal(saved.countryCode,'GB'); assert.equal(preferences.get(db,'sqlite-user').locale,'en-GB'); db.close();
});

test('Main persists regional preferences through authenticated no-store API and account portability', () => {
  const schema=read('server/db.js'); const routes=read('server/index.js'); const portability=read('server/accountPortability.js'); const api=read('src/api.ts');
  assert.match(schema,/CREATE TABLE IF NOT EXISTS user_regional_preferences/);
  assert.match(routes,/app\.get\("\/api\/regional\/preferences", auth\.authMiddleware/);
  assert.match(routes,/app\.put\("\/api\/regional\/preferences", auth\.authMiddleware/);
  assert.match(routes,/user_regional_display_preference/);
  assert.match(portability,/"user_regional_preferences"/); assert.match(portability,/unsupported regional preference/);
  assert.match(api,/getRegionalPreferences/); assert.match(api,/updateRegionalPreferences/);
});

test('Main Profile exposes country, locale and language controls without claiming complete translation coverage', () => {
  const profile=read('src/app/(tabs)/profile.tsx'); const picker=read('src/CountryPicker.tsx'); const regional=read('src/regionalization.ts');
  assert.match(profile,/Country, language and regional format/); assert.match(profile,/Save regional preferences/);
  assert.match(profile,/translations depend on each feature's coverage/); assert.match(picker,/countryFlag/); assert.match(picker,/callingCode/);
  assert.match(regional,/NEXA_RESTRICTED_COUNTRY_RULES: ReadonlyArray/); assert.match(regional,/formatRegionalDateTime/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const { OPTIONS, FIELDS, normalizeAvatarConfig, parseStoredAvatar } = require('./damiAvatar');

const good = { gender: 'female', skin: 's3', face: 'smile', hair: 'curly', hairColor: 'h1', glasses: 'none', mustache: 'none', top: 'gold', bottom: 'skirt', shoes: 'sneakers', bag: 'none', pose: 'stand', scene: 'neighborhood', lang: 'en' };

test('a full valid avatar is accepted and unknown fields are dropped', () => {
  const r = normalizeAvatarConfig({ ...good, extra: 'x', lang: 'YO' });
  assert.equal(r.ok, true);
  assert.equal(r.config.lang, 'yo');
  assert.deepEqual(Object.keys(r.config).sort(), [...FIELDS].sort());
});

test('invalid, missing or oversized avatar values are rejected', () => {
  for (const bad of [null, [], 'x', { ...good, hair: 'mohawk' }, { ...good, gender: 'other' }, { ...good, lang: 'auto' }, { ...good, lang: 'xx' }, { ...good, top: undefined }, { ...good, scene: { a: 1 } }]) assert.equal(normalizeAvatarConfig(bad).ok, false);
});

test('a corrupt stored avatar reads back as no avatar', () => {
  assert.equal(parseStoredAvatar('not json'), null);
  assert.equal(parseStoredAvatar(JSON.stringify({ ...good, hair: 'nope' })), null);
  assert.deepEqual(parseStoredAvatar(JSON.stringify(good)), good);
});

test('server option lists match the app catalogue', () => {
  const src = read('src/nexaAvatar.ts');
  const catalogue = { skin: 'SKINS', face: 'FACES', hair: 'HAIR', hairColor: 'HAIR_COLORS', glasses: 'GLASSES', mustache: 'MUSTACHES', top: 'TOPS', bottom: 'BOTTOMS', shoes: 'SHOES', bag: 'BAGS', scene: 'SCENES' };
  for (const [key, name] of Object.entries(catalogue)) {
    const line = src.split('\n').find((l) => l.startsWith(`export const ${name}: Opt[]`));
    assert.ok(line, name);
    const ids = [...line.matchAll(/\{ id: '([a-z0-9]+)'/g)].map((m) => m[1]);
    assert.deepEqual([...OPTIONS[key]].sort(), ids.sort(), key);
  }
  assert.deepEqual([...OPTIONS.gender].sort(), ['female', 'male']);
  const poses = [...src.slice(src.indexOf('export const POSES')).split('\n').slice(0, 4).join('').matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]);
  assert.deepEqual([...OPTIONS.pose].sort(), poses.sort());
});

test('avatar routes, table, export and account closure are wired', () => {
  const index = read('server/index.js');
  assert.match(index, /app\.get\("\/api\/ai\/avatar", auth\.authMiddleware/);
  assert.match(index, /app\.put\("\/api\/ai\/avatar", auth\.authMiddleware/);
  assert.match(read('server/db.js'), /CREATE TABLE IF NOT EXISTS ai_avatar \(\s*userId TEXT PRIMARY KEY/);
  assert.match(read('server/accountPortability.js'), /"ai_avatar"/);
  assert.match(read('server/v5_77_0_account_closure_integrity.js'), /"ai_avatar"/);
});

test('app avatar syncs appearance with the server and heals a failed save', () => {
  const s = read('src/nexaAvatar.ts');
  assert.match(s, /getDamiAvatar/);
  assert.match(s, /saveDamiAvatar\(state as any\)/);
  assert.match(s, /one-time upload of an avatar saved before server storage existed/);
  assert.match(read('src/api.ts'), /fetch\('\/api\/ai\/avatar'|authedFetch\('\/api\/ai\/avatar',\{method:'PUT'/);
});

test('every translated avatar option row covers every option id exactly once', () => {
  const src = read('src/nexaAvatarLabels.ts');
  const ids = [...src.match(/AVATAR_OPTION_IDS = \[([^\]]*)\]/)[1].matchAll(/'([a-z0-9]+)'/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  const serverIds = new Set([...Object.entries(OPTIONS).filter(([k]) => k !== 'pose' || true).flatMap(([, v]) => v)]);
  for (const id of ids) assert.ok(serverIds.has(id), `unknown option id ${id}`);
  for (const id of serverIds) assert.ok(ids.includes(id), `option id without a translation slot: ${id}`);
  const rows = [...src.matchAll(/^  ([a-z]{2}): \[(.*)\],$/gm)];
  assert.ok(rows.length >= 7);
  for (const [, lang, body] of rows) assert.equal([...body.matchAll(/'((?:[^'\\]|\\.)*)'/g)].length, ids.length, `${lang} row length`);
});

test('studio shows translated option names and keeps the lock marker', () => {
  const studio = read('src/NexaAvatarStudio.tsx');
  assert.match(studio, /optLabel\(lang, o\.id, o\.label\)/);
  assert.match(studio, /lockedIds\?\.includes\(o\.id\)/);
  assert.equal((studio.match(/<Row lang=\{L\} title=/g) || []).length, 14);
});

const A = require('./damiAvatar');
const fakeSubs = (sub) => ({ currentSubscription: () => sub });

test('pose plan rules on the server match the app', () => {
  const src = read('src/nexaAvatar.ts');
  const block = src.slice(src.indexOf('export const POSES'), src.indexOf('const RANK'));
  const client = Object.fromEntries([...block.matchAll(/id: '([a-z]+)', label: '[^']*', min: '([a-z]+)'/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(A.POSE_MIN_TIER, client);
});

test('a plan only saves the poses it includes; the rest become standing', () => {
  const cfg = (pose) => ({ ...good, pose });
  for (const [tier, ok, no] of [['free', ['stand'], ['move', 'computer', 'sit', 'lie']], ['regular', ['stand', 'move'], ['computer', 'sit', 'lie']], ['premium', ['stand', 'move', 'computer'], ['sit', 'lie']], ['vip', ['stand', 'move', 'computer', 'sit', 'lie'], []]]) {
    for (const p of ok) assert.deepEqual(A.applyPoseTier(cfg(p), tier), { config: cfg(p), clamped: false }, `${tier} ${p}`);
    for (const p of no) assert.deepEqual(A.applyPoseTier(cfg(p), tier), { config: cfg('stand'), clamped: true }, `${tier} ${p}`);
  }
  assert.equal(A.applyPoseTier(cfg('lie'), 'free', { unlockAll: true }).clamped, false);
});

test('the user plan comes from an active subscription only', () => {
  assert.equal(A.tierForUser(fakeSubs({ status: 'active', planId: 'vip' }), null, 'u'), 'vip');
  assert.equal(A.tierForUser(fakeSubs({ status: 'cancelled', planId: 'vip' }), null, 'u'), 'free');
  assert.equal(A.tierForUser(fakeSubs({ status: 'active', planId: 'gold' }), null, 'u'), 'free');
  assert.equal(A.tierForUser(fakeSubs(null), null, 'u'), 'free');
  assert.equal(A.tierForUser({ currentSubscription: () => { throw new Error('db'); } }, null, 'u'), 'free');
});

test('the developer preview unlock never works in production', () => {
  assert.equal(A.previewUnlockAll({ NEXA_AVATAR_PREVIEW_UNLOCK: '1' }), true);
  assert.equal(A.previewUnlockAll({ NEXA_AVATAR_PREVIEW_UNLOCK: '1', NODE_ENV: 'production' }), false);
  assert.equal(A.previewUnlockAll({}), false);
});

test('avatar routes apply the plan on save and on read, and the app adopts the saved pose', () => {
  const index = read('server/index.js');
  assert.match(index, /const tier = tierForUser\(subscriptionsForAvatar, db, req\.user\.id\)[^\n]*\n\s*const \{ config, clamped \} = applyPoseTier\(result\.config, tier,/);
  assert.match(index, /poseLocked: clamped/);
  assert.match(index, /applyPoseTier\(stored, tier, \{ unlockAll \}\)/);
  assert.match(read('src/nexaAvatar.ts'), /the server drops a pose the plan does not include/);
});

test('the server reports the plan it confirmed, so the studio locks poses the same way', () => {
  assert.equal(A.reportedTier('vip'), 'vip');
  assert.equal(A.reportedTier('premium'), 'premium');
  assert.equal(A.reportedTier('gold'), 'free');
  assert.equal(A.reportedTier(undefined), 'free');
  assert.equal(A.reportedTier('free', { unlockAll: true }), 'vip');
});

test('both avatar routes send the plan and the studio uses it instead of the saved plan', () => {
  const index = read('server/index.js');
  assert.match(index, /updatedAt: avatar \? row\.updatedAt : null, tier: reportedTier\(tier, \{ unlockAll \}\)/);
  assert.match(index, /poseLocked: clamped, tier: reportedTier\(tier, \{ unlockAll \}\)/);
  const store = read('src/nexaAvatar.ts');
  assert.match(store, /export function useAvatarTier\(/);
  assert.match(store, /readServerTier\(got\)/);
  assert.match(store, /readServerTier\(res\)/);
  assert.match(read('src/NexaAvatarStudio.tsx'), /useAvatarTier\(savedTier\)/);
});

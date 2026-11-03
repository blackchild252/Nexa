const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('Dami avatar saves to browser storage first so the web app keeps it after a reload', () => {
  const s = read('src/nexaAvatar.ts');
  assert.match(s, /typeof localStorage !== 'undefined'/);
  assert.match(s, /localStorage\.setItem\(key, value\)/);
  assert.match(s, /expo-secure-store/);
});

test('Dami avatar gender and language follow the server voice setting', () => {
  const s = read('src/nexaAvatar.ts');
  assert.match(s, /getDamiVoicePreferences/);
  assert.match(s, /async function reconcileServer/);
  assert.match(s, /voicePending/);
  assert.match(s, /export function applyDamiVoiceToAvatar/);
});

test('Dami screen voice, language and reset changes update the avatar', () => {
  const s = read('src/NexaAI.tsx');
  assert.match(s, /applyDamiVoiceToAvatar\(nextVoice,languageCode\)/);
  assert.match(s, /applyDamiVoiceToAvatar\(voiceStyle,next\)/);
  assert.match(s, /applyDamiVoiceToAvatar\('female','auto'\)/);
});

test('every avatar language is a language the server supports', () => {
  const { isSupportedDamiLanguage } = require('./damiLanguage');
  const codes = [...read('src/nexaAvatar.ts').matchAll(/\{ code: '([a-z]+)', label:/g)].map((m) => m[1]);
  assert.ok(codes.length >= 12);
  for (const c of codes) assert.ok(isSupportedDamiLanguage(c), c);
});

test('male and female avatars are drawn differently', () => {
  const s = read('src/NexaAvatar.tsx');
  assert.match(s, /const tx = male \?/);
  assert.match(s, /headR = male \?/);
  assert.match(s, /\{male \? null : <>/); // blush is female only
  assert.doesNotMatch(s, /\? null : null/);
});

test('studio titles are translated and locked poses explain themselves', () => {
  const cat = read('src/nexaAvatar.ts');
  const studio = read('src/NexaAvatarStudio.tsx');
  for (const lang of ['en', 'fr', 'es', 'pt', 'de', 'ar', 'hi', 'zh']) assert.match(cat, new RegExp(`^  ${lang}: \\{.*ttlPose:`, 'm'), lang);
  for (const lang of ['fr', 'es', 'pt', 'de', 'ar', 'hi', 'zh', 'pcm']) assert.match(cat, new RegExp(`^  ${lang}: \\{.*locked:`, 'm'), lang);
  assert.match(studio, /else setNote\(tr\(L, 'locked'\)\)/);
});

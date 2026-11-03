const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { validateProfile } = require('./profileValidation');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('Zeeza welcome is Inbox/friends-first with a dedicated profile navigation action', () => {
  const zeeza = read('src/app/(tabs)/zeeza.tsx');
  assert.match(zeeza, /Inbox/);
  assert.match(zeeza, /Friends/);
  assert.match(zeeza, /Profile/);
  assert.match(zeeza, /\/zeeza\/profile/);
  assert.doesNotMatch(zeeza, /Dream Marketplace/);
  assert.doesNotMatch(zeeza, /Sky Money/);
  assert.doesNotMatch(zeeza, /Yaayz/);
});

test('Zeeza has a dedicated social profile surface', () => {
  const profile = read('src/ZeezaProfile.tsx');
  assert.match(profile, /Profile picture/);
  assert.match(profile, /Status \/ bio/);
  assert.match(profile, /200 words/);
  assert.match(profile, /Profile info/);
  assert.match(profile, /Profile visibility/);
});

test('Zeeza profile route has an explicit back path', () => {
  const route = read('src/app/zeeza/profile.tsx');
  assert.match(route, /router\.replace/);
  assert.match(route, /\(tabs\)\/zeeza/);
});

test('social profile accepts 200 words and rejects 201 words', () => {
  const twoHundred = Array.from({length: 200}, (_, i) => `word${i}`).join(' ');
  const twoHundredOne = `${twoHundred} extra`;
  assert.equal(validateProfile({ bio: twoHundred }).error, undefined);
  assert.match(validateProfile({ bio: twoHundredOne }).error, /200 words/);
});

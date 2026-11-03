const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { validateAvatarPayload } = require('./profileAvatar');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('V4.10 Zeeza profile has native photo picker and no legacy URL-only editor copy', () => {
  const profile = read('src/ZeezaProfile.tsx');
  assert.match(profile, /expo-image-picker/);
  assert.match(profile, /launchImageLibraryAsync/);
  assert.match(profile, /apiUploadProfileAvatar/);
  assert.doesNotMatch(profile, /native photo-upload\/storage flow can be added later/);
});

test('V4.10 Friends page no longer renders the removed legacy ProfileEditor', () => {
  const friends = read('src/FriendsScreen.tsx');
  assert.doesNotMatch(friends, /<ProfileEditor\s*\/>/);
});

test('V4.10 Zeeza shell exposes unread/request badges', () => {
  const zeeza = read('src/app/(tabs)/zeeza.tsx');
  assert.match(zeeza, /unreadInbox/);
  assert.match(zeeza, /requestCount/);
  assert.match(zeeza, /badge/);
});

test('V4.10 avatar validation accepts real PNG bytes and rejects fake data', () => {
  const png = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00]).toString('base64');
  assert.equal(validateAvatarPayload({ imageBase64: png, mimeType: 'image/png' }).error, undefined);
  assert.match(validateAvatarPayload({ imageBase64: Buffer.from('not image').toString('base64'), mimeType: 'image/png' }).error, /valid image/i);
});

test('V4.10 avatar validation enforces an 800 KB ceiling', () => {
  const fake = Buffer.concat([Buffer.from([0xff,0xd8,0xff]), Buffer.alloc(800 * 1024)]).toString('base64');
  assert.match(validateAvatarPayload({ imageBase64: fake, mimeType: 'image/jpeg' }).error, /800 KB/i);
});

test('V4.10 server exposes authenticated avatar upload route', () => {
  const friends = read('server/friends.js');
  assert.match(friends, /app\.post\("\/api\/social\/profile\/avatar"/);
  assert.match(friends, /validateAvatarPayload/);
  assert.match(friends, /req\.user\.id/);
});

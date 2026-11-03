const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProfile, countWords } = require('./profileValidation');

test('profile accepts a normal profile', () => {
  const r = validateProfile({ bio: 'Hello NEXA', avatarUrl: 'https://cdn.example.com/a.png', visibility: 'friends' });
  assert.equal(r.error, undefined);
  assert.equal(r.value.visibility, 'friends');
});

test('profile accepts a bio at exactly 200 words', () => {
  const bio = Array.from({ length: 200 }, (_, i) => `word${i + 1}`).join(' ');
  assert.equal(countWords(bio), 200);
  assert.equal(validateProfile({ bio }).error, undefined);
});

test('profile rejects a bio over 200 words', () => {
  const bio = Array.from({ length: 201 }, (_, i) => `word${i + 1}`).join(' ');
  assert.match(validateProfile({ bio }).error, /200 words/);
});

test('profile rejects invalid visibility', () => assert.match(validateProfile({ visibility: 'everyone' }).error, /Visibility/));
test('profile rejects non-HTTPS avatar URL', () => assert.match(validateProfile({ avatarUrl: 'http://example.com/a.png' }).error, /HTTPS/));
test('profile accepts empty avatar URL as null', () => assert.equal(validateProfile({ avatarUrl: '' }).value.avatarUrl, null));


test('profile accepts a bounded image data URI', () => {
  const png = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).toString('base64');
  const r = validateProfile({ avatarUrl: `data:image/png;base64,${png}` });
  assert.equal(r.error, undefined);
});

test('profile rejects an oversized image data URI', () => {
  const payload = 'A'.repeat(1100001);
  assert.match(validateProfile({ avatarUrl: `data:image/png;base64,${payload}` }).error, /too large/i);
});

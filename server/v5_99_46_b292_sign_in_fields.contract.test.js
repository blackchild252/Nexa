const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = (rel) => fs.readFileSync(path.join(__dirname, '..', 'src', rel), 'utf8');

test('B292 PasswordInput has the eye toggle and the right autofill hints', () => {
  const s = src('PasswordInput.tsx');
  assert.match(s, /secureTextEntry=\{!shown\}/);
  assert.match(s, /'Hide password' : 'Show password'/);
  assert.match(s, /isNew \? 'new-password' : 'current-password'/);
  assert.match(s, /isNew \? 'newPassword' : 'password'/);
  assert.match(s, /importantForAutofill="yes"/);
});

test('B292 every password field in the app uses PasswordInput', () => {
  for (const f of ['app/auth/login.tsx', 'app/auth/signup.tsx', 'app/(tabs)/profile.tsx']) {
    const s = src(f);
    assert.match(s, /<PasswordInput /, `${f} uses PasswordInput`);
    assert.ok(!/<TextInput[^>]*secureTextEntry/.test(s), `${f} has no bare secure TextInput`);
  }
  assert.match(src('app/auth/signup.tsx'), /<PasswordInput isNew /);
});

test('B292 email and username fields carry autofill hints', () => {
  for (const f of ['app/auth/login.tsx', 'app/auth/signup.tsx']) {
    const s = src(f);
    assert.match(s, /autoComplete="email" textContentType="emailAddress" importantForAutofill="yes"/);
  }
  assert.match(src('app/auth/signup.tsx'), /autoComplete="username-new" textContentType="username"/);
});

test('B292 restoring and offline screens are dark, not the white window colour', () => {
  const s = src('auth.tsx');
  assert.match(s, /Restoring your NEXA session/);
  assert.equal((s.match(/backgroundColor:theme\.colors\.background\}\]\}>/g) || []).length, 2);
});

test('B292 saved login survives restart: token is kept in SecureStore and only cleared when it has expired', () => {
  const s = src('auth.tsx');
  assert.match(s, /SecureStore\.getItemAsync\(TOKEN_KEY\)/);
  assert.match(s, /SecureStore\.setItemAsync\(TOKEN_KEY,token\)/);
  assert.match(s, /AUTH_EXPIRED/);
  assert.match(s, /setStatus\('offline'\)/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('B366: shared focus primitive is keyboard-focusable and preserves the 44px floor', () => {
  const motion = read('src/motion.tsx');
  assert.match(motion, /export function NexaFocusPressable/);
  assert.match(motion, /focusable=\{!disabled\}/);
  assert.match(motion, /touchTargetStyle\(/);
  assert.match(motion, /outlineWidth:2/);
});

test('B366: authentication controls use the shared focus primitive', () => {
  const login = read('src/app/auth/login.tsx');
  const signup = read('src/app/auth/signup.tsx');
  const auth = read('src/auth.tsx');
  assert.doesNotMatch(login, /<TouchableOpacity\b/);
  assert.doesNotMatch(signup, /<TouchableOpacity\b/);
  assert.doesNotMatch(auth, /<TouchableOpacity\b/);
  assert.match(login, /<NexaFocusPressable\b/);
  assert.match(signup, /<NexaFocusPressable\b/);
  assert.match(auth, /<NexaFocusPressable\b/);
});

test('B366: password visibility control has a 44px focusable hit surface', () => {
  const password = read('src/PasswordInput.tsx');
  assert.doesNotMatch(password, /<TouchableOpacity\b/);
  assert.match(password, /<NexaFocusPressable\b/);
  assert.match(password, /width:\s*44/);
  assert.match(password, /height:\s*44/);
});

test('B366: Admin web keeps a visible keyboard focus indicator and 44px form/control floor', () => {
  const css = read('admin-web/style.css');
  assert.match(css, /:focus-visible\{outline:3px solid var\(--gold\);outline-offset:2px\}/);
  assert.match(css, /input,select,textarea\{[^}]*min-height:44px/s);
  assert.match(css, /button\{[^}]*min-height:44px/s);
  assert.match(css, /nav\.tabs a\{[^}]*min-height:44px/s);
});

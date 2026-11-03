const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('B262-ERR0 no handler answers a 5xx with the raw error text', () => {
  const src = read('server/index.js');
  assert.match(src, /const clientErrorMessage = \(e, status, fallback\) =>/);
  // any status(...500...) response that still sends e.message straight through is a leak
  const leaks = src.split('\n').filter(l =>
    /(\|\| 500|\? *\d+ *: *500)\)\s*\.json\(\{ ?error: ?e(rr)?\.message/.test(l));
  assert.deepStrictEqual(leaks, []);
});

test('B262-ERR1 clientErrorMessage hides 5xx text and keeps 4xx text', () => {
  const src = read('server/index.js');
  const line = src.split('\n').find(l => l.startsWith('const clientErrorMessage'));
  const fn = new Function(line.replace(/^const clientErrorMessage = /, 'return ').replace(/;\s*$/, ''))();
  assert.strictEqual(fn(new Error('SQLITE_CONSTRAINT: users.email'), 500, 'Signup failed.'), 'Signup failed.');
  assert.strictEqual(fn(new Error('Email is already registered.'), 409, 'Signup failed.'), 'Email is already registered.');
  assert.strictEqual(fn(null, 400, 'Fallback.'), 'Fallback.');
});

test('B262-ERR2 signup, login, rotation, export, import and fee-settle handlers use the helper', () => {
  const src = read('server/index.js');
  for (const msg of ['Signup failed.', 'Login failed.', 'Session rotation failed.', 'Could not export account data.', 'Could not import account data.', 'Google sign-in is unavailable.', 'Could not settle the Kitchen service fee.', 'Could not settle the Yaayz service fee.']) {
    assert.ok(src.includes(`clientErrorMessage(e`) && new RegExp(`clientErrorMessage\\(e[^)]*['"]${msg.replace(/[.]/g, '\\.')}['"]`).test(src), `helper missing for: ${msg}`);
  }
});

test('B262-NAV0 vendor payment and Google sign-in links go through the safe external-link policy', () => {
  const vendor = read('src/VendorDashboard.tsx');
  const auth = read('src/auth.tsx');
  assert.doesNotMatch(vendor, /Linking\.openURL/);
  assert.doesNotMatch(auth, /Linking\.openURL/);
  assert.match(vendor, /openPaymentUrl\(String\(url\)\)/);
  assert.match(auth, /openGoogleUrl\(String\(data\.url\)\)/);
});

test('B262-NAV1 no screen opens an external link directly (B116 boundary)', () => {
  // Deliberate exemption: the Fitness screen falls back to opening its own bundled PDF (a local file URI, not a web link).
  const LOCAL_FILE_ONLY = new Set([path.join('app', 'leisure', 'fitness', 'index.tsx')]);
  const dir = path.join(__dirname, '..', 'src');
  const offenders = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f.name) && f.name !== 'safeExternalNavigation.ts' && !LOCAL_FILE_ONLY.has(path.relative(dir, p)) && /Linking\.openURL\(/.test(fs.readFileSync(p, 'utf8'))) offenders.push(path.relative(dir, p));
    }
  })(dir);
  assert.deepStrictEqual(offenders, []);
});

// V5.54.3 Devil's Walk fixes: Node 22 in CI/Docker, webhook retry safety, AI spend ceilings, client timeout, web Alert shim.
// Server-route checks here are source-level (the route needs express/better-sqlite3 to run); the limiter and the
// alert shim are exercised for real.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('CI and Docker use Node 22 (node:sqlite tests need 22.5+)', () => {
  assert.match(read('.github/workflows/nexa-quality.yml'), /node-version:\s*22\.x/);
  const docker = read('Dockerfile');
  const froms = docker.match(/^FROM\s+\S+/gm);
  assert.equal(froms.length, 2);
  for (const f of froms) assert.match(f, /node:22-/);
});

test('webhook: duplicate events are only acknowledged when the earlier attempt reached a final outcome', () => {
  const s = read('server/index.js');
  assert.match(s, /const WEBHOOK_RETRYABLE_OUTCOMES = new Set\(\["received", "vendor_activation_failed"\]\)/);
  assert.match(s, /SELECT outcome FROM mall_payment_events WHERE eventKey = \?/);
  assert.match(s, /if \(!WEBHOOK_RETRYABLE_OUTCOMES\.has\(String\(prior\?\.outcome \|\| ""\)\)\) return res\.sendStatus\(200\);/);
  // the bare "duplicate -> 200" shortcut must be gone
  assert.doesNotMatch(s, /if \(!inserted\.changes\) return res\.sendStatus\(200\);/);
  // signature check still comes first
  const h = s.slice(s.indexOf('app.post("/api/payments/paystack/webhook"'));
  assert.ok(h.indexOf('verifyWebhookSignature') < h.indexOf('INSERT OR IGNORE INTO mall_payment_events'));
});

test('AI spend limits remain on configured AI routes and realtime voice is disabled locally', () => {
  const s = read('server/index.js');
  assert.match(s, /windowMs: 24 \* 60 \* 60 \* 1000, max: 300,/);
  assert.match(s, /app\.post\("\/api\/realtime\/client-secret", auth\.authMiddleware, \(_req, res\) =>/);
  assert.match(s, /Realtime voice is disabled in local-only mode/);
  assert.equal((s.match(/const aiLimiter =/g) || []).length, 1);
  for (const route of ['/api/dami', '/api/speak', '/api/compare', '/api/price-check', '/api/transcribe', '/api/scamcheck-image', '/api/ai/actions/confirm'])
    assert.ok(s.includes(`app.post("${route}", auth.authMiddleware, aiLimiter`), route);
});

test('the daily limiter blocks the (max+1)th call and keeps users separate', () => {
  const { createRateLimiter } = require('./rateLimiter');
  const daily = createRateLimiter({ windowMs: 86_400_000, max: 3, keyFn: (r) => 'ai-day:' + r.user.id, message: 'daily' });
  const call = (id) => { let status = 200; daily({ user: { id }, ip: '1.1.1.1' }, { set() {}, status(c) { status = c; return { json() {} }; } }, () => {}); return status; };
  assert.deepEqual([call('a'), call('a'), call('a'), call('a')], [200, 200, 200, 429]);
  assert.equal(call('b'), 200);
  daily.reset?.();
});

test('client requests time out instead of hanging', () => {
  const s = read('src/api.ts');
  assert.match(s, /REQUEST_TIMEOUT_MS = 30_000/);
  assert.match(s, /UPLOAD_TIMEOUT_MS = 90_000/);
  assert.match(s, /error\.code = 'REQUEST_TIMEOUT'/);
  // no bare fetch left except the one inside the helper
  assert.equal((s.match(/\bfetch\(/g) || []).length, 1);
  assert.ok((s.match(/fetchWithTimeout\(/g) || []).length >= 2);
});

function loadShim(platform) {
  const original = Module._load;
  const alertObj = { alert: () => 'native' };
  Module._load = function (request, ...rest) {
    if (request === 'react-native') return { Alert: alertObj, Platform: { OS: platform } };
    return original.call(this, request, ...rest);
  };
  try {
    const file = path.join(root, 'src/webAlertShim.ts');
    // Node 22's built-in type stripper (no TypeScript install needed), then a CommonJS wrapper.
    const js = Module.stripTypeScriptTypes(fs.readFileSync(file, 'utf8'), { mode: 'strip' })
      .replace(/^import \{ Alert, Platform \} from 'react-native';/m, "const { Alert, Platform } = require('react-native');")
      .replace(/export function/g, 'function')
      + '\nmodule.exports = { webAlert, installWebAlertShim };';
    const m = new Module(file); m.filename = file; m.paths = Module._nodeModulePaths(path.dirname(file));
    m._compile(js, file);
    return { ...m.exports, alertObj };
  } finally { Module._load = original; }
}

test('web Alert shim: single button alerts then runs onPress; two buttons confirm/cancel route correctly', () => {
  const { webAlert } = loadShim('web');
  const seen = [];
  const env = { alert: (m) => seen.push('alert:' + m), confirm: (m) => { seen.push('confirm:' + m); return env.answer; } };
  let pressed = 0;
  webAlert('Saved', 'Done', [{ text: 'OK', onPress: () => { pressed += 1; } }], env);
  assert.deepEqual(seen, ['alert:Saved\n\nDone']);
  assert.equal(pressed, 1);
  webAlert('Oops', undefined, undefined, env);
  assert.equal(seen.at(-1), 'alert:Oops');

  const log = [];
  const buttons = [{ text: 'Cancel', style: 'cancel', onPress: () => log.push('cancel') }, { text: 'Delete', style: 'destructive', onPress: () => log.push('delete') }];
  env.answer = true; webAlert('Delete?', 'Sure?', buttons, env);
  env.answer = false; webAlert('Delete?', 'Sure?', buttons, env);
  assert.deepEqual(log, ['delete', 'cancel']);
  // a throwing dialog must not break the screen
  assert.doesNotThrow(() => webAlert('x', 'y', buttons, { confirm: () => { throw new Error('blocked'); } }));
});

test('web Alert shim installs only on web, and is wired into the root layout', () => {
  const web = loadShim('web');
  assert.notEqual(web.alertObj.alert(), 'native');
  const native = loadShim('ios');
  assert.equal(native.alertObj.alert(), 'native');
  assert.equal(native.installWebAlertShim('android'), false);
  assert.match(read('src/app/_layout.tsx'), /import '\.\.\/webAlertShim';/);
});

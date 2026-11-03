// V5.54.4 open-case hardening: configurable trust proxy, minimal /health, audio-only uploads, lock-out-resistant login limits.
// index.js cannot be loaded without express/better-sqlite3, so route wiring is checked at source level;
// the pure pieces (limiter behaviour, error mapping, upload predicate) are executed.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const idx = read('server/index.js');

test('trust proxy is configurable via TRUST_PROXY and defaults to the previous value 1', () => {
  const m = /app\.set\("trust proxy", \(\(\) => \{[\s\S]*?\}\)\(\)\);/.exec(idx);
  assert.ok(m, 'trust proxy IIFE present');
  const run = (v) => { const env = v === undefined ? {} : { TRUST_PROXY: v }; return vm.runInNewContext(m[0].replace('app.set("trust proxy", ', '(').replace(/process\.env/g, 'env').replace(/\);$/, ')'), { env, String, Number }); };
  assert.equal(run(undefined), 1);
  assert.equal(run(''), 1);
  assert.equal(run('2'), 2);
  assert.equal(run('0'), false);
  assert.equal(run('false'), false);
  assert.deepEqual(Array.from(run('10.0.0.0/8, 172.16.0.0/12')), ['10.0.0.0/8', '172.16.0.0/12']);
  assert.match(read('server/.env.example'), /TRUST_PROXY/);
});

test('/health no longer discloses model, provider-key state or specialists', () => {
  const h = idx.slice(idx.indexOf('app.get("/health", (req, res)'), idx.indexOf('// Matches the original inline thresholds'));
  assert.match(h, /ok: true, version:/);
  assert.doesNotMatch(h, /MODEL|apiKeyConfigured|OPENAI_API_KEY|specialists/);
});

test('login: tight limit is per email+IP, a loose email-only flood cap remains, both wired', () => {
  assert.match(idx, /keyFn: \(req\) => "login:" \+ loginEmailKey\(req\) \+ "\|" \+ req\.ip/);
  assert.match(idx, /keyFn: \(req\) => "login-flood:" \+ loginEmailKey\(req\)/);
  assert.match(idx, /app\.post\("\/api\/auth\/login", authLimiter, loginEmailLimiter, loginAccountFloodLimiter, async/);
  const { createRateLimiter } = require('./rateLimiter');
  const key = (email, ip) => 'login:' + email + '|' + ip;
  const tight = createRateLimiter({ windowMs: 900000, max: 10, keyFn: (r) => key(r.body.email, r.ip) });
  const hit = (ip) => { let st = 200; tight({ body: { email: 'v@x.com' }, ip }, { set() {}, status(c) { st = c; return { json() {} }; } }, () => {}); return st; };
  for (let i = 0; i < 10; i++) assert.equal(hit('6.6.6.6'), 200);
  assert.equal(hit('6.6.6.6'), 429);      // attacker is blocked...
  assert.equal(hit('9.9.9.9'), 200);      // ...the victim on another IP is not
  tight.reset();
});

test('signup: account-scoped limits supplement the shared per-IP cap', () => {
  assert.match(idx, /keyFn: \(req\) => "signup:" \+ signupEmailKey\(req\) \+ "\|" \+ req\.ip/);
  assert.match(idx, /keyFn: \(req\) => "signup-flood:" \+ signupEmailKey\(req\)/);
  assert.match(idx, /app\.post\("\/api\/auth\/signup", authLimiter, signupEmailLimiter, signupAccountFloodLimiter, async/);
});

test('uploads: audio only, sanitized extension, single file, 415 on rejection', () => {
  const src = /const AUDIO_EXTENSIONS[\s\S]*?\n(?=const audioUploadManager)/.exec(idx)[0];
  const sandbox = { path, exports: {} };
  vm.runInNewContext(src + '\nexports.ok = isAllowedAudioUpload; exports.ext = safeAudioExtension;', sandbox);
  const { ok, ext } = sandbox.exports;
  assert.equal(ok({ mimetype: 'audio/m4a', originalname: 'a.m4a' }), true);
  assert.equal(ok({ mimetype: 'application/octet-stream', originalname: 'voice.m4a' }), true);
  assert.equal(ok({ mimetype: 'video/mp4', originalname: 'rec.mp4' }), true);
  assert.equal(ok({ mimetype: 'application/octet-stream', originalname: 'evil.exe' }), false);
  assert.equal(ok({ mimetype: 'text/html', originalname: 'x.html' }), false);
  assert.equal(ok({ mimetype: 'image/png', originalname: 'x.m4a' }), false);
  assert.equal(ext('../../etc/passwd'), '.m4a');
  assert.equal(ext('note.WAV'), '.wav');
  assert.equal(ext('x.php'), '.m4a');
  assert.match(idx, /fileFilter: \(req, file, cb\) => \{/);
  assert.match(idx, /files: 1/);
  const { errorPayload } = require('./httpErrors');
  assert.equal(errorPayload({ status: 415, message: 'Only audio files can be uploaded here.' }, 'r').status, 415);
  // temp-file cleanup (checked, not changed): the transcribe route deletes the upload in a finally block
  const t = idx.slice(idx.indexOf('app.post("/api/transcribe"'));
  assert.match(t, /finally \{[\s\S]*audioUploadManager\.remove\(filePath\)/);
});

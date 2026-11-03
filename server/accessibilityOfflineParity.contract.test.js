'use strict';
// Mobile accessibility, offline UX and platform parity.
// Real code is run where possible: nexaNetworkPolicy.js is loaded as is, and the real
// fetchWithTimeout/resilientFetch text is cut out of src/api.ts, types stripped, and run
// against a fake fetch. No device, browser, express or network is used.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');

const root = path.join(__dirname, '..');
const policy = require('../src/nexaNetworkPolicy.js');
const apiSource = fs.readFileSync(path.join(root, 'src', 'api.ts'), 'utf8');

function loadResilientFetch(fakeFetch) {
  const start = apiSource.indexOf('async function fetchWithTimeout');
  const end = apiSource.indexOf('async function readResponseData');
  assert.ok(start > 0 && end > start, 'resilientFetch block must be found in src/api.ts');
  const js = stripTypeScriptTypes(apiSource.slice(start, end), { mode: 'strip' });
  const names = ['normalizeMethod', 'retryPolicy', 'isRetryableStatus', 'isRetryableError', 'isNetworkFailureMessage',
    'backoffMs', 'parseRetryAfter', 'requestId', 'requestBodyAllowed', 'contentTypeAllowed', 'canRetryMutation',
    'idempotencyKey'];
  const factory = new Function('fetch', 'REQUEST_TIMEOUT_MS', 'process', ...names, `${js}\nreturn resilientFetch;`);
  return factory(fakeFetch, 30000, { env: {} }, ...names.map(n => policy[n]));
}

const BROWSER_MESSAGES = [
  'Network request failed',                          // React Native
  'Failed to fetch',                                 // Chrome, Edge
  'NetworkError when attempting to fetch resource.', // Firefox
  'Load failed',                                     // Safari (iOS and macOS)
  'The Internet connection appears to be offline.',  // Safari / iOS
  'The network connection was lost.',                // Safari / iOS
];

test('every platform wording of a dropped connection is classified as offline and is retryable', () => {
  for (const m of BROWSER_MESSAGES) {
    const e = new TypeError(m);
    assert.equal(policy.classifyNetworkError(e), 'offline_or_network', m);
    assert.equal(policy.isRetryableError(e), true, m);
    assert.equal(policy.isNetworkFailureMessage(e), true, m);
  }
});

test('ordinary programming errors are not mistaken for being offline', () => {
  for (const e of [new TypeError('Cannot read properties of undefined'), new TypeError('Bad argument'), new Error('offline'),
    new RangeError('network'), null, undefined, {}]) {
    assert.equal(policy.isNetworkFailureMessage(e), false);
    assert.equal(policy.isRetryableError(e), false);
  }
});

test('an aborted request is still not retried and not called offline', () => {
  const abort = new DOMException('aborted', 'AbortError');
  assert.equal(policy.isRetryableError(abort), false);
  assert.equal(policy.classifyNetworkError(abort), 'aborted');
});

test('GET: a dropped connection is tried 3 times, then a plain offline error is thrown', async () => {
  let calls = 0;
  const rf = loadResilientFetch(async () => { calls += 1; throw new TypeError('Load failed'); });
  await assert.rejects(rf('https://x.test/api/me'), e => {
    assert.equal(e.code, 'NETWORK_ERROR');
    assert.equal(e.status, 0);
    assert.equal(e.networkClass, 'offline_or_network');
    assert.match(e.message, /offline/i);
    assert.doesNotMatch(e.message, /Load failed/);
    return true;
  });
  assert.equal(calls, 3);
});

test('POST without an idempotency key is tried once only, and still gets the plain offline error', async () => {
  let calls = 0;
  const rf = loadResilientFetch(async () => { calls += 1; throw new TypeError('Network request failed'); });
  await assert.rejects(rf('https://x.test/api/pay', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } }),
    e => e.code === 'NETWORK_ERROR' && /offline/i.test(e.message));
  assert.equal(calls, 1);
});

test('a connection that drops once and comes back succeeds on the retry', async () => {
  let calls = 0;
  const ok = { ok: true, status: 200, headers: { get: () => null } };
  const rf = loadResilientFetch(async () => { calls += 1; if (calls === 1) throw new TypeError('Load failed'); return ok; });
  const res = await rf('https://x.test/api/me');
  assert.equal(res, ok);
  assert.equal(calls, 2);
});

test('an unrelated error passes through unchanged (not rewritten as offline)', async () => {
  const boom = new TypeError('Cannot read properties of undefined');
  const rf = loadResilientFetch(async () => { throw boom; });
  await assert.rejects(rf('https://x.test/api/me'), e => e === boom);
});

test('an outer abort passes through as an abort, not as offline', async () => {
  const abort = new DOMException('aborted', 'AbortError');
  const rf = loadResilientFetch(async () => { throw abort; });
  await assert.rejects(rf('https://x.test/api/me'), e => e.name === 'AbortError');
});

test('request body limit and bad content type still fail before any network call', async () => {
  let calls = 0;
  const rf = loadResilientFetch(async () => { calls += 1; return { ok: true, status: 200, headers: { get: () => null } }; });
  await assert.rejects(rf('https://x.test/api/x', { method: 'POST', body: 'x'.repeat(1024 * 1024 + 1) }), e => e.code === 'REQUEST_BODY_TOO_LARGE');
  await assert.rejects(rf('https://x.test/api/x', { method: 'POST', body: '{}', headers: { 'Content-Type': 'text/html' } }), e => e.code === 'UNSUPPORTED_CONTENT_TYPE');
  assert.equal(calls, 0);
});

test('type declarations and api.ts import the new helper', () => {
  assert.match(fs.readFileSync(path.join(root, 'src', 'nexaNetworkPolicy.d.ts'), 'utf8'), /isNetworkFailureMessage/);
  assert.match(apiSource, /import \{[^}]*isNetworkFailureMessage[^}]*\} from '\.\/nexaNetworkPolicy'/);
});

// ---- Configuration, response limits, retry safety and cleanup (real api.ts text, run with fakes) ----
function loadConfig(env, dev) {
  const end = apiSource.indexOf("import { normalizeMethod");
  const js = stripTypeScriptTypes(apiSource.slice(0, end), { mode: 'strip' });
  return new Function('process', '__DEV__', `${js}\nreturn API_BASE;`)({ env }, dev);
}

test('missing API address: development falls back to loopback, production refuses to start', () => {
  assert.equal(loadConfig({}, true), 'http://localhost:3000');
  assert.throws(() => loadConfig({}, false), /must be configured for production/);
});

test('bad API addresses are refused: not a URL, outside loopback, with credentials, or http in production', () => {
  assert.throws(() => loadConfig({ EXPO_PUBLIC_API_URL: 'not a url' }, true), /absolute HTTP\(S\) URL/);
  assert.throws(() => loadConfig({ EXPO_PUBLIC_API_URL: 'https://api.example.com' }, true), /loopback/);
  assert.throws(() => loadConfig({ EXPO_PUBLIC_API_URL: 'http://user:pw@localhost:3000' }, true), /embedded credentials/);
  assert.throws(() => loadConfig({ EXPO_PUBLIC_API_URL: 'http://localhost:3000' }, false), /HTTPS in production/);
  assert.equal(loadConfig({ EXPO_PUBLIC_API_URL: 'http://10.0.2.2:3000/' }, true), 'http://10.0.2.2:3000');
});

function loadResponseHelpers() {
  const start = apiSource.indexOf('async function readResponseData');
  const end = apiSource.indexOf('const PlatformLabel');
  const js = stripTypeScriptTypes(apiSource.slice(start, end), { mode: 'strip' });
  const names = ['responseSizeAllowed', 'parseJsonText', 'normalizeClientError', 'classifyNetworkError'];
  return new Function(...names, `${js}\nreturn { readResponseData, throwClientError };`)(...names.map(n => policy[n]));
}
const fakeRes = (text, status = 200, headers = {}) => ({ ok: status < 400, status, text: async () => text,
  headers: { get: k => headers[String(k).toLowerCase()] ?? null } });

test('responses: oversize by header or by body is refused; bad JSON is returned as text; good JSON is parsed', async () => {
  const { readResponseData } = loadResponseHelpers();
  await assert.rejects(readResponseData(fakeRes('{}', 200, { 'content-length': String(1024 * 1024 + 1) })), e => e.code === 'RESPONSE_TOO_LARGE' && e.status === 502);
  await assert.rejects(readResponseData(fakeRes('x'.repeat(1024 * 1024 + 1))), e => e.code === 'RESPONSE_TOO_LARGE');
  assert.equal(await readResponseData(fakeRes('not json')), 'not json');
  assert.deepEqual(await readResponseData(fakeRes('{"ok":true}')), { ok: true });
});

test('HTTP errors: 401 becomes AUTH_EXPIRED, suspended account keeps its code, long messages are cut', () => {
  const { throwClientError } = loadResponseHelpers();
  assert.equal(throwClientError(fakeRes('', 401), { error: 'no' }).code, 'AUTH_EXPIRED');
  assert.equal(throwClientError(fakeRes('', 403), { code: 'ACCOUNT_SUSPENDED', error: 'gone' }).code, 'ACCOUNT_SUSPENDED');
  assert.equal(throwClientError(fakeRes('', 503), {}).code, 'HTTP_503');
  assert.equal(throwClientError(fakeRes('', 400), { error: 'bad' }).message, 'bad');
});

test('401 and 400 answers are returned at once, never retried; 503 on GET is retried then succeeds', async () => {
  for (const status of [401, 400, 404]) {
    let calls = 0;
    const rf = loadResilientFetch(async () => { calls += 1; return { ok: false, status, headers: { get: () => null } }; });
    assert.equal((await rf('https://x.test/api/a')).status, status);
    assert.equal(calls, 1, `status ${status}`);
  }
  let calls = 0;
  const rf = loadResilientFetch(async () => { calls += 1; return calls < 3 ? { ok: false, status: 503, headers: { get: () => '0' } } : { ok: true, status: 200, headers: { get: () => null } }; });
  assert.equal((await rf('https://x.test/api/a')).status, 200);
  assert.equal(calls, 3);
});

test('a mutation is retried only when the caller brings its own idempotency key and asks for it', async () => {
  // As the checkout call in src/marketplace.ts does: its own key plus the retry header.
  const seen = [];
  const rf = loadResilientFetch(async (_u, init) => { seen.push(init.headers['Idempotency-Key'] || ''); throw new TypeError('Failed to fetch'); });
  await assert.rejects(rf('https://x.test/api/mall/checkout', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'checkout-key-123456', 'X-Nexa-Retry-Mutation': '1' } }), e => e.code === 'NETWORK_ERROR');
  assert.deepEqual(seen, ['checkout-key-123456', 'checkout-key-123456', 'checkout-key-123456']);
});

test('a mutation that asks for retry but has no key of its own is NOT retried (no key is invented from the URL)', async () => {
  let calls = 0; const keys = [];
  const rf = loadResilientFetch(async (_u, init) => { calls += 1; keys.push(init.headers['Idempotency-Key']); throw new TypeError('Failed to fetch'); });
  await assert.rejects(rf('https://x.test/api/mall/checkout', { method: 'POST', body: '{"a":1}', headers: { 'Content-Type': 'application/json', 'X-Nexa-Retry-Mutation': '1' } }), e => e.code === 'NETWORK_ERROR');
  assert.equal(calls, 1);
  assert.deepEqual(keys, [undefined]);
});

test('cleanup: the caller abort listener is removed after success and after failure', async () => {
  for (const mode of ['ok', 'fail']) {
    let added = 0; let removed = 0;
    const signal = { aborted: false, addEventListener: () => { added += 1; }, removeEventListener: () => { removed += 1; } };
    const rf = loadResilientFetch(async () => { if (mode === 'fail') throw new TypeError('Load failed'); return { ok: true, status: 200, headers: { get: () => null } }; });
    if (mode === 'ok') await rf('https://x.test/api/a', { signal });
    else await assert.rejects(rf('https://x.test/api/a', { signal }));
    assert.ok(added >= 1 && added === removed, `${mode}: added ${added}, removed ${removed}`);
  }
});

test('an already-aborted caller signal stops the request before the network is used for a second try', async () => {
  const abort = new DOMException('aborted', 'AbortError');
  let calls = 0;
  const rf = loadResilientFetch(async () => { calls += 1; throw abort; });
  await assert.rejects(rf('https://x.test/api/a', { signal: { aborted: true, addEventListener() {}, removeEventListener() {} } }), e => e.name === 'AbortError');
  assert.equal(calls, 1);
});

// ---- Accessibility guard: no interactive control may ship without a name source ----
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name))
    : /\.(tsx|jsx)$/.test(e.name) ? [path.join(dir, e.name)] : []);
}
function openingTags(source, names) {
  const found = [];
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== '<') continue;
    const m = /^<([A-Za-z]+)/.exec(source.slice(i, i + 40));
    if (!m || !names.has(m[1])) continue;
    let j = i + m[0].length, depth = 0, quote = null;
    for (; j < source.length; j++) {
      const c = source[j];
      if (quote) { if (c === quote && source[j - 1] !== '\\') quote = null; continue; }
      if (depth === 0 && (c === '"' || c === "'")) { quote = c; continue; }
      if (c === '{') depth++; else if (c === '}') depth--; else if (c === '>' && depth === 0) break;
    }
    found.push({ name: m[1], text: source.slice(i, j + 1), line: source.slice(0, i).split('\n').length });
  }
  return found;
}

test('every pressable control has a label, a role, or a shared accessibility helper', () => {
  const names = new Set(['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'NexaPressable', 'NexaFocusPressable']);
  const bad = [];
  for (const file of walk(path.join(root, 'src'))) {
    for (const t of openingTags(fs.readFileSync(file, 'utf8'), names)) {
      if (!/accessibilityLabel|aria-label|accessibilityRole|\{\.\.\.[A-Za-z]|accessible=\{false\}/.test(t.text)) bad.push(`${path.relative(root, file)}:${t.line}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('every text field has a label or a shared field helper, and every image has a label or is hidden', () => {
  const bad = [];
  for (const file of walk(path.join(root, 'src'))) {
    for (const t of openingTags(fs.readFileSync(file, 'utf8'), new Set(['TextInput', 'Image']))) {
      if (t.text === '<TextInput>') continue; // a type argument such as useRef<TextInput>, not a field
      if (!/accessibilityLabel|aria-label|alt=|\{\.\.\.[A-Za-z]|accessible=\{false\}|importantForAccessibility/.test(t.text)) bad.push(`${path.relative(root, file)}:${t.line}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('no text opts out of system text scaling', () => {
  const bad = [];
  for (const file of walk(path.join(root, 'src'))) {
    if (/allowFontScaling=\{false\}|allowFontScaling:\s*false/.test(fs.readFileSync(file, 'utf8'))) bad.push(path.relative(root, file));
  }
  assert.deepEqual(bad, []);
});

test('offline screen keeps a labelled retry control and does not drop the saved session', () => {
  const auth = fs.readFileSync(path.join(root, 'src', 'auth.tsx'), 'utf8');
  assert.match(auth, /NEXA is offline/);
  assert.match(auth, /accessibilityLabel="Retry NEXA connection"/);
  assert.match(auth, /Preserve a valid stored credential during transient API\/network failure/);
});

test('web and native storage paths are separate for the session token', () => {
  const auth = fs.readFileSync(path.join(root, 'src', 'auth.tsx'), 'utf8');
  for (const fn of ['readWebToken', 'writeWebToken', 'deleteWebToken']) assert.match(auth, new RegExp(fn));
  assert.ok((auth.match(/Platform\.OS==='web'/g) || []).length >= 5);
});

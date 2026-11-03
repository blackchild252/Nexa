'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const reporting = require('./centralReporting');
const customer = { id: 'u-1', accountType: 'customer' };
const business = { id: 'u-2', accountType: 'vendor' };
const staff = { id: 'u-3', role: 'moderator' };
const valid = { category: 'order', summary: 'Order problem', description: 'The order status is incorrect.', sourceType: 'order', sourceId: 'ord-123' };

test('M7191 role/category policy is explicit and unknown roles receive no categories', () => {
  assert.ok(reporting.allowedCategories(customer).includes('order'));
  assert.ok(reporting.allowedCategories(business).includes('product'));
  assert.ok(reporting.allowedCategories(staff).includes('privacy'));
  assert.deepEqual(reporting.allowedCategories({ role: 'mystery' }), []);
});
test('M7193 valid report payload retains only approved source references', () => {
  assert.deepEqual(reporting.validateSubmission(valid, customer), { ok: true, value: valid });
});
test('M7194 rejects malformed, unknown, oversized and restricted payload fields', () => {
  assert.equal(reporting.validateSubmission(null, customer).ok, false);
  assert.ok(reporting.validateSubmission({ ...valid, category: 'unknown' }, customer).errors.includes('invalid_category_for_account'));
  assert.ok(reporting.validateSubmission({ ...valid, summary: 'x'.repeat(161) }, customer).errors.includes('invalid_summary'));
  assert.ok(reporting.validateSubmission({ ...valid, description: 'x'.repeat(4001) }, customer).errors.includes('invalid_description'));
  assert.ok(reporting.validateSubmission({ ...valid, sourceId: '../secret' }, customer).errors.includes('invalid_source_id'));
  assert.ok(reporting.validateSubmission({ ...valid, sourceType: 'order', sourceId: '' }, customer).errors.includes('source_id_required'));
  assert.ok(reporting.validateSubmission({ ...valid, attachments: ['private'] }, customer).errors.includes('attachments_not_supported'));
  assert.ok(reporting.validateSubmission({ ...valid, centralReviewerNotes: 'internal' }, customer).errors.includes('restricted_fields_not_allowed'));
});
test('M7196 idempotency key is stable per owner and opaque', () => {
  const a = reporting.idempotencyKey('u-1', 'request-1');
  assert.equal(a, reporting.idempotencyKey('u-1', 'request-1'));
  assert.notEqual(a, reporting.idempotencyKey('u-2', 'request-1'));
  assert.match(a, /^[a-f0-9]{64}$/);
});
test('M7197 durable idempotency schema stores only opaque hashes and owner metadata', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(process.cwd(), 'server/centralReporting.js'), 'utf8');
  assert.match(source, /CREATE TABLE IF NOT EXISTS central_report_idempotency/);
  assert.match(source, /requestId TEXT PRIMARY KEY/);
  assert.match(source, /ownerId TEXT NOT NULL/);
  const ddl = source.slice(source.indexOf('function ensureIdempotencySchema'), source.indexOf('// Store only the opaque request hash'));
  assert.doesNotMatch(ddl, /description TEXT|summary TEXT|attachment/i);
  assert.match(source, /function reserveIdempotencyKey/);
});
test('M7197 durable reservation reports a duplicate without storing report content', () => {
  const rows = new Map();
  const fakeDb = { prepare: (sql) => ({ run: (...args) => {
    if (/DELETE FROM central_report_idempotency/.test(sql)) { for (const [key, row] of rows) if (row.expiresAt <= args[0]) rows.delete(key); return { changes: 0 }; }
    assert.match(sql, /INSERT INTO central_report_idempotency/);
    const [requestId, ownerId] = args;
    if (rows.has(requestId)) { const e = new Error('UNIQUE constraint failed'); e.code = 'SQLITE_CONSTRAINT_PRIMARYKEY'; throw e; }
    rows.set(requestId, { ownerId, createdAt: args[2], expiresAt: args[3] });
    return { changes: 1 };
  } }) };
  const key = reporting.idempotencyKey('u-1', 'retry-1');
  assert.deepEqual(reporting.reserveIdempotencyKey(fakeDb, key, 'u-1', new Date('2026-10-11T00:00:00Z')), { ok: true, duplicate: false });
  assert.deepEqual(reporting.reserveIdempotencyKey(fakeDb, key, 'u-1', new Date('2026-10-11T00:01:00Z')), { ok: true, duplicate: true });
  assert.equal(rows.get(key).ownerId, 'u-1');
  assert.equal('description' in rows.get(key), false);
});
test('M7197 idempotency rejects missing, oversized and newline keys', () => {
  assert.equal(reporting.idempotencyKey('u-1', ''), null);
  assert.equal(reporting.idempotencyKey('u-1', 'x'.repeat(201)), null);
  assert.equal(reporting.idempotencyKey('u-1', 'x\ny'), null);
});
test('M7198 known Central states normalize to stable client states', () => {
  assert.equal(reporting.normalizeStatus('received'), 'acknowledged');
  assert.equal(reporting.normalizeStatus('reviewing'), 'in_review');
  assert.equal(reporting.normalizeStatus('pending_user'), 'waiting');
  assert.equal(reporting.normalizeStatus('resolved'), 'resolved');
  assert.equal(reporting.normalizeStatus('dismissed'), 'closed');
});
test('M7199 report projection denies any viewer who does not own the record', () => {
  assert.equal(reporting.projectCentralReport({ id: 'r1', ownerId: 'u-1' }, 'u-2'), null);
  assert.equal(reporting.projectCentralReport({ id: 'r1', reporterId: 'u-1' }, 'u-1').id, 'r1');
});
test('M7200 ordinary-user projection never exposes restricted reviewer fields', () => {
  const result = reporting.projectCentralReport({ id: 'r1', ownerId: 'u-1', centralReviewerNotes: 'secret', privateEvidence: 'secret', summary: 'safe' }, 'u-1');
  assert.equal(result.summary, 'safe');
  assert.equal('centralReviewerNotes' in result, false);
  assert.equal('privateEvidence' in result, false);
});
test('M7201 source reference is an identifier only, not copied source record data', () => {
  const result = reporting.validateSubmission(valid, customer);
  assert.deepEqual(Object.keys(result.value).sort(), ['category', 'description', 'sourceId', 'sourceType', 'summary'].sort());
  assert.equal('orderData' in result.value, false);
});
test('M7202 acknowledgement language never guarantees Central delivery or resolution', () => {
  const ack = reporting.acknowledgement('req-1');
  assert.match(ack.message, /not confirmation of Central delivery or resolution/i);
});
test('M7203 approved replies are bounded and unsafe private fields are omitted', () => {
  const result = reporting.projectCentralReport({ id: 'r1', ownerId: 'u-1', approvedReply: 'Thanks', internalReply: 'secret' }, 'u-1');
  assert.equal(result.approvedReply, 'Thanks');
  assert.equal('internalReply' in result, false);
  assert.equal(reporting.projectCentralReport({ id: 'r1', ownerId: 'u-1', approvedReply: 'x'.repeat(2500) }, 'u-1').approvedReply.length, 2000);
});
test('M7204 projection does not include notification body or private description', () => {
  const result = reporting.projectCentralReport({ id: 'r1', ownerId: 'u-1', description: 'private', notificationBody: 'private' }, 'u-1');
  assert.equal('description' in result, false);
  assert.equal('notificationBody' in result, false);
});
test('M7205 and M7206 report contract is separate from Zeeza social messages', () => {
  assert.equal(reporting.CATEGORY_BY_ROLE.customer.includes('zeeza'), true);
  const result = reporting.projectCentralReport({ id: 'r1', ownerId: 'u-1', status: 'open' }, 'u-1');
  assert.equal(result.status, 'in_review');
  assert.equal('messageId' in result, false);
});
test('M7208 unavailable response explicitly allows retry without claiming submission', () => {
  const result = reporting.unavailableResponse();
  assert.equal(result.retryable, true);
  assert.match(result.message, /No report was delivered/i);
});
test('M7209 projection is strict owner-only and fail closed for missing identities', () => {
  assert.equal(reporting.projectCentralReport({ id: 'r1', ownerId: 'u-1' }, ''), null);
  assert.equal(reporting.projectCentralReport({ id: 'r1' }, 'u-1'), null);
});
test('M7210 sensitive text is not returned by the safe projection', () => {
  const result = reporting.projectCentralReport({ id: 'r1', ownerId: 'u-1', description: 'private text', authToken: 'token' }, 'u-1');
  assert.equal(JSON.stringify(result).includes('private text'), false);
  assert.equal(JSON.stringify(result).includes('token'), false);
});
test('M7211 outage path is explicit and retryable', () => {
  assert.deepEqual(reporting.unavailableResponse(), {
    error: 'central_reporting_unavailable',
    message: 'AAMI Central reporting is not connected. No report was delivered; please retry later.',
    retryable: true,
  });
});
test('M7212 duplicate retries derive identical owner-scoped request IDs', () => {
  assert.equal(reporting.idempotencyKey('u-1', 'same-key'), reporting.idempotencyKey('u-1', 'same-key'));
  assert.notEqual(reporting.idempotencyKey('u-1', 'same-key'), reporting.idempotencyKey('u-2', 'same-key'));
});
test('M7213 report UI has retryable unavailable state and never treats 503 as delivery', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(process.cwd(), 'src/CentralReportScreen.tsx'), 'utf8');
  assert.match(source, /Delivery not confirmed/);
  assert.match(source, /Retry with same request key/);
  assert.match(source, /No report was delivered/);
  assert.match(source, /isConfirmedCentralDelivery\(response\)/);
  assert.match(fs.readFileSync(path.join(process.cwd(), 'src/centralReportingContract.ts'), 'utf8'), /response\.accepted === true && response\.delivered === true/);
});
test('M7213 UI-level status rendering is not asserted by backend contracts', () => {
  assert.equal(typeof reporting.normalizeStatus, 'function');
});
test('M7214 contract exports bounded schema limits for documentation', () => {
  assert.equal(reporting.MAX_SUMMARY, 160);
  assert.equal(reporting.MAX_DESCRIPTION, 4000);
});
test('M7215 local contract remains fail-closed without Central provider', () => {
  assert.match(reporting.unavailableResponse().message, /not connected/i);
});

test('M7192 accessible report entry exists and category/field constraints are bounded', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const screen = fs.readFileSync(path.join(process.cwd(), 'src/CentralReportScreen.tsx'), 'utf8');
  const route = fs.readFileSync(path.join(process.cwd(), 'src/app/central-reports.tsx'), 'utf8');
  const home = fs.readFileSync(path.join(process.cwd(), 'src/homeDesign.ts'), 'utf8');
  assert.match(screen, /accessibilityLabel="Report summary"/);
  assert.match(screen, /maxLength=\{160\}/);
  assert.match(screen, /maxLength=\{4000\}/);
  assert.match(route, /CentralReportScreen/);
  assert.match(home, /Report to AAMI Central/);
});
test('M7207 selecting Inbox Notifications opens the dedicated Notifications page', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(process.cwd(), 'src/ZeezaInbox.tsx'), 'utf8');
  assert.match(source, /router\.push\("\/\(tabs\)\?panel=notifications"/);
  assert.match(source, /verified Central notification feed is connected/);
});
test('M7195 API routes require Main authentication and never write Central records locally', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(process.cwd(), 'server/index.js'), 'utf8');
  assert.match(source, /app\.post\("\/api\/central-reports", auth\.authMiddleware/);
  assert.match(source, /app\.get\("\/api\/central-reports", auth\.authMiddleware/);
  assert.match(source, /Central remains the[\s\S]*record\/status authority/);
  assert.match(source, /centralReportClient\.submit/);
  assert.match(source, /centralReportClient\.status/);
});
test('M7208 and M7211 routes fail clearly instead of falsely claiming successful delivery', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(process.cwd(), 'server/index.js'), 'utf8');
  assert.match(source, /return res\.status\(503\)\.json\(centralReporting\.unavailableResponse\(\)\)/);
  assert.match(fs.readFileSync(path.join(process.cwd(), 'server/centralReporting.js'), 'utf8'), /No report was delivered/);
});
test('M7210 report route does not log user report payloads or raw idempotency keys', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(process.cwd(), 'server/index.js'), 'utf8');
  const start = source.indexOf('app.post("/api/central-reports"');
  const end = source.indexOf('\n});', start) + 4;
  const route = source.slice(start, end);
  assert.doesNotMatch(route, /console\.(log|info|warn|error)/);
  assert.doesNotMatch(route, /req\.body\s*\)/);
});

test('M7228 governance report payload rejects cross-company and mismatched product identity', () => {
  assert.equal(reporting.validateSubmission({ ...valid, companyId: 'lordgistics', productId: 'lordgistics' }, customer).ok, false);
  assert.equal(reporting.validateSubmission({ ...valid, companyId: 'nexa', productId: 'lordgistics' }, customer).ok, false);
  assert.equal(reporting.validateSubmission({ ...valid, companyId: 'nexa', productId: 'nexa-main' }, customer).ok, true);
});


test('M7294 payload validation rejects oversized serialized payloads and unexpected fields', () => {
  assert.ok(reporting.MAX_PAYLOAD_BYTES >= 16 * 1024);
  assert.ok(reporting.validateSubmission({ ...valid, extraPrivateData: 'x' }, customer).errors.includes('unexpected_fields'));
  assert.ok(reporting.validateSubmission({ ...valid, description: 'x'.repeat(reporting.MAX_PAYLOAD_BYTES) }, customer).errors.includes('payload_too_large'));
});
test('M7294 text is Unicode-normalized and rejects control characters', () => {
  const normalized = reporting.validateSubmission({ ...valid, summary: '  Cafe\u0301  ' }, customer);
  assert.equal(normalized.ok, true);
  assert.equal(normalized.value.summary, 'Café');
  assert.ok(reporting.validateSubmission({ ...valid, summary: 'bad\u0001summary' }, customer).errors.includes('invalid_summary'));
  assert.ok(reporting.validateSubmission({ ...valid, description: 'bad\u0000description' }, customer).errors.includes('invalid_description'));
  assert.equal(reporting.validateSubmission({ ...valid, description: 'line one\nline two' }, customer).ok, true);
});
test('M7293 source references require actual strings rather than coerced objects', () => {
  assert.ok(reporting.validateSubmission({ ...valid, sourceId: { id: 'ord-123' } }, customer).errors.includes('invalid_source_id'));
  assert.ok(reporting.validateSubmission({ ...valid, sourceType: ['order'] }, customer).errors.includes('invalid_source_type'));
});
test('M7298 Central report route does not reserve keys while the provider is unconfigured', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(process.cwd(), 'server/index.js'), 'utf8');
  const start = source.indexOf('app.post("/api/central-reports"');
  const end = source.indexOf('\n});', start) + 4;
  const route = source.slice(start, end);
  assert.match(route, /if \(!centralReportClient\.configured\(\)\) return res\.status\(503\)/);
  assert.match(route, /reserveIdempotencyKey\(db, requestId, req\.user\.id\)/);
  assert.match(route, /result\.accepted && result\.delivered/);
});
test('M7292 report screen scans role fallbacks instead of stopping at an unknown accountType', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(process.cwd(), 'src/CentralReportScreen.tsx'), 'utf8');
  assert.match(source, /roleCandidates\.find\(candidate => Object\.prototype\.hasOwnProperty\.call\(CATEGORY_BY_ROLE, candidate\)\)/);
});

test('M7305 approved replies are NFC-normalized, control-cleaned and bounded for plain-text rendering', () => {
  const projected = reporting.projectCentralReport({ id: 'r1', ownerId: 'u-1', approvedReply: '  Cafe\u0301\u0001 reply  ' }, 'u-1');
  assert.equal(projected.approvedReply, 'Café reply');
  assert.equal(reporting.projectCentralReport({ id: 'r1', ownerId: 'u-1', approvedReply: '  \u0001  ' }, 'u-1').approvedReply, null);
});
test('M7295 typed client contract guards delivery acknowledgement and normalizes known states', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const contract = fs.readFileSync(path.join(process.cwd(), 'src/centralReportingContract.ts'), 'utf8');
  const screen = fs.readFileSync(path.join(process.cwd(), 'src/CentralReportScreen.tsx'), 'utf8');
  assert.match(contract, /export interface CentralReportRequest/);
  assert.match(contract, /export interface CentralReportUnavailableResponse/);
  assert.match(contract, /function isConfirmedCentralDelivery/);
  assert.match(contract, /response\.accepted === true && response\.delivered === true/);
  assert.match(contract, /function normalizeCentralReportStatus/);
  assert.match(screen, /isConfirmedCentralDelivery\(response\)/);
});
test('M7292 accessible Help surface links to the separate Central report form', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(process.cwd(), 'src/app/help.tsx'), 'utf8');
  assert.match(source, /accessibilityLabel="Open AAMI Central report form"/);
  assert.match(source, /router\.push\('\/central-reports'\)/);
});

test('M7310 report UI explains that disconnected attempts do not reserve keys or claim delivery', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(process.cwd(), 'src/CentralReportScreen.tsx'), 'utf8');
  assert.match(source, /request key is not reserved and delivery is not claimed/i);
  assert.doesNotMatch(source, /Main stores only an opaque request key/i);
});

test('M7195 configured Central client signs exact payloads, preserves details and confirms only acknowledged delivery', async () => {
  const crypto = require('node:crypto');
  const now = 1_800_000_000_000; const secret = 'main-central-report-contract-secret-2026'; const calls = [];
  const client = reporting.createCentralReportClient({ env: { AAMI_CENTRAL_REPORT_BASE_URL: 'https://central.example.test', AAMI_CENTRAL_REPORT_SECRET: secret }, now: () => now, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    const payload = JSON.parse(options.body);
    const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}` : JSON.stringify(value);
    assert.equal(options.headers['x-report-signature'], `sha256=${crypto.createHmac('sha256', secret).update(`${now}.${canonical(payload)}`).digest('hex')}`);
    if (url.endsWith('/status')) return { ok: true, status: 200, json: async () => ({ id: 'RPT-abcdefghij', status: 'acknowledged', category: 'operational_issue', createdAt: now, replies: [{ text: 'We are reviewing it.' }, { text: '<script>bad</script>' }] }) };
    return { ok: true, status: 201, json: async () => ({ id: 'RPT-abcdefghij', status: 'received', createdAt: now }) };
  } });
  assert.equal(client.configured(), true);
  const submitted = await client.submit({ userId: 'u-1', requestId: 'a'.repeat(64), report: valid });
  assert.equal(submitted.accepted, true); assert.equal(submitted.delivered, true); assert.equal(submitted.report.status, 'acknowledged');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.reporterId, 'u-1'); assert.equal(body.sourceProduct, undefined); assert.equal(body.details, `${valid.description}\n\nSource reference: order / ord-123`);
  assert.equal(calls[0].options.headers['x-report-source'], 'main'); assert.equal(calls[0].options.redirect, 'error');
  const status = await client.status({ userId: 'u-1', reportId: 'RPT-abcdefghij' });
  assert.equal(status.ok, true); assert.equal(status.report.status, 'acknowledged'); assert.equal(status.report.replies.length, 2);
});
test('M7195 Central client fails closed for unsafe URLs, missing keys, redirects and unconfirmed receipts', async () => {
  assert.equal(reporting.createCentralReportClient({ env: { AAMI_CENTRAL_REPORT_BASE_URL: 'http://example.test', AAMI_CENTRAL_REPORT_SECRET: 'x'.repeat(40) } }).configured(), false);
  assert.equal(reporting.createCentralReportClient({ env: { AAMI_CENTRAL_REPORT_BASE_URL: 'https://central.example.test' } }).configured(), false);
  const client = reporting.createCentralReportClient({ env: { AAMI_CENTRAL_REPORT_BASE_URL: 'https://central.example.test', AAMI_CENTRAL_REPORT_SECRET: 'x'.repeat(40) }, fetchImpl: async () => ({ ok: false, status: 302, json: async () => ({}) }) });
  const result = await client.submit({ userId: 'u-1', requestId: 'a'.repeat(64), report: valid });
  assert.equal(result.accepted, false); assert.equal(result.reason, 'rejected');
});

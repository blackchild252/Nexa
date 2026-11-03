'use strict';

const crypto = require('node:crypto');
const companyScope = require('./companyScope');

const CATEGORY_BY_ROLE = Object.freeze({
  customer: Object.freeze(['account', 'order', 'product', 'zeeza', 'safety', 'other']),
  business: Object.freeze(['account', 'order', 'product', 'safety', 'other']),
  staff: Object.freeze(['account', 'order', 'product', 'zeeza', 'safety', 'privacy', 'other']),
});
const STATUS_MAP = Object.freeze({
  submitted: 'submitted', acknowledged: 'acknowledged', received: 'acknowledged',
  open: 'in_review', reviewing: 'in_review', in_review: 'in_review',
  waiting: 'waiting', pending_user: 'waiting', resolved: 'resolved',
  closed: 'closed', dismissed: 'closed',
});
const MAX_SUMMARY = 160;
const MAX_DESCRIPTION = 4000;
const MAX_SOURCE_ID = 128;
const MAX_PAYLOAD_BYTES = 16 * 1024;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function normalizeRole(user = {}) {
  const candidates = [user.accountType, user.userType, user.role, user.kind];
  for (const candidate of candidates) {
    const role = String(candidate || '').trim().toLowerCase();
    if (['customer', 'consumer', 'user'].includes(role)) return 'customer';
    if (['business', 'vendor', 'seller', 'merchant'].includes(role)) return 'business';
    if (['staff', 'support', 'moderator', 'admin', 'administrator'].includes(role)) return 'staff';
  }
  return null;
}
function allowedCategories(user) {
  const role = normalizeRole(user);
  return role ? [...CATEGORY_BY_ROLE[role]] : [];
}
function normalizeText(value) {
  return typeof value === 'string' ? value.normalize('NFC').trim() : '';
}
function hasDisallowedControls(value, allowLineBreaks = false) {
  const pattern = allowLineBreaks ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/ : /[\u0000-\u001F\u007F]/;
  return pattern.test(value);
}
function validateSubmission(body, user) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: ['invalid_payload'] };
  let payloadBytes;
  try { payloadBytes = Buffer.byteLength(JSON.stringify(body), 'utf8'); }
  catch { return { ok: false, errors: ['invalid_payload'] }; }
  if (payloadBytes > MAX_PAYLOAD_BYTES) errors.push('payload_too_large');
  const allowedKeys = new Set(['category', 'summary', 'description', 'sourceType', 'sourceId', 'companyId', 'productId', 'industryCoinId', 'attachments', 'centralReviewerNotes', 'internalNotes']);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) errors.push('unexpected_fields');
  const category = normalizeText(body.category).toLowerCase();
  const summary = normalizeText(body.summary);
  const description = normalizeText(body.description);
  if (!allowedCategories(user).includes(category)) errors.push('invalid_category_for_account');
  if (!summary || summary.length > MAX_SUMMARY || hasDisallowedControls(summary)) errors.push('invalid_summary');
  if (!description || description.length > MAX_DESCRIPTION || hasDisallowedControls(description, true)) errors.push('invalid_description');
  if (body.sourceType != null && typeof body.sourceType !== 'string') errors.push('invalid_source_type');
  if (body.sourceId != null && typeof body.sourceId !== 'string') errors.push('invalid_source_id');
  const sourceType = body.sourceType == null || body.sourceType === '' ? null : normalizeText(body.sourceType).toLowerCase();
  const sourceId = body.sourceId == null || body.sourceId === '' ? null : normalizeText(body.sourceId);
  if (sourceType && !['order', 'account', 'product', 'zeeza_message', 'zeeza_room'].includes(sourceType)) errors.push('invalid_source_type');
  if (sourceId && !SAFE_ID.test(sourceId)) errors.push('invalid_source_id');
  if (sourceType && !sourceId) errors.push('source_id_required');
  if (!sourceType && sourceId) errors.push('source_type_required');
  if (body.attachments !== undefined) errors.push('attachments_not_supported');
  if (body.centralReviewerNotes !== undefined || body.internalNotes !== undefined) errors.push('restricted_fields_not_allowed');
  // Main is the source company for this API. Reject attempts to label a report as another product/company.
  if (body.companyId !== undefined || body.productId !== undefined || body.industryCoinId !== undefined) {
    const identity = companyScope.normalizeIdentity({
      companyId: body.companyId === undefined ? 'nexa' : body.companyId,
      productId: body.productId === undefined ? 'nexa-main' : body.productId,
      ...(body.industryCoinId === undefined ? {} : { industryCoinId: body.industryCoinId }),
    });
    if (!identity.ok) errors.push(identity.error);
    else if (identity.value.companyId !== 'nexa' || identity.value.productId !== 'nexa-main') errors.push('report_scope_not_allowed');
  }
  return errors.length ? { ok: false, errors } : {
    ok: true,
    value: { category, summary, description, sourceType, sourceId },
  };
}
function idempotencyKey(userId, clientKey) {
  const owner = String(userId || '').trim();
  const supplied = String(clientKey || '').trim();
  if (!owner || !supplied || supplied.length > 200 || /[\r\n]/.test(supplied)) return null;
  return crypto.createHash('sha256').update(`${owner}\0${supplied}`).digest('hex');
}
function normalizeStatus(value) {
  const status = STATUS_MAP[String(value || '').trim().toLowerCase()];
  return status || 'submitted';
}
function projectCentralReport(report, viewerId) {
  if (!report || String(report.ownerId || report.reporterId || '') !== String(viewerId || '')) return null;
  return {
    id: String(report.id || ''),
    status: normalizeStatus(report.status),
    category: String(report.category || 'other'),
    summary: String(report.summary || '').slice(0, MAX_SUMMARY),
    createdAt: report.createdAt || null,
    updatedAt: report.updatedAt || null,
    approvedReply: typeof report.approvedReply === 'string' ? report.approvedReply.normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, 2000) || null : null,
  };
}
function acknowledgement(requestId) {
  return { accepted: true, requestId, message: 'Your report request was accepted for submission. This is not confirmation of Central delivery or resolution.' };
}
function unavailableResponse() {
  return { error: 'central_reporting_unavailable', message: 'AAMI Central reporting is not connected. No report was delivered; please retry later.', retryable: true };
}
function ensureIdempotencySchema(db) {
  if (!db || typeof db.exec !== 'function') throw new TypeError('A database handle is required');
  db.exec(`CREATE TABLE IF NOT EXISTS central_report_idempotency (
    requestId TEXT PRIMARY KEY,
    ownerId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    expiresAt TEXT NOT NULL
  ); CREATE INDEX IF NOT EXISTS idx_central_report_idempotency_owner ON central_report_idempotency(ownerId, createdAt DESC);`);
}
// Store only the opaque request hash and owner metadata. Never persist report text,
// attachments, reviewer data, or Central-owned report records in Main's database.
function reserveIdempotencyKey(db, requestId, ownerId, now = new Date()) {
  if (!db || typeof db.prepare !== 'function' || !/^[a-f0-9]{64}$/.test(String(requestId || '')) || !String(ownerId || '').trim()) {
    return { ok: false, reason: 'invalid_reservation' };
  }
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
  try {
    db.prepare('DELETE FROM central_report_idempotency WHERE expiresAt <= ?').run(createdAt);
    const result = db.prepare('INSERT INTO central_report_idempotency (requestId, ownerId, createdAt, expiresAt) VALUES (?, ?, ?, ?)').run(requestId, String(ownerId), createdAt, expiresAt);
    return { ok: Number(result?.changes) === 1, duplicate: false };
  } catch (error) {
    if (String(error?.code || '').startsWith('SQLITE_CONSTRAINT') || /unique|primary key/i.test(String(error?.message || ''))) {
      return { ok: true, duplicate: true };
    }
    throw error;
  }
}
const CENTRAL_CATEGORY_BY_MAIN = Object.freeze({
  account: 'account_concern', order: 'operational_issue', product: 'operational_issue',
  zeeza: 'service_complaint', safety: 'safety_security_incident', privacy: 'governance_matter', other: 'service_complaint',
});
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function reportEndpoint(env = process.env) {
  const raw = String(env.AAMI_CENTRAL_REPORT_BASE_URL || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) return null;
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString().replace(/\/$/, '');
  } catch { return null; }
}
function createCentralReportClient({ env = process.env, fetchImpl = fetch, now = () => Date.now(), timeoutMs = 3000 } = {}) {
  const baseUrl = reportEndpoint(env);
  const secret = typeof env.AAMI_CENTRAL_REPORT_SECRET === 'string' && env.AAMI_CENTRAL_REPORT_SECRET.length >= 32 ? env.AAMI_CENTRAL_REPORT_SECRET : null;
  const configured = () => !!baseUrl && !!secret && typeof fetchImpl === 'function';
  async function call(path, payload) {
    if (!configured()) return { ok: false, reason: 'not_configured' };
    const timestamp = String(now());
    const signature = `sha256=${crypto.createHmac('sha256', secret).update(`${timestamp}.${canonicalJson(payload)}`).digest('hex')}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(100, Math.min(10000, timeoutMs)));
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'content-type': 'application/json', accept: 'application/json', 'x-report-source': 'main', 'x-report-timestamp': timestamp, 'x-report-signature': signature },
        body: JSON.stringify(payload),
      });
      let body; try { body = await response.json(); } catch { return { ok: false, reason: 'invalid_response' }; }
      if (!response.ok) return { ok: false, reason: response.status === 429 ? 'rate_limited' : response.status >= 500 ? 'unavailable' : 'rejected', status: response.status };
      return { ok: true, body };
    } catch (error) {
      return { ok: false, reason: error?.name === 'AbortError' ? 'timeout' : 'unavailable' };
    } finally { clearTimeout(timer); }
  }
  return {
    configured,
    async submit({ userId, report, requestId }) {
      const category = CENTRAL_CATEGORY_BY_MAIN[report?.category];
      if (!userId || !category || !report || !requestId) return { accepted: false, reason: 'invalid_request' };
      const details = [report.description, report.sourceType && report.sourceId ? `Source reference: ${report.sourceType} / ${report.sourceId}` : ''].filter(Boolean).join('\n\n');
      const result = await call('/central/v1/report-intake', { reporterId: String(userId), category, summary: report.summary, details, urgency: report.category === 'safety' ? 'high' : 'normal', evidence: [], idempotencyKey: requestId });
      if (!result.ok) return { accepted: false, reason: result.reason, ...(result.status ? { status: result.status } : {}) };
      const body = result.body;
      if (!body || typeof body.id !== 'string' || !/^RPT-[A-Za-z0-9-]{10,80}$/.test(body.id) || typeof body.status !== 'string') return { accepted: false, reason: 'invalid_response' };
      return { accepted: true, delivered: true, requestId, report: { id: body.id, status: normalizeStatus(body.status), category: report.category, summary: report.summary.slice(0, MAX_SUMMARY), createdAt: body.createdAt ?? null } };
    },
    async status({ userId, reportId }) {
      if (!userId || typeof reportId !== 'string' || !/^RPT-[A-Za-z0-9-]{10,80}$/.test(reportId)) return { ok: false, reason: 'invalid_request' };
      const result = await call('/central/v1/report-intake/status', { reporterId: String(userId), reportId });
      if (!result.ok) return result;
      const body = result.body;
      if (!body || body.id !== reportId || typeof body.status !== 'string') return { ok: false, reason: 'invalid_response' };
      return { ok: true, report: { id: body.id, status: normalizeStatus(body.status), category: typeof body.category === 'string' ? body.category : 'other', createdAt: body.createdAt ?? null, replies: Array.isArray(body.replies) ? body.replies.filter(item => item && typeof item.text === 'string').map(item => ({ at: item.at ?? null, text: item.text.normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C-\u001F\u007F]/g, '').slice(0, 2000) })) : [] } };
    },
  };
}

module.exports = {
  CATEGORY_BY_ROLE, MAX_SUMMARY, MAX_DESCRIPTION, MAX_PAYLOAD_BYTES, allowedCategories, normalizeRole,
  validateSubmission, idempotencyKey, normalizeStatus, projectCentralReport,
  acknowledgement, unavailableResponse, ensureIdempotencySchema, reserveIdempotencyKey,
  CENTRAL_CATEGORY_BY_MAIN, canonicalJson, reportEndpoint, createCentralReportClient,
};

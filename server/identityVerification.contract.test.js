"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const identity = require("./identityVerification");

function setup() {
  const rows = new Map(); const routes = new Map();
  const db = {
    exec() {},
    prepare(sql) {
      return {
        get(...args) {
          if (/SELECT 1 FROM identity_verification_cases/.test(sql)) return null;
          if (/SELECT \* FROM identity_verification_cases WHERE id=\? AND userId=\?/.test(sql)) { const r = rows.get(args[0]); return r && r.userId === args[1] ? { ...r } : undefined; }
          if (/SELECT \* FROM identity_verification_cases WHERE id=\?/.test(sql)) return rows.has(args[0]) ? { ...rows.get(args[0]) } : undefined;
          if (/SELECT \* FROM identity_verification_cases/.test(sql)) return [...rows.values()].map((r) => ({ ...r }));
          return undefined;
        },
        all(...args) { if (/FROM identity_verification_cases/.test(sql)) return [...rows.values()].filter((r) => !args[0] || r.status === args[0]).map((r) => ({ ...r })); return []; },
        run(...args) {
          if (/INSERT INTO identity_verification_cases/.test(sql)) { const [id,userId,countryCode,documentType,status,evidenceState,policyVersion,createdAt,updatedAt] = args; rows.set(id,{id,userId,countryCode,documentType,status,evidenceRef:null,evidenceState,policyVersion,createdAt,updatedAt}); return { changes: 1 }; }
          if (/UPDATE identity_verification_cases SET status='deleted'/.test(sql)) { const [deletedAt,updatedAt,id] = args; const r=rows.get(id); if(!r)return {changes:0}; Object.assign(r,{status:'deleted',deletedAt,updatedAt,evidenceRef:null,evidenceState:'deletion_pending_storage_confirmation'}); return {changes:1}; }
          return { changes: 1 };
        }
      };
    }
  };
  const app = { use: () => {}, get: (p, ...h) => routes.set(`GET ${p}`, h.at(-1)), post: (p, ...h) => routes.set(`POST ${p}`, h.at(-1)), delete: (p, ...h) => routes.set(`DELETE ${p}`, h.at(-1)) };
  const auth = { authMiddleware: (_req, _res, next) => next() };
  const admin = { require: () => (_req, _res, next) => next(), audit: () => {}, newId: () => "test-id" };
  identity.register(app, { db, auth, admin });
  const invoke = async (method, route, req = {}) => {
    let status = 200; let body;
    const res = { status(n) { status = n; return this; }, set() { return this; }, setHeader() { return this; }, json(v) { body = v; return this; } };
    routes.get(`${method} ${route}`)({ body: {}, params: {}, query: {}, user: { id: "user-1", name: "Test" }, ...req }, res);
    return { status, body };
  };
  return { db, routes, invoke, rows };
}

test("Block 09 identity policy enumerates countries without asserting legal/commercial eligibility", () => {
  assert.ok(Object.keys(identity.COUNTRY_RULES).length >= 240);
  assert.ok(identity.COUNTRY_RULES.NG);
  assert.equal(identity.COUNTRY_RULES.NG.policyState, "manual_policy_review_required");
  assert.equal(identity.COUNTRY_RULES.NG.automatedApprovalAllowed, false);
  assert.ok(identity.DOCUMENT_TYPES.includes("passport"));
});

test("provider results are normalized to non-authoritative manual-review states", () => {
  assert.equal(identity.normalizeProviderResult("verified"), "provider_positive_requires_human_review");
  assert.equal(identity.normalizeProviderResult("rejected"), "provider_negative_requires_human_review");
  assert.equal(identity.normalizeProviderResult("what"), "unknown_requires_manual_review");
});

test("schema stores evidence references only and creates an auditable case state model", () => {
  const source = require("node:fs").readFileSync(require.resolve("./identityVerification"), "utf8");
  assert.match(source, /evidenceRef TEXT/);
  assert.match(source, /evidenceState TEXT/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS identity_verification_events/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS identity_provider_events/);
  assert.doesNotMatch(source, /documentBytes|evidenceBytes\s+TEXT|fileData|imageBlob/);
});

test("M7118 SQLite schema stores opaque evidence references only, never document payloads or storage locators", () => {
  const source = require("node:fs").readFileSync(require.resolve("./identityVerification"), "utf8");
  const schema = source.slice(source.indexOf("function ensureSchema"), source.indexOf("function sweepLifecycle"));
  assert.match(schema, /evidenceRef TEXT/);
  assert.doesNotMatch(schema, /\bBLOB\b|documentBytes|evidenceBytes|imageData|fileData|base64Payload|signedUrl|storagePath/i);
  assert.match(source, /const EVIDENCE_REF_RE = \/\^evr_\[a-f0-9\]\{32\}\$\//);
  assert.match(source, /evidenceBytesStoredInSqlite: false/);
  assert.match(source, /evidenceUploadEnabled: false/);
});

test("case creation stores metadata only and explicitly awaits secure evidence", async () => {
  const { rows, invoke } = setup();
  const result = await invoke("POST", "/api/identity-verification/cases", { body: { countryCode: "NG", documentType: "passport" } });
  assert.equal(result.status, 201);
  assert.equal(result.body.case.status, "awaiting_evidence");
  assert.equal(result.body.case.evidenceReference, null);
  assert.equal(result.body.case.evidenceBytesStoredInDatabase, false);
  assert.equal(result.body.readiness.evidenceUploadEnabled, false);
  const stored = [...rows.values()][0];
  assert.equal(stored.evidenceRef, null);
  assert.equal(stored.evidenceState, "not_configured");
});

test("document upload and provider webhook fail closed while integrations are not configured", async () => {
  const { invoke } = setup();
  const created = await invoke("POST", "/api/identity-verification/cases", { body: { countryCode: "NG", documentType: "passport" } });
  const upload = await invoke("POST", "/api/identity-verification/cases/:id/evidence", { params: { id: created.body.case.id } });
  assert.equal(upload.status, 503);
  assert.equal(upload.body.code, "SECURE_STORAGE_NOT_CONFIGURED");
  const webhook = await invoke("POST", "/api/identity-verification/provider-webhook");
  assert.equal(webhook.status, 503);
  assert.equal(webhook.body.code, "PROVIDER_NOT_CONFIGURED");
});

test("Main identity verification routes preserve owner/admin boundaries", () => {
  const { routes } = setup();
  for (const key of ["GET /api/identity-verification/policy", "GET /api/identity-verification/readiness", "POST /api/identity-verification/cases", "GET /api/identity-verification/cases/mine", "POST /api/identity-verification/cases/:id/appeal", "POST /api/identity-verification/cases/:id/resubmit", "POST /api/identity-verification/cases/:id/renew", "GET /api/admin/identity-verification", "GET /api/admin/identity-verification/policy", "POST /api/admin/identity-verification/:id/decision", "GET /api/admin/identity-verification/readiness", "GET /api/admin/identity-verification/:id/audit", "DELETE /api/identity-verification/cases/:id"]) assert.ok(routes.has(key), `missing ${key}`);
});

test("supported identity document types are documented and evidence uploads remain fail-closed", () => {
  const policy = require("node:fs").readFileSync(require("node:path").join(__dirname, "../docs/IDENTITY_EVIDENCE_DOCUMENT_POLICY.md"), "utf8");
  for (const type of ["passport", "national_identity_card", "drivers_license", "residence_permit", "voter_card"]) assert.ok(identity.DOCUMENT_TYPES.includes(type), `missing ${type}`);
  assert.match(policy, /Evidence upload remains disabled/);
  assert.match(policy, /must not be stored in SQLite/);
  assert.match(policy, /NOT CONFIGURED \/ NOT TESTED/);
});

test("M7117 secure object-storage boundary is explicit and upload remains disabled until gates are met", () => {
  const policy = require("node:fs").readFileSync(require("node:path").join(__dirname, "../docs/SECURE_IDENTITY_OBJECT_STORAGE_BOUNDARY.md"), "utf8");
  for (const requirement of ["Authenticated upload", "Strict byte-size limits", "Malware/content scanning", "Private bucket/container policy", "Short-lived, purpose-bound access grants", "tenant isolation", "provider-side completion"]) {
    assert.ok(policy.toLowerCase().includes(requirement.toLowerCase()), `missing storage boundary requirement: ${requirement}`);
  }
  assert.match(policy, /NOT CONFIGURED \/ NOT TESTED/);
  assert.match(policy, /return `503 SECURE_STORAGE_NOT_CONFIGURED`/);
});


test("M7119 readiness diagnostics enumerate blocking integration gaps without enabling uploads", async () => {
  const { invoke } = setup();
  const result = await invoke("GET", "/api/identity-verification/readiness");
  assert.equal(result.status, 200);
  assert.equal(result.body.readinessStatus, "blocked");
  assert.equal(result.body.evidenceUploadEnabled, false);
  const ids = result.body.blockers.map((item) => item.id);
  for (const id of ["secure_object_storage", "evidence_upload", "verification_provider", "provider_webhook", "country_legal_policy", "retention_enforcement"]) assert.ok(ids.includes(id), `missing readiness blocker ${id}`);
  assert.ok(result.body.blockers.every((item) => item.message && ["blocking", "review_required"].includes(item.severity)));
});


test("M7120 complete verification architecture remains fail-closed across policy, storage, provider, retention and admin readiness", async () => {
  const { invoke } = setup();
  const publicReadiness = await invoke("GET", "/api/identity-verification/readiness");
  const adminReadiness = await invoke("GET", "/api/admin/identity-verification/readiness");
  const policy = await invoke("GET", "/api/identity-verification/policy", { query: { countryCode: "NG" } });

  assert.equal(publicReadiness.status, 200);
  assert.equal(adminReadiness.status, 200);
  assert.equal(publicReadiness.body.readinessStatus, "blocked");
  assert.equal(publicReadiness.body.evidenceUploadEnabled, false);
  assert.equal(publicReadiness.body.providerWebhookEnabled, false);
  assert.equal(publicReadiness.body.evidenceBytesStoredInSqlite, false);
  assert.equal(publicReadiness.body.retention.policyState, "prepared_not_automatically_enforced_without_secure_storage_adapter");
  assert.equal(publicReadiness.body.privacy.noEvidenceBytesInApiOrDatabase, true);
  assert.equal(publicReadiness.body.privacy.adminMustNotReceiveEvidenceBytes, true);
  assert.equal(adminReadiness.body.readinessStatus, "blocked");
  assert.equal(adminReadiness.body.evidenceUploadEnabled, false);
  assert.equal(policy.body.commercialEligibilityAsserted, false);
  assert.equal(policy.body.countryRule.policyState, "manual_policy_review_required");
  assert.equal(policy.body.countryRule.automatedApprovalAllowed, false);

  const source = require("node:fs").readFileSync(require.resolve("./identityVerification"), "utf8");
  const schema = source.slice(source.indexOf("function ensureSchema"), source.indexOf("function sweepLifecycle"));
  assert.doesNotMatch(schema, /\bBLOB\b|documentBytes|evidenceBytes|imageData|fileData|base64Payload|signedUrl|storagePath/i);
});

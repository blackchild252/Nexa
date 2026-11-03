"use strict";
// Block 09: identity verification architecture. Main is the sole verification authority.
// Sensitive document bytes are NEVER accepted or stored by this module; evidence must live behind a future private object-storage adapter.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const DOCUMENT_TYPES = Object.freeze(["passport", "national_identity_card", "drivers_license", "residence_permit", "voter_card"]);
const CASE_STATES = Object.freeze(["draft", "awaiting_evidence", "pending_review", "approved", "rejected", "appealed", "expired", "renewal_required", "deleted"]);
const MAX_REASON = 300;
const POLICY_VERSION = "identity-policy-v1";
const RETENTION_DAYS = 365;
const EVIDENCE_REF_RE = /^evr_[a-f0-9]{32}$/;
const COUNTRY_CODES = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, "countryRegionalization.json"), "utf8")).map((c) => c.code));
const COUNTRY_RULES = Object.freeze(Object.fromEntries([...COUNTRY_CODES].map((code) => [code, Object.freeze({ countryCode: code, policyState: "manual_policy_review_required", allowedDocumentTypes: DOCUMENT_TYPES, requiredDocuments: [], automatedApprovalAllowed: false, note: "Reference list only. Confirm applicable law and NEXA policy before accepting documents; no legal eligibility is inferred." })])));
function normalizeDocumentType(value) { const v = String(value || "").trim().toLowerCase(); return DOCUMENT_TYPES.includes(v) ? v : null; }
function normalizeCountry(value) { const v = String(value || "").trim().toUpperCase(); return COUNTRY_CODES.has(v) ? v : null; }
function normalizeProviderResult(value) {
  const v = String(value || "").trim().toLowerCase();
  if (["verified", "approved", "clear", "passed"].includes(v)) return "provider_positive_requires_human_review";
  if (["failed", "rejected", "unverified", "negative"].includes(v)) return "provider_negative_requires_human_review";
  if (["pending", "processing", "review"].includes(v)) return "pending";
  return "unknown_requires_manual_review";
}
function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS identity_verification_cases (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL, countryCode TEXT NOT NULL, documentType TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft','awaiting_evidence','pending_review','approved','rejected','appealed','expired','renewal_required','deleted')),
      evidenceRef TEXT, evidenceState TEXT NOT NULL DEFAULT 'not_configured', policyVersion TEXT NOT NULL,
      rejectionReason TEXT, reviewReason TEXT, reviewedBy TEXT, reviewedAt TEXT,
      appealReason TEXT, appealAt TEXT, expiresAt TEXT, renewalRequestedAt TEXT,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_identity_cases_user ON identity_verification_cases(userId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_identity_cases_queue ON identity_verification_cases(status, createdAt ASC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_evidence_ref ON identity_verification_cases(evidenceRef) WHERE evidenceRef IS NOT NULL;
    CREATE TABLE IF NOT EXISTS identity_verification_events (
      id TEXT PRIMARY KEY, caseId TEXT NOT NULL, actorId TEXT, eventType TEXT NOT NULL,
      fromStatus TEXT, toStatus TEXT, reason TEXT, metadata TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_identity_events_case ON identity_verification_events(caseId, createdAt ASC);
    CREATE TABLE IF NOT EXISTS identity_provider_events (
      providerEventId TEXT PRIMARY KEY, eventType TEXT NOT NULL, normalizedResult TEXT NOT NULL,
      caseId TEXT, receivedAt TEXT NOT NULL, processedAt TEXT
    );
  `);
}
function sweepLifecycle(db, { now = new Date() } = {}) {
  const stamp = now.toISOString();
  const expired = db.prepare("SELECT id,status FROM identity_verification_cases WHERE status='approved' AND expiresAt IS NOT NULL AND expiresAt<=?").all(stamp);
  const update = db.prepare("UPDATE identity_verification_cases SET status='expired',updatedAt=? WHERE id=? AND status='approved'");
  const addEvent = db.prepare("INSERT INTO identity_verification_events(id,caseId,actorId,eventType,fromStatus,toStatus,reason,metadata,createdAt) VALUES(?,?,?,?,?,?,?,?,?)");
  db.transaction(() => {
    for (const row of expired) {
      const changed = update.run(stamp, row.id);
      if (changed.changes) addEvent.run(crypto.randomUUID(), row.id, null, "verification_expired", row.status, "expired", null, JSON.stringify({ policyVersion: POLICY_VERSION }), stamp);
    }
  })();
  return { expired: expired.length, retentionDays: RETENTION_DAYS, evidenceDeletionAutomated: false };
}

function safeCase(row) {
  return { id: row.id, countryCode: row.countryCode, documentType: row.documentType, status: row.status,
    evidenceReference: row.evidenceRef || null, evidenceState: row.evidenceState, policyVersion: row.policyVersion,
    rejectionReason: row.status === "rejected" || row.status === "appealed" ? (row.rejectionReason || "") : "",
    reviewReason: row.reviewReason || "", reviewedAt: row.reviewedAt || null, expiresAt: row.expiresAt || null,
    appealReason: row.status === "appealed" ? (row.appealReason || "") : "", appealAt: row.appealAt || null,
    renewalRequestedAt: row.renewalRequestedAt || null, createdAt: row.createdAt, updatedAt: row.updatedAt,
    evidenceBytesStoredInDatabase: false };
}
function register(app, { db, auth, admin }) {
  ensureSchema(db);
  app.use("/api/identity-verification", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  app.use("/api/admin/identity-verification", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  const fail = (res, status, error, code) => res.status(status).json({ error, ...(code ? { code } : {}) });
  const now = () => new Date().toISOString();
  const event = (caseId, actorId, eventType, fromStatus, toStatus, reason = "", metadata = {}) => db.prepare("INSERT INTO identity_verification_events(id,caseId,actorId,eventType,fromStatus,toStatus,reason,metadata,createdAt) VALUES(?,?,?,?,?,?,?,?,?)").run(crypto.randomUUID(), caseId, actorId || null, eventType, fromStatus || null, toStatus || null, String(reason || "").slice(0, MAX_REASON) || null, JSON.stringify(metadata), now());
  const readiness = () => {
    const blockers = [
      { id: "secure_object_storage", severity: "blocking", status: "not_configured", message: "Private evidence storage and provider-side deletion confirmation are not configured." },
      { id: "evidence_upload", severity: "blocking", status: "disabled", message: "Evidence upload remains disabled until storage, scanning and access controls are verified." },
      { id: "verification_provider", severity: "blocking", status: "not_configured", message: "No external identity-verification provider is configured." },
      { id: "provider_webhook", severity: "blocking", status: "disabled", message: "Provider webhook signature verification and replay protection are not enabled." },
      { id: "country_legal_policy", severity: "review_required", status: "manual_review_required", message: "Country document rules are references only and require legal and policy review." },
      { id: "retention_enforcement", severity: "review_required", status: "not_enforced", message: "Evidence retention and deletion cannot be fully enforced without the private storage adapter." }
    ];
    return { authority: "nexa_main_only", policyVersion: POLICY_VERSION, documentTypes: [...DOCUMENT_TYPES], countryRuleCount: COUNTRY_CODES.size,
      countryRulesRequireManualLegalPolicyReview: true, secureObjectStorage: "not_configured", evidenceUploadEnabled: false,
      providerIntegration: "not_configured", providerWebhookEnabled: false, evidenceBytesStoredInSqlite: false,
      readinessStatus: "blocked", blockers,
      privacy: { noEvidenceBytesInApiOrDatabase: true, evidenceReferencesOnly: true, adminMustNotReceiveEvidenceBytes: true },
      retention: { daysAfterTerminalDecision: RETENTION_DAYS, policyState: "prepared_not_automatically_enforced_without_secure_storage_adapter" },
      deletion: { status: "metadata_tombstone_supported", evidenceDeletion: "requires_storage_adapter_confirmation" } };
  };

  app.get("/api/identity-verification/policy", auth.authMiddleware, (req, res) => {
    res.set("Cache-Control", "no-store");
    const code = normalizeCountry(req.query.countryCode || (req.user && req.user.countryCode));
    res.json({ policyVersion: POLICY_VERSION, documentTypes: [...DOCUMENT_TYPES], countryRule: code ? COUNTRY_RULES[code] : null,
      countryRules: code ? undefined : COUNTRY_RULES, commercialEligibilityAsserted: false, legalAdvice: false, uploadEnabled: false });
  });
  app.get("/api/identity-verification/readiness", auth.authMiddleware, (req, res) => { res.set("Cache-Control", "no-store"); res.json(readiness()); });
  app.post("/api/identity-verification/cases", auth.authMiddleware, (req, res) => {
    const b = req.body || {}; const countryCode = normalizeCountry(b.countryCode); const documentType = normalizeDocumentType(b.documentType);
    if (!countryCode) return fail(res, 400, "Choose a supported country or territory.");
    if (!documentType) return fail(res, 400, "Choose a supported identity document type.");
    if (!COUNTRY_RULES[countryCode].allowedDocumentTypes.includes(documentType)) return fail(res, 400, "That document type is not supported by the current policy reference.");
    if (db.prepare("SELECT 1 FROM identity_verification_cases WHERE userId=? AND status IN ('awaiting_evidence','pending_review','approved','appealed','renewal_required')").get(req.user.id)) return fail(res, 409, "You already have an active identity-verification case.");
    const id = crypto.randomUUID(); const stamp = now();
    db.prepare("INSERT INTO identity_verification_cases(id,userId,countryCode,documentType,status,evidenceState,policyVersion,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)").run(id, req.user.id, countryCode, documentType, "awaiting_evidence", "not_configured", POLICY_VERSION, stamp, stamp);
    event(id, req.user.id, "case_created_waiting_for_secure_evidence", null, "awaiting_evidence", "", { countryCode, documentType, policyVersion: POLICY_VERSION });
    res.status(201).json({ case: safeCase(db.prepare("SELECT * FROM identity_verification_cases WHERE id=?").get(id)), readiness: readiness() });
  });
  app.post("/api/identity-verification/cases/:id/evidence", auth.authMiddleware, (req, res) => {
    const row = db.prepare("SELECT * FROM identity_verification_cases WHERE id=? AND userId=?").get(String(req.params.id), req.user.id);
    if (!row || row.status === "deleted") return fail(res, 404, "Identity-verification case not found.");
    // Explicit deny until private object storage and malware/content validation are configured.
    return fail(res, 503, "Secure document upload is not configured yet. No document was accepted or stored.", "SECURE_STORAGE_NOT_CONFIGURED");
  });
  app.post("/api/identity-verification/provider-webhook", (req, res) => fail(res, 503, "Verification provider webhook is disabled until a server-side provider adapter and signature verification are configured.", "PROVIDER_NOT_CONFIGURED"));
  app.get("/api/identity-verification/cases/mine", auth.authMiddleware, (req, res) => {
    sweepLifecycle(db);
    const rows = db.prepare("SELECT * FROM identity_verification_cases WHERE userId=? AND status<>'deleted' ORDER BY createdAt DESC LIMIT 50").all(req.user.id);
    res.set("Cache-Control", "no-store"); res.json({ cases: rows.map(safeCase), readiness: readiness() });
  });
  app.post("/api/identity-verification/cases/:id/resubmit", auth.authMiddleware, (req, res) => {
    const row = db.prepare("SELECT * FROM identity_verification_cases WHERE id=? AND userId=?").get(String(req.params.id), req.user.id);
    if (!row || row.status === "deleted") return fail(res, 404, "Identity-verification case not found.");
    if (row.status !== "rejected") return fail(res, 409, "Only a rejected case can be resubmitted.");
    const stamp = now();
    const changed = db.prepare("UPDATE identity_verification_cases SET status='awaiting_evidence',evidenceRef=NULL,evidenceState='not_configured',rejectionReason=NULL,reviewReason=NULL,reviewedBy=NULL,reviewedAt=NULL,updatedAt=? WHERE id=? AND status='rejected'").run(stamp, row.id);
    if (!changed.changes) return fail(res, 409, "The case changed; refresh before retrying.");
    event(row.id, req.user.id, "case_resubmitted_waiting_for_secure_evidence", row.status, "awaiting_evidence");
    return res.json({ case: safeCase(db.prepare("SELECT * FROM identity_verification_cases WHERE id=?").get(row.id)), uploadEnabled: false });
  });
  app.post("/api/identity-verification/cases/:id/appeal", auth.authMiddleware, (req, res) => {
    const row = db.prepare("SELECT * FROM identity_verification_cases WHERE id=? AND userId=?").get(String(req.params.id), req.user.id);
    if (!row || row.status === "deleted") return fail(res, 404, "Identity-verification case not found.");
    if (row.status !== "rejected") return fail(res, 409, "Only a rejected case can be appealed.");
    const reason = String((req.body || {}).reason || "").trim(); if (reason.length < 10 || reason.length > MAX_REASON) return fail(res, 400, "Explain your appeal in 10–300 characters.");
    const stamp = now(); const changed = db.prepare("UPDATE identity_verification_cases SET status='appealed',appealReason=?,appealAt=?,updatedAt=? WHERE id=? AND status='rejected'").run(reason, stamp, stamp, row.id);
    if (!changed.changes) return fail(res, 409, "The case changed; refresh before retrying.");
    event(row.id, req.user.id, "appeal_submitted", row.status, "appealed", reason); res.json({ case: safeCase(db.prepare("SELECT * FROM identity_verification_cases WHERE id=?").get(row.id)) });
  });
  app.post("/api/identity-verification/cases/:id/renew", auth.authMiddleware, (req, res) => {
    const row = db.prepare("SELECT * FROM identity_verification_cases WHERE id=? AND userId=?").get(String(req.params.id), req.user.id);
    if (!row || row.status === "deleted") return fail(res, 404, "Identity-verification case not found.");
    if (!row.expiresAt || new Date(row.expiresAt).getTime() > Date.now() || !["approved", "expired", "renewal_required"].includes(row.status)) return fail(res, 409, "This identity verification is not due for renewal.");
    const stamp = now(); db.prepare("UPDATE identity_verification_cases SET status='renewal_required',renewalRequestedAt=?,updatedAt=? WHERE id=?").run(stamp, stamp, row.id);
    event(row.id, req.user.id, "renewal_requested", row.status, "renewal_required"); res.json({ case: safeCase(db.prepare("SELECT * FROM identity_verification_cases WHERE id=?").get(row.id)), uploadEnabled: false });
  });
  app.get("/api/admin/identity-verification/policy", auth.authMiddleware, admin.require("verification"), (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ policyVersion: POLICY_VERSION, documentTypes: [...DOCUMENT_TYPES], countryRules: COUNTRY_RULES, legalEligibilityAsserted: false, decisionAuthority: "main_only" });
  });
  app.get("/api/admin/identity-verification", auth.authMiddleware, admin.require("verification"), (req, res) => {
    const states = [...CASE_STATES]; const status = states.includes(String(req.query.status)) ? String(req.query.status) : null;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100); const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const rows = db.prepare(`SELECT c.*,u.name AS userName,u.email AS userEmail FROM identity_verification_cases c LEFT JOIN users u ON u.id=c.userId WHERE (? IS NULL OR c.status=?) AND (?='deleted' OR c.status<>'deleted') ORDER BY c.createdAt ASC LIMIT ? OFFSET ?`).all(status, status, status, limit, offset);
    res.set("Cache-Control", "no-store"); res.json({ cases: rows.map((r) => ({ ...safeCase(r), user: { id: r.userId, name: r.userName || "Member", email: r.userEmail || null } })), readiness: readiness(), decisionAuthority: "main_only", evidenceBytesIncluded: false });
  });
  app.post("/api/admin/identity-verification/:id/decision", auth.authMiddleware, admin.require("verification"), (req, res) => {
    const row = db.prepare("SELECT * FROM identity_verification_cases WHERE id=? AND status<>'deleted'").get(String(req.params.id));
    if (!row) return fail(res, 404, "Identity-verification case not found.");
    if (!["pending_review", "appealed"].includes(row.status)) return fail(res, 409, "This case is not in a reviewable state.");
    if (!row.evidenceRef) return fail(res, 409, "Secure evidence is not available; the case cannot be approved or rejected yet.", "EVIDENCE_NOT_AVAILABLE");
    if (row.userId === req.user.id) return fail(res, 403, "You cannot decide your own identity-verification case.");
    const b = req.body || {}; const decision = String(b.decision || "").toLowerCase(); const reason = String(b.reason || "").trim().slice(0, MAX_REASON);
    if (!["approve", "reject"].includes(decision)) return fail(res, 400, "Choose approve or reject.");
    if (decision === "reject" && reason.length < 3) return fail(res, 400, "Give a short reason so the person knows what to fix.");
    const stamp = now(); const status = decision === "approve" ? "approved" : "rejected";
    const changed = db.prepare("UPDATE identity_verification_cases SET status=?,reviewReason=?,rejectionReason=?,reviewedBy=?,reviewedAt=?,expiresAt=?,updatedAt=? WHERE id=? AND status=? AND evidenceRef IS NOT NULL").run(status, reason || null, decision === "reject" ? reason : null, req.user.id, stamp, decision === "approve" ? new Date(Date.now() + 365 * 86400000).toISOString() : null, stamp, row.id, row.status);
    if (!changed.changes) return fail(res, 409, "The case changed; refresh before retrying.");
    event(row.id, req.user.id, `decision_${status}`, row.status, status, reason); admin.audit(req, `identity_verification_${status}`, "identity_verification_case", row.id, reason || null);
    res.json({ ok: true, case: safeCase(db.prepare("SELECT * FROM identity_verification_cases WHERE id=?").get(row.id)), financialStateChanged: false });
  });
  app.get("/api/admin/identity-verification/readiness", auth.authMiddleware, admin.require("verification"), (req, res) => { res.set("Cache-Control", "no-store"); res.json(readiness()); });
  app.get("/api/admin/identity-verification/:id/audit", auth.authMiddleware, admin.require("verification"), (req, res) => {
    const exists = db.prepare("SELECT id FROM identity_verification_cases WHERE id=?").get(String(req.params.id));
    if (!exists) return fail(res, 404, "Identity-verification case not found.");
    const events = db.prepare("SELECT id,actorId,eventType,fromStatus,toStatus,reason,metadata,createdAt FROM identity_verification_events WHERE caseId=? ORDER BY createdAt ASC LIMIT 200").all(exists.id).map((e) => ({ ...e, metadata: (() => { try { return JSON.parse(e.metadata || "{}"); } catch { return {}; } })() }));
    res.json({ events, evidenceBytesIncluded: false });
  });
  app.delete("/api/identity-verification/cases/:id", auth.authMiddleware, (req, res) => {
    const row = db.prepare("SELECT * FROM identity_verification_cases WHERE id=? AND userId=?").get(String(req.params.id), req.user.id);
    if (!row) return fail(res, 404, "Identity-verification case not found.");
    const stamp = now(); db.prepare("UPDATE identity_verification_cases SET status='deleted',deletedAt=?,updatedAt=?,evidenceRef=NULL,evidenceState='deletion_pending_storage_confirmation' WHERE id=?").run(stamp, stamp, row.id);
    event(row.id, req.user.id, "case_deletion_requested", row.status, "deleted", "", { evidenceDeletionRequiresStorageAdapter: true });
    res.json({ ok: true, deleted: true, evidenceDeletion: row.evidenceRef ? "pending_storage_adapter_confirmation" : "no_evidence_reference_present", evidenceBytesStoredInDatabase: false });
  });
}
module.exports = { register, ensureSchema, DOCUMENT_TYPES, CASE_STATES, POLICY_VERSION, RETENTION_DAYS, normalizeCountry, normalizeDocumentType, normalizeProviderResult, safeCase, sweepLifecycle, COUNTRY_RULES, EVIDENCE_REF_RE };

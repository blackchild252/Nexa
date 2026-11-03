"use strict";
const crypto = require("node:crypto");
const governance = require("./adminDamiGovernanceModel");
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const safeJson = (value, fallback) => { try { return JSON.parse(value); } catch (_) { return fallback; } };

function registerAdminDamiGovernance({ app, auth, admin, db } = {}) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_dami_knowledge (
      id TEXT PRIMARY KEY, ownerId TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'admin-operations',
      title TEXT NOT NULL, type TEXT NOT NULL, content TEXT NOT NULL, chunks TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', trust TEXT NOT NULL DEFAULT 'untrusted-content',
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_admin_dami_knowledge_owner ON admin_dami_knowledge(ownerId,updatedAt DESC);
    CREATE TABLE IF NOT EXISTS admin_dami_workflows (
      id TEXT PRIMARY KEY, ownerId TEXT NOT NULL, title TEXT NOT NULL, steps TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft', version INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_dami_workflows_owner ON admin_dami_workflows(ownerId,updatedAt DESC);
    CREATE TABLE IF NOT EXISTS admin_dami_events (
      id TEXT PRIMARY KEY, ownerId TEXT NOT NULL, workflowId TEXT, resourceType TEXT NOT NULL,
      resourceId TEXT, eventType TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_dami_events_owner ON admin_dami_events(ownerId,createdAt DESC);
    CREATE TABLE IF NOT EXISTS admin_dami_receipts (
      id TEXT PRIMARY KEY, ownerId TEXT NOT NULL, workflowId TEXT NOT NULL, idempotencyKey TEXT NOT NULL,
      outcome TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL,
      UNIQUE(ownerId,idempotencyKey)
    );
    CREATE TABLE IF NOT EXISTS admin_dami_connected_apps (
      id TEXT PRIMARY KEY, ownerId TEXT NOT NULL, name TEXT NOT NULL, context TEXT NOT NULL DEFAULT '',
      authorized INTEGER NOT NULL DEFAULT 0, verifiedAt TEXT, createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_dami_connected_apps_owner ON admin_dami_connected_apps(ownerId,authorized);
  `);

  const owner = admin.require("operations");
  const actorFor = (req) => ({ adminId: req.user.id, adminOperationsRead: true, adminOperationsWrite: true, canApprove: req.adminRole === "owner", now: now() });
  const event = (req, eventType, resourceType, resourceId, metadata = {}, workflowId = null) => {
    const actor = actorFor(req), ts = now();
    db.prepare("INSERT INTO admin_dami_events(id,ownerId,workflowId,resourceType,resourceId,eventType,metadata,createdAt) VALUES(?,?,?,?,?,?,?,?)")
      .run(id("ade"), actor.adminId, workflowId, resourceType, resourceId, eventType, JSON.stringify(metadata), ts);
    admin.audit(req, `dami_${eventType}`, resourceType, resourceId, JSON.stringify(metadata).slice(0, 450));
  };

  app.get("/api/admin/dami/knowledge", auth.authMiddleware, owner, (req, res) => {
    const documents = db.prepare("SELECT id,title,type,length(content) AS characterCount,status,trust,createdAt,updatedAt FROM admin_dami_knowledge WHERE ownerId=? AND scope='admin-operations' AND status='active' ORDER BY updatedAt DESC LIMIT 200").all(req.user.id);
    res.json({ scope: "admin-operations", documents, consumerKnowledgeAccess: false });
  });
  app.post("/api/admin/dami/knowledge", auth.authMiddleware, owner, (req, res) => {
    const actor = actorFor(req);
    const result = governance.ingestAdminDocument({ title: req.body?.title, type: req.body?.type || "text/plain", text: req.body?.content, id: id("adoc") }, actor);
    if (!result.ok) return res.status(400).json({ error: result.error });
    const doc = result.document, ts = now();
    db.prepare("INSERT INTO admin_dami_knowledge(id,ownerId,scope,title,type,content,chunks,status,trust,createdAt,updatedAt,deletedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,NULL)")
      .run(doc.id, req.user.id, doc.scope, doc.title, doc.type, String(req.body.content).trim(), JSON.stringify(doc.chunks), doc.status, doc.trust, ts, ts);
    event(req, "knowledge.created", "knowledge", doc.id, { chunkCount: doc.chunks.length, type: doc.type });
    res.status(201).json({ document: { id: doc.id, title: doc.title, type: doc.type, chunkCount: doc.chunks.length, scope: doc.scope, trust: doc.trust, createdAt: ts, updatedAt: ts } });
  });
  app.get("/api/admin/dami/knowledge/search", auth.authMiddleware, owner, (req, res) => {
    const docs = db.prepare("SELECT id,ownerId,scope,title,chunks,status,deletedAt FROM admin_dami_knowledge WHERE ownerId=? AND scope='admin-operations' AND status='active' AND deletedAt IS NULL ORDER BY updatedAt DESC LIMIT 500").all(req.user.id);
    const indexed = governance.indexAdminDocuments(docs.map(d => ({ ...d, chunks: safeJson(d.chunks, []) }))).filter(x => x.ownerId === req.user.id);
    const result = governance.retrieveAdminKnowledge(req.query.q, indexed, actorFor(req), 8);
    if (!result.ok) return res.status(400).json({ error: result.error });
    event(req, "knowledge.searched", "knowledge", null, { resultCount: result.results.length });
    res.json({ ...result, scope: "admin-operations" });
  });
  app.delete("/api/admin/dami/knowledge/:id", auth.authMiddleware, owner, (req, res) => {
    const old = db.prepare("SELECT * FROM admin_dami_knowledge WHERE id=? AND ownerId=? AND scope='admin-operations'").get(req.params.id, req.user.id);
    if (!old) return res.status(404).json({ error: "Knowledge document not found." });
    const current = { ...old, chunks: safeJson(old.chunks, []), deletedAt: old.deletedAt };
    const result = governance.deleteAdminDocument(current, actorFor(req), now());
    if (!result.ok) return res.status(403).json({ error: result.error });
    if (!result.replayed) db.prepare("UPDATE admin_dami_knowledge SET status='deleted',chunks='[]',deletedAt=?,updatedAt=? WHERE id=? AND ownerId=? AND scope='admin-operations'").run(result.document.deletedAt, result.document.deletedAt, req.params.id, req.user.id);
    event(req, "knowledge.deleted", "knowledge", req.params.id, { replayed: !!result.replayed });
    res.json({ ok: true, deleted: true, replayed: !!result.replayed });
  });

  app.get("/api/admin/dami/workflows", auth.authMiddleware, owner, (req, res) => {
    const workflows = db.prepare("SELECT id,title,steps,status,version,createdAt,updatedAt FROM admin_dami_workflows WHERE ownerId=? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id).map(w => ({ ...w, steps: safeJson(w.steps, []) }));
    res.json({ scope: "admin-operations", workflows, externalActionExecution: false });
  });
  app.post("/api/admin/dami/workflows", auth.authMiddleware, owner, (req, res) => {
    const draft = governance.workflowDraft({ id: id("adw"), title: req.body?.title, steps: req.body?.steps }, actorFor(req));
    if (!draft.ok) return res.status(400).json({ error: draft.error });
    const w = draft.workflow, ts = now();
    db.prepare("INSERT INTO admin_dami_workflows(id,ownerId,title,steps,status,version,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)").run(w.id, req.user.id, w.title, JSON.stringify(w.steps), w.status, w.version, ts, ts);
    event(req, "workflow.created", "workflow", w.id, { stepCount: w.steps.length, recommendationOnly: true }, w.id);
    res.status(201).json({ workflow: { ...w, createdAt: ts, updatedAt: ts } });
  });
  app.post("/api/admin/dami/workflows/:id/transition", auth.authMiddleware, owner, (req, res) => {
    const current = db.prepare("SELECT * FROM admin_dami_workflows WHERE id=? AND ownerId=?").get(req.params.id, req.user.id);
    if (!current) return res.status(404).json({ error: "Workflow not found." });
    const w = { ...current, steps: safeJson(current.steps, []), events: [] };
    const result = governance.transitionAdminWorkflow(w, String(req.body?.to || ""), actorFor(req), req.body?.reason || "");
    if (!result.ok) { event(req, "workflow.transition_denied", "workflow", w.id, { reason: result.error, requestedState: String(req.body?.to || "").slice(0, 40) }, w.id); return res.status(409).json({ error: result.error }); }
    const ts = result.event.at;
    const updated = db.prepare("UPDATE admin_dami_workflows SET status=?,version=?,updatedAt=? WHERE id=? AND ownerId=? AND version=? AND status=?").run(result.workflow.status, result.workflow.version, ts, w.id, req.user.id, current.version, current.status);
    if (!updated.changes) return res.status(409).json({ error: "Workflow changed concurrently; reload and retry." });
    event(req, result.event.type, "workflow", w.id, { from: result.event.from, to: result.event.to, reason: result.event.reason, version: result.event.version }, w.id);
    res.json({ workflow: { ...result.workflow, updatedAt: ts } });
  });
  app.post("/api/admin/dami/workflows/:id/receipt", auth.authMiddleware, owner, (req, res) => {
    const workflow = db.prepare("SELECT id,status FROM admin_dami_workflows WHERE id=? AND ownerId=?").get(req.params.id, req.user.id);
    if (!workflow) return res.status(404).json({ error: "Workflow not found." });
    const key = String(req.body?.idempotencyKey || "").trim().slice(0, 100);
    if (key.length < 8) return res.status(400).json({ error: "A valid idempotency key is required." });
    const existing = db.prepare("SELECT ownerId AS adminId,workflowId,idempotencyKey,outcome,createdAt AS at FROM admin_dami_receipts WHERE ownerId=? AND idempotencyKey=?").get(req.user.id, key);
    const result = governance.receipt({ adminId: req.user.id, workflowId: workflow.id, idempotencyKey: key, existing: existing ? [existing] : [] }, actorFor(req));
    if (!result.ok) return res.status(409).json({ error: result.error });
    if (!result.replayed) {
      const receipt = result.receipt, ts = now();
      db.prepare("INSERT INTO admin_dami_receipts(id,ownerId,workflowId,idempotencyKey,outcome,metadata,createdAt) VALUES(?,?,?,?,?,?,?)").run(id("adr"), req.user.id, workflow.id, key, receipt.outcome, JSON.stringify({ executed: false, scope: "admin-operations" }), ts);
      event(req, "action.receipt_recorded", "workflow", workflow.id, { executed: false, idempotencyFingerprint: crypto.createHash("sha256").update(key).digest("hex").slice(0, 16) }, workflow.id);
    } else event(req, "action.receipt_replayed", "workflow", workflow.id, { executed: false }, workflow.id);
    res.json({ ok: true, replayed: result.replayed, receipt: result.receipt, executed: false });
  });
  app.get("/api/admin/dami/workflows/:id/audit", auth.authMiddleware, owner, (req, res) => {
    const workflow = db.prepare("SELECT id FROM admin_dami_workflows WHERE id=? AND ownerId=?").get(req.params.id, req.user.id);
    if (!workflow) return res.status(404).json({ error: "Workflow not found." });
    const events = db.prepare("SELECT eventType,resourceType,resourceId,metadata,createdAt FROM admin_dami_events WHERE ownerId=? AND workflowId=? ORDER BY createdAt DESC LIMIT 80").all(req.user.id, req.params.id).map(e => ({ ...e, metadata: safeJson(e.metadata, {}) }));
    res.json({ workflowId: req.params.id, events, externalActionExecution: false });
  });
}
module.exports = { registerAdminDamiGovernance };

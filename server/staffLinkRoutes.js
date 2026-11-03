// HTTP routes for the Staff Link registry (M7769-M7777 over HTTP). Authority is resolved by the
// server (resolveActor), never from the request body: the body never names the boss, the tier,
// the approver or the destination. Fail closed: no actor, no 2FA marker, no route.
"use strict";
const { StaffLinkError, APPROVER_TIER } = require("./staffLinks");

function publicLink(l) {
  return { id: l.id, nexaUserId: l.nexaUserId, bossTier: l.bossTier, unit: l.unit, permissions: JSON.parse(l.permissions), status: l.status, decisionReason: l.decisionReason, createdAt: l.createdAt, decidedAt: l.decidedAt };
}
// What an approver sees: the link plus which boss asked (the boss id is the Manager's own NEXA account for Manager staff).
function pendingLink(l) { return { ...publicLink(l), bossId: l.bossId }; }
function publicUpload(u) {
  return { id: u.id, kind: u.kind, unit: u.unit, status: u.status, decisionReason: u.decisionReason, createdAt: u.createdAt };
}

// deps: links (createStaffLinks result), auth middleware A, resolveActor(req) -> {id,tier,bossId,cap}|null,
// userExists(id) -> bool, isTwoFactorVerified(req) -> bool, limiter (middleware array or []).
function createStaffLinkRoutes({ links, A, resolveActor, userExists, isTwoFactorVerified, requestManagerStaff, resolveApprover, limiter = [] }) {
  const handle = (fn) => (req, res) => {
    try { fn(req, res); }
    catch (e) {
      if (e instanceof StaffLinkError) return res.status(e.status).json({ error: e.message, code: e.code });
      console.error("[NEXA staff-links]", e);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };
  const actorOf = (req) => { const a = resolveActor(req); if (!a || !a.id || !a.tier) throw new StaffLinkError(403, "forbidden", "You cannot do that."); return a; };

  // The approver is read from the server (an active Administrative Director grant), never from the request. If a separate
  // approver resolver is wired it decides who may approve; otherwise the normal actor is used and the module checks the tier.
  const approverOf = (req) => { const d = typeof resolveApprover === "function" ? resolveApprover(req) : null; return d && d.id && d.tier ? d : actorOf(req); };

  function register(app) {
    // Boss asks for a link for an existing NEXA user. Boss identity, tier and cap come from the server.
    app.post("/api/staff-links/requests", A, ...limiter, handle((req, res) => {
      const a = actorOf(req); const b = req.body || {};
      // A Manager asks for their own staff. The appointment decides boss, tier and unit; the body can only name the person,
      // the permissions and a replay key. The link then waits for the Administrative Director.
      if (a.tier === "manager") {
        if (typeof requestManagerStaff !== "function") throw new StaffLinkError(403, "forbidden", "You cannot do that.");
        if (typeof b.nexaUserId !== "string" || !userExists(b.nexaUserId)) throw new StaffLinkError(404, "not_found", "That person could not be found on NEXA.");
        const m = requestManagerStaff(a, { nexaUserId: b.nexaUserId, permissions: b.permissions || [], requestKey: b.requestKey });
        return res.status(m.replayed ? 200 : 201).json({ link: publicLink(m.link) });
      }
      if (!a.bossId || !Array.isArray(a.cap)) throw new StaffLinkError(403, "forbidden", "You cannot do that.");
      if (typeof b.nexaUserId !== "string" || !userExists(b.nexaUserId)) throw new StaffLinkError(404, "not_found", "That person could not be found on NEXA.");
      const out = links.createPendingLink({ nexaUserId: b.nexaUserId, bossTier: a.tier, bossId: a.bossId, unit: b.unit, permissions: b.permissions || [], requestedBy: a.id, requestKey: b.requestKey }, { bossCap: a.cap });
      res.status(out.replayed ? 200 : 201).json({ link: publicLink(out.link) });
    }));
    // Boss lists their own staff links.
    app.get("/api/staff-links", A, handle((req, res) => {
      const a = actorOf(req);
      res.json({ links: links.listForBoss(a.tier, a.bossId).map(publicLink) });
    }));
    // Approver sees the requests waiting for their tier (Director: vendor and Manager staff). Anyone else gets 403.
    app.get("/api/staff-links/pending", A, handle((req, res) => {
      const a = approverOf(req);
      if (a.tier !== "director") throw new StaffLinkError(403, "forbidden", "You cannot do that.");
      res.json({ links: links.listPendingForApprover(a.tier).map(pendingLink) });
    }));
    // Approver decides. Tier chain, self-approval and one-decision rules live in the module.
    app.post("/api/staff-links/:id/decision", A, ...limiter, handle((req, res) => {
      const a = approverOf(req); const b = req.body || {};
      const l = links.decideLink(String(req.params.id), { id: a.id, tier: a.tier }, b.decision, b.reason);
      res.json({ link: publicLink(l) });
    }));
    // Staff doors (Business Hub for vendor staff; Kitchen and Blaca Essentials for Manager staff): the person is already signed in as their own NEXA account.
    app.post("/api/staff-links/door/business-hub/sign-in", A, ...limiter, handle((req, res) => {
      const r = links.staffDoorSignIn("business-hub", { authenticated: true, twoFactorVerified: isTwoFactorVerified(req) === true, nexaUserId: req.user && req.user.id });
      res.json({ destination: r.destination, permissions: r.permissions });
    }));
    app.post("/api/staff-links/door/kitchen/sign-in", A, ...limiter, handle((req, res) => {
      const r = links.staffDoorSignIn("kitchen", { authenticated: true, twoFactorVerified: isTwoFactorVerified(req) === true, nexaUserId: req.user && req.user.id });
      res.json({ destination: r.destination, permissions: r.permissions });
    }));
    app.post("/api/staff-links/door/blaca-essentials/sign-in", A, ...limiter, handle((req, res) => {
      const r = links.staffDoorSignIn("blaca-essentials", { authenticated: true, twoFactorVerified: isTwoFactorVerified(req) === true, nexaUserId: req.user && req.user.id });
      res.json({ destination: r.destination, permissions: r.permissions });
    }));
    // Staff submit an upload (pending until the boss side decides).
    app.post("/api/staff-links/uploads", A, handle((req, res) => {
      const b = req.body || {};
      res.status(201).json({ upload: publicUpload(links.submitUpload(req.user && req.user.id, b.kind, b.payload)) });
    }));
    // Boss side decides an upload.
    app.post("/api/staff-links/uploads/:id/decision", A, handle((req, res) => {
      const a = actorOf(req); const b = req.body || {};
      if (!a.bossId) throw new StaffLinkError(403, "forbidden", "You cannot do that.");
      res.json({ upload: publicUpload(links.decideUpload(String(req.params.id), { id: a.id, bossId: a.bossId }, b.decision, b.reason)) });
    }));
  }
  return { register };
}
module.exports = { createStaffLinkRoutes, publicLink, publicUpload, APPROVER_TIER };

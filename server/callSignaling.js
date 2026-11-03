"use strict";

const CALL_TTL_MS = 2 * 60 * 60 * 1000;
const RING_TIMEOUT_MS = 45 * 1000; // B145: an unanswered call stops ringing and becomes "missed".
const TERMINAL = ["ended", "declined", "expired", "missed"];
const SIGNAL_LIMIT = 200;
const VALID_TYPES = new Set(["offer", "answer", "candidate"]);
const VALID_MEDIA = new Set(["audio", "video"]);

function createCallSignaling({ db, auth, friends, sendPush, genRowId }) {
  const now = () => new Date().toISOString();
  const { areFriends, isBlocked, publicUser, userRow } = friends;
  const A = auth.authMiddleware;

  function participant(callId, userId) {
    return db.prepare("SELECT * FROM call_participants WHERE callId=? AND userId=?").get(callId, userId);
  }
  function getCall(callId) {
    return db.prepare("SELECT * FROM call_sessions WHERE id=?").get(callId);
  }
  function requireParticipant(req, res) {
    const call = getCall(req.params.callId);
    if (!call) { res.status(404).json({ error: "Call not found." }); return null; }
    if (!participant(call.id, req.user.id)) { res.status(403).json({ error: "You are not a participant in this call." }); return null; }
    return call;
  }
  function out(call, me) {
    const otherId = call.callerId === me ? call.calleeId : call.callerId;
    const other = userRow(otherId);
    return {
      id: call.id, callerId: call.callerId, calleeId: call.calleeId,
      role: call.callerId === me ? "caller" : "callee",
      media: call.media, status: call.status, createdAt: call.createdAt,
      startedAt: call.startedAt || null, endedAt: call.endedAt || null,
      with: publicUser(other),
    };
  }
  function iceServers() {
    const servers = [{ urls: "stun:stun.l.google.com:19302" }];
    const turnUrl = String(process.env.NEXA_TURN_URL || "").trim();
    const turnUsername = String(process.env.NEXA_TURN_USERNAME || "").trim();
    const turnCredential = String(process.env.NEXA_TURN_CREDENTIAL || "").trim();
    if (turnUrl && turnUsername && turnCredential) servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
    return servers;
  }
  function markMissedIfNeeded(call) {
    if (!call || call.status !== "ringing" || Date.now() - Date.parse(call.createdAt) <= RING_TIMEOUT_MS) return false;
    const changed = db.prepare("UPDATE call_sessions SET status='missed',endedAt=? WHERE id=? AND status='ringing'").run(now(), call.id);
    if (changed.changes === 1 && sendPush) {
      try {
        const who = userRow(call.callerId)?.name || "a friend";
        Promise.resolve(sendPush(call.calleeId, "Missed NEXA call", `Missed ${call.media === "video" ? "video" : "voice"} call from ${who}`, { screen: "zeeza", type: "missed_call", callId: call.id, dedupeKey: `missed-call:${call.id}` })).catch(() => {});
      } catch (_) { /* a push failure must not affect call state */ }
    }
    return changed.changes === 1;
  }
  function expireIfNeeded(call) {
    if (!call || TERMINAL.includes(call.status)) return call;
    if (markMissedIfNeeded(call)) return getCall(call.id);
    if (Date.now() - Date.parse(call.createdAt) > CALL_TTL_MS) {
      db.prepare("UPDATE call_sessions SET status='expired',endedAt=? WHERE id=? AND status NOT IN ('ended','declined','expired','missed')").run(now(), call.id);
      return getCall(call.id);
    }
    return call;
  }
  function sweepRinging() {
    const cutoff = new Date(Date.now() - RING_TIMEOUT_MS).toISOString();
    const rows = db.prepare("SELECT * FROM call_sessions WHERE status='ringing' AND createdAt<?").all(cutoff);
    let n = 0; for (const row of rows) if (markMissedIfNeeded(row)) n += 1;
    return n;
  }

  function register(app) {
    const sweeper = setInterval(() => { try { sweepRinging(); } catch (_) {} }, 15_000); if (sweeper.unref) sweeper.unref();
    app.post("/api/zeeza/calls", A, (req, res) => {
      const targetId = String(req.body?.userId || "");
      const media = VALID_MEDIA.has(String(req.body?.media)) ? String(req.body.media) : "audio";
      if (!targetId || targetId === req.user.id) return res.status(400).json({ error: "Choose another friend to call." });
      if (!areFriends(req.user.id, targetId)) return res.status(403).json({ error: "Calls are available between friends." });
      if (isBlocked(req.user.id, targetId)) return res.status(403).json({ error: "You can't call this person." });
      const active = db.prepare("SELECT id FROM call_sessions WHERE ((callerId=? AND calleeId=?) OR (callerId=? AND calleeId=?)) AND status IN ('ringing','active') ORDER BY createdAt DESC LIMIT 1").get(req.user.id,targetId,targetId,req.user.id);
      if (active) return res.status(409).json({ error: "A call is already active between you." });
      const id = genRowId("call");
      const t = now();
      db.transaction(() => {
        db.prepare("INSERT INTO call_sessions (id,callerId,calleeId,media,status,createdAt) VALUES (?,?,?,?,?,?)").run(id,req.user.id,targetId,media,"ringing",t);
        db.prepare("INSERT INTO call_participants (id,callId,userId,role,joinedAt) VALUES (?,?,?,?,?)").run(genRowId("callp"),id,req.user.id,"caller",t);
        db.prepare("INSERT INTO call_participants (id,callId,userId,role,joinedAt) VALUES (?,?,?,?,?)").run(genRowId("callp"),id,targetId,"callee",t);
      })();
      if (sendPush) sendPush(targetId, "Incoming NEXA call", `${media === "video" ? "Video" : "Voice"} call from ${userRow(req.user.id)?.name || "a friend"}`, { screen: "call", callId: id, media });
      res.status(201).json({ call: out(getCall(id), req.user.id), iceServers: iceServers() });
    });

    app.get("/api/zeeza/calls/:callId", A, (req,res) => {
      const call = requireParticipant(req,res); if (!call) return;
      const fresh = expireIfNeeded(call);
      res.json({ call: out(fresh, req.user.id), iceServers: iceServers() });
    });

    app.post("/api/zeeza/calls/:callId/accept", A, (req,res) => {
      let call = requireParticipant(req,res); if (!call) return;
      if (call.calleeId !== req.user.id) return res.status(403).json({ error: "Only the called participant can accept this call." });
      call = expireIfNeeded(call);
      if (call.status !== "ringing") return res.status(409).json({ error: `Call is already ${call.status}.` });
      const t = now();
      db.prepare("UPDATE call_sessions SET status='active',startedAt=? WHERE id=? AND status='ringing'").run(t,call.id);
      res.json({ call: out(getCall(call.id), req.user.id), iceServers: iceServers() });
    });

    app.post("/api/zeeza/calls/:callId/decline", A, (req,res) => {
      const call = requireParticipant(req,res); if (!call) return;
      if (call.status === "ringing") db.prepare("UPDATE call_sessions SET status='declined',endedAt=? WHERE id=? AND status='ringing'").run(now(),call.id);
      res.json({ call: out(getCall(call.id), req.user.id) });
    });

    app.post("/api/zeeza/calls/:callId/end", A, (req,res) => {
      const call = requireParticipant(req,res); if (!call) return;
      if (!TERMINAL.includes(call.status)) db.prepare("UPDATE call_sessions SET status='ended',endedAt=? WHERE id=?").run(now(),call.id);
      res.json({ call: out(getCall(call.id), req.user.id) });
    });

    app.post("/api/zeeza/calls/:callId/signals", A, (req,res) => {
      const call = requireParticipant(req,res); if (!call) return;
      const type = String(req.body?.type || "");
      if (!VALID_TYPES.has(type)) return res.status(400).json({ error: "Unsupported call signal." });
      if (TERMINAL.includes(call.status)) return res.status(409).json({ error: "This call has ended." });
      const payload = req.body?.payload;
      if (!payload || typeof payload !== "object" || JSON.stringify(payload).length > 100000) return res.status(400).json({ error: "Invalid call signal." });
      const id = genRowId("callsig");
      db.prepare("INSERT INTO call_signals (id,callId,senderId,type,payload,createdAt) VALUES (?,?,?,?,?,?)").run(id,call.id,req.user.id,type,JSON.stringify(payload),now());
      res.status(201).json({ ok:true, id });
    });

    app.get("/api/zeeza/calls/:callId/signals", A, (req,res) => {
      const call = requireParticipant(req,res); if (!call) return;
      const after = String(req.query.after || "");
      const rows = after
        ? db.prepare("SELECT id,senderId,type,payload,createdAt FROM call_signals WHERE callId=? AND createdAt>? ORDER BY createdAt ASC LIMIT ?").all(call.id,after,SIGNAL_LIMIT)
        : db.prepare("SELECT id,senderId,type,payload,createdAt FROM call_signals WHERE callId=? ORDER BY createdAt ASC LIMIT ?").all(call.id,SIGNAL_LIMIT);
      res.json({ signals: rows.map(r=>({id:r.id,senderId:r.senderId,type:r.type,payload:JSON.parse(r.payload),createdAt:r.createdAt})) });
    });
  }
  return { register, sweepRinging };
}

module.exports = { createCallSignaling, RING_TIMEOUT_MS };

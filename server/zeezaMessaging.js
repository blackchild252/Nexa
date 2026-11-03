// Social layer, part 2 (V3.17): direct messages and rooms. Built on top of friends.js — a DM
// requires the two people already being friends (no cold-DMs from strangers), and a block in
// either direction closes both the thread and any future one. Rooms are open group chats
// (split/pot/ajo groups already cover shared *money*; rooms are just conversation) joined with
// an 8-character invite code, the same idiom vendor_staff and money_groups use.
"use strict";

const crypto = require("crypto");
const fs = require("fs");

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0, 1
const MAX_ROOM_MEMBERS = 200;
const MAX_MESSAGE_LEN = 2000;
const PAGE_SIZE = 50;
const continuity = require("./zeezaMessagingContinuity");
const inviteIntegrity = require("./v5_81_0_room_invite_integrity");

class ChatError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function createZeezaMessaging({ db, auth, sendPush, genRowId, friends, messageLimiter, audioUpload }) {
  const now = () => new Date().toISOString();
  const { isBlocked, areFriends, publicUser, shortName, userRow } = friends;
  const inviteExpiry = () => inviteIntegrity.expiryFrom();

  function cleanBody(raw) {
    const body = String(raw ?? "").trim();
    if (!body) throw new ChatError(400, "Message can't be empty.");
    if (body.length > MAX_MESSAGE_LEN) throw new ChatError(400, `Message is too long (${MAX_MESSAGE_LEN} characters max).`);
    return body;
  }

  // ---------- DMs ----------

  function threadKey(a, b) {
    return a < b ? [a, b] : [b, a];
  }

  function findOrCreateThread(a, b) {
    const [userAId, userBId] = threadKey(a, b);
    const tx = db.transaction(() => {
      let t = db.prepare("SELECT * FROM dm_threads WHERE userAId = ? AND userBId = ?").get(userAId, userBId);
      if (t) return t;
      const id = genRowId("dmt");
      try {
        db.prepare("INSERT INTO dm_threads (id, userAId, userBId, createdAt) VALUES (?,?,?,?)").run(id, userAId, userBId, now());
      } catch (e) {
        if (!String(e?.message || "").toLowerCase().includes("unique")) throw e;
      }
      return db.prepare("SELECT * FROM dm_threads WHERE userAId = ? AND userBId = ?").get(userAId, userBId);
    });
    const t = tx();
    if (!t) throw new ChatError(409, "The conversation changed before it could be opened. Try again.");
    return t;
  }

  function otherUserId(thread, myId) {
    return thread.userAId === myId ? thread.userBId : thread.userAId;
  }

  // ---------- rooms ----------

  function newInviteCode() {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = inviteIntegrity.newCode();
      if (!db.prepare("SELECT 1 FROM chat_rooms WHERE inviteCode = ?").get(code)) return code;
    }
    throw new ChatError(500, "Could not create an invite code. Try again.");
  }

  function membership(roomId, userId) {
    return db.prepare("SELECT * FROM chat_room_members WHERE roomId = ? AND userId = ?").get(roomId, userId);
  }

  function requireMember(req, res, next) {
    const room = db.prepare("SELECT * FROM chat_rooms WHERE id = ?").get(req.params.roomId);
    if (!room) return res.status(404).json({ error: "Room not found." });
    const m = membership(room.id, req.user.id);
    if (!m) return res.status(403).json({ error: "You're not a member of this room." });
    req.room = room;
    req.roomRole = m.role;
    next();
  }

  function roomOut(row, myRole) {
    const memberCount = db.prepare("SELECT COUNT(*) AS n FROM chat_room_members WHERE roomId = ?").get(row.id).n;
    return { id: row.id, name: row.name, myRole, memberCount, inviteCode: myRole === "owner" ? row.inviteCode : undefined, inviteExpiresAt: myRole === "owner" ? row.inviteExpiresAt : undefined, createdAt: row.createdAt };
  }

  const handle = (fn) => (req, res) => {
    try { fn(req, res); }
    catch (e) {
      if (e instanceof ChatError) return res.status(e.status).json({ error: e.message });
      console.error("[NEXA chat]", e);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };
  const A = auth.authMiddleware;
  const limited = messageLimiter ? [messageLimiter] : [];

  function register(app) {
    // ================= Direct messages =================

    // My DM inbox: one row per thread, with the other person and a preview of the last message.
    app.get("/api/social/dm/threads", A, handle((req, res) => {
      const rows = db.prepare(
        "SELECT * FROM dm_threads WHERE userAId = ? OR userBId = ? ORDER BY COALESCE(lastMessageAt, createdAt) DESC LIMIT ?"
      ).all(req.user.id, req.user.id, continuity.threadListLimit());
      const out = rows.map((t) => {
        const otherId = otherUserId(t, req.user.id);
        const last = db.prepare("SELECT body, kind, senderId, createdAt FROM dm_messages WHERE threadId = ? ORDER BY createdAt DESC LIMIT 1").get(t.id);
        const unread = continuity.capUnread(db.prepare("SELECT COUNT(*) AS n FROM dm_messages WHERE threadId = ? AND senderId != ? AND readAt IS NULL").get(t.id, req.user.id).n);
        return { id: t.id, with: publicUser(userRow(otherId)), lastMessage: last ? { body: last.kind === "voice" ? "🎙 Voice note" : last.body, mine: last.senderId === req.user.id, createdAt: last.createdAt } : null, unread };
      });
      res.json({ threads: out });
    }));

    // Open (or silently create) my thread with a friend — call this when the person taps a
    // friend's name from the friends list, before showing the message view.
    app.post("/api/social/dm/open", A, handle((req, res) => {
      const otherId = String((req.body || {}).userId || "");
      if (!otherId || otherId === req.user.id) throw new ChatError(400, "Choose someone to message.");
      if (!areFriends(req.user.id, otherId)) throw new ChatError(403, "You can only message friends. Send a friend request first.");
      const t = findOrCreateThread(req.user.id, otherId);
      res.json({ threadId: t.id, with: publicUser(userRow(otherId)) });
    }));

    app.get("/api/social/dm/threads/:threadId/messages", A, handle((req, res) => {
      const t = db.prepare("SELECT * FROM dm_threads WHERE id = ? AND (userAId = ? OR userBId = ?)").get(req.params.threadId, req.user.id, req.user.id);
      if (!t) throw new ChatError(404, "Conversation not found.");
      const before = req.query.before ? String(req.query.before) : null;
      const limit = continuity.boundedLimit(req.query.limit);
      const fetched = db.prepare("SELECT * FROM dm_messages WHERE threadId = ? ORDER BY createdAt DESC, id DESC LIMIT ?").all(t.id, limit + 1);
      const filtered = before ? fetched.filter((row) => continuity.messageBefore(row, before)) : fetched;
      const page = filtered.slice(0, limit);
      const hasMore = filtered.length > limit;
      const visibleIds = page.map((m) => m.id);
      if (visibleIds.length) {
        const placeholders = visibleIds.map(() => "?").join(",");
        db.prepare(`UPDATE dm_messages SET readAt = ? WHERE threadId = ? AND senderId != ? AND readAt IS NULL AND id IN (${placeholders})`).run(now(), t.id, req.user.id, ...visibleIds);
      }
      const ordered = page.reverse();
      res.json({
        with: publicUser(userRow(otherUserId(t, req.user.id))),
        messages: ordered.map((m) => ({ id: m.id, mine: m.senderId === req.user.id, body: m.body, kind: m.kind || "text", mediaUrl: m.mediaUrl || null, createdAt: m.createdAt })),
        hasMore,
        nextBefore: hasMore && ordered.length ? continuity.messageCursor(ordered[0]) : null,
      });
    }));

    app.post("/api/social/dm/threads/:threadId/messages", A, ...limited, handle((req, res) => {
      const t = db.prepare("SELECT * FROM dm_threads WHERE id = ? AND (userAId = ? OR userBId = ?)").get(req.params.threadId, req.user.id, req.user.id);
      if (!t) throw new ChatError(404, "Conversation not found.");
      const otherId = otherUserId(t, req.user.id);
      const body = cleanBody((req.body || {}).body);
      require("./contentSafety").assertText(body);
      const id = genRowId("dm");
      const createdAt = now();
      const tx = db.transaction(() => {
        const current = db.prepare("SELECT * FROM dm_threads WHERE id = ? AND (userAId = ? OR userBId = ?)").get(t.id, req.user.id, req.user.id);
        if (!current) throw new ChatError(404, "Conversation not found.");
        const currentOtherId = otherUserId(current, req.user.id);
        if (isBlocked(req.user.id, currentOtherId)) throw new ChatError(403, "You can't message this person.");
        if (!areFriends(req.user.id, currentOtherId)) throw new ChatError(403, "You're no longer friends with this person.");
        db.prepare("INSERT INTO dm_messages (id, threadId, senderId, body, kind, mediaUrl, createdAt) VALUES (?,?,?,?,?,?,?)").run(id, current.id, req.user.id, body, "text", null, createdAt);
        db.prepare("UPDATE dm_threads SET lastMessageAt = ? WHERE id = ?").run(createdAt, current.id);
      });
      tx();
      if (sendPush) sendPush(otherId, shortName(userRow(req.user.id).name), body.slice(0, 140), { screen: "dm_thread", threadId: t.id });
      res.json({ message: { id, mine: true, body, kind:"text", mediaUrl:null, createdAt } });
    }));

    app.post("/api/social/dm/threads/:threadId/voice", A, ...limited, audioUpload ? audioUpload.single("audio") : (req,res,next)=>next(), handle((req, res) => {
      const t = db.prepare("SELECT * FROM dm_threads WHERE id = ? AND (userAId = ? OR userBId = ?)").get(req.params.threadId, req.user.id, req.user.id);
      if (!t) throw new ChatError(404, "Conversation not found.");
      const otherId=otherUserId(t,req.user.id);
      if(isBlocked(req.user.id,otherId) || !areFriends(req.user.id,otherId)) throw new ChatError(403,"You can't send a voice note to this person.");
      const file=req.file; if(!file?.path) throw new ChatError(400,"A voice note is required.");
      const maxBytes=2*1024*1024; if(Number(file.size||0)>maxBytes){try{fs.unlinkSync(file.path);}catch(_){} throw new ChatError(413,"That voice note is too large. Keep it under 2 MB.");}
      const ext=String(file.originalname||".m4a").toLowerCase().match(/\.(m4a|mp3|wav|webm|ogg|aac|caf|mp4|3gp)$/)?.[1]||"m4a";
      const mime=String(file.mimetype||"audio/m4a"); const mediaUrl=`data:${mime};base64,${fs.readFileSync(file.path).toString("base64")}`; const id=genRowId("dm"); const createdAt=now();
      try{db.transaction(()=>{const current=db.prepare("SELECT * FROM dm_threads WHERE id=? AND (userAId=? OR userBId=?)").get(t.id,req.user.id,req.user.id);if(!current)throw new ChatError(404,"Conversation not found.");db.prepare("INSERT INTO dm_messages (id,threadId,senderId,body,kind,mediaUrl,createdAt) VALUES(?,?,?,?,?,?,?)").run(id,current.id,req.user.id,"Voice note","voice",mediaUrl,createdAt);db.prepare("UPDATE dm_threads SET lastMessageAt=? WHERE id=?").run(createdAt,current.id);})();}finally{try{fs.unlinkSync(file.path);}catch(_){} }
      if(sendPush)sendPush(otherId,shortName(userRow(req.user.id).name),"🎙 Voice note",{screen:"dm_thread",threadId:t.id});
      res.json({message:{id,mine:true,body:"Voice note",kind:"voice",mediaUrl,createdAt}});
    }));

    // ================= Rooms =================

    app.get("/api/social/rooms", A, handle((req, res) => {
      const rows = db.prepare(
        "SELECT r.*, m.role FROM chat_room_members m JOIN chat_rooms r ON r.id = m.roomId WHERE m.userId = ? ORDER BY r.updatedAt DESC LIMIT ?"
      ).all(req.user.id, continuity.threadListLimit());
      res.json({ rooms: rows.map((r) => roomOut(r, r.role)) });
    }));

    app.post("/api/social/rooms", A, ...limited, handle((req, res) => {
      const name = String((req.body || {}).name || "").trim().slice(0, 60);
      if (!name) throw new ChatError(400, "Give the room a name.");
      const id = genRowId("room");
      const code = newInviteCode();
      const tx = db.transaction(() => {
        db.prepare("INSERT INTO chat_rooms (id, name, ownerId, inviteCode, inviteExpiresAt, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)").run(id, name, req.user.id, code, inviteExpiry(), now(), now());
        db.prepare("INSERT INTO chat_room_members (id, roomId, userId, role, joinedAt) VALUES (?,?,?,?,?)").run(genRowId("rm"), id, req.user.id, "owner", now());
      });
      tx();
      res.json({ room: roomOut(db.prepare("SELECT * FROM chat_rooms WHERE id = ?").get(id), "owner") });
    }));

    app.post("/api/social/rooms/join", A, ...limited, handle((req, res) => {
      const code = inviteIntegrity.normalizeCode((req.body || {}).code);
      const room = code ? db.prepare("SELECT * FROM chat_rooms WHERE inviteCode = ?").get(code) : null;
      if (!room) throw new ChatError(404, "That room code isn't valid.");
      if (inviteIntegrity.isExpired(room.inviteExpiresAt)) throw new ChatError(410, "That room invite has expired. Ask the owner for a new code.");
      if (membership(room.id, req.user.id)) return res.json({ room: roomOut(room, membership(room.id, req.user.id).role) });
      const joined = db.transaction(() => {
        const currentRoom = db.prepare("SELECT * FROM chat_rooms WHERE id = ? AND inviteCode = ?").get(room.id, code);
        if (!currentRoom) throw new ChatError(404, "That room is no longer available.");
        const existing = db.prepare("SELECT * FROM chat_room_members WHERE roomId = ? AND userId = ?").get(currentRoom.id, req.user.id);
        if (existing) return { room: currentRoom, role: existing.role, created: false };
        const count = db.prepare("SELECT COUNT(*) AS n FROM chat_room_members WHERE roomId = ?").get(currentRoom.id).n;
        if (count >= MAX_ROOM_MEMBERS) throw new ChatError(409, "This room is full.");
        const inserted = db.prepare("INSERT INTO chat_room_members (id, roomId, userId, role, joinedAt) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM chat_room_members WHERE roomId = ?) < ?").run(genRowId("rm"), currentRoom.id, req.user.id, "member", now(), currentRoom.id, MAX_ROOM_MEMBERS);
        if (!inserted.changes) throw new ChatError(409, "This room filled up before you could join it.");
        return { room: currentRoom, role: "member", created: true };
      })();
      if (joined.created && sendPush) sendPush(joined.room.ownerId, joined.room.name, `${shortName(userRow(req.user.id).name)} joined the room`, { screen: "chat_room", roomId: joined.room.id });
      res.json({ room: roomOut(joined.room, joined.role) });
    }));

    app.post("/api/social/rooms/:roomId/invite/rotate", A, handle((req, res) => {
      const room = db.prepare("SELECT * FROM chat_rooms WHERE id = ? AND ownerId = ?").get(req.params.roomId, req.user.id);
      if (!room) throw new ChatError(404, "Room not found.");
      const nextCode = (() => { for (let i = 0; i < 10; i++) { const c = inviteIntegrity.newCode(); if (!db.prepare("SELECT 1 FROM chat_rooms WHERE inviteCode = ?").get(c)) return c; } throw new ChatError(500, "Could not rotate the invite code. Try again."); })();
      const expiresAt = inviteExpiry();
      db.prepare("UPDATE chat_rooms SET inviteCode = ?, inviteExpiresAt = ?, updatedAt = ? WHERE id = ? AND ownerId = ?").run(nextCode, expiresAt, now(), room.id, req.user.id);
      res.json({ ok: true, inviteCode: nextCode, inviteExpiresAt: expiresAt });
    }));

    app.post("/api/social/rooms/:roomId/invite/revoke", A, handle((req, res) => {
      const room = db.prepare("SELECT * FROM chat_rooms WHERE id = ? AND ownerId = ?").get(req.params.roomId, req.user.id);
      if (!room) throw new ChatError(404, "Room not found.");
      const expiresAt = new Date(0).toISOString();
      db.prepare("UPDATE chat_rooms SET inviteExpiresAt = ?, updatedAt = ? WHERE id = ? AND ownerId = ?").run(expiresAt, now(), room.id, req.user.id);
      res.json({ ok: true, revoked: true });
    }));

    app.get("/api/social/rooms/:roomId/members", A, requireMember, handle((req, res) => {
      const rows = db.prepare(
        "SELECT m.role, m.joinedAt, u.id, u.name, u.username FROM chat_room_members m JOIN users u ON u.id = m.userId WHERE m.roomId = ? ORDER BY m.role ASC, m.joinedAt ASC"
      ).all(req.room.id);
      res.json({ members: rows.map((r) => ({ ...publicUser(r), role: r.role, joinedAt: r.joinedAt })) });
    }));

    app.get("/api/social/rooms/:roomId/messages", A, requireMember, handle((req, res) => {
      const before = req.query.before ? String(req.query.before) : null;
      const limit = continuity.boundedLimit(req.query.limit);
      const fetched = db.prepare("SELECT * FROM room_messages WHERE roomId = ? ORDER BY createdAt DESC, id DESC LIMIT ?").all(req.room.id, limit + 1);
      const filtered = before ? fetched.filter((row) => continuity.messageBefore(row, before)) : fetched;
      const rows = filtered.slice(0, limit);
      const hasMore = filtered.length > limit;
      const senderIds = [...new Set(rows.map((m) => m.senderId))];
      const senders = new Map(senderIds.map((id) => [id, publicUser(userRow(id))]));
      const ordered = rows.reverse();
      res.json({
        room: roomOut(req.room, req.roomRole),
        messages: ordered.map((m) => ({ id: m.id, mine: m.senderId === req.user.id, sender: senders.get(m.senderId) || null, body: m.body, createdAt: m.createdAt })),
        hasMore,
        nextBefore: hasMore && ordered.length ? continuity.messageCursor(ordered[0]) : null,
      });
    }));

    app.post("/api/social/rooms/:roomId/messages", A, requireMember, ...limited, handle((req, res) => {
      const body = cleanBody((req.body || {}).body);
      require("./contentSafety").assertText(body);
      const id = genRowId("rmsg");
      const createdAt = now();
      const tx = db.transaction(() => {
        const active = db.prepare("SELECT 1 FROM chat_room_members WHERE roomId = ? AND userId = ?").get(req.room.id, req.user.id);
        if (!active) throw new ChatError(403, "You're no longer a member of this room.");
        const inserted = db.prepare("INSERT INTO room_messages (id, roomId, senderId, body, createdAt) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM chat_room_members WHERE roomId = ? AND userId = ?)").run(id, req.room.id, req.user.id, body, createdAt, req.room.id, req.user.id);
        if (!inserted.changes) throw new ChatError(403, "You're no longer a member of this room.");
        db.prepare("UPDATE chat_rooms SET updatedAt = ? WHERE id = ?").run(createdAt, req.room.id);
      });
      tx();
      res.json({ message: { id, mine: true, sender: publicUser(userRow(req.user.id)), body, createdAt } });
    }));

    // Leave a room I'm in. The owner can't leave (they'd orphan it) — they delete it instead.
    app.post("/api/social/rooms/:roomId/leave", A, requireMember, handle((req, res) => {
      if (req.roomRole === "owner") throw new ChatError(400, "As the owner, delete the room instead of leaving it.");
      db.prepare("DELETE FROM chat_room_members WHERE roomId = ? AND userId = ?").run(req.room.id, req.user.id);
      res.json({ ok: true });
    }));

    // Owner removes a member, or deletes the whole room (roomId only, no memberId).
    app.delete("/api/social/rooms/:roomId/members/:memberId", A, requireMember, handle((req, res) => {
      if (req.roomRole !== "owner") throw new ChatError(403, "Only the room owner can remove members.");
      if (req.params.memberId === req.user.id) throw new ChatError(400, "You can't remove yourself — delete the room instead.");
      db.prepare("DELETE FROM chat_room_members WHERE roomId = ? AND userId = ?").run(req.room.id, req.params.memberId);
      res.json({ ok: true });
    }));

    app.delete("/api/social/rooms/:roomId", A, requireMember, handle((req, res) => {
      if (req.roomRole !== "owner") throw new ChatError(403, "Only the room owner can delete this room.");
      const tx = db.transaction(() => {
        db.prepare("DELETE FROM room_messages WHERE roomId = ?").run(req.room.id);
        db.prepare("DELETE FROM chat_room_members WHERE roomId = ?").run(req.room.id);
        db.prepare("DELETE FROM chat_rooms WHERE id = ?").run(req.room.id);
      });
      tx();
      res.json({ ok: true });
    }));
  }

  return { register };
}

module.exports = { createZeezaMessaging };

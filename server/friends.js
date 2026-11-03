// Social layer, part 1 (V3.17): usernames, friend requests and blocking. Email is never shown to
// another user anywhere in NEXA — a username is the only thing people search for and see. It's
// opt-in: nothing here forces a user to set one before using chat/rooms, they just can't be found
// by username (or add friends by username) until they do.
"use strict";
const { normalizeAppeal, canAppeal } = require("./trustAppeals");
const { appealWindow } = require("./trustSafetyMaturity");
const crypto = require("crypto");
const { validateProfile } = require("./profileValidation");
const { validateAvatarPayload } = require("./profileAvatar");
const { PLANS } = require("./subscriptions");
const privacyAuthorization = require("./v5_63_0_privacy_authorization");
const zeezaShareIntegrity = require("./v5_80_0_zeeza_share_integrity");
const aamiEconomy = require("./aamiEconomy");
// ZEEZA_SHARE_INTEGRITY_CERTIFIED


class FriendsError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const { USERNAME_RE, RESERVED } = require("./signupUsername"); // one shared username rule
const ZEEZA_CHASE_TERMS_VERSION = "1.1";
const CHASE_LIMITS = { local: 5, country: 2, international: 1 };
const CHASE_LOCATION_COOLDOWN_MS = 72 * 60 * 60 * 1000;
const CHASE_PENDING_MAX = 5;

function cleanArea(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 60);
}
function normArea(value) { return cleanArea(value).toLowerCase(); }
function locationTier(from, target) {
  if (from?.locationCell && target?.locationCell && String(from.locationCell) === String(target.locationCell)) return "local";
  const fc = normArea(from?.zeezaExploreCountry), tc = normArea(target?.zeezaExploreCountry);
  const fa = normArea(from?.zeezaExploreCity), ta = normArea(target?.zeezaExploreCity);
  if (fc && tc && fc === tc && fa && ta && fa === ta) return "local";
  if (fc && tc && fc === tc) return "country";
  return "international";
}

function createFriends({ db, auth, sendPush, genRowId, actionLimiter }) {
  const now = () => new Date().toISOString();

  // First name + last initial — same identity rule staff.js and group members use: one person
  // is never shown another's full legal name or email.
  function shortName(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length || parts[0].includes("@")) return "NEXA user";
    const first = parts[0].slice(0, 20);
    return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
  }

  function userRow(userId) {
    return db.prepare("SELECT id, name, username, avatarUrl, profileVisibility FROM users WHERE id = ?").get(userId);
  }

  function isBlocked(a, b) {
    // true if EITHER has blocked the other — a mutual dead end either way.
    return !!db.prepare(
      "SELECT 1 FROM blocks WHERE (blockerId = ? AND blockedId = ?) OR (blockerId = ? AND blockedId = ?)"
    ).get(a, b, b, a);
  }

  function publicUser(row, { allowPrivateAvatar = false } = {}) {
    if (!row) return null;
    const visibility = row.profileVisibility || "friends";
    const avatarVisible = !!row.avatarUrl && (allowPrivateAvatar || visibility === "public");
    return {
      id: row.id,
      username: row.username || null,
      name: shortName(row.name),
      avatarUrl: avatarVisible ? row.avatarUrl : null,
    };
  }

  function chaseUser(row, tier, viewerId) {
    if (!row) return null;
    const likeCount = Number(db.prepare("SELECT COUNT(*) AS n FROM chase_profile_likes WHERE profileId=?").get(row.id)?.n || 0);
    const commentCount = Number(db.prepare("SELECT COUNT(*) AS n FROM chase_profile_comments WHERE profileId=?").get(row.id)?.n || 0);
    const likedByMe = !!db.prepare("SELECT 1 FROM chase_profile_likes WHERE profileId=? AND viewerId=?").get(row.id, viewerId);
    return {
      id: row.id, username: row.username || null, name: shortName(row.name), avatarUrl: row.avatarUrl || null, bio: row.profileBio || "",
      country: row.zeezaExploreCountry || null, city: row.zeezaExploreCity || null, proximity: tier,
      age: row.zeezaChaseAge == null ? null : Number(row.zeezaChaseAge), nationality: row.zeezaChaseNationality || null,
      heightCm: row.zeezaChaseHeightCm == null ? null : Number(row.zeezaChaseHeightCm), jobType: row.zeezaChaseJobType || null,
      ageTrustStatus: row.zeezaAgeTrustStatus || "self_declared", likeCount, commentCount, likedByMe, demo: !!row.chaseDemo
    };
  }

  function chasePlan(userId) {
    const row = db.prepare("SELECT planId, status FROM nexa_subscriptions WHERE userId = ?").get(userId);
    const planId = row?.status === "active" ? row.planId : "free";
    return PLANS[planId] || PLANS.free;
  }

  function canChaseRequest(reqUserId, target) {
    const me = db.prepare("SELECT zeezaExploreCountry, zeezaExploreCity, locationCell FROM users WHERE id = ?").get(reqUserId) || {};
    const tier = locationTier(me, target);
    const plan = chasePlan(reqUserId);
    const tierLimit = Number(plan.chaseReach?.limits?.[tier] || 0);
    if (!tierLimit) {
      throw new FriendsError(403, tier === "country"
        ? "Country-wide Chase discovery is available on Regular and above. Upgrade your NEXA membership to chase farther."
        : "Global Chase discovery is available on Premium and above. Upgrade your NEXA membership to chase farther.");
    }
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const priorRows = db.prepare("SELECT toUserId FROM friend_requests WHERE fromUserId = ? AND source IN ('explore','chase') AND createdAt >= ? AND status != 'cancelled'").all(reqUserId, cutoff);
    if (priorRows.length >= 100) throw new FriendsError(429, "You've reached today's Chase request safety ceiling. Try again tomorrow.");
    const meForHistory = me;
    let usedTier = 0;
    for (const prior of priorRows) {
      const priorTarget = db.prepare("SELECT zeezaExploreCountry, zeezaExploreCity FROM users WHERE id = ?").get(prior.toUserId);
      if (priorTarget && locationTier(meForHistory, priorTarget) === tier) usedTier += 1;
    }
    if (usedTier >= tierLimit) {
      throw new FriendsError(429, tier === "local"
        ? "You've reached today's nearby Chase add limit. Try again tomorrow."
        : tier === "country"
          ? "You've reached today's country-wide Chase add limit for your plan."
          : "You've reached today's distant Chase add limit for your plan. For safety, distant adds remain intentionally limited.");
    }
    const pending = db.prepare("SELECT COUNT(*) AS n FROM friend_requests WHERE fromUserId = ? AND source IN ('explore','chase') AND status = 'pending'").get(reqUserId)?.n || 0;
    if (pending >= CHASE_PENDING_MAX) throw new FriendsError(429, "You have several pending Chase requests. Wait for some to be accepted before adding more strangers.");
    return tier;
  }

  function areFriends(a, b) {
    return !!db.prepare("SELECT 1 FROM friendships WHERE userId = ? AND friendId = ?").get(a, b);
  }

  // Removes any live friendship AND any pending request between two people, in either direction.
  // Used by both block() and unfriend() aren't the same thing, so only block() calls this — see below.
  function severFriendship(a, b) {
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM friendships WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)").run(a, b, b, a);
      db.prepare(
        "UPDATE friend_requests SET status = 'cancelled', respondedAt = ? WHERE status = 'pending' AND ((fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?))"
      ).run(now(), a, b, b, a);
    });
    tx();
  }

  const handle = (fn) => (req, res) => {
    try { fn(req, res); }
    catch (e) {
      if (e instanceof FriendsError) return res.status(e.status).json({ error: e.message });
      console.error("[NEXA friends]", e);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };
  const A = auth.authMiddleware;
  const limited = actionLimiter ? [actionLimiter] : [];

  function register(app) {
    aamiEconomy.ensureSchema(db);
    db.exec(`
      CREATE TABLE IF NOT EXISTS chase_profile_likes (
        profileId TEXT NOT NULL, viewerId TEXT NOT NULL, createdAt TEXT NOT NULL,
        PRIMARY KEY(profileId,viewerId)
      );
      CREATE INDEX IF NOT EXISTS idx_chase_profile_likes_profile ON chase_profile_likes(profileId);
      CREATE TABLE IF NOT EXISTS chase_profile_comments (
        id TEXT PRIMARY KEY, profileId TEXT NOT NULL, userId TEXT NOT NULL, comment TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chase_profile_comments_profile ON chase_profile_comments(profileId,createdAt DESC);
    `);

    // ---------- username ----------

    app.get("/api/social/username/check", A, handle((req, res) => {
      const u = String(req.query.u || "").toLowerCase().trim();
      if (!USERNAME_RE.test(u)) return res.json({ available: false, reason: "3-20 characters, start with a letter, letters/numbers/underscore only." });
      if (RESERVED.has(u)) return res.json({ available: false, reason: "That username is reserved." });
      const taken = db.prepare("SELECT 1 FROM users WHERE username = ? COLLATE NOCASE AND id != ?").get(u, req.user.id);
      res.json({ available: !taken, reason: taken ? "Already taken." : undefined });
    }));

    app.post("/api/social/username", A, ...limited, handle((req, res) => {
      const raw = String((req.body || {}).username || "").trim();
      const u = raw.toLowerCase();
      if (!USERNAME_RE.test(u)) throw new FriendsError(400, "3-20 characters, start with a letter, letters/numbers/underscore only.");
      if (RESERVED.has(u)) throw new FriendsError(409, "That username is reserved.");
      const taken = db.prepare("SELECT 1 FROM users WHERE username = ? COLLATE NOCASE AND id != ?").get(u, req.user.id);
      if (taken) throw new FriendsError(409, "That username is already taken.");
      db.prepare("UPDATE users SET username = ?, usernameSetAt = ? WHERE id = ?").run(u, now(), req.user.id);
      res.json({ username: u });
    }));

    // ---------- search ----------

    // Prefix search only (no substring scan of everyone's handle), and never surfaces someone
    // who has blocked the searcher or been blocked by them.
    app.get("/api/social/users/search", A, handle((req, res) => {
      const q = String(req.query.q || "").toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
      if (q.length < 2) return res.json({ users: [] });
      const rows = db.prepare(
        "SELECT id, name, username, avatarUrl, profileVisibility FROM users WHERE username LIKE ? AND id != ? AND COALESCE(accountStatus, 'active') = 'active' ORDER BY username LIMIT 20"
      ).all(`${q}%`, req.user.id);
      const visible = rows.filter((r) => !isBlocked(req.user.id, r.id));
      res.json({ users: visible.map(publicUser) });
    }));

    // ---------- Chase ----------

    const handleChaseDiscovery = (req, res) => {
      const me = db.prepare("SELECT zeezaExploreCountry, zeezaExploreCity, locationCell FROM users WHERE id = ?").get(req.user.id) || {};
      const plan = chasePlan(req.user.id);
      const allowedTiers = plan.chaseReach.tiers;
      const rows = db.prepare(`
        SELECT id, name, username, profileBio, avatarUrl, profileVisibility, zeezaExploreCountry, zeezaExploreCity, locationCell, zeezaChaseAge, zeezaChaseNationality, zeezaChaseHeightCm, zeezaChaseJobType
        FROM users
        WHERE id != ?
          AND accountStatus = 'active'
          AND zeezaExploreOptIn = 1
          AND zeezaExploreTermsVersion = ?
          AND COALESCE(profileVisibility, 'friends') != 'private'
        ORDER BY CASE
          WHEN zeezaExploreCountry = ? AND zeezaExploreCity = ? THEN 0
          WHEN zeezaExploreCountry = ? THEN 1
          ELSE 2 END,
          createdAt DESC
        LIMIT 60
      `).all(req.user.id, ZEEZA_CHASE_TERMS_VERSION,
        me.zeezaExploreCountry || "", me.zeezaExploreCity || "",
        me.zeezaExploreCountry || "");
      const visible = rows.filter((r) => !isBlocked(req.user.id, r.id))
        .map((r) => ({ row: r, tier: locationTier(me, r) }))
        .filter((x) => allowedTiers.includes(x.tier))
        .map((x) => chaseUser(x.row, x.tier, req.user.id));
      res.json({ users: visible, chase: { planId: plan.id, label: plan.chaseReach.label, tiers: [...plan.chaseReach.tiers], limits: { ...plan.chaseReach.limits } } });
    };

    app.get("/api/social/chase", A, ...limited, handle(handleChaseDiscovery));
    app.post("/api/social/chase/:userId/like", A, ...limited, handle((req, res) => {
      const targetId = String(req.params.userId || "").trim();
      if (!targetId || targetId === req.user.id) throw new FriendsError(400, "You cannot like your own Chase showcase.");
      const target = db.prepare("SELECT id,zeezaExploreOptIn,zeezaExploreTermsVersion,profileVisibility,accountStatus FROM users WHERE id=?").get(targetId);
      if (!target || target.accountStatus !== "active" || !target.zeezaExploreOptIn || target.zeezaExploreTermsVersion !== ZEEZA_CHASE_TERMS_VERSION || target.profileVisibility === "private" || isBlocked(req.user.id,targetId)) throw new FriendsError(404,"Chase profile not found.");
      const inserted = db.prepare("INSERT OR IGNORE INTO chase_profile_likes(profileId,viewerId,createdAt) VALUES(?,?,?)").run(targetId,req.user.id,now());
      const likeCount = Number(db.prepare("SELECT COUNT(*) AS n FROM chase_profile_likes WHERE profileId=?").get(targetId)?.n || 0);
      const reward = inserted.changes ? aamiEconomy.awardChaseLikeMilestone(db,targetId,likeCount) : null;
      res.status(inserted.changes ? 201 : 200).json({liked:true,likeCount,reward:reward && reward.amount ? {amount:reward.amount,threshold:reward.threshold} : null});
    }));
    app.delete("/api/social/chase/:userId/like", A, ...limited, handle((req, res) => {
      const targetId = String(req.params.userId || "").trim();
      db.prepare("DELETE FROM chase_profile_likes WHERE profileId=? AND viewerId=?").run(targetId,req.user.id);
      const likeCount = Number(db.prepare("SELECT COUNT(*) AS n FROM chase_profile_likes WHERE profileId=?").get(targetId)?.n || 0);
      res.json({liked:false,likeCount});
    }));
    app.get("/api/social/chase/:userId/comments", A, ...limited, handle((req, res) => {
      const targetId=String(req.params.userId||"").trim();
      if(isBlocked(req.user.id,targetId)) throw new FriendsError(404,"Chase profile not found.");
      const rows=db.prepare("SELECT c.id,c.comment,c.createdAt,u.id userId,u.name,u.username,u.avatarUrl FROM chase_profile_comments c JOIN users u ON u.id=c.userId WHERE c.profileId=? ORDER BY c.createdAt DESC LIMIT 50").all(targetId);
      res.json({comments:rows.map(r=>({id:r.id,comment:r.comment,createdAt:r.createdAt,user:publicUser({id:r.userId,name:r.name,username:r.username,avatarUrl:r.avatarUrl,profileVisibility:'public'})}))});
    }));
    app.post("/api/social/chase/:userId/comments", A, ...limited, handle((req, res) => {
      const targetId=String(req.params.userId||"").trim();
      if(targetId===req.user.id || isBlocked(req.user.id,targetId)) throw new FriendsError(400,"You cannot comment on this Chase profile.");
      const target=db.prepare("SELECT id,zeezaExploreOptIn,zeezaExploreTermsVersion,profileVisibility,accountStatus FROM users WHERE id=?").get(targetId);
      if(!target || target.accountStatus!=='active' || !target.zeezaExploreOptIn || target.zeezaExploreTermsVersion!==ZEEZA_CHASE_TERMS_VERSION || target.profileVisibility==='private') throw new FriendsError(404,"Chase profile not found.");
      const comment=String(req.body?.comment||"").trim().replace(/\s+/g,' ').slice(0,500);
      require("./contentSafety").assertText(comment);
      if(comment.length<1) throw new FriendsError(400,"Comment cannot be empty.");
      const id=genRowId('cc');
      db.prepare("INSERT INTO chase_profile_comments(id,profileId,userId,comment,createdAt) VALUES(?,?,?,?,?)").run(id,targetId,req.user.id,comment,now());
      const commentCount=Number(db.prepare("SELECT COUNT(*) AS n FROM chase_profile_comments WHERE profileId=?").get(targetId)?.n||0);
      res.status(201).json({comment:{id,comment,createdAt:now(),user:publicUser(userRow(req.user.id),{allowPrivateAvatar:true})},commentCount});
    }));

    // Legacy Explore endpoint kept as a compatibility bridge for older clients/deep links.
    // Legacy persisted source = 'explore' remains supported while new requests use 'chase'.
    app.get("/api/social/explore", A, ...limited, handle(handleChaseDiscovery));

    app.post("/api/social/chase/:userId/report", A, ...limited, handle((req, res) => {
      const targetId=String(req.params.userId||"").trim();
      if(!targetId || targetId===req.user.id) throw new FriendsError(400,"Choose a valid Chase account to report.");
      const target=db.prepare("SELECT id,accountStatus,zeezaExploreOptIn FROM users WHERE id=?").get(targetId);
      if(!target || target.accountStatus!=="active" || !target.zeezaExploreOptIn || isBlocked(req.user.id,targetId)) throw new FriendsError(404,"Chase account not found.");
      const reason=String(req.body?.reason||"other").trim().toLowerCase();
      if(!new Set(["spam","harassment","unsafe","nudity","other"]).has(reason)) throw new FriendsError(400,"Choose a valid report reason.");
      const ts=require("./trustSafety");
      res.status(201).json({report:ts.report(db,{reporterId:req.user.id,targetType:"chase_account",targetId:targetId,targetUserId:targetId,reason,details:String(req.body?.details||"").slice(0,1000)})});
    }));

    // ---------- friend requests ----------

    app.post("/api/social/friends/request", A, ...limited, handle((req, res) => {
      const username = String((req.body || {}).username || "").toLowerCase().trim();
      if (!username) throw new FriendsError(400, "Enter a username.");
      const target = db.prepare("SELECT id, name, username FROM users WHERE username = ? COLLATE NOCASE").get(username);
      if (!target) throw new FriendsError(404, "No NEXA user has that username.");
      if (target.id === req.user.id) throw new FriendsError(400, "You can't friend yourself.");
      if (isBlocked(req.user.id, target.id)) throw new FriendsError(403, "You can't send a request to this person.");
      const id = genRowId("fr");
      let outcome;
      try {
        outcome = db.transaction(() => {
          const currentTarget = db.prepare("SELECT id, name, username, avatarUrl, profileVisibility FROM users WHERE id = ?").get(target.id);
          if (!currentTarget) { const e = new FriendsError(404, "No NEXA user has that username."); throw e; }
          if (currentTarget.id === req.user.id) throw new FriendsError(400, "You can't friend yourself.");
          if (isBlocked(req.user.id, currentTarget.id)) throw new FriendsError(403, "You can't send a request to this person.");
          const privacy = db.prepare("SELECT allowFriendRequests, accountStatus FROM users WHERE id=?").get(currentTarget.id);
          if (!privacy || privacy.accountStatus === "closed") throw new FriendsError(404, "No NEXA user has that username.");
          if (privacy.allowFriendRequests === 0) throw new FriendsError(403, "This person isn't accepting friend requests right now.");
          if (areFriends(req.user.id, currentTarget.id)) throw new FriendsError(409, "You're already friends.");

          const reverse = db.prepare("SELECT * FROM friend_requests WHERE fromUserId = ? AND toUserId = ? AND status = 'pending'").get(currentTarget.id, req.user.id);
          if (reverse) {
            const accepted = db.prepare("UPDATE friend_requests SET status = 'accepted', respondedAt = ? WHERE id = ? AND status = 'pending'").run(now(), reverse.id);
            if (!accepted.changes) throw new FriendsError(409, "That friend request changed before it could be accepted.");
            db.prepare("INSERT OR IGNORE INTO friendships (userId, friendId, sourceRequestId, createdAt) VALUES (?,?,?,?)").run(req.user.id, currentTarget.id, reverse.id, now());
            db.prepare("INSERT OR IGNORE INTO friendships (userId, friendId, sourceRequestId, createdAt) VALUES (?,?,?,?)").run(currentTarget.id, req.user.id, reverse.id, now());
            return { status: "accepted", friend: publicUser(currentTarget), notify: true, aamiUsers: [req.user.id, currentTarget.id] };
          }

          const existing = db.prepare("SELECT 1 FROM friend_requests WHERE fromUserId = ? AND toUserId = ? AND status = 'pending'").get(req.user.id, currentTarget.id);
          if (existing) throw new FriendsError(409, "You already sent a request to this person.");
          const inserted = db.prepare("INSERT OR IGNORE INTO friend_requests (id, fromUserId, toUserId, status, createdAt) VALUES (?,?,?,?,?)").run(id, req.user.id, currentTarget.id, "pending", now());
          if (!inserted.changes) throw new FriendsError(409, "You already sent a request to this person.");
          return { status: "pending", request: { id, to: publicUser(currentTarget) }, notify: true };
        })();
      } catch (e) {
        if (e instanceof FriendsError) throw e;
        if (String(e?.message || '').toLowerCase().includes('unique')) throw new FriendsError(409, "This friend request changed before it could be created.");
        throw e;
      }
      if (outcome.notify && sendPush) {
        sendPush(target.id, "NEXA", `${shortName(userRow(req.user.id).name)} sent you a friend request`, { screen: "friend_requests", inAppPopup:true });
      }
      if (outcome.status === "accepted") {
        for (const uid of outcome.aamiUsers || []) aamiEconomy.maybeNotifyAamiUnlock(db, uid, sendPush);
        return res.json({ status: "accepted", friend: outcome.friend });
      }
      res.json({ status: "pending", request: outcome.request });
    }));

    // Everything I need to render a requests inbox: what came in, what I'm still waiting on.
    app.get("/api/social/friends/requests", A, handle((req, res) => {
      const incoming = db.prepare(
        "SELECT r.id, r.createdAt, u.id AS uid, u.name, u.username, u.avatarUrl, u.profileVisibility FROM friend_requests r JOIN users u ON u.id = r.fromUserId WHERE r.toUserId = ? AND r.status = 'pending' ORDER BY r.createdAt DESC"
      ).all(req.user.id);
      const outgoing = db.prepare(
        "SELECT r.id, r.createdAt, u.id AS uid, u.name, u.username, u.avatarUrl, u.profileVisibility FROM friend_requests r JOIN users u ON u.id = r.toUserId WHERE r.fromUserId = ? AND r.status = 'pending' ORDER BY r.createdAt DESC"
      ).all(req.user.id);
      const shape = (rows) => rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        user: publicUser({ id: r.uid, name: r.name, username: r.username, avatarUrl: r.avatarUrl, profileVisibility: r.profileVisibility }),
      }));
      res.json({ incoming: shape(incoming), outgoing: shape(outgoing) });
    }));

    app.post("/api/social/friends/requests/:id/accept", A, handle((req, res) => {
      let accepted;
      const tx = db.transaction(() => {
        const r = db.prepare("SELECT * FROM friend_requests WHERE id = ? AND toUserId = ? AND status = 'pending'").get(req.params.id, req.user.id);
        if (!r) throw new FriendsError(404, "That request isn't there anymore.");
        if (isBlocked(req.user.id, r.fromUserId)) throw new FriendsError(403, "You can't accept this request.");
        const changed = db.prepare("UPDATE friend_requests SET status = 'accepted', respondedAt = ? WHERE id = ? AND toUserId = ? AND status = 'pending'").run(now(), r.id, req.user.id);
        if (!changed.changes) throw new FriendsError(409, "That friend request changed before it could be accepted.");
        db.prepare("INSERT OR IGNORE INTO friendships (userId, friendId, sourceRequestId, createdAt) VALUES (?,?,?,?)").run(r.toUserId, r.fromUserId, r.id, now());
        db.prepare("INSERT OR IGNORE INTO friendships (userId, friendId, sourceRequestId, createdAt) VALUES (?,?,?,?)").run(r.fromUserId, r.toUserId, r.id, now());
        accepted = r;
      });
      tx();
      if (sendPush) sendPush(accepted.fromUserId, "NEXA", `${shortName(userRow(req.user.id).name)} accepted your friend request`, { screen: "friends", inAppPopup:true });
      aamiEconomy.maybeNotifyAamiUnlock(db, req.user.id, sendPush);
      aamiEconomy.maybeNotifyAamiUnlock(db, accepted.fromUserId, sendPush);
      res.json({ friend: publicUser(userRow(accepted.fromUserId)) });
    }));

    app.post("/api/social/friends/requests/:id/decline", A, handle((req, res) => {
      const r = db.prepare("UPDATE friend_requests SET status = 'declined', respondedAt = ? WHERE id = ? AND toUserId = ? AND status = 'pending'").run(now(), req.params.id, req.user.id);
      if (!r.changes) throw new FriendsError(404, "That request isn't there anymore.");
      res.json({ ok: true });
    }));

    // Cancel my own outgoing request.
    app.delete("/api/social/friends/requests/:id", A, handle((req, res) => {
      const r = db.prepare("UPDATE friend_requests SET status = 'cancelled', respondedAt = ? WHERE id = ? AND fromUserId = ? AND status = 'pending'").run(now(), req.params.id, req.user.id);
      if (!r.changes) throw new FriendsError(404, "That request isn't there anymore.");
      res.json({ ok: true });
    }));

    // ---------- friend list ----------

    app.get("/api/social/friends", A, handle((req, res) => {
      const rows = db.prepare(
        "SELECT u.id, u.name, u.username, u.avatarUrl, u.profileVisibility FROM friendships f JOIN users u ON u.id = f.friendId WHERE f.userId = ? ORDER BY u.name"
      ).all(req.user.id);
      res.json({ friends: rows.map((row) => publicUser(row, { allowPrivateAvatar: true })) });
    }));

    app.delete("/api/social/friends/:userId", A, handle((req, res) => {
      const tx = db.transaction(() => {
        db.prepare("DELETE FROM friendships WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)").run(req.user.id, req.params.userId, req.params.userId, req.user.id);
      });
      tx();
      res.json({ ok: true });
    }));

    // ---------- trust & safety reports ----------
    app.post("/api/social/reports", A, ...limited, handle((req, res) => {
      const targetUserId = String(req.body?.targetUserId || "").trim();
      const reason = String(req.body?.reason || "").trim().toLowerCase();
      const details = String(req.body?.details || "").trim().slice(0, 1000);
      const context = String(req.body?.context || "").trim().slice(0, 120);
      const allowed = new Set(["harassment", "spam", "scam", "impersonation", "unsafe", "other"]);
      if (!targetUserId || targetUserId === req.user.id) throw new FriendsError(400, "Choose a valid person to report.");
      if (!allowed.has(reason)) throw new FriendsError(400, "Choose a valid report reason.");
      const target = db.prepare("SELECT id, accountStatus FROM users WHERE id=?").get(targetUserId);
      if (!target || target.accountStatus !== "active") throw new FriendsError(404, "That account is unavailable.");
      const duplicate = db.prepare("SELECT id FROM social_reports WHERE reporterId=? AND targetUserId=? AND status='open' LIMIT 1").get(req.user.id, targetUserId);
      if (duplicate) return res.status(200).json({ report: { id: duplicate.id, status: "open", duplicate: true } });
      const id = genRowId("sr");
      db.prepare("INSERT INTO social_reports(id,reporterId,targetUserId,reason,details,context,status,createdAt) VALUES(?,?,?,?,?,?,?,?)").run(id, req.user.id, targetUserId, reason, details, context, "open", now());
      res.status(201).json({ report: { id, status: "open" } });
    }));

    // ---------- blocking ----------

    app.post("/api/social/block/:userId", A, handle((req, res) => {
      if (req.params.userId === req.user.id) throw new FriendsError(400, "You can't block yourself.");
      db.transaction(() => {
        db.prepare("DELETE FROM friendships WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)").run(req.user.id, req.params.userId, req.params.userId, req.user.id);
        db.prepare(
          "UPDATE friend_requests SET status = 'cancelled', respondedAt = ? WHERE status = 'pending' AND ((fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?))"
        ).run(now(), req.user.id, req.params.userId, req.params.userId, req.user.id);
        db.prepare("INSERT OR IGNORE INTO blocks (blockerId, blockedId, createdAt) VALUES (?,?,?)").run(req.user.id, req.params.userId, now());
      })();
      res.json({ ok: true });
    }));

    app.delete("/api/social/block/:userId", A, handle((req, res) => {
      db.prepare("DELETE FROM blocks WHERE blockerId = ? AND blockedId = ?").run(req.user.id, req.params.userId);
      res.json({ ok: true });
    }));

    app.get("/api/social/reports", A, handle((req, res) => {
      const configured = String(process.env.NEXA_ADMIN_USER_IDS || "").split(",").map(x => x.trim()).filter(Boolean);
      const emails = String(process.env.NEXA_ADMIN_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
      if (!configured.includes(req.user.id) && !emails.includes(String(req.user.email || "").toLowerCase())) return res.status(403).json({ error: "Administrator access required." });
      const status = String(req.query?.status || "open");
      const allowed = new Set(["open", "reviewed", "dismissed"]);
      const filter = allowed.has(status) ? "WHERE r.status=?" : "";
      const rows = db.prepare(`SELECT r.id,r.targetUserId,r.reason,r.details,r.context,r.status,r.createdAt,r.reviewedAt, u.username AS targetUsername FROM social_reports r LEFT JOIN users u ON u.id=r.targetUserId ${filter} ORDER BY r.createdAt DESC LIMIT 100`).all(...(filter ? [status] : []));
      res.json({ reports: rows });
    }));

    app.post("/api/social/reports/:reportId/appeal", A, handle((req, res) => {
      const report = db.prepare("SELECT id,targetUserId,status FROM social_reports WHERE id=?").get(req.params.reportId);
      if (!report) return res.status(404).json({ error:"Report not found." });
      if (!canAppeal({ status: report.status, subjectId: report.targetUserId }, req.user.id)) return res.status(409).json({ error:"This report is not eligible for an appeal from this account." });
      const reason = String(req.body?.reason || "").trim();
      if (!reason) return res.status(400).json({ error:"An appeal reason is required." });
      const existing = db.prepare("SELECT id,status FROM social_report_appeals WHERE reportId=? AND appellantId=? AND status IN ('open','under_review')").get(report.id, req.user.id);
      if (existing) return res.status(200).json({ appeal: existing, duplicate:true });
      const appeal = normalizeAppeal({ id: genRowId("appeal"), reportId:report.id, appellantId:req.user.id, reason });
      const now = new Date().toISOString();
      db.prepare("INSERT INTO social_report_appeals(id,reportId,appellantId,reason,status,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)").run(appeal.id,appeal.reportId,appeal.appellantId,appeal.reason,appeal.status,now,now);
      res.status(201).json({ appeal:{ id:appeal.id, reportId:appeal.reportId, status:appeal.status, createdAt:now } });
    }));

    app.get("/api/social/appeals", A, handle((req, res) => {
      const rows = db.prepare("SELECT id,reportId,reason,status,createdAt,updatedAt,resolvedAt FROM social_report_appeals WHERE appellantId=? ORDER BY createdAt DESC LIMIT 100").all(req.user.id);
      res.json({ appeals: rows });
    }));

    app.get("/api/social/blocked", A, handle((req, res) => {
      const rows = db.prepare(
        "SELECT u.id, u.name, u.username, u.avatarUrl, u.profileVisibility FROM blocks b JOIN users u ON u.id = b.blockedId WHERE b.blockerId = ? ORDER BY b.createdAt DESC"
      ).all(req.user.id);
      res.json({ blocked: rows.map((row) => publicUser(row, { allowPrivateAvatar: true })) });
    }));

    // ---------- editable profile ----------
    // ---------- shareable Zeeza profile links ----------
    // A shared link is an explicit invitation: the opaque token is not guessable like a username.
    // Anyone holding the link can view the shared profile and, once signed in, send a friend request.
    const handleChaseFriendRequest = (req, res) => {
      const targetId = String(req.params.userId || "");
      const target = db.prepare("SELECT id, name, username, avatarUrl, profileBio, profileVisibility, zeezaExploreOptIn, zeezaExploreCountry, zeezaExploreCity, zeezaExploreTermsVersion FROM users WHERE id = ?").get(targetId);
      if (!target || !target.zeezaExploreOptIn || target.zeezaExploreTermsVersion !== ZEEZA_CHASE_TERMS_VERSION || target.profileVisibility === "private") throw new FriendsError(404, "That Chase profile is no longer available.");
      if (target.id === req.user.id) throw new FriendsError(400, "That's your own profile.");
      if (isBlocked(req.user.id, target.id)) throw new FriendsError(403, "You can't send a request to this person.");
      if (areFriends(req.user.id, target.id)) throw new FriendsError(409, "You're already friends.");
      const reverse = db.prepare("SELECT * FROM friend_requests WHERE fromUserId = ? AND toUserId = ? AND status = 'pending'").get(target.id, req.user.id);
      if (reverse) throw new FriendsError(409, "This person has already sent you a request. Open your requests to accept it.");
      const existing = db.prepare("SELECT 1 FROM friend_requests WHERE fromUserId = ? AND toUserId = ? AND status = 'pending'").get(req.user.id, target.id);
      if (existing) throw new FriendsError(409, "You already sent this person a request.");
      const tier = canChaseRequest(req.user.id, target);
      const id = genRowId("fr");
      db.prepare("INSERT INTO friend_requests (id, fromUserId, toUserId, status, source, createdAt) VALUES (?,?,?,?,?,?)").run(id, req.user.id, target.id, "pending", "chase", now());
      if (sendPush) sendPush(target.id, "Zeeza", `${shortName(userRow(req.user.id).name)} found you on Chase and sent a friend request`, { screen: "friend_requests" });
      res.json({ status: "pending", proximity: tier, request: { id, to: publicUser(target, { allowPrivateAvatar: true }) } });
    };

    app.post("/api/social/friends/request/chase/:userId", A, ...limited, handle(handleChaseFriendRequest));
    // Legacy Explore request endpoint remains accepted for older clients.
    app.post("/api/social/friends/request/explore/:userId", A, ...limited, handle(handleChaseFriendRequest));

    app.post("/api/social/profile/share", A, ...limited, handle((req, res) => {
      let u = db.prepare(zeezaShareIntegrity.shareableProfileQuery()).get(req.user.id);
      if (!u) throw new FriendsError(404, "Profile link is unavailable while your account or profile is private.");
      let token = u.zeezaShareToken;
      if (!token) {
        token = zeezaShareIntegrity.newToken();
        db.prepare("UPDATE users SET zeezaShareToken = ? WHERE id = ? AND zeezaShareToken IS NULL").run(token, req.user.id);
        u = db.prepare(zeezaShareIntegrity.shareableProfileQuery()).get(req.user.id);
        token = u?.zeezaShareToken;
      }
      if (!token) throw new FriendsError(503, "Profile link could not be created. Please try again.");
      res.setHeader("Cache-Control", zeezaShareIntegrity.SHARE_CACHE_CONTROL);
      res.json({ token, profile: { id: u.id, name: shortName(u.name), username: u.username || null, bio: u.profileBio || "", avatarUrl: u.avatarUrl || null, visibility: u.profileVisibility || "friends" } });
    }));

    app.post("/api/social/profile/share/rotate", A, ...limited, handle((req, res) => {
      const u = db.prepare(zeezaShareIntegrity.shareableProfileQuery()).get(req.user.id);
      if (!u) throw new FriendsError(404, "Profile link is unavailable while your account or profile is private.");
      const token = zeezaShareIntegrity.newToken();
      db.prepare("UPDATE users SET zeezaShareToken = ? WHERE id = ? AND COALESCE(accountStatus, 'active') = 'active'").run(token, req.user.id);
      res.setHeader("Cache-Control", zeezaShareIntegrity.SHARE_CACHE_CONTROL);
      res.json({ token });
    }));

    app.delete("/api/social/profile/share", A, ...limited, handle((req, res) => {
      db.prepare("UPDATE users SET zeezaShareToken = NULL WHERE id = ?").run(req.user.id);
      res.setHeader("Cache-Control", zeezaShareIntegrity.SHARE_CACHE_CONTROL);
      res.json({ revoked: true });
    }));

    app.get("/api/social/profile/share/:token", ...limited, handle((req, res) => {
      const token = zeezaShareIntegrity.normalizeToken(req.params.token);
      if (!token) throw new FriendsError(404, "Profile link not found.");
      const u = db.prepare(zeezaShareIntegrity.shareableUserQuery()).get(token);
      if (!u) throw new FriendsError(404, "Profile link not found.");
      res.setHeader("Cache-Control", zeezaShareIntegrity.SHARE_CACHE_CONTROL);
      res.json({ profile: { id: u.id, name: shortName(u.name), username: u.username || null, bio: u.profileBio || "", avatarUrl: u.avatarUrl || null, visibility: u.profileVisibility || "friends" } });
    }));

    app.post("/api/social/friends/request/share/:token", A, ...limited, handle((req, res) => {
      const token = zeezaShareIntegrity.normalizeToken(req.params.token);
      if (!token) throw new FriendsError(404, "Profile link not found.");
      const target = db.prepare(zeezaShareIntegrity.shareableUserQuery()).get(token);
      if (!target) throw new FriendsError(404, "Profile link not found.");
      if (target.id === req.user.id) throw new FriendsError(400, "That's your own profile link.");
      if (isBlocked(req.user.id, target.id)) throw new FriendsError(403, "You can't send a request to this person.");
      if (areFriends(req.user.id, target.id)) throw new FriendsError(409, "You're already friends.");
      const reverse = db.prepare("SELECT * FROM friend_requests WHERE fromUserId = ? AND toUserId = ? AND status = 'pending'").get(target.id, req.user.id);
      if (reverse) {
        const changed = db.prepare("UPDATE friend_requests SET status = 'accepted', respondedAt = ? WHERE id = ? AND status = 'pending'").run(now(), reverse.id);
        if (!changed.changes) throw new FriendsError(409, "That friend request changed before it could be accepted.");
        db.prepare("INSERT OR IGNORE INTO friendships (userId, friendId, sourceRequestId, createdAt) VALUES (?,?,?,?)").run(req.user.id, target.id, reverse.id, now());
        db.prepare("INSERT OR IGNORE INTO friendships (userId, friendId, sourceRequestId, createdAt) VALUES (?,?,?,?)").run(target.id, req.user.id, reverse.id, now());
        if (sendPush) sendPush(target.id, "NEXA", `${shortName(userRow(req.user.id).name)} connected with you on Zeeza`, { screen: "friends", inAppPopup:true });
        aamiEconomy.maybeNotifyAamiUnlock(db, req.user.id, sendPush);
        aamiEconomy.maybeNotifyAamiUnlock(db, target.id, sendPush);
        return res.json({ status: "accepted", friend: publicUser(target, { allowPrivateAvatar: true }) });
      }
      const existing = db.prepare("SELECT 1 FROM friend_requests WHERE fromUserId = ? AND toUserId = ? AND status = 'pending'").get(req.user.id, target.id);
      if (existing) throw new FriendsError(409, "You already sent a friend request to this person.");
      const id = genRowId("fr");
      db.prepare("INSERT INTO friend_requests (id, fromUserId, toUserId, status, createdAt) VALUES (?,?,?,?,?)").run(id, req.user.id, target.id, "pending", now());
      if (sendPush) sendPush(target.id, "NEXA", `${shortName(userRow(req.user.id).name)} sent you a friend request`, { screen: "friend_requests" });
      res.json({ status: "pending", request: { id, to: publicUser(target, { allowPrivateAvatar: true }) } });
    }));

    app.get("/api/social/profile/me", A, handle((req, res) => {
      const u = db.prepare("SELECT id, name, username, profileBio, avatarUrl, profileVisibility, zeezaExploreOptIn, zeezaExploreCountry, zeezaExploreCity, zeezaExploreTermsVersion, zeezaExploreLocationChangedAt, zeezaChaseAge, zeezaChaseNationality, zeezaChaseHeightCm, zeezaChaseJobType FROM users WHERE id = ?").get(req.user.id);
      res.json({ profile: { id: u.id, name: shortName(u.name), username: u.username || null, bio: u.profileBio || "", avatarUrl: u.avatarUrl || null, visibility: u.profileVisibility || "friends", chaseOptIn: !!u.zeezaExploreOptIn, chaseCountry: u.zeezaExploreCountry || "", chaseCity: u.zeezaExploreCity || "", chaseTermsVersion: u.zeezaExploreTermsVersion || null, exploreOptIn: !!u.zeezaExploreOptIn, exploreCountry: u.zeezaExploreCountry || "", exploreCity: u.zeezaExploreCity || "", exploreTermsVersion: u.zeezaExploreTermsVersion || null, chaseAge: u.zeezaChaseAge ?? null, chaseNationality: u.zeezaChaseNationality || "", chaseHeightCm: u.zeezaChaseHeightCm ?? null, chaseJobType: u.zeezaChaseJobType || "" } });
    }));

    app.post("/api/social/profile/avatar", A, ...limited, handle((req, res) => {
      const checked = validateAvatarPayload({ imageBase64: req.body?.imageBase64, mimeType: req.body?.mimeType });
      if (checked.error) throw new FriendsError(400, checked.error);
      const current = db.prepare("SELECT profileBio, profileVisibility FROM users WHERE id = ?").get(req.user.id);
      db.prepare("UPDATE users SET avatarUrl = ? WHERE id = ?").run(checked.value.avatarUrl, req.user.id);
      const u = db.prepare("SELECT id, name, username, profileBio, avatarUrl, profileVisibility FROM users WHERE id = ?").get(req.user.id);
      res.json({ profile: { id: u.id, name: shortName(u.name), username: u.username || null, bio: u.profileBio || current.profileBio || "", avatarUrl: u.avatarUrl || null, visibility: u.profileVisibility || current.profileVisibility || "friends" } });
    }));

    app.patch("/api/social/profile/me", A, ...limited, handle((req, res) => {
      const current = db.prepare("SELECT profileBio, avatarUrl, profileVisibility, zeezaExploreOptIn, zeezaExploreCountry, zeezaExploreCity, zeezaExploreTermsVersion, zeezaExploreLocationChangedAt, zeezaChaseAge, zeezaChaseNationality, zeezaChaseHeightCm, zeezaChaseJobType FROM users WHERE id = ?").get(req.user.id);
      const input = { bio: req.body?.bio ?? current.profileBio, avatarUrl: req.body?.avatarUrl === undefined ? current.avatarUrl : req.body.avatarUrl, visibility: req.body?.visibility ?? current.profileVisibility };
      const checked = validateProfile(input);
      if (checked.error) throw new FriendsError(400, checked.error);
      const chaseOptIn = req.body?.chaseOptIn === undefined ? (req.body?.exploreOptIn === undefined ? !!current.zeezaExploreOptIn : !!req.body.exploreOptIn) : !!req.body.chaseOptIn;
      const chaseCountry = cleanArea(req.body?.chaseCountry === undefined ? (req.body?.exploreCountry === undefined ? current.zeezaExploreCountry : req.body.exploreCountry) : req.body.chaseCountry);
      const chaseCity = cleanArea(req.body?.chaseCity === undefined ? (req.body?.exploreCity === undefined ? current.zeezaExploreCity : req.body.exploreCity) : req.body.chaseCity);
      const locationChanged = normArea(chaseCountry) !== normArea(current.zeezaExploreCountry) || normArea(chaseCity) !== normArea(current.zeezaExploreCity);
      if (chaseOptIn && locationChanged && current.zeezaExploreLocationChangedAt) {
        const changedAt = Date.parse(current.zeezaExploreLocationChangedAt);
        if (Number.isFinite(changedAt) && Date.now() - changedAt < CHASE_LOCATION_COOLDOWN_MS) {
          throw new FriendsError(429, "For Chase safety, your approximate location can only be changed again after the current 72-hour safety window.");
        }
      }
      if (chaseOptIn && !chaseCountry) throw new FriendsError(400, "Choose a country before appearing on Zeeza Chase.");
      if (chaseOptIn && !chaseCity) throw new FriendsError(400, "Choose a city or area before appearing on Zeeza Chase.");
      if (chaseOptIn && input.visibility === "private") throw new FriendsError(400, "Set profile visibility to Public or Friends before appearing on Chase.");
      const ageRaw = req.body?.chaseAge === undefined ? current.zeezaChaseAge : req.body.chaseAge;
      const age = ageRaw === null || ageRaw === "" || ageRaw === undefined ? null : Number(ageRaw);
      const nationality = cleanArea(req.body?.chaseNationality === undefined ? current.zeezaChaseNationality : req.body.chaseNationality);
      const heightRaw = req.body?.chaseHeightCm === undefined ? current.zeezaChaseHeightCm : req.body.chaseHeightCm;
      const heightCm = heightRaw === null || heightRaw === "" || heightRaw === undefined ? null : Number(heightRaw);
      const jobType = cleanArea(req.body?.chaseJobType === undefined ? current.zeezaChaseJobType : req.body.chaseJobType);
      if (age !== null && (!Number.isInteger(age) || age < 18 || age > 120)) throw new FriendsError(400, "Chase age must be 18 or older.");
      if (heightCm !== null && (!Number.isInteger(heightCm) || heightCm < 100 || heightCm > 250)) throw new FriendsError(400, "Enter height in centimetres between 100 and 250.");
      if (chaseOptIn && age === null) throw new FriendsError(400, "Add your age (18+) before appearing in Chase.");
      if (chaseOptIn && !nationality) throw new FriendsError(400, "Add your nationality before appearing in Chase.");
      const chaseTermsVersion = chaseOptIn ? ZEEZA_CHASE_TERMS_VERSION : null;
      db.prepare("UPDATE users SET profileBio = ?, avatarUrl = ?, profileVisibility = ?, zeezaExploreOptIn = ?, zeezaExploreCountry = ?, zeezaExploreCity = ?, zeezaChaseAge = ?, zeezaChaseNationality = ?, zeezaChaseHeightCm = ?, zeezaChaseJobType = ?, zeezaExploreTermsVersion = ?, zeezaExploreTermsAt = CASE WHEN ? = 1 THEN COALESCE(zeezaExploreTermsAt, ?) ELSE NULL END, zeezaExploreLocationChangedAt = CASE WHEN ? = 1 AND ? = 1 THEN ? ELSE zeezaExploreLocationChangedAt END WHERE id = ?")
        .run(checked.value.bio, checked.value.avatarUrl, checked.value.visibility, chaseOptIn ? 1 : 0, chaseCountry || null, chaseCity || null, age, nationality || null, heightCm, jobType || null, chaseTermsVersion, chaseOptIn ? 1 : 0, now(), chaseOptIn ? 1 : 0, locationChanged ? 1 : 0, now(), req.user.id);
      const u = db.prepare("SELECT id, name, username, profileBio, avatarUrl, profileVisibility, zeezaExploreOptIn, zeezaExploreCountry, zeezaExploreCity, zeezaExploreTermsVersion, zeezaExploreLocationChangedAt, zeezaChaseAge, zeezaChaseNationality, zeezaChaseHeightCm, zeezaChaseJobType FROM users WHERE id = ?").get(req.user.id);
      res.json({ profile: { id: u.id, name: shortName(u.name), username: u.username || null, bio: u.profileBio || "", avatarUrl: u.avatarUrl || null, visibility: u.profileVisibility || "friends", chaseOptIn: !!u.zeezaExploreOptIn, chaseCountry: u.zeezaExploreCountry || "", chaseCity: u.zeezaExploreCity || "", chaseTermsVersion: u.zeezaExploreTermsVersion || null, exploreOptIn: !!u.zeezaExploreOptIn, exploreCountry: u.zeezaExploreCountry || "", exploreCity: u.zeezaExploreCity || "", exploreTermsVersion: u.zeezaExploreTermsVersion || null, chaseAge: u.zeezaChaseAge ?? null, chaseNationality: u.zeezaChaseNationality || "", chaseHeightCm: u.zeezaChaseHeightCm ?? null, chaseJobType: u.zeezaChaseJobType || "" } });
    }));

    app.get("/api/social/profile/:userId", A, handle((req, res) => {
      const targetId = String(req.params.userId || "");
      if (isBlocked(req.user.id, targetId)) throw new FriendsError(404, "Profile not found.");
      const u = db.prepare("SELECT id, name, username, profileBio, avatarUrl, profileVisibility FROM users WHERE id = ?").get(targetId);
      if (!u) throw new FriendsError(404, "Profile not found.");
      const visibility = u.profileVisibility || "friends";
      const access = privacyAuthorization.profileVisibility({ viewerId: req.user.id, targetId, visibility, friends: areFriends(req.user.id, targetId), blocked: isBlocked(req.user.id, targetId) });
      if (!access.allowed) throw new FriendsError(404, "Profile not found.");
      res.json({ profile: { id: u.id, name: shortName(u.name), username: u.username || null, bio: u.profileBio || "", avatarUrl: u.avatarUrl || null, visibility } });
    }));

    app.get("/api/social/me", A, handle((req, res) => {
      const u = userRow(req.user.id);
      res.json({ username: u.username || null });
    }));
  }

  return { register, isBlocked, areFriends, publicUser, shortName, userRow };
}

module.exports = { createFriends };

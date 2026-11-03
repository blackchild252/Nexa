"use strict";
// Lifestyle (B316-B318): photo posts shared with friends, with likes, comments and reporting. Photos are stored in the database as small images
// (same approach as Kitchen Hub item photos). Videos are NOT shared yet: they need file storage first.
const crypto = require("crypto");

const PHOTO_RE = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const VIDEO_RE = /^data:video\/(mp4|quicktime|webm|3gpp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTO_CHARS = 5000000;
const MAX_CAPTION = 300;
const FEED_LIMIT = 50;
const MAX_COMMENT = 300;
const COMMENTS_PER_MINUTE = 20;
const MAX_ALERTS = 50;
const REPORT_REASONS = ["spam", "nudity", "harassment", "other"];

function ensureSchema(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS lifestyle_posts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'photo',
  caption TEXT,
  photo TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lifestyle_posts_user ON lifestyle_posts(userId, createdAt);
CREATE TABLE IF NOT EXISTS lifestyle_likes (
  postId TEXT NOT NULL,
  userId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (postId, userId)
);
CREATE TABLE IF NOT EXISTS lifestyle_comments (
  id TEXT PRIMARY KEY,
  postId TEXT NOT NULL,
  userId TEXT NOT NULL,
  body TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lifestyle_comments_post ON lifestyle_comments(postId, createdAt);
CREATE INDEX IF NOT EXISTS idx_lifestyle_comments_user ON lifestyle_comments(userId, createdAt);
CREATE TABLE IF NOT EXISTS lifestyle_reports (
  id TEXT PRIMARY KEY,
  postId TEXT NOT NULL,
  reporterId TEXT NOT NULL,
  reason TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  UNIQUE (postId, reporterId)
);
CREATE TABLE IF NOT EXISTS lifestyle_comment_reports (
  id TEXT PRIMARY KEY,
  commentId TEXT NOT NULL,
  postId TEXT NOT NULL,
  reporterId TEXT NOT NULL,
  reason TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  UNIQUE (commentId, reporterId)
);
CREATE INDEX IF NOT EXISTS idx_lifestyle_comment_reports_status ON lifestyle_comment_reports(status, createdAt);
`);
  const cols = db.prepare("PRAGMA table_info(lifestyle_reports)").all().map((c) => c.name);
  if (!cols.includes("status")) db.exec("ALTER TABLE lifestyle_reports ADD COLUMN status TEXT NOT NULL DEFAULT 'open'");
}

function register(app, { db, auth, friends, genRowId, notify, isAdmin, admin }) {
  ensureSchema(db);
  require("./verification").ensureSchema(db); // B321: author verified mark reads user_verifications
  // V6.2.6: a verified Admin AAMI grant is decided only by its own permission ("violations" to read, "social_reports_write" to act); legacy admins keep "reports".
  const mayReview = (req, scopedPermission = "violations") => (Object.hasOwn(req, "adminAamiAccess") ? !!admin && admin.canRequest(req, scopedPermission) : admin ? admin.can(req.user, "reports") : typeof isAdmin === "function" && isAdmin(req.user));
  const audit = (req, action, id, detail, type) => { if (admin) { req.adminRole = req.adminAamiAccess?.role || admin.roleOf(req.user); admin.audit(req, action, type || "lifestyle_post", id, detail); } };
  const newId = () => (typeof genRowId === "function" ? genRowId() : crypto.randomUUID());
  const contentSafety = require("./contentSafety");
  const trustSafety = require("./trustSafety");
  const accountLifecycle = require("./accountLifecycle");
  const vendorSubscriptions = require("./vendorSubscriptions");
  trustSafety.ensureSchema(db);
  const fail = (res, status, error) => res.status(status).json({ error });
  const isVerified = (id) => { try { return !!db.prepare("SELECT 1 FROM user_verifications WHERE userId = ? AND kind = 'user'").get(id); } catch (_) { return false; } };
  const author = (id) => { const row = friends.userRow(id); const base = row ? friends.publicUser(row) : { id, username: null, name: "NEXA member", avatarUrl: null }; return { ...base, verified: isVerified(id) }; };
  const counts = (postId, viewerId) => ({
    likeCount: db.prepare("SELECT COUNT(*) AS n FROM lifestyle_likes WHERE postId = ?").get(postId).n,
    liked: !!db.prepare("SELECT 1 FROM lifestyle_likes WHERE postId = ? AND userId = ?").get(postId, viewerId),
    commentCount: db.prepare("SELECT COUNT(*) AS n FROM lifestyle_comments WHERE postId = ? AND id NOT IN (SELECT commentId FROM lifestyle_comment_reports WHERE reporterId = ?)").get(postId, viewerId).n,
  });
  const shape = (row, viewerId) => ({
    id: row.id, kind: row.kind, caption: row.caption || "", photo: row.photo, createdAt: row.createdAt,
    mine: row.userId === viewerId, author: author(row.userId), ...counts(row.id, viewerId),
  });
  // B323: every Lifestyle alert carries the postId, so a tap can open that exact post.
  // B328: report lists page 100 at a time (default 100, so older callers see the same first page as before).
  const reportPage = (req) => ({ limit: Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100), offset: Math.max(parseInt(req.query.offset, 10) || 0, 0) });
  const ping = (userId, title, body, postId) => { try { if (notify && userId) Promise.resolve(notify(userId, title, body, { type: "leisure", screen: "leisure_lifestyle", action: "leisure_lifestyle", ...(postId ? { postId: String(postId) } : {}) })).catch(() => {}); } catch (_) {} };
  // A post can be seen (liked, commented on) by its owner and the owner's friends, unless either side blocked the other.
  const visiblePost = (postId, viewerId) => {
    const row = db.prepare("SELECT * FROM lifestyle_posts WHERE id = ?").get(postId);
    if (!row) return null;
    if (row.userId === viewerId) return row;
    if (!friends.areFriends(viewerId, row.userId)) return null;
    if (friends.isBlocked(viewerId, row.userId)) return null;
    return row;
  };
  const shortName = (id) => (author(id).name || "A friend").split(" ")[0];
  const commentShape = (c, viewerId) => ({ id: c.id, postId: c.postId, body: c.body, createdAt: c.createdAt, mine: c.userId === viewerId, author: author(c.userId) });

  app.post("/api/lifestyle/posts", auth.authMiddleware, (req, res) => {
    const b = req.body || {};
    const photo = typeof b.photo === "string" ? b.photo : "";
    const kind = b.kind === "video" ? "video" : "photo";
    if (!photo) return fail(res, 400, "Choose a photo to post.");
    if (photo.length > MAX_PHOTO_CHARS) return fail(res, 400, "That photo is too large. Try a smaller one.");
    if (!(kind === "video" ? VIDEO_RE.test(photo) : PHOTO_RE.test(photo))) return fail(res, 400, kind === "video" ? "That video file is not supported. Use MP4, QuickTime, WebM or 3GP." : "That file isn't a photo we can post. Use a JPG, PNG or WebP.");
    const caption = String(b.caption || "").trim().slice(0, MAX_CAPTION);
    contentSafety.assertText(caption);
    const id = newId();
    const createdAt = new Date().toISOString();
    db.prepare("INSERT INTO lifestyle_posts(id,userId,kind,caption,photo,createdAt) VALUES(?,?,?,?,?,?)").run(id, req.user.id, kind, caption || null, photo, createdAt);
    try {
      const ids = db.prepare("SELECT friendId FROM friendships WHERE userId = ? LIMIT ?").all(req.user.id, MAX_ALERTS).map((r) => r.friendId).filter((fid) => !friends.isBlocked(req.user.id, fid));
      for (const fid of ids) ping(fid, "New in Lifestyle", `${shortName(req.user.id)} shared a photo.`, id);
    } catch (_) { /* alerts never block a post */ }
    res.status(201).json({ post: shape({ id, userId: req.user.id, kind, caption, photo, createdAt }, req.user.id) });
  });

  // Feed (B321 "load more"): newest first. Send ?before=<nextBefore from the last page> to get the next page. nextBefore is null on the last page.
  // Posts hidden by a block are skipped while scanning, so a page is never short just because of them. Rarely, the last nextBefore leads to an empty page; the app treats that as the end.
  app.get("/api/lifestyle/feed", auth.authMiddleware, (req, res) => {
    const me = req.user.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || FEED_LIMIT, 1), FEED_LIMIT);
    const cur = String(req.query.before || "");
    const bar = cur.indexOf("|");
    let at = bar > 0 ? cur.slice(0, bar) : "";
    let id = bar > 0 ? cur.slice(bar + 1) : "";
    let useCursor = at && id ? 1 : 0;
    const batch = limit * 2 + 1;
    const fetchRows = () => db.prepare(
      `SELECT p.* FROM lifestyle_posts p
       WHERE (p.userId = ? OR p.userId IN (SELECT friendId FROM friendships WHERE userId = ?))
         AND p.id NOT IN (SELECT postId FROM lifestyle_reports WHERE reporterId = ?)
         AND (? = 0 OR p.createdAt < ? OR (p.createdAt = ? AND p.id < ?))
       ORDER BY p.createdAt DESC, p.id DESC LIMIT ?`
    ).all(me, me, me, useCursor, at, at, id, batch);
    const out = []; let last = null; let more = false;
    for (let round = 0; round < 6; round++) {
      const rows = fetchRows();
      let i = 0;
      for (; i < rows.length && out.length < limit; i++) {
        const r = rows[i]; last = r;
        if (r.userId === me || !friends.isBlocked(me, r.userId)) out.push(r);
      }
      if (out.length >= limit) { more = i < rows.length || rows.length === batch; break; }
      if (rows.length < batch) { more = false; break; }
      more = true; useCursor = 1; at = last.createdAt; id = last.id;
    }
    res.json({ posts: out.map((r) => shape(r, me)), nextBefore: more && last ? `${last.createdAt}|${last.id}` : null });
  });

  app.post("/api/lifestyle/posts/:id/report", auth.authMiddleware, (req, res) => {
    const post = visiblePost(req.params.id, req.user.id);
    if (!post) return fail(res, 404, "Post not found.");
    if (post.userId === req.user.id) return fail(res, 400, "You can't report your own post. Delete it instead.");
    const reason = String((req.body || {}).reason || "").toLowerCase();
    if (!REPORT_REASONS.includes(reason)) return fail(res, 400, "Choose a reason for the report.");
    db.prepare("INSERT OR IGNORE INTO lifestyle_reports(id,postId,reporterId,reason,createdAt) VALUES(?,?,?,?,?)").run(newId(), post.id, req.user.id, reason, new Date().toISOString());
    res.json({ ok: true });
  });

  // Admin review: see reported posts, and take one down.
  app.get("/api/lifestyle/reports", auth.authMiddleware, (req, res) => {
    if (!mayReview(req)) return fail(res, 403, "Administrator access required.");
    const wanted = String(req.query.status || "open");
    const pg = reportPage(req);
    const rows = db.prepare(
      `SELECT postId, COUNT(*) AS reports, GROUP_CONCAT(DISTINCT reason) AS reasons, MAX(createdAt) AS lastReportedAt
       FROM lifestyle_reports WHERE status = ? GROUP BY postId ORDER BY lastReportedAt DESC, postId DESC LIMIT ? OFFSET ?`
    ).all(["open", "dismissed", "actioned"].includes(wanted) ? wanted : "open", pg.limit + 1, pg.offset);
    const hasMore = rows.length > pg.limit; if (hasMore) rows.pop();
    res.json({ limit: pg.limit, offset: pg.offset, hasMore, reports: rows.map((r) => {
      const post = db.prepare("SELECT * FROM lifestyle_posts WHERE id = ?").get(r.postId);
      return { postId: r.postId, reports: r.reports, reasons: String(r.reasons || "").split(","), lastReportedAt: r.lastReportedAt, removed: !post, author: post ? author(post.userId) : null, caption: post ? post.caption || "" : "" };
    }) });
  });

  app.delete("/api/lifestyle/reports/:postId/post", auth.authMiddleware, admin?.scopedGate ? admin.scopedGate("social_reports_write") : (_q,_s,n)=>n(), (req, res) => {
    if (!mayReview(req, "social_reports_write")) return fail(res, 403, "Administrator access required.");
    const post = db.prepare("SELECT id, userId FROM lifestyle_posts WHERE id = ?").get(req.params.postId);
    if (!post) return fail(res, 404, "Post not found.");
    db.prepare("DELETE FROM lifestyle_likes WHERE postId = ?").run(post.id);
    db.prepare("DELETE FROM lifestyle_comments WHERE postId = ?").run(post.id);
    db.prepare("DELETE FROM lifestyle_posts WHERE id = ?").run(post.id);
    db.prepare("UPDATE lifestyle_reports SET status = 'actioned' WHERE postId = ?").run(post.id);
    db.prepare("UPDATE lifestyle_comment_reports SET status = 'actioned' WHERE postId = ? AND status = 'open'").run(post.id);
    const reportRow=db.prepare("SELECT id,reason FROM lifestyle_reports WHERE postId=? AND status='actioned' ORDER BY createdAt DESC LIMIT 1").get(post.id);
    trustSafety.addFeedback(db,{userId:post.userId,reportId:reportRow?.id,targetType:"lifestyle_post",targetId:post.id,reason:reportRow?.reason,notify:(uid,title,body,data)=>notify?.(uid,title,body,data),closeAccount:(uid)=>accountLifecycle.closeAccount(db,uid,new Date().toISOString(),vendorSubscriptions)});
    audit(req, "lifestyle_post_removed", post.id, `author ${post.userId}`);
    // B328: the author is told. No postId: the post is gone, so the alert opens Lifestyle itself.
    if (post.userId !== req.user.id) ping(post.userId, "A post of yours was removed", "An admin removed one of your Lifestyle posts after it was reported.");
    res.json({ ok: true });
  });

  // Keep the post: close its open reports as not a problem. The reporters still don't see it.
  app.post("/api/lifestyle/reports/:postId/dismiss", auth.authMiddleware, admin?.scopedGate ? admin.scopedGate("social_reports_write") : (_q,_s,n)=>n(), (req, res) => {
    if (!mayReview(req, "social_reports_write")) return fail(res, 403, "Administrator access required.");
    const changed = db.prepare("UPDATE lifestyle_reports SET status = 'dismissed' WHERE postId = ? AND status = 'open'").run(req.params.postId);
    if (!changed.changes) return fail(res, 404, "No open reports for that post.");
    audit(req, "lifestyle_reports_dismissed", req.params.postId, `${changed.changes} report(s)`);
    res.json({ ok: true });
  });

  // Report a comment (B321). Same reasons as a post report. You can't report your own comment, and a comment you reported is hidden from you.
  app.post("/api/lifestyle/comments/:id/report", auth.authMiddleware, (req, res) => {
    const c = db.prepare("SELECT * FROM lifestyle_comments WHERE id = ?").get(req.params.id);
    if (!c || !visiblePost(c.postId, req.user.id)) return fail(res, 404, "Comment not found.");
    if (c.userId === req.user.id) return fail(res, 400, "You can't report your own comment. Delete it instead.");
    const reason = String((req.body || {}).reason || "").toLowerCase();
    if (!REPORT_REASONS.includes(reason)) return fail(res, 400, "Choose a reason for the report.");
    db.prepare("INSERT OR IGNORE INTO lifestyle_comment_reports(id,commentId,postId,reporterId,reason,createdAt) VALUES(?,?,?,?,?,?)").run(newId(), c.id, c.postId, req.user.id, reason, new Date().toISOString());
    res.json({ ok: true });
  });

  // Admin review of reported comments: list, remove the comment, or keep it and close the reports.
  app.get("/api/lifestyle/comment-reports", auth.authMiddleware, (req, res) => {
    if (!mayReview(req)) return fail(res, 403, "Administrator access required.");
    const wanted = String(req.query.status || "open");
    const pg = reportPage(req);
    const rows = db.prepare(
      `SELECT commentId, postId, COUNT(*) AS reports, GROUP_CONCAT(DISTINCT reason) AS reasons, MAX(createdAt) AS lastReportedAt
       FROM lifestyle_comment_reports WHERE status = ? GROUP BY commentId ORDER BY lastReportedAt DESC, commentId DESC LIMIT ? OFFSET ?`
    ).all(["open", "dismissed", "actioned"].includes(wanted) ? wanted : "open", pg.limit + 1, pg.offset);
    const hasMore = rows.length > pg.limit; if (hasMore) rows.pop();
    res.json({ limit: pg.limit, offset: pg.offset, hasMore, reports: rows.map((r) => {
      const c = db.prepare("SELECT * FROM lifestyle_comments WHERE id = ?").get(r.commentId);
      return { commentId: r.commentId, postId: r.postId, reports: r.reports, reasons: String(r.reasons || "").split(","), lastReportedAt: r.lastReportedAt, removed: !c, author: c ? author(c.userId) : null, body: c ? c.body : "" };
    }) });
  });

  app.delete("/api/lifestyle/comment-reports/:commentId/comment", auth.authMiddleware, admin?.scopedGate ? admin.scopedGate("social_reports_write") : (_q,_s,n)=>n(), (req, res) => {
    if (!mayReview(req, "social_reports_write")) return fail(res, 403, "Administrator access required.");
    const c = db.prepare("SELECT id, userId FROM lifestyle_comments WHERE id = ?").get(req.params.commentId);
    if (!c) return fail(res, 404, "Comment not found.");
    db.prepare("DELETE FROM lifestyle_comments WHERE id = ?").run(c.id);
    db.prepare("UPDATE lifestyle_comment_reports SET status = 'actioned' WHERE commentId = ?").run(c.id);
    const reportRow=db.prepare("SELECT id,reason FROM lifestyle_comment_reports WHERE commentId=? ORDER BY createdAt DESC LIMIT 1").get(c.id);
    trustSafety.addFeedback(db,{userId:c.userId,reportId:reportRow?.id,targetType:"lifestyle_comment",targetId:c.id,reason:reportRow?.reason,notify:(uid,title,body,data)=>notify?.(uid,title,body,data),closeAccount:(uid)=>accountLifecycle.closeAccount(db,uid,new Date().toISOString(),vendorSubscriptions)});
    audit(req, "lifestyle_comment_removed", c.id, `author ${c.userId}`, "lifestyle_comment");
    // B328: the author is told (same wording style as a removed post, and it opens Lifestyle).
    if (c.userId !== req.user.id) ping(c.userId, "A comment of yours was removed", "An admin removed one of your Lifestyle comments after it was reported.");
    res.json({ ok: true });
  });

  app.post("/api/lifestyle/comment-reports/:commentId/dismiss", auth.authMiddleware, admin?.scopedGate ? admin.scopedGate("social_reports_write") : (_q,_s,n)=>n(), (req, res) => {
    if (!mayReview(req, "social_reports_write")) return fail(res, 403, "Administrator access required.");
    const changed = db.prepare("UPDATE lifestyle_comment_reports SET status = 'dismissed' WHERE commentId = ? AND status = 'open'").run(req.params.commentId);
    if (!changed.changes) return fail(res, 404, "No open reports for that comment.");
    audit(req, "lifestyle_comment_reports_dismissed", req.params.commentId, `${changed.changes} report(s)`, "lifestyle_comment");
    res.json({ ok: true });
  });

  // One post (B323), for opening the exact post from an alert. Same visibility as like and comment: the owner and the owner's friends, no blocks.
  // A post you reported is treated as gone for you, like in the feed.
  app.get("/api/lifestyle/posts/:id", auth.authMiddleware, (req, res) => {
    const post = visiblePost(req.params.id, req.user.id);
    const reported = post && db.prepare("SELECT 1 FROM lifestyle_reports WHERE postId = ? AND reporterId = ?").get(post.id, req.user.id);
    if (!post || reported) return fail(res, 404, "That post is no longer available.");
    res.json({ post: shape(post, req.user.id) });
  });

  app.post("/api/lifestyle/posts/:id/like", auth.authMiddleware, (req, res) => {
    const post = visiblePost(req.params.id, req.user.id);
    if (!post) return fail(res, 404, "Post not found.");
    const had = db.prepare("SELECT 1 FROM lifestyle_likes WHERE postId = ? AND userId = ?").get(post.id, req.user.id);
    if (had) db.prepare("DELETE FROM lifestyle_likes WHERE postId = ? AND userId = ?").run(post.id, req.user.id);
    else {
      db.prepare("INSERT INTO lifestyle_likes(postId,userId,createdAt) VALUES(?,?,?)").run(post.id, req.user.id, new Date().toISOString());
      if (post.userId !== req.user.id) ping(post.userId, "Lifestyle", `${shortName(req.user.id)} liked your photo.`, post.id);
    }
    res.json(counts(post.id, req.user.id));
  });

  app.get("/api/lifestyle/posts/:id/comments", auth.authMiddleware, (req, res) => {
    const post = visiblePost(req.params.id, req.user.id);
    if (!post) return fail(res, 404, "Post not found.");
    const rows = db.prepare("SELECT * FROM lifestyle_comments WHERE postId = ? AND id NOT IN (SELECT commentId FROM lifestyle_comment_reports WHERE reporterId = ?) ORDER BY createdAt ASC LIMIT 200").all(post.id, req.user.id);
    res.json({ comments: rows.filter((c) => c.userId === req.user.id || !friends.isBlocked(req.user.id, c.userId)).map((c) => commentShape(c, req.user.id)) });
  });

  app.post("/api/lifestyle/posts/:id/comments", auth.authMiddleware, (req, res) => {
    const post = visiblePost(req.params.id, req.user.id);
    if (!post) return fail(res, 404, "Post not found.");
    const body = String((req.body || {}).body || "").trim();
    contentSafety.assertText(body);
    if (!body) return fail(res, 400, "Write a comment first.");
    if (body.length > MAX_COMMENT) return fail(res, 400, `Keep comments under ${MAX_COMMENT} characters.`);
    const since = new Date(Date.now() - 60000).toISOString();
    const recent = db.prepare("SELECT COUNT(*) AS n FROM lifestyle_comments WHERE userId = ? AND createdAt > ?").get(req.user.id, since).n;
    if (recent >= COMMENTS_PER_MINUTE) return fail(res, 429, "You're commenting too fast. Wait a moment and try again.");
    const id = newId();
    const createdAt = new Date().toISOString();
    db.prepare("INSERT INTO lifestyle_comments(id,postId,userId,body,createdAt) VALUES(?,?,?,?,?)").run(id, post.id, req.user.id, body, createdAt);
    if (post.userId !== req.user.id) ping(post.userId, "Lifestyle", `${shortName(req.user.id)} commented on your photo.`, post.id);
    res.status(201).json({ comment: commentShape({ id, postId: post.id, userId: req.user.id, body, createdAt }, req.user.id), commentCount: counts(post.id, req.user.id).commentCount });
  });

  app.delete("/api/lifestyle/comments/:id", auth.authMiddleware, (req, res) => {
    const c = db.prepare("SELECT c.id, c.userId, c.postId, p.userId AS postOwner FROM lifestyle_comments c JOIN lifestyle_posts p ON p.id = c.postId WHERE c.id = ?").get(req.params.id);
    if (!c || (c.userId !== req.user.id && c.postOwner !== req.user.id)) return fail(res, 404, "Comment not found.");
    db.prepare("DELETE FROM lifestyle_comments WHERE id = ?").run(c.id);
    res.json({ ok: true, commentCount: counts(c.postId, req.user.id).commentCount });
  });

  app.delete("/api/lifestyle/posts/:id", auth.authMiddleware, (req, res) => {
    const row = db.prepare("SELECT userId FROM lifestyle_posts WHERE id = ?").get(req.params.id);
    if (!row || row.userId !== req.user.id) return fail(res, 404, "Post not found.");
    db.prepare("DELETE FROM lifestyle_likes WHERE postId = ?").run(req.params.id);
    db.prepare("DELETE FROM lifestyle_comments WHERE postId = ?").run(req.params.id);
    db.prepare("DELETE FROM lifestyle_posts WHERE id = ?").run(req.params.id);
    db.prepare("UPDATE lifestyle_comment_reports SET status = 'actioned' WHERE postId = ? AND status = 'open'").run(req.params.id);
    res.json({ ok: true });
  });
}

module.exports = { register, ensureSchema, MAX_PHOTO_CHARS, MAX_CAPTION, MAX_COMMENT, REPORT_REASONS };

"use strict";

const MAX_PLATFORM_LENGTH = 20;

function registerPushToken(db, { token, userId, platform = null, now = new Date() } = {}) {
  const normalizedToken = String(token || "");
  const normalizedUserId = String(userId || "");
  const normalizedPlatform = platform == null ? null : String(platform).trim().toLowerCase().slice(0, MAX_PLATFORM_LENGTH) || null;
  const nowIso = new Date(now).toISOString();
  if (!normalizedToken || !normalizedUserId) return { ok: false, reason: "invalid_identity" };

  const work = db.transaction(() => {
    const inserted = db.prepare(
      "INSERT OR IGNORE INTO push_tokens (token, userId, platform, updatedAt) VALUES (?,?,?,?)"
    ).run(normalizedToken, normalizedUserId, normalizedPlatform, nowIso);
    if (inserted.changes) return { ok: true, created: true, refreshed: false };

    const owner = db.prepare("SELECT userId FROM push_tokens WHERE token=? LIMIT 1").get(normalizedToken);
    if (!owner) return { ok: false, reason: "registration_race" };
    if (String(owner.userId) !== normalizedUserId) return { ok: false, reason: "token_owned_by_other_user" };

    db.prepare("UPDATE push_tokens SET platform=?, updatedAt=? WHERE token=? AND userId=?")
      .run(normalizedPlatform, nowIso, normalizedToken, normalizedUserId);
    return { ok: true, created: false, refreshed: true };
  });

  return work();
}

module.exports = { MAX_PLATFORM_LENGTH, registerPushToken };

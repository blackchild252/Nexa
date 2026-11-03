"use strict";

function purgeExpiredSessions(db, now = new Date()) {
  const cutoff = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const result = db.prepare("DELETE FROM sessions WHERE expiresAt <= ? OR (revokedAt IS NOT NULL AND revokedAt <= ?)").run(cutoff, cutoff);
  return { deleted: result.changes, cutoff };
}

module.exports = { purgeExpiredSessions };

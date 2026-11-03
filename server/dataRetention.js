"use strict";

const DEFAULT_NOTIFICATION_DAYS = 90;
const MAX_NOTIFICATION_DAYS = 3650;
const DEFAULT_EVENT_DAYS = 30;
const MAX_EVENT_DAYS = 365;

function boundedDays(value, fallback, max) {
  if (value == null || (typeof value === "string" && value.trim() === "")) return fallback;
  // Retention settings may arrive as numeric environment strings, but must
  // not execute or coerce arbitrary objects, arrays, booleans, or symbols.
  if (typeof value !== "number" && typeof value !== "string") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(n)));
}

function cutoffIso(days, now = new Date()) {
  const d = new Date(now);
  if (!Number.isFinite(d.getTime())) throw new TypeError("Retention reference time is invalid");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function purgeUserNotifications(db, userId, days = DEFAULT_NOTIFICATION_DAYS, now = new Date()) {
  if (typeof userId !== "string" || userId.trim() === "" || userId.length > 200) {
    throw new TypeError("Notification owner is invalid");
  }
  const safeDays = boundedDays(days, DEFAULT_NOTIFICATION_DAYS, MAX_NOTIFICATION_DAYS);
  const cutoff = cutoffIso(safeDays, now);
  // Child delivery rows and their parent events must be removed atomically
  // whenever the database adapter supports transactions. This prevents a
  // parent-delete failure from committing a partial retention cleanup.
  const purge = () => {
    db.prepare("DELETE FROM notification_deliveries WHERE eventId IN (SELECT id FROM notification_events WHERE userId=? AND createdAt < ?)").run(userId, cutoff);
    const result = db.prepare("DELETE FROM notification_events WHERE userId=? AND createdAt < ?").run(userId, cutoff);
    return { deleted: result.changes, days: safeDays };
  };
  const executePurge = typeof db.transaction === "function" ? db.transaction(purge) : purge;
  return executePurge();
}

function purgePlatformEvents(db, days = DEFAULT_EVENT_DAYS, now = new Date()) {
  const safeDays = boundedDays(days, DEFAULT_EVENT_DAYS, MAX_EVENT_DAYS);
  const result = db.prepare("DELETE FROM platform_event_log WHERE createdAt < ?").run(cutoffIso(safeDays, now));
  return { deleted: result.changes, days: safeDays };
}

module.exports = { DEFAULT_NOTIFICATION_DAYS, MAX_NOTIFICATION_DAYS, DEFAULT_EVENT_DAYS, MAX_EVENT_DAYS, boundedDays, cutoffIso, purgeUserNotifications, purgePlatformEvents };

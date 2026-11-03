"use strict";
const crypto = require("crypto");
const notificationPolicy = require("./notificationPolicy");

const TYPES = new Set(["money", "marketplace", "social", "chat", "system", "extension", "yaayz", "leisure"]);
const ACTIONS = Object.freeze({
  home: "home", money: "money", money_group: "money_group", marketplace: "marketplace", mall_orders: "mall_orders",
  mall_vendor: "mall_vendor", friends: "friends", friend_requests: "friend_requests", chat: "chat",
  dm_thread: "dm_thread", chat_room: "chat_room", call: "call", extensions: "extensions", developer: "developer", profile: "profile", yaayz: "yaayz", leisure: "leisure", leisure_kitchen: "leisure_kitchen", leisure_lifestyle: "leisure_lifestyle", verification: "verification"
});

function normalizeAction(data = {}) {
  const action = String(data.action || data.screen || "").trim().toLowerCase();
  if (!action || !Object.prototype.hasOwnProperty.call(ACTIONS, action)) return null;
  const out = { action: ACTIONS[action] };
  const candidateId = data.id ?? data.postId ?? data.groupId ?? data.orderId ?? data.threadId ?? data.roomId ?? data.callId ?? data.ticketOrderId;
  if (candidateId != null && /^[A-Za-z0-9._:-]{1,160}$/.test(String(candidateId))) out.id = String(candidateId);
  return out;
}


function normalizeType(value) {
  const type = String(value || "system").trim().toLowerCase();
  return TYPES.has(type) ? type : "system";
}

function normalizeData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key)) continue;
    if (["token", "authorization", "password", "secret", "apiKey", "key", "url", "uri", "href", "deeplink", "deepLink", "dedupeKey"].some((x) => key.toLowerCase().includes(x.toLowerCase()))) continue;
    if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") out[key] = value;
  }
  return out;
}

function inferType(data = {}) {
  if (data.type && TYPES.has(String(data.type).toLowerCase())) return String(data.type).toLowerCase();
  const screen = String(data.screen || "");
  if (screen === "money_group") return "money";
  if (["mall_vendor", "mall_orders"].includes(screen)) return "marketplace";
  if (["friend_requests", "friends"].includes(screen)) return "social";
  if (["dm_thread", "chat_room", "call"].includes(screen)) return "chat";
  if (data.source === "extension") return "extension";
  if (["yaayz", "ticket"].includes(screen)) return "yaayz";
  if (screen === "leisure" || screen === "leisure_kitchen" || screen === "leisure_lifestyle") return "leisure";
  return "system";
}

function shouldInAppPopup(data = {}) {
  if (data.inAppPopup === true) return true;
  const screen = String(data.screen || data.action || "").trim().toLowerCase();
  const type = String(data.type || "").trim().toLowerCase();
  if (["call", "dm_thread", "chat_room"].includes(screen) || type === "missed_call") return false;
  return [
    "wallet", "money_group", "mall_orders", "mall_vendor", "leisure_kitchen",
    "verification", "friend_requests", "friends", "moderation", "aami_unlock", "yaayz", "vendor_staff"
  ].includes(screen) || type === "aami_unlock" || data.moderation === true;
}

function createEvent(userId, title, body, data = {}, now = new Date().toISOString()) {
  const sourceData = shouldInAppPopup(data) ? { ...data, inAppPopup: true } : data;
  const action = normalizeAction(sourceData);
  const safeData = normalizeData(sourceData);
  if (sourceData.priority != null) safeData.priority = notificationPolicy.normalizePriority(sourceData.priority);
  if (sourceData.category != null) safeData.category = notificationPolicy.normalizeCategory(sourceData.category);
  return {
    id: "n_" + crypto.randomBytes(12).toString("hex"),
    userId: String(userId),
    title: String(title || "NEXA").slice(0, 120),
    body: String(body || "").slice(0, 500),
    type: inferType(data),
    data: { ...safeData, ...(action ? { action: action.action, ...(action.id ? { id: action.id } : {}) } : {}) },
    createdAt: now,
  };
}

function list(db, userId, { limit = 50, before = null, type = null } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safeType = type && TYPES.has(String(type).toLowerCase()) ? String(type).toLowerCase() : null;
  const rows = before
    ? safeType
      ? db.prepare("SELECT * FROM notification_events WHERE userId=? AND type=? AND createdAt < ? ORDER BY createdAt DESC LIMIT ?").all(userId, safeType, String(before), safeLimit)
      : db.prepare("SELECT * FROM notification_events WHERE userId=? AND createdAt < ? ORDER BY createdAt DESC LIMIT ?").all(userId, String(before), safeLimit)
    : safeType
      ? db.prepare("SELECT * FROM notification_events WHERE userId=? AND type=? ORDER BY createdAt DESC LIMIT ?").all(userId, safeType, safeLimit)
      : db.prepare("SELECT * FROM notification_events WHERE userId=? ORDER BY createdAt DESC LIMIT ?").all(userId, safeLimit);
  return rows.map(readRow);
}

function unreadCount(db, userId, type = null) {
  const safeType = type && TYPES.has(String(type).toLowerCase()) ? String(type).toLowerCase() : null;
  return safeType
    ? db.prepare("SELECT COUNT(*) AS count FROM notification_events WHERE userId=? AND type=? AND readAt IS NULL").get(userId, safeType).count
    : db.prepare("SELECT COUNT(*) AS count FROM notification_events WHERE userId=? AND readAt IS NULL").get(userId).count;
}

function markRead(db, userId, id) {
  return db.prepare("UPDATE notification_events SET readAt=? WHERE id=? AND userId=? AND readAt IS NULL").run(new Date().toISOString(), id, userId).changes;
}

function markAllRead(db, userId, type = null) {
  const safeType = type && TYPES.has(String(type).toLowerCase()) ? String(type).toLowerCase() : null;
  return safeType
    ? db.prepare("UPDATE notification_events SET readAt=? WHERE userId=? AND type=? AND readAt IS NULL").run(new Date().toISOString(), userId, safeType).changes
    : db.prepare("UPDATE notification_events SET readAt=? WHERE userId=? AND readAt IS NULL").run(new Date().toISOString(), userId).changes;
}

function readRow(row) {
  let data = {};
  try { data = JSON.parse(row.data || "{}"); } catch (_) {}
  return { id: row.id, title: row.title, body: row.body, type: normalizeType(row.type), data, createdAt: row.createdAt, readAt: row.readAt || null };
}

module.exports = { TYPES, ACTIONS, normalizeType, normalizeData, normalizeAction, inferType, shouldInAppPopup, createEvent, list, unreadCount, markRead, markAllRead, readRow };

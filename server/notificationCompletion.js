"use strict";
function completion(db, userId, notificationId) {
  const row = db.prepare("SELECT * FROM notification_events WHERE id=? AND userId=?").get(notificationId, userId);
  if (!row) return null;
  let data = {}; try { data = JSON.parse(row.data || "{}"); } catch (_) {}
  const action = String(data.action || data.screen || "").trim();
  const candidateId = data.id ?? data.groupId ?? data.orderId ?? data.threadId ?? data.roomId ?? data.callId ?? data.ticketOrderId;
  const id = candidateId == null ? null : String(candidateId);
  return { notificationId: row.id, action: action || null, id: id || null, type: row.type, read: !!row.readAt, createdAt: row.createdAt };
}
module.exports = { completion };

"use strict";
function discoverRooms(db, userId, q="", limit=20) {
  const safe=Math.min(Math.max(Number(limit)||20,1),50); const like=`%${String(q||"").trim().slice(0,80).replace(/[%_]/g,"\\$&" )}%`;
  return db.prepare(`SELECT r.id,r.name,r.createdAt,r.updatedAt,(SELECT COUNT(*) FROM chat_room_members m2 WHERE m2.roomId=r.id) AS memberCount
    FROM chat_rooms r WHERE r.discoverable=1 AND r.name LIKE ? ESCAPE '\\' AND NOT EXISTS (SELECT 1 FROM chat_room_members me WHERE me.roomId=r.id AND me.userId=?)
    ORDER BY r.updatedAt DESC LIMIT ?`).all(like,userId,safe);
}
function graphSummary(db,userId) {
  const friends=db.prepare("SELECT COUNT(*) AS n FROM friendships WHERE userId=?").get(userId)?.n||0;
  const incoming=db.prepare("SELECT COUNT(*) AS n FROM friend_requests WHERE toUserId=? AND status='pending'").get(userId)?.n||0;
  const outgoing=db.prepare("SELECT COUNT(*) AS n FROM friend_requests WHERE fromUserId=? AND status='pending'").get(userId)?.n||0;
  const blocked=db.prepare("SELECT COUNT(*) AS n FROM blocks WHERE blockerId=?").get(userId)?.n||0;
  return {friends:Number(friends),pendingIncoming:Number(incoming),pendingOutgoing:Number(outgoing),blocked:Number(blocked)};
}
module.exports={discoverRooms,graphSummary};

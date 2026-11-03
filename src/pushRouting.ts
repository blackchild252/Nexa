// Push-tap routing. One place that turns a push notification's `data` payload into "where to
// navigate", so the actual push-tap listener (wherever it lives in your app shell) stays a
// one-line call into this instead of a growing switch statement per feature.
//
// Every `screen` value the server currently sends a push with, gathered from server/*.js:
//   money_group      { groupId }        — server/groups.js  (join, your share, payments, contributions, payouts)
//   vendor_staff     {}                 — server/staff.js   (someone joined/was removed from your staff)
//   mall_vendor      { orderId }        — server/index.js   (new order, low stock / sold out)
//   mall_orders      { orderId }        — server/index.js   (buyer: order status changed, payment confirmed)
//   friend_requests  {}                 — server/friends.js (someone sent you a friend request)
//   friends          {}                 — server/friends.js (someone accepted your friend request)
//   dm_thread        { threadId }       — Zeeza messaging service    (new direct message)
//   chat_room        { roomId }         — Zeeza messaging service    (someone joined a room you own)
//   verification     {}                 — server/verification.js (your verification request was decided)
//   admin_verification is for admins and has no screen in this app; it falls through to null (the app just opens).
// `disputes.js` wasn't part of any drop in this thread, so if it sends push data with other
// `screen` values, add a case below — `route()` already falls through safely for one it doesn't
// recognise (returns null, so the caller can no-op or fall back to opening the app).

export type PushTarget =
  | { tab: "money"; screen: "money_group"; groupId: string }
  | { tab: "vendor"; screen: "vendor_staff" }
  | { tab: "market"; screen: "mall_vendor"; orderId?: string }
  | { tab: "market"; screen: "mall_orders"; orderId?: string }
  | { tab: "zeeza"; screen: "friend_requests" }
  | { tab: "zeeza"; screen: "friends" }
  | { tab: "zeeza"; screen: "chat" }
  | { tab: "zeeza"; screen: "dm_thread"; threadId: string }
  | { tab: "zeeza"; screen: "chat_room"; roomId: string }
  | { tab: "zeeza"; screen: "call"; callId: string; media?: "audio"|"video" }
  | { tab: "yaayz"; screen: "yaayz"; ticketOrderId?: string }
  | { tab: "leisure"; screen: "leisure" | "leisure_kitchen" | "leisure_lifestyle" }
  | { tab: "profile"; screen: "verification" };


/** Accept only bounded opaque identifiers from untrusted notification payloads. */
export function safeRouteIdentifier(value: unknown, maxLength = 160): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const id = String(value).trim();
  if (!id || id.length > maxLength || !/^[A-Za-z0-9._:-]+$/.test(id)) return null;
  if (id === '.' || id === '..' || /^(undefined|null)$/i.test(id)) return null;
  return id;
}

// data comes off the push payload as strings (React Native's push libraries hand you
// Record<string, string> or similar), so this reads defensively rather than trusting shapes.
export function routeForPush(data: Record<string, any> | undefined | null): PushTarget | null {
  if (!data) return null;
  switch (data.screen) {
    case "money_group":
      const groupId = safeRouteIdentifier(data.groupId);
      return groupId ? { tab: "money", screen: data.screen, groupId } : null;
    case "vendor_staff":
      return { tab: "vendor", screen: data.screen };
    case "mall_vendor":
    case "mall_orders":
      const orderId = data.orderId == null ? null : safeRouteIdentifier(data.orderId);
      if (data.orderId != null && !orderId) return null;
      return { tab: "market", screen: data.screen, orderId: orderId || undefined };
    case "friend_requests":
    case "friends":
      return { tab: "zeeza", screen: data.screen };
    case "chat":
      return { tab: "zeeza", screen: "chat" };
    case "dm_thread":
      const threadId = safeRouteIdentifier(data.threadId);
      return threadId ? { tab: "zeeza", screen: data.screen, threadId } : null;
    case "chat_room":
      const roomId = safeRouteIdentifier(data.roomId);
      return roomId ? { tab: "zeeza", screen: data.screen, roomId } : null;
    case "call":
      const callId = safeRouteIdentifier(data.callId);
      return callId ? { tab: "zeeza", screen: data.screen, callId, media: data.media === "video" ? "video" : "audio" } : null;
    case "yaayz":
      const ticketOrderId = data.ticketOrderId == null ? null : safeRouteIdentifier(data.ticketOrderId);
      if (data.ticketOrderId != null && !ticketOrderId) return null;
      return { tab: "yaayz", screen: "yaayz", ticketOrderId: ticketOrderId || undefined };
    case "leisure":
    case "leisure_kitchen":
    case "leisure_lifestyle":
      return { tab: "leisure", screen: data.screen };
    case "verification":
      return { tab: "profile", screen: "verification" };
    default:
      return null; // unknown or missing `screen` — caller decides the fallback (e.g. just open the app)
  }
}

// Wire-in (adjust to whatever your existing push-tap listener and navigator actually look like —
// I don't have that file, so this is illustrative, not a drop-in import):
//
//   import { routeForPush } from "./pushRouting";
//
//   Notifications.addNotificationResponseReceivedListener((response) => {
//     const target = routeForPush(response.notification.request.content.data);
//     if (!target) return;
//     setTab(target.tab);
//     if (target.screen === "money_group") groups.openGroup(target.groupId);
//     // "vendor_staff" / "mall_vendor" / "mall_orders" open the relevant master section —
//     // wire target.screen (and target.orderId, where present) into however that section picks
//     // what to show.
//     if (target.screen === "dm_thread") zeeza.openThreadById(target.threadId); // or navigate + let ZeezaInbox resolve it
//     if (target.screen === "chat_room") zeeza.openRoomById(target.roomId);
//     // "friend_requests" / "friends" just need the Zeeza open on the Friends sub-view.
//   });

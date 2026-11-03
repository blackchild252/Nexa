// Push-tap routing for the live app (src/app). Pure and free of React Native imports so it can be
// tested directly. It turns a push `data` payload into an Expo Router href. The payload meaning is
// owned by src/pushRouting.ts (routeForPush); this file only maps those targets onto the routes and
// query params that really exist under src/app. An unknown payload returns null (the app just opens).
import { routeForPush, safeRouteIdentifier } from './pushRouting';

export type PushHref = string | { pathname: string; params: Record<string, string> };

const withParams = (pathname: string, params: Record<string, string | undefined>): PushHref => {
  const clean: Record<string, string> = {};
  for (const k of Object.keys(params)) { const v = params[k]; if (v) clean[k] = v; }
  return Object.keys(clean).length ? { pathname, params: clean } : pathname;
};

export function hrefForPush(data: Record<string, any> | undefined | null): PushHref | null {
  if (!data) return null;
  // The server sends a group call as screen "chat_room" plus type "group_call" and a callId.
  if (data.screen === 'chat_room' && data.type === 'group_call') {
    const callId = safeRouteIdentifier(data.callId);
    if (!callId) return null;
    return withParams('/zeeza/group-call', { callId });
  }
  // B323: a Lifestyle alert with a postId opens that exact post.
  if (data.screen === 'leisure_lifestyle') {
    const postId = safeRouteIdentifier(data.postId);
    if (postId) return withParams('/lifestyle', { postId });
  }
  const t = routeForPush(data);
  if (!t) return null;
  switch (t.screen) {
    case 'money_group': return withParams('/(tabs)/money', { view: 'groups', groupId: t.groupId });
    case 'vendor_staff': return '/staff';
    case 'mall_vendor': return withParams('/marketplace/vendor', { tab: t.orderId ? 'orders' : undefined, orderId: t.orderId });
    case 'mall_orders': return withParams('/(tabs)/marketplace', { tab: 'orders', orderId: t.orderId });
    case 'friend_requests':
    case 'friends': return withParams('/(tabs)/zeeza', { section: 'friends' });
    case 'chat': return withParams('/(tabs)/zeeza', { section: 'inbox' });
    case 'dm_thread': return withParams('/(tabs)/zeeza', { threadId: t.threadId });
    case 'chat_room': return withParams('/(tabs)/zeeza', { roomId: t.roomId });
    case 'call': return withParams('/zeeza/call', { callId: t.callId, media: t.media });
    case 'yaayz': return withParams('/(tabs)/yaayz', { ticketOrderId: t.ticketOrderId });
    case 'leisure': return '/(tabs)/leisure';
    case 'leisure_kitchen': return '/leisure/kitchen';
    case 'leisure_lifestyle': return '/lifestyle';
    case 'verification': return '/verification';
    default: return null;
  }
}

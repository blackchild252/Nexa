// Push taps and foreground display for the live app. Ported behaviour of the retired root app/:
//  - a push that arrives while the app is open is shown (banner and list);
//  - a tap on a push opens the right screen (src/pushTapRouting.ts), also when the tap launched the app;
//  - a tap that arrives before sign-in is held and used once the session is authenticated.
// Best-effort only: nothing here can block sign-in or the app. Renders nothing.
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuth } from './auth';
import { hrefForPush, PushHref } from './pushTapRouting';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export function PushTaps() {
  const { status } = useAuth();
  const authed = status === 'authenticated';
  const authedRef = useRef(authed);
  const pending = useRef<PushHref | null>(null);
  const handled = useRef<Set<string>>(new Set());
  authedRef.current = authed;

  const go = (href: PushHref) => { setTimeout(() => { try { router.push(href as any); } catch { /* stay where we are */ } }, 0); };
  const handle = (response: Notifications.NotificationResponse | null | undefined) => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handled.current.has(id)) return;
    handled.current.add(id);
    const href = hrefForPush(response.notification.request.content.data as any);
    if (!href) return;
    if (authedRef.current) go(href); else pending.current = href;
  };

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (authed && pending.current) { const href = pending.current; pending.current = null; go(href); }
  }, [authed]);
  return null;
}

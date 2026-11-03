import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NotificationCenter } from '../../NotificationCenter';
import { RoyalBackground } from '../../RoyalBackground';
import { NexaWorldBackground } from '../../NexaWorldBackground';
import { HomeCommandCenter } from '../../HomeCommandCenter';
import { authedFetch } from '../../api';
import { navigationForNotification } from '../../nexaNavigation';

// Dami remains the embedded NexaAI surface; its dedicated route renders <NexaAI embedded .../>.
export default function Home() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const params = useLocalSearchParams<{ panel?: string }>();
  // Directory → Notifications opens the Notification Center on Home (V5.19.0), then clears the flag so it can re-open.
  useEffect(() => {
    if (params.panel === 'notifications') { setNotificationsOpen(true); router.setParams({ panel: '' } as any); }
  }, [params.panel]);
  // The panel stays open until the server-owned action resolves to a real destination. If it cannot
  // (offline, unknown action), the person stays on their notifications and is told, instead of being
  // dropped on Home with nothing opened.
  const openNotificationTarget = useCallback(async (data: Record<string, any>): Promise<boolean> => {
    try {
      const notificationId = data?.notificationId ? String(data.notificationId) : '';
      const resolved = notificationId ? await authedFetch(`/api/notifications/${encodeURIComponent(notificationId)}/action`) : { action: data?.screen, id: data?.id };
      const target = navigationForNotification({ ...data, screen: resolved?.action || data?.screen, id: resolved?.id ?? data?.id });
      if (target) router.push(target as any);
      return Boolean(target);
    } catch {
      // A persisted notification must never bypass its server-owned action authority.
      return false;
    }
  }, []);
  const onNotificationNavigate = useCallback(async (data: Record<string, any>) => {
    const opened = await openNotificationTarget(data);
    if (opened) setNotificationsOpen(false);
    else Alert.alert('Notification', 'Could not open this notification right now. Check your connection and try again.');
  }, [openNotificationTarget]);
  if (notificationsOpen) return <NexaWorldBackground world="notifications"><NotificationCenter onClose={() => setNotificationsOpen(false)} onNavigate={onNotificationNavigate} /></NexaWorldBackground>;
  return <RoyalBackground world="home" style={{flex:1}}><HomeCommandCenter onOpenNotifications={() => setNotificationsOpen(true)} /></RoyalBackground>;
}

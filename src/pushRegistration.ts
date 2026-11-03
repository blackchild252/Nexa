// Push registration for the live app (src/app). It was ported from the retired root app/index.tsx,
// which was the only place that did this. Behaviour is kept the same: create the two Android
// channels, ask for permission, get the Expo push token and post it to /api/push/register.
// Everything is best-effort: a failure here never blocks sign-in or the app.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { authedFetch } from './api';
import { useAuth } from './auth';

export type PushRegistrationResult = 'registered' | 'denied' | 'skipped' | 'failed';

/** Android channels. The server sends call pushes with channelId "calls", so that channel must exist. */
export async function setupAndroidPushChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'NEXA',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('calls', {
    name: 'Calls',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 500, 300, 500, 300, 500],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
}

/** Channels, permission, token, server registration. `isCurrent` lets the caller cancel after sign-out. */
export async function registerForPush(isCurrent: () => boolean = () => true): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') return 'skipped';
  try {
    await setupAndroidPushChannels();
    const perms = await Notifications.getPermissionsAsync();
    let status = perms.status;
    if (status !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== 'granted') return 'denied';
    if (!isCurrent()) return 'skipped';
    const token = await Notifications.getExpoPushTokenAsync();
    if (!isCurrent()) return 'skipped';
    await authedFetch('/api/push/register', { method: 'POST', body: JSON.stringify({ token: token.data, platform: Platform.OS }) });
    return 'registered';
  } catch {
    return 'failed';
  }
}

/** Mounted once under AuthProvider. Registers this device each time a user signs in. Renders nothing. */
export function PushRegistration() {
  const { user } = useAuth();
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let current = true;
    registerForPush(() => current);
    return () => { current = false; };
  }, [userId]);
  return null;
}

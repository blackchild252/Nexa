import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiMyProfile } from './friends';
import { theme } from './theme';

// One shared copy of the signed-in person's profile photo, so every profile icon in the app shows the same picture.
// The photo is fetched once from the profile route (it is NOT part of the sign-in data: it can be up to 800 KB).
let current: string | null = null;
let loaded = false;
let loading = false;
const listeners = new Set<(url: string | null) => void>();

function publish(url: string | null) {
  current = url;
  listeners.forEach((fn) => fn(url));
}

export function setMyAvatar(url: string | null | undefined) {
  loaded = true;
  publish(url || null);
}

export function clearMyAvatar() {
  loaded = false;
  loading = false;
  publish(null);
}

async function loadMyAvatar() {
  if (loaded || loading) return;
  loading = true;
  try {
    const p = await apiMyProfile();
    if (loading) { loaded = true; publish(p?.avatarUrl || null); }
  } catch {
    // Not signed in yet or offline: keep the fallback icon and try again the next time an icon mounts.
  } finally {
    loading = false;
  }
}

export function useMyAvatar(): string | null {
  const [url, setUrl] = useState<string | null>(current);
  useEffect(() => {
    listeners.add(setUrl);
    setUrl(current);
    void loadMyAvatar();
    return () => { listeners.delete(setUrl); };
  }, []);
  return url;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** A profile icon: the person's own photo when they have one, otherwise the given icon. */
export function ProfilePhotoIcon({ size, icon, color, ring = false }: { size: number; icon: IconName; color: string; ring?: boolean }) {
  const url = useMyAvatar();
  if (!url) return <Ionicons name={icon} size={Math.round(size * 0.9)} color={color} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: ring ? 1 : 0, borderColor: theme.colors.borderGold }}>
      <Image accessible accessibilityRole="image" accessibilityLabel="Your profile photo" source={{ uri: url }} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

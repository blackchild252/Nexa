import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { theme } from './theme';
import { NexaFocusPressable } from './motion';

/**
 * NEXA crash screen (V5.99.43 / B289).
 * Replaces the default expo-router error screen. It renders outside the app providers,
 * so it uses only plain React Native parts and the static theme: no context, no hooks.
 * It shows the error message and the top of the stack so a crash can be traced from a screenshot.
 */
export function crashDetails(error: any): { message: string; where: string } {
  try {
    const message = String(error?.message || error || 'Unknown error').slice(0, 300);
    const stack = String(error?.stack || '').split('\n').slice(0, 14).join('\n').slice(0, 1800);
    return { message, where: stack };
  } catch {
    return { message: 'Unknown error', where: '' };
  }
}

export function NexaErrorScreen({ error, retry }: { error: Error; retry: () => Promise<void> | void }) {
  const { message, where } = crashDetails(error);
  const goHome = () => {
    try { router.replace('/(tabs)' as any); } catch {}
    try { retry(); } catch {}
  };
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 20, paddingTop: 56 }}>
      <Text style={{ color: theme.colors.goldBright, fontSize: 24, fontWeight: '800' }}>Something went wrong</Text>
      <Text style={{ color: theme.colors.ivoryText, marginTop: 8, fontSize: 17 }}>{message}</Text>
      <Text style={{ color: theme.colors.muted, marginTop: 16, fontSize: 14, fontWeight: '700' }}>WHERE IT FAILED (send a screenshot of this)</Text>
      <ScrollView style={{ flex: 1, marginTop: 6, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.surface }} contentContainerStyle={{ padding: 10 }}>
        <Text selectable style={{ color: theme.colors.ivoryText, fontSize: 14, fontFamily: 'monospace' }}>{where || 'No stack was recorded.'}</Text>
      </ScrollView>
      <View style={{ flexDirection: 'row', marginTop: 14, marginBottom: 20 }}>
        <NexaFocusPressable accessibilityRole="button" accessibilityLabel="Retry" onPress={() => { try { retry(); } catch {} }} style={{ flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: theme.colors.goldBright, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
          <Text style={{ color: theme.colors.deepBlack, fontWeight: '800' }}>Retry</Text>
        </NexaFocusPressable>
        <NexaFocusPressable accessibilityRole="button" accessibilityLabel="Go to Home" onPress={goHome} style={{ flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
          <Text style={{ color: theme.colors.goldBright, fontWeight: '800' }}>Home</Text>
        </NexaFocusPressable>
      </View>
    </View>
  );
}

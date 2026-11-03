import React from 'react';
import { Text, View } from 'react-native';
import { NexaPressable } from './motion';
import { theme, ds } from './theme';
import { NEXA_TEXT_SCALES, NEXA_TEXT_SCALE_LABELS, setNexaTextScale, useNexaTextScale, type NexaTextScale } from './nexaTextScale';

export function NexaTextSizeControl() {
  const scale = useNexaTextScale();
  return <View accessibilityLabel="NEXA text size controls" style={ds({ marginTop: 12 })}>
    <Text style={ds({ color: theme.colors.text, fontSize: 20, fontWeight: '800' })}>Text size</Text>
    <Text style={ds({ color: theme.colors.muted, fontSize: 16, lineHeight: 20, marginTop: 3 })}>
      Choose a readable size. Device accessibility scaling still applies.
    </Text>
    <View style={ds({ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' })} accessibilityRole="radiogroup">
      {NEXA_TEXT_SCALES.map((option) => {
        const active = scale === option;
        return <NexaPressable key={option} onPress={() => persistNexaTextScalePreference(option)}
          accessibilityRole="radio" accessibilityState={{ selected: active }}
          accessibilityLabel={`${NEXA_TEXT_SCALE_LABELS[option]} text size`}
          style={ds({ minHeight: 44, minWidth: 92, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: active ? 2 : 1, borderColor: active ? theme.colors.brightGold : theme.colors.border, backgroundColor: active ? theme.colors.goldWash : theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' })}>
          <Text style={ds({ color: active ? theme.colors.goldBright : theme.colors.text, fontSize: option === 1 ? 14 : 15, fontWeight: active ? '900' : '700' })}>{NEXA_TEXT_SCALE_LABELS[option]}</Text>
        </NexaPressable>;
      })}
    </View>
    <Text style={ds({ color: theme.colors.muted, fontSize: 15, lineHeight: 18, marginTop: 8 })}>
      Current: {NEXA_TEXT_SCALE_LABELS[scale]} ({Math.round(scale * 100)}%)
    </Text>
  </View>;
}

export async function loadNexaTextScalePreference(): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('nexa.text.scale');
      if (stored != null) setNexaTextScale(stored);
      return;
    }
  } catch { /* native storage path below */ }
  try {
    const SecureStore = await import('expo-secure-store');
    const stored = await SecureStore.getItemAsync('nexa.text.scale');
    if (stored != null) setNexaTextScale(stored);
  } catch { /* preference is optional; device font scaling remains available */ }
}

export async function persistNexaTextScalePreference(value: NexaTextScale): Promise<void> {
  setNexaTextScale(value);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nexa.text.scale', String(value));
      return;
    }
  } catch { /* native storage path below */ }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync('nexa.text.scale', String(value));
  } catch { /* in-memory preference is still active for this session */ }
}


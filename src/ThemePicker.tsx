import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme, ds } from './theme';
import type { ThemePreference } from './themeMode';

/**
 * Appearance switch shown in Profile & Settings. Each option is a tappable mini-preview of the
 * interface it selects, so the choice is visible before it is applied. Fixed swatch colors are
 * intentional: a preview must not change with the active theme.
 */
const OPTIONS: Array<{ id: ThemePreference; title: string; sub: string; sky: [string, string]; land: string; water: string; forest: string; gold: string; split?: boolean }> = [
  { id: 'default', title: 'Default', sub: 'Follows your phone', split: true, sky: ['#05020C', '#3A1436'], land: '#8B5E3C', water: '#2E8FD6', forest: '#2F7D4F', gold: '#D4AF37' },
  { id: 'dark', title: 'Royal Dark', sub: 'Black and royal gold', sky: ['#05020C', '#3A1436'], land: '#0A0510', water: '#5A2B10', forest: '#1A1A1A', gold: '#D4AF37' },
  { id: 'light', title: 'Earth Light', sub: 'Sky, water and land', sky: ['#EAF5FF', '#FFFFFF'], land: '#8B5E3C', water: '#2E8FD6', forest: '#2F7D4F', gold: '#C9A227' },
];

/** M4502: three tiles. `preference` is the person's choice (Default, Royal Dark or Earth Light), not the resolved look. */
export function ThemePicker({ preference, onSelect }: { preference: ThemePreference; onSelect: (preference: ThemePreference) => void }) {
  return <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={ds({ flexDirection: 'row', flexWrap: 'wrap', gap: 12 })}>
    {OPTIONS.map(o => {
      const active = o.id === preference;
      return <NexaPressable key={o.id} activeOpacity={0.85} onPress={() => onSelect(o.id)}
        accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={`${o.title}${o.id === 'default' ? ', follows your phone' : ' interface'}${active ? ', selected' : ''}`}
        style={ds({ flexGrow: 1, flexBasis: '30%', minWidth: 100, minHeight: 48, borderRadius: 16, borderWidth: active ? 2 : 1, borderColor: active ? theme.colors.brightGold : theme.colors.border, backgroundColor: theme.colors.surfaceElevated, overflow: 'hidden' })}>
        <View style={{ height: 78, overflow: 'hidden' }}>
          <LinearGradient colors={o.sky} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          {o.split ? <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', backgroundColor: '#EAF5FF' }} /> : null}
          <View style={{ position: 'absolute', right: 14, top: 10, width: 16, height: 16, borderRadius: 8, backgroundColor: o.gold }} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 26, backgroundColor: o.water }} />
          <View style={{ position: 'absolute', left: -10, bottom: 18, width: 70, height: 34, borderTopLeftRadius: 40, borderTopRightRadius: 40, backgroundColor: o.land }} />
          <View style={{ position: 'absolute', left: 46, bottom: 18, width: 60, height: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: o.forest }} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: o.gold }} />
        </View>
        <View style={ds({ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 6 })}>
          <View style={{ flex: 1 }}>
            <Text style={ds({ color: theme.colors.text, fontWeight: '900', fontSize: 16 })}>{o.title}</Text>
            <Text style={ds({ color: theme.colors.muted, fontSize: 15, marginTop: 2 })}>{o.sub}</Text>
          </View>
          {active ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.brightGold} /> : null}
        </View>
      </NexaPressable>;
    })}
  </View>;
}

import { NexaPressable } from './motion';

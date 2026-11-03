import React from 'react';
import { Text, View } from 'react-native';
import { NexaPressable } from './motion';
import { theme, ds } from './theme';
import { NEXA_HOME_SPACINGS, NEXA_HOME_SPACING_LABELS, persistNexaHomeSpacingPreference, useNexaHomeSpacing } from './nexaHomeSpacing';

/** Settings > Home top spacing. Adds room above the Home header; the automatic phone-safe spacing always stays. */
export function NexaHomeSpacingControl() {
  const spacing = useNexaHomeSpacing();
  return <View accessibilityLabel="NEXA Home top spacing controls" style={ds({ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border })}>
    <Text accessibilityRole="header" style={ds({ color: theme.colors.text, fontSize: 22, fontWeight: '900' })}>Home top spacing</Text>
    <Text style={ds({ color: theme.colors.muted, fontSize: 16, lineHeight: 20, marginTop: 3 })}>
      Add more room above the NEXA title on Home. Only the Home screen changes. It is remembered on this phone.
    </Text>
    <View style={ds({ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' })} accessibilityRole="radiogroup">
      {NEXA_HOME_SPACINGS.map((option) => {
        const active = spacing === option;
        return <NexaPressable key={option} onPress={() => { void persistNexaHomeSpacingPreference(option); }}
          accessibilityRole="radio" accessibilityState={{ selected: active }}
          accessibilityLabel={`${NEXA_HOME_SPACING_LABELS[option]} Home top spacing${active ? ', selected' : ''}`}
          style={ds({ minHeight: 44, minWidth: 92, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: active ? 2 : 1, borderColor: active ? theme.colors.brightGold : theme.colors.border, alignItems: 'center', justifyContent: 'center' })}>
          <Text style={ds({ color: active ? theme.colors.goldBright : theme.colors.text, fontSize: 17, fontWeight: active ? '900' : '700' })}>{NEXA_HOME_SPACING_LABELS[option]}</Text>
        </NexaPressable>;
      })}
    </View>
  </View>;
}

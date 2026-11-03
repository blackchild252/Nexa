import React from 'react';
import { Text, View } from 'react-native';
import { NexaPressable } from './motion';
import { theme, ds } from './theme';
import { NexaTextSizeControl } from './NexaTextSizeControl';
import { NEXA_FONT_CHOICES, NEXA_FONT_CHOICE_LABELS, NEXA_FONT_CHOICE_NOTES } from './nexaFontFamilies';
import { useNexaFontChoice } from './nexaFontChoice';
import { NEXA_TEXT_SCALE_LABELS, useNexaTextScale } from './nexaTextScale';
import { persistNexaFontChoice, resetNexaTypographyPreferences } from './nexaTypographyPreferences';

/** Settings > Reading comfort: text size, font type, live preview and one-tap reset. */
export function NexaFontTypeControl() {
  const choice = useNexaFontChoice();
  return <View accessibilityLabel="NEXA font type controls" style={ds({ marginTop: 18 })}>
    <Text style={ds({ color: theme.colors.text, fontSize: 20, fontWeight: '800' })}>Font type</Text>
    <Text style={ds({ color: theme.colors.muted, fontSize: 16, lineHeight: 20, marginTop: 3 })}>Pick the letters that are easiest for you to read.</Text>
    <View style={ds({ gap: 8, marginTop: 12 })} accessibilityRole="radiogroup">
      {NEXA_FONT_CHOICES.map((option) => {
        const active = choice === option;
        return <NexaPressable key={option} onPress={() => { void persistNexaFontChoice(option); }}
          accessibilityRole="radio" accessibilityState={{ selected: active }}
          accessibilityLabel={`${NEXA_FONT_CHOICE_LABELS[option]} font${active ? ', selected' : ''}`}
          style={ds({ minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: active ? 2 : 1, borderColor: active ? theme.colors.brightGold : theme.colors.border, backgroundColor: active ? theme.colors.goldWash : theme.colors.surfaceElevated, justifyContent: 'center' })}>
          <Text style={ds({ color: active ? theme.colors.goldBright : theme.colors.text, fontSize: 18, fontWeight: active ? '900' : '700' })}>{NEXA_FONT_CHOICE_LABELS[option]}{active ? '  ✓' : ''}</Text>
          <Text style={ds({ color: theme.colors.muted, fontSize: 15, lineHeight: 18, marginTop: 2 })}>{NEXA_FONT_CHOICE_NOTES[option]}</Text>
        </NexaPressable>;
      })}
    </View>
  </View>;
}

export function NexaReadingSettings() {
  const scale = useNexaTextScale();
  const choice = useNexaFontChoice();
  const isStandard = scale === 1 && choice === 'inter';
  return <View accessibilityLabel="NEXA reading comfort settings" style={ds({ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border })}>
    <Text accessibilityRole="header" style={ds({ color: theme.colors.text, fontSize: 22, fontWeight: '900' })}>Reading comfort</Text>
    <Text style={ds({ color: theme.colors.muted, fontSize: 16, lineHeight: 20, marginTop: 3 })}>Changes apply to the whole app and are remembered on this phone.</Text>
    <NexaTextSizeControl />
    <NexaFontTypeControl />
    <View accessibilityLabel="Reading preview" style={ds({ marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated })}>
      <Text style={ds({ color: theme.colors.muted, fontSize: 15, lineHeight: 18 })}>Preview · {NEXA_TEXT_SCALE_LABELS[scale]} · {NEXA_FONT_CHOICE_NOTES[choice]}</Text>
      <Text style={ds({ color: theme.colors.text, fontSize: 18, lineHeight: 24, marginTop: 6 })}>Your world. One app. This is how NEXA text will look.</Text>
    </View>
    <NexaPressable accessibilityRole="button" accessibilityLabel="Reset text size and font to 100% default" accessibilityState={{ disabled: isStandard }} disabled={isStandard}
      onPress={() => { void resetNexaTypographyPreferences(); }}
      style={ds({ minHeight: 44, marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', opacity: isStandard ? 0.5 : 1 })}>
      <Text style={ds({ color: theme.colors.goldText, fontSize: 17, fontWeight: '800' })}>{isStandard ? 'Already 100% default' : 'Reset to 100% default'}</Text>
    </NexaPressable>
  </View>;
}

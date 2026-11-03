import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, tc } from './theme';
import { NexaWorldBackground } from './NexaWorldBackground';
import type { NexaWorld } from './nexaWorlds';

type Props = { children: React.ReactNode; style?: StyleProp<ViewStyle>; world?: NexaWorld };

/** Permanent NEXA app ambiance: deep-black to graphite gradient. */
export function RoyalBackground({ children, style, world }: Props) {
  if (world) return <NexaWorldBackground world={world} style={style}>{children}</NexaWorldBackground>;
  return (
    <LinearGradient colors={theme.gradients.app as unknown as readonly [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[{ flex: 1 }, style]}>
      {children}
    </LinearGradient>
  );
}

/** Lightweight surface wrapper for screens that need a gold-elevated card. */
export function RoyalSurface({ children, style }: Props) {
  return <View style={[{ backgroundColor: theme.colors.graphite, borderColor: tc('rgba(212,175,55,0.4)'), borderWidth: 1, borderRadius: 18, ...theme.shadow.card }, style]}>{children}</View>;
}

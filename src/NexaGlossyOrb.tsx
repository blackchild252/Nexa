import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NexaPressable, useMotion } from './motion';
import { MOTION_MS } from './motionTiming';
import { useThemeMode } from './ThemeProvider';

/**
 * Glossy 3D orb (V5.20.0): jewel body, specular highlight, inner rim light and a coloured glow.
 * Built from gradients only, so it needs no new dependency and works in Expo Go.
 */
export type OrbTone = 'red' | 'blue' | 'gold' | 'glass';

const TONES: Record<OrbTone, { body: [string, string, string]; rim: string; glow: string; border: string }> = {
  red: { body: ['#ff6b6b', '#d81f2a', '#5a0710'], rim: 'rgba(255,190,190,0.9)', glow: '#ff2a3a', border: 'rgba(255,170,170,0.55)' },
  blue: { body: ['#5aa8ff', '#1554e6', '#071a66'], rim: 'rgba(170,210,255,0.9)', glow: '#2f6bff', border: 'rgba(160,200,255,0.55)' },
  gold: { body: ['#fff0a3', '#FFD700', '#8a6a10'], rim: 'rgba(255,255,220,0.95)', glow: '#FFD700', border: 'rgba(255,240,170,0.7)' },
  glass: { body: ['#2b2b3a', '#0d0d16', '#000000'], rim: 'rgba(255,225,140,0.85)', glow: '#FFD700', border: 'rgba(255,215,0,0.75)' },
};

/**
 * Earth Light: the same jewel orbs in earth colours.
 * red -> forest green, blue -> water blue, glass -> sky glass with a real-gold rim, gold stays gold.
 * Royal Dark tones above are unchanged.
 */
const LIGHT_TONES: Record<OrbTone, { body: [string, string, string]; rim: string; glow: string; border: string }> = {
  red: { body: ['#6FCB93', '#2F7D4F', '#123F26'], rim: 'rgba(210,245,222,0.9)', glow: '#2F7D4F', border: 'rgba(201,162,39,0.75)' },
  blue: { body: ['#7CC4F2', '#1E78C2', '#0B3F6E'], rim: 'rgba(214,236,252,0.9)', glow: '#1E78C2', border: 'rgba(201,162,39,0.75)' },
  gold: { body: ['#FFF3C4', '#E6C566', '#9A7412'], rim: 'rgba(255,250,225,0.95)', glow: '#C9A227', border: 'rgba(201,162,39,0.85)' },
  glass: { body: ['#FFFFFF', '#E3F1FB', '#BBDBF2'], rim: 'rgba(255,225,140,0.9)', glow: '#C9A227', border: 'rgba(201,162,39,0.85)' },
};

export function NexaGlossyOrb({ size = 120, tone = 'gold', children, onPress, style, pulse = false, accessibilityLabel, disabled, accessibilityRole = 'button' }: {
  size?: number; tone?: OrbTone; children?: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; pulse?: boolean; accessibilityLabel?: string; disabled?: boolean; accessibilityRole?: 'button' | 'link';
}) {
  const { mode } = useThemeMode();
  const t = (mode === 'light' ? LIGHT_TONES : TONES)[tone];
  const { allows } = useMotion();
  const breathe = useRef(new Animated.Value(0)).current;
  const animate = pulse && allows('dami');
  useEffect(() => {
    if (!animate) { breathe.stopAnimation(); breathe.setValue(0); return; }
    const l = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: MOTION_MS.breathe, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: MOTION_MS.breathe, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, [animate, breathe]);

  const body = (
    <Animated.View style={{ width: size, height: size, transform: [{ scale: animate ? breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) : 1 }] }}>
      {/* outer coloured glow */}
      <View style={{ position: 'absolute', left: -size * 0.08, top: -size * 0.08, width: size * 1.16, height: size * 1.16, borderRadius: size, backgroundColor: t.glow, opacity: 0.16 }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: 1.5, borderColor: t.border, shadowColor: t.glow, shadowOpacity: 0.85, shadowRadius: size * 0.22, shadowOffset: { width: 0, height: size * 0.06 }, elevation: 16 }}>
        <LinearGradient colors={t.body} start={{ x: 0.25, y: 0.05 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
        {/* bottom bounce light */}
        <LinearGradient colors={['rgba(255,255,255,0)', t.rim]} style={{ position: 'absolute', left: size * 0.16, right: size * 0.16, bottom: 2, height: size * 0.18, borderRadius: size, opacity: 0.35 }} />
        {/* specular highlight */}
        <LinearGradient colors={['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.05)']} style={{ position: 'absolute', left: size * 0.14, top: size * 0.05, width: size * 0.72, height: size * 0.42, borderRadius: size }} />
        <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      </View>
    </Animated.View>
  );
  if (!onPress) return <View style={style} accessibilityLabel={accessibilityLabel}>{body}</View>;
  return <NexaPressable onPress={onPress} disabled={disabled} style={style} accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel}>{body}</NexaPressable>;
}

/** Bevelled glass panel used by rails and cards: lit top edge, deep shadow, gold hairline. */
export function NexaBevel({ children, style, radius = 16 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number }) {
  const { mode } = useThemeMode();
  const light = mode === 'light';
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: light ? 'rgba(201,162,39,0.55)' : 'rgba(255,215,0,0.4)', backgroundColor: light ? 'rgba(255,255,255,0.82)' : 'rgba(14,10,22,0.78)', shadowColor: light ? '#4F7A99' : '#FFD700', shadowOpacity: light ? 0.2 : 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 }, style]}>
      <LinearGradient pointerEvents="none" colors={light ? ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0)'] : ['rgba(255,235,160,0.22)', 'rgba(255,215,0,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

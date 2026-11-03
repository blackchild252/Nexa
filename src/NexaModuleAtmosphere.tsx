import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';
import { useThemeMode } from './ThemeProvider';
import { NexaGlossyOrb } from './NexaGlossyOrb';

type AtmosphereWorld = 'sky-money' | 'dream-marketplace' | 'kitchen' | 'ball-house' | 'leisure' | 'fitness' | 'game-house' | 'zeeza' | 'yaayz';

const PALETTES: Record<AtmosphereWorld, { primary: string; secondary: string; accent: string }> = {
  'sky-money': { primary: 'rgba(255,215,0,0.34)', secondary: 'rgba(70,120,255,0.18)', accent: 'rgba(255,245,190,0.5)' },
  'dream-marketplace': { primary: 'rgba(255,215,0,0.3)', secondary: 'rgba(140,80,255,0.16)', accent: 'rgba(255,240,170,0.46)' },
  kitchen: { primary: 'rgba(255,180,70,0.28)', secondary: 'rgba(255,215,0,0.18)', accent: 'rgba(255,245,205,0.42)' },
  'ball-house': { primary: 'rgba(255,215,0,0.3)', secondary: 'rgba(60,150,255,0.18)', accent: 'rgba(220,240,255,0.4)' },
  leisure: { primary: 'rgba(255,215,0,0.28)', secondary: 'rgba(80,180,150,0.18)', accent: 'rgba(240,230,180,0.4)' },
  fitness: { primary: 'rgba(255,215,0,0.26)', secondary: 'rgba(60,190,140,0.18)', accent: 'rgba(230,255,245,0.38)' },
  'game-house': { primary: 'rgba(255,215,0,0.28)', secondary: 'rgba(120,80,255,0.2)', accent: 'rgba(180,220,255,0.42)' },
  zeeza: { primary: 'rgba(255,215,0,0.25)', secondary: 'rgba(70,150,255,0.18)', accent: 'rgba(255,240,190,0.4)' },
  yaayz: { primary: 'rgba(255,215,0,0.28)', secondary: 'rgba(80,150,255,0.18)', accent: 'rgba(235,245,255,0.4)' },
};

const worlds = new Set<AtmosphereWorld>(Object.keys(PALETTES) as AtmosphereWorld[]);
export function isAtmosphereWorld(world: string): world is AtmosphereWorld { return worlds.has(world as AtmosphereWorld); }

/** Decorative world-specific depth. It never receives input and never owns route/content behavior. */
export function NexaModuleAtmosphere({ world }: { world: AtmosphereWorld }) {
  const { mode } = useThemeMode();
  const { allows } = useMotion();
  const { width, height } = useWindowDimensions();
  const motion = allows('world-ambient') && mode === 'dark';
  const p = PALETTES[world];
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!motion) { sweep.stopAnimation(); pulse.stopAnimation(); sweep.setValue(0); pulse.setValue(0); return; }
    const a = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true }));
    const b = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, [motion, pulse, sweep]);

  const glow = motion ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.95] }) : 0.55;
  const sweepX = motion ? sweep.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.5, width * 0.75] }) : 0;

  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Animated.View style={{ position: 'absolute', left: -width * 0.2, top: height * 0.18, width: width * 1.4, height: 1, backgroundColor: p.primary, opacity: glow, transform: [{ translateX: sweepX }, { rotate: '-12deg' }] }} />
      <Animated.View style={{ position: 'absolute', left: width * 0.08, top: height * 0.58, width: width * 0.84, height: height * 0.34, borderRadius: width, borderWidth: 1, borderColor: p.secondary, opacity: glow, transform: [{ scale: motion ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.03] }) : 1 }] }} />
      <View style={{ position: 'absolute', left: width * 0.18, top: height * 0.27, width: 6, height: 6, borderRadius: 3, backgroundColor: p.accent, opacity: 0.55 }} />
      <View style={{ position: 'absolute', left: width * 0.76, top: height * 0.34, width: 4, height: 4, borderRadius: 2, backgroundColor: p.accent, opacity: 0.42 }} />
      <View style={{ position: 'absolute', left: width * 0.5 - 32, top: height * 0.73, width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: p.primary, opacity: 0.18 }} />
      <View pointerEvents="none" style={{ position: 'absolute', right: width * 0.09, top: height * 0.18, opacity: 0.9 }}>
        <NexaGlossyOrb size={58} tone={world === 'ball-house' || world === 'sky-money' ? 'blue' : world === 'fitness' || world === 'leisure' ? 'red' : 'gold'} pulse />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: width * 0.08, bottom: height * 0.16, opacity: 0.5 }}>
        <NexaGlossyOrb size={28} tone="glass" />
      </View>
    </View>
  );
}

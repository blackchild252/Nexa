import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from './theme';
import { useMotion } from './motion';
import { currentThemeMode } from './themeMode';

/** Runtime 3D-like depth layer: no 3D engine or new dependency required. */
export function NexaDepthLayer({ emphasis = 0.7 }: { emphasis?: number }) {
  const { allows, reducedMotion, level } = useMotion();
  const ambient = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const drift = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ambient || reducedMotion) {
      drift.stopAnimation();
      spin.stopAnimation();
      drift.setValue(0);
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: level >= 100 ? 5200 : 7200, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: level >= 100 ? 5200 : 7200, useNativeDriver: true }),
      ]),
    );
    const spinLoop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 26000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    spinLoop.start();
    return () => { loop.stop(); spinLoop.stop(); };
  }, [ambient, reducedMotion, level, drift, spin]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const scale = drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] });
  const opacity = Math.max(0.18, Math.min(0.7, emphasis));
  const light = currentThemeMode() === 'light';  // V5.21.0: Earth Light rings are gold + water blue

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.depth, { opacity, transform: [{ translateY }, { scale }] }]}>
        <LinearGradient
          colors={light ? NEXA_DEPTH_COLORS_LIGHT : NEXA_DEPTH_COLORS}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={styles.wash}
        />
        {/* V5.20.0: rings are tilted in perspective (real 3D depth) and slowly orbit when ambient motion is allowed */}
        <Animated.View style={[styles.ringOuter, { borderColor: light ? `rgba(201,162,39,${vip ? 0.5 : 0.32})` : `rgba(212,175,55,${vip ? 0.34 : 0.2})`, transform: [{ perspective: 800 }, { rotateX: '64deg' }, { rotateZ: spin.interpolate({ inputRange: [0, 1], outputRange: ['18deg', '378deg'] }) }] }]} />
        <Animated.View style={[styles.ringInner, { borderColor: light ? `rgba(30,120,194,${vip ? 0.36 : 0.2})` : `rgba(255,215,0,${vip ? 0.24 : 0.12})`, transform: [{ perspective: 800 }, { rotateY: '62deg' }, { rotateZ: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }] }]} />
        <View style={[styles.floorGlow, light ? { backgroundColor: 'rgba(46,143,214,0.10)' } : null]} />
        {vip ? <View style={styles.spotlight} /> : null}
      </Animated.View>
    </View>
  );
}

const NEXA_DEPTH_COLORS_LIGHT = [
  'rgba(30,120,194,0.06)',
  'rgba(201,162,39,0.03)',
  'rgba(255,255,255,0)',
] as const;

const NEXA_DEPTH_COLORS = [
  'rgba(255,215,0,0.04)',
  'rgba(212,175,55,0.015)',
  'rgba(0,0,0,0)',
] as const;

const styles = StyleSheet.create({
  depth: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  wash: { ...StyleSheet.absoluteFillObject },
  ringOuter: {
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  ringInner: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1.5,
  },
  floorGlow: { position: 'absolute', bottom: -60, width: 360, height: 140, borderRadius: 180, backgroundColor: 'rgba(255,170,40,0.06)' },
  spotlight: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,215,0,0.035)',
    shadowColor: theme.colors.brightGold,
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 8,
  },
});

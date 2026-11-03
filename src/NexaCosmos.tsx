import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMotion } from './motion';

/**
 * NEXA Royal Dark cosmos (V5.20.0).
 * A fully native, dependency-free space scene: nebula, twinkling stars, a ringed planet,
 * layered mountains with gold rim light, a glowing horizon and shimmering water.
 * It replaces the old ChatGPT poster wallpaper. Decorative only: never receives input.
 * Motion follows the subscription rules: Free renders the same scene, static.
 */

// Deterministic pseudo-random so the sky is identical on every render.
function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

type Star = { x: number; y: number; size: number; alpha: number; group: 0 | 1 | 2 };

function makeStars(count: number): Star[] {
  const r = rng(20260929);
  return Array.from({ length: count }, (_, i) => ({ x: r(), y: r() * 0.62, size: 1 + r() * 1.8, alpha: 0.35 + r() * 0.6, group: (i % 3) as 0 | 1 | 2 }));
}

function Tri({ w, h, color, style }: { w: number; h: number; color: string; style?: any }) {
  return <View style={[{ width: 0, height: 0, borderLeftWidth: w / 2, borderRightWidth: w / 2, borderBottomWidth: h, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }, style]} />;
}

// Mountain ridge: [left fraction, width fraction, height px]
const BACK_RIDGE: Array<[number, number, number]> = [[-0.1, 0.55, 150], [0.22, 0.5, 190], [0.55, 0.6, 140], [0.8, 0.45, 170]];
const FRONT_RIDGE: Array<[number, number, number]> = [[-0.18, 0.6, 210], [0.12, 0.42, 120], [0.62, 0.55, 230], [0.9, 0.4, 130]];

export function NexaCosmos({ variant = 'home', dim = 0 }: { variant?: 'home' | 'dami'; dim?: number }) {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const stars = useMemo(() => makeStars(56), []);

  const twA = useRef(new Animated.Value(0)).current;
  const twB = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [twA, twB, glow, float, shimmer].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loop = (v: Animated.Value, ms: number) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const loops = [loop(twA, 1900), loop(twB, 2700), loop(glow, 3600), loop(float, 6200), Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true }))];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, twA, twB, glow, float, shimmer]);

  const horizonY = height * (variant === 'home' ? 0.6 : 0.5);
  const waterH = height - horizonY;
  const base = variant === 'home' ? ['#05020c', '#170a2b', '#3a1436', '#7a3a18'] : ['#04030a', '#0f0822', '#26102a', '#5a2b12'];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
      <LinearGradient colors={base as any} locations={[0, 0.38, 0.72, 1]} style={StyleSheet.absoluteFill} />

      {/* nebula clouds */}
      <Animated.View style={[styles.blob, { left: -width * 0.25, top: height * 0.08, width: width * 0.95, height: width * 0.95, backgroundColor: 'rgba(120,60,200,0.16)', transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) }] }]} />
      <Animated.View style={[styles.blob, { right: -width * 0.3, top: height * 0.22, width: width * 0.9, height: width * 0.9, backgroundColor: 'rgba(255,140,40,0.10)', transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [8, -6] }) }] }]} />

      {/* stars */}
      {stars.map((s, i) => {
        const style: any = { position: 'absolute', left: s.x * width, top: s.y * height, width: s.size, height: s.size, borderRadius: s.size, backgroundColor: i % 7 === 0 ? '#FFE9A8' : '#FFFFFF', opacity: s.alpha };
        if (animated && s.group === 1) style.opacity = twA.interpolate({ inputRange: [0, 1], outputRange: [s.alpha, s.alpha * 0.25] });
        if (animated && s.group === 2) style.opacity = twB.interpolate({ inputRange: [0, 1], outputRange: [s.alpha * 0.3, s.alpha] });
        return <Animated.View key={i} style={style} />;
      })}

      {/* ringed planet */}
      <Animated.View style={{ position: 'absolute', right: width * 0.05, top: height * 0.2, width: 70, height: 70, transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }}>
        <View style={[styles.planetGlow]} />
        <LinearGradient colors={['#f1b463', '#a5561d', '#2b0f06']} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.85, y: 0.95 }} style={styles.planet} />
        <View style={styles.planetRing} />
      </Animated.View>

      {/* back mountains */}
      {BACK_RIDGE.map(([l, w, h], i) => <Tri key={'b' + i} w={w * width} h={h} color="#2a1233" style={{ position: 'absolute', left: l * width, top: horizonY - h }} />)}
      {/* horizon glow */}
      <LinearGradient colors={['rgba(255,170,40,0)', 'rgba(255,170,40,0.55)', 'rgba(255,120,20,0.0)']} style={{ position: 'absolute', left: 0, right: 0, top: horizonY - 70, height: 110 }} />
      <Animated.View style={{ position: 'absolute', left: width * 0.5 - 150, top: horizonY - 36, width: 300, height: 72, borderRadius: 150, backgroundColor: 'rgba(255,190,70,0.42)', opacity: animated ? glow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) : 0.85, transform: [{ scaleX: animated ? glow.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) : 1 }] }} />
      {/* front mountains with gold rim light */}
      {FRONT_RIDGE.map(([l, w, h], i) => (
        <React.Fragment key={'f' + i}>
          <Tri w={w * width} h={h} color="rgba(255,190,70,0.75)" style={{ position: 'absolute', left: l * width - 2, top: horizonY - h + 6 }} />
          <Tri w={w * width} h={h} color="#0a0510" style={{ position: 'absolute', left: l * width, top: horizonY - h + 8 }} />
        </React.Fragment>
      ))}

      {/* water */}
      <LinearGradient colors={['#5a2b10', '#1a0c12', '#05030a']} locations={[0, 0.35, 1]} style={{ position: 'absolute', left: 0, right: 0, top: horizonY + 6, height: waterH }} />
      {Array.from({ length: 8 }, (_, i) => {
        const w = 180 - i * 18;
        const dir = i % 2 ? 1 : -1;
        return <Animated.View key={'w' + i} style={{ position: 'absolute', top: horizonY + 14 + i * 13, left: width * 0.5 - w / 2, width: w, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,205,110,0.55)', opacity: animated ? shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.7, 0.15] }) : 0.4 - i * 0.03, transform: [{ translateX: animated ? shimmer.interpolate({ inputRange: [0, 1], outputRange: [-8 * dir, 8 * dir] }) : 0 }] }} />;
      })}

      {vip ? <Animated.View style={{ position: 'absolute', left: width * 0.5 - 120, top: height * 0.24, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,215,0,0.05)', opacity: glow }} /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${Math.max(0, Math.min(0.8, dim))})` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', borderRadius: 999 },
  planetGlow: { position: 'absolute', left: -12, top: -12, width: 94, height: 94, borderRadius: 47, backgroundColor: 'rgba(255,170,60,0.18)' },
  planet: { position: 'absolute', left: 0, top: 0, width: 70, height: 70, borderRadius: 35 },
  planetRing: { position: 'absolute', left: -22, top: 27, width: 114, height: 16, borderRadius: 57, borderWidth: 2, borderColor: 'rgba(255,215,140,0.55)', transform: [{ rotate: '-14deg' }] },
});

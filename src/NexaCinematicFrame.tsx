import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMotion } from './motion';
import { useThemeMode } from './ThemeProvider';
import { getNexaSceneContract, NEXA_SCENE_ACCENTS } from './nexaSceneContract';
import type { NexaWorld } from './nexaWorlds';

/**
 * Shared cinematic material frame. Decorative only: it adds depth, edge lighting,
 * a restrained horizon and corner material cues without owning content or navigation.
 */
export function NexaCinematicFrame({ world }: { world: NexaWorld }) {
  const { width, height } = useWindowDimensions();
  const { mode } = useThemeMode();
  const { allows, reducedMotion } = useMotion();
  const contract = getNexaSceneContract(world);
  const tone = NEXA_SCENE_ACCENTS[contract.accent];
  const drift = useRef(new Animated.Value(0)).current;
  const animated = mode === 'dark' && allows('world-ambient') && !reducedMotion;

  useEffect(() => {
    if (!animated) {
      drift.stopAnimation();
      drift.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 11000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 11000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animated, drift]);

  const translate = animated ? drift.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.08, width * 0.08] }) : 0;
  const glow = animated ? drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.22, 0.48, 0.22] }) : 0.28;
  const cinematic = contract.density === 'cinematic';

  return (
    <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, styles.frame]}>
      <LinearGradient
        colors={mode === 'dark' ? ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.72)'] : ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.32)']}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.readability}
      />
      <Animated.View style={[styles.horizon, { left: width * 0.08, width: width * 0.84, top: height * (cinematic ? 0.62 : 0.68), backgroundColor: tone.primary, opacity: glow, transform: [{ translateX: translate }, { rotate: '-5deg' }] }]} />
      <View style={[styles.horizonGlow, { left: width * 0.18, width: width * 0.64, top: height * (cinematic ? 0.60 : 0.66), borderColor: tone.secondary }]} />
      <View style={[styles.cornerTL, { borderColor: tone.secondary }]} />
      <View style={[styles.cornerBR, { borderColor: tone.secondary }]} />
      {cinematic ? <Animated.View style={[styles.materialBand, { top: height * 0.76, opacity: glow, transform: [{ translateX: translate }] }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  readability: { ...StyleSheet.absoluteFillObject },
  horizon: { position: 'absolute', height: 1.5, borderRadius: 2 },
  horizonGlow: { position: 'absolute', height: 42, borderRadius: 999, borderWidth: 1, opacity: 0.13, transform: [{ scaleY: 0.28 }] },
  cornerTL: { position: 'absolute', left: 10, top: 12, width: 46, height: 46, borderTopWidth: 1, borderLeftWidth: 1, borderTopLeftRadius: 18, opacity: 0.16 },
  cornerBR: { position: 'absolute', right: 10, bottom: 12, width: 46, height: 46, borderBottomWidth: 1, borderRightWidth: 1, borderBottomRightRadius: 18, opacity: 0.12 },
  materialBand: { position: 'absolute', left: '12%', width: '76%', height: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
});

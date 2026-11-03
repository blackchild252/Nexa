import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { NexaGlossyOrb } from './NexaGlossyOrb';
import { useMotion } from './motion';
import { useThemeMode } from './ThemeProvider';
import { getNexaSceneContract, NEXA_SCENE_ACCENTS } from './nexaSceneContract';
import type { NexaWorld } from './nexaWorlds';

/** Shared cinematic accent for quieter worlds; decorative and pointer-safe. */
export function NexaSceneAccent({ world }: { world: NexaWorld }) {
  const { mode } = useThemeMode();
  const { allows } = useMotion();
  const { width, height } = useWindowDimensions();
  const sweep = useRef(new Animated.Value(0)).current;
  const contract = getNexaSceneContract(world);
  const tone = NEXA_SCENE_ACCENTS[contract.accent];
  const animated = mode === 'dark' && allows('world-ambient');

  useEffect(() => {
    if (!animated) { sweep.stopAnimation(); sweep.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(sweep, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animated, sweep]);

  const drift = animated ? sweep.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.14, width * 0.14] }) : 0;
  const glow = animated ? sweep.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.28, 0.62, 0.28] }) : 0.3;
  const orbSize = Math.max(38, Math.min(64, width * 0.13));

  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.horizon, { width: width * 0.78, left: width * 0.11, top: height * 0.58, backgroundColor: tone.primary, opacity: glow, transform: [{ translateX: drift }, { rotate: '-7deg' }] }]} />
      <View style={[styles.halo, { left: width * 0.08, top: height * 0.18, width: width * 0.42, height: width * 0.42, borderColor: tone.secondary, backgroundColor: tone.glow }]} />
      <View style={{ position: 'absolute', right: width * 0.08, top: height * 0.16, opacity: 0.78 }}>
        <NexaGlossyOrb size={orbSize} tone={contract.accent === 'green' ? 'red' : contract.accent === 'violet' ? 'glass' : contract.accent === 'blue' ? 'blue' : 'gold'} pulse={animated} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  horizon: { position: 'absolute', height: 1.5, borderRadius: 2 },
  halo: { position: 'absolute', borderRadius: 999, borderWidth: 1, opacity: 0.28 },
});

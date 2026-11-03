import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light DAMI block layers.
 * Drawn only for the Dami world, on top of the shared Earth scene (NexaEarth):
 *  - EarthDamiSky:   a gold halo (two thin rings, one turning slowly) behind the Dami robot,
 *                    a small orbit of water-blue and gold sparks, and a few light motes floating up
 *  - EarthDamiWater: three soft "listening" ripples spreading across the water
 * Native views only, decorative, never receives input.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark Dami is untouched (it keeps the cosmos + gold rings).
 */

type Common = { width: number; height: number; horizonY: number };

/** Where the header robot sits in the embedded Dami screen (96px robot, 16px page padding, 18px top). */
const HALO_CX = 58;
const HALO_CY = 70;
const ORBIT_SPARKS: Array<[number, string]> = [[0, '#1A70B8'], [72, '#C9A227'], [144, '#5FB0E8'], [216, '#C9A227'], [288, '#1A70B8']];
const MOTES: Array<[number, number, number]> = [[0.14, 0.34, 0], [0.38, 0.4, 0.35], [0.62, 0.32, 0.6], [0.82, 0.38, 0.15], [0.5, 0.46, 0.8]];

export function EarthDamiSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const spin = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [spin, breathe, rise].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(rise, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, spin, breathe, rise]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {/* halo: soft gold glow, a breathing ring and a steady outer ring */}
      <Animated.View style={{ position: 'absolute', left: HALO_CX - 70, top: HALO_CY - 70, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,215,120,0.16)', opacity: animated ? breathe.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) : 0.85, transform: [{ scale: animated ? breathe.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) : 1 }] }} />
      <View style={{ position: 'absolute', left: HALO_CX - 62, top: HALO_CY - 62, width: 124, height: 124, borderRadius: 62, borderWidth: 1, borderColor: 'rgba(201,162,39,0.45)' }} />
      {vip ? <View style={{ position: 'absolute', left: HALO_CX - 86, top: HALO_CY - 86, width: 172, height: 172, borderRadius: 86, borderWidth: 1, borderColor: 'rgba(30,120,194,0.28)' }} /> : null}

      {/* orbit: five sparks circling the robot; the whole ring turns slowly */}
      <Animated.View style={{ position: 'absolute', left: HALO_CX, top: HALO_CY, width: 0, height: 0, transform: [{ rotate: animated ? spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) : '0deg' }] }}>
        {ORBIT_SPARKS.map(([deg, color], i) => (
          <View key={'o' + i} style={{ position: 'absolute', left: -3, top: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: color, transform: [{ rotate: `${deg}deg` }, { translateY: -62 }] }} />
        ))}
      </Animated.View>

      {/* motes: tiny lights drifting up through the sky */}
      {MOTES.map(([x, y, phase], i) => (
        <Animated.View key={'m' + i} style={{ position: 'absolute', left: x * width, top: height * y, width: 5, height: 5, borderRadius: 3, backgroundColor: i % 2 ? 'rgba(201,162,39,0.85)' : 'rgba(255,255,255,0.95)', opacity: animated ? rise.interpolate({ inputRange: [0, 0.15 + phase * 0.1, 0.85, 1], outputRange: [0, 0.9, 0.9, 0] }) : 0.55, transform: [{ translateY: animated ? rise.interpolate({ inputRange: [0, 1], outputRange: [24 + phase * 20, -60 - phase * 30] }) : 0 }] }} />
      ))}
    </View>
  );
}

export function EarthDamiWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 6000, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [animated, pulse]);

  const cy = horizonY + 46;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {[0, 1, 2].map(i => {
        const w = width * 0.62; const h = 34;
        // ripples start at different sizes so they spread as three separate rings; static (Free / reduced motion) shows three fixed rings
        const phase = i / 3;
        const scale = animated ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4 + phase * 0.6, 1.4 + phase * 0.6] }) : 0.6 + i * 0.28;
        const opacity = animated ? pulse.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.55 - phase * 0.2, 0.25, 0] }) : 0.34 - i * 0.08;
        return <Animated.View key={'rp' + i} style={{ position: 'absolute', left: (width - w) / 2, top: cy - h / 2, width: w, height: h, borderRadius: h, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)', opacity, transform: [{ scale }] }} />;
      })}
    </View>
  );
}

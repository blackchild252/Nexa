import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light L.A. (Leisure Arena) block layers.
 * Drawn only for the L.A. hub world, on top of the shared Earth scene (NexaEarth). One symbol per activity card
 * (The Kitchen, Ball House, Game House, Fitness):
 *  - EarthLeisureSky:   four small balloons (forest green, water blue, gold, white) drifting up and down out of step;
 *                       VIP adds a small gold spark above the gold one
 *  - EarthLeisureWater: a wooden pier on the water with four lamp posts whose gold lamps glow in turn;
 *                       VIP adds a soft gold halo on the lamp that is lit
 * Native views only, decorative, never receives input. Kept faint so the activity cards stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark L.A. has its own layer (NexaDarkLeisure).
 */

type Common = { width: number; height: number; horizonY: number };

// [left fraction, top fraction, body colour, cycle ms]
const BALLOONS: Array<[number, number, string, number]> = [
  [0.14, 0.09, '#2F7D4F', 5200],
  [0.4, 0.15, '#2E8FD6', 6100],
  [0.66, 0.08, '#E6BE45', 5600],
  [0.86, 0.16, '#FFFFFF', 6600],
];
const LAMPS = 4;

export function EarthLeisureSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const bob = useRef(BALLOONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!animated) { bob.forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = bob.map((v, i) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: BALLOONS[i][3], easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: BALLOONS[i][3], easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, bob]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {BALLOONS.map(([l, t, color], i) => {
        const dy = animated ? bob[i].interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) : 0;
        const rot = animated ? bob[i].interpolate({ inputRange: [0, 1], outputRange: [i % 2 ? '-2deg' : '2deg', i % 2 ? '2deg' : '-2deg'] }) : '0deg';
        return (
          <Animated.View key={'bl' + i} style={{ position: 'absolute', left: l * width - 14, top: t * height, width: 28, height: 46, opacity: 0.8, transform: [{ translateY: dy }, { rotate: rot }] }}>
            <View style={{ position: 'absolute', left: 0, top: 0, width: 28, height: 32, borderRadius: 14, backgroundColor: color, borderWidth: 1, borderColor: 'rgba(201,162,39,0.75)' }} />
            <View style={{ position: 'absolute', left: 8, top: 5, width: 6, height: 9, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' }} />
            <View style={{ position: 'absolute', left: 8, top: 32, width: 1, height: 8, backgroundColor: 'rgba(107,90,58,0.7)' }} />
            <View style={{ position: 'absolute', left: 19, top: 32, width: 1, height: 8, backgroundColor: 'rgba(107,90,58,0.7)' }} />
            <View style={{ position: 'absolute', left: 8, top: 39, width: 12, height: 7, borderRadius: 2, backgroundColor: '#8B5E3C' }} />
            {vip && i === 2 ? <View style={{ position: 'absolute', left: 11, top: -8, width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(230,190,69,0.95)' }} /> : null}
          </Animated.View>
        );
      })}
    </View>
  );
}

export function EarthLeisureWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { glow.stopAnimation(); glow.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(glow, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [animated, glow]);

  const deckTop = horizonY + 52;
  const pierLeft = width * 0.08;
  const pierW = width * 0.62;
  const step = pierW / (LAMPS + 1);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {/* deck and pilings */}
      <View style={{ position: 'absolute', left: pierLeft, top: deckTop, width: pierW, height: 5, borderRadius: 2, backgroundColor: '#8B5E3C', opacity: 0.85 }} />
      {Array.from({ length: 9 }, (_, k) => <View key={'pl' + k} style={{ position: 'absolute', left: pierLeft + 6 + k * ((pierW - 16) / 8), top: deckTop + 5, width: 3, height: 12, backgroundColor: '#7C5232', opacity: 0.75 }} />)}
      {/* lamp posts: lamp i is brightest at (i+0.5)/4 of the cycle */}
      {Array.from({ length: LAMPS }, (_, i) => {
        const peak = (i + 0.5) / LAMPS;
        const opacity = animated ? glow.interpolate({ inputRange: [0, Math.max(0.01, peak - 0.2), peak, Math.min(0.99, peak + 0.2), 1], outputRange: [0.35, 0.35, 1, 0.35, 0.35] }) : 0.7;
        const x = pierLeft + step * (i + 1);
        return (
          <View key={'lp' + i} style={{ position: 'absolute', left: x - 6, top: deckTop - 26, width: 12, height: 26 }}>
            <View style={{ position: 'absolute', left: 5, top: 8, width: 2, height: 18, backgroundColor: '#7C5232', opacity: 0.85 }} />
            {vip ? <Animated.View style={{ position: 'absolute', left: -6, top: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,225,140,0.35)', opacity }} /> : null}
            <Animated.View style={{ position: 'absolute', left: 2, top: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(230,190,69,0.98)', opacity }} />
          </View>
        );
      })}
    </View>
  );
}

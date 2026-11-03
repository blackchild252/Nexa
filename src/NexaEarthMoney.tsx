import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light SKY MONEY block layers.
 * Drawn only for the Sky Money world, on top of the shared Earth scene (NexaEarth):
 *  - EarthMoneySky:   five gold coins bobbing in the sky and slowly turning (edge-on, then face-on);
 *                     VIP adds a small gold sparkle
 *  - EarthMoneyWater: five "growth" bars rising out of the water, shortest to tallest, each with a gold cap
 *                     that glows in turn (savings growing)
 * Native views only, decorative, never receives input. Kept faint so the money screens stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark Sky Money has its own layer (NexaDarkMoney).
 */

type Common = { width: number; height: number; horizonY: number };

// [left fraction, top fraction, diameter, phase 0..1]
const COINS: Array<[number, number, number, number]> = [[0.1, 0.17, 34, 0], [0.36, 0.26, 28, 0.3], [0.58, 0.19, 38, 0.55], [0.82, 0.36, 26, 0.8], [0.22, 0.36, 24, 0.15]];
const BAR_HEIGHTS = [22, 34, 46, 60, 78];

export function EarthMoneySky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const bob = useRef(new Animated.Value(0)).current;
  const turn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [bob, turn].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 6500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 6500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(turn, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, bob, turn]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {COINS.map(([l, t, d, phase], i) => {
        const dy = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? [8 + phase * 6, -10 - phase * 6] : [-8 - phase * 6, 10 + phase * 6] }) : 0;
        // edge-on (0.25) and back to face-on (1): alternate coins start from opposite faces
        const sx = animated ? turn.interpolate({ inputRange: [0, 0.5, 1], outputRange: i % 2 ? [1, 0.25, 1] : [0.25, 1, 0.25] }) : 1;
        return (
          <Animated.View key={'mc' + i} style={{ position: 'absolute', left: l * width, top: t * height, width: d, height: d, opacity: 0.66, transform: [{ translateY: dy }, { scaleX: sx }] }}>
            <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: '#E6BE45', borderWidth: 1.5, borderColor: 'rgba(160,120,20,0.8)' }} />
            <View style={{ position: 'absolute', left: d * 0.2, top: d * 0.2, width: d * 0.6, height: d * 0.6, borderRadius: d * 0.3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)' }} />
          </Animated.View>
        );
      })}
      {vip ? <View style={{ position: 'absolute', left: width * 0.46, top: height * 0.11, width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(201,162,39,0.8)' }} /> : null}
    </View>
  );
}

export function EarthMoneyWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { rise.stopAnimation(); rise.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(rise, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [animated, rise]);

  const base = horizonY + 76;
  const left0 = width * 0.6;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {BAR_HEIGHTS.map((h, i) => {
        // cap glows in turn: bar i peaks at i/5 of the cycle (inputRange stays ascending: peak - 0.2 >= 0 handled by clamping)
        const peak = (i + 1) / (BAR_HEIGHTS.length + 1);
        const glow = animated ? rise.interpolate({ inputRange: [0, Math.max(0.01, peak - 0.18), peak, Math.min(0.99, peak + 0.18), 1], outputRange: [0.45, 0.45, 1, 0.45, 0.45] }) : 0.75;
        const bob = animated ? rise.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, i % 2 ? -3 : 3, 0] }) : 0;
        return (
          <Animated.View key={'mb' + i} style={{ position: 'absolute', left: left0 + i * 20, top: base - h, width: 14, height: h, transform: [{ translateY: bob }] }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' }} />
            <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 6, borderRadius: 3, backgroundColor: '#E6BE45', opacity: glow }} />
          </Animated.View>
        );
      })}
    </View>
  );
}

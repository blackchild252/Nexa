import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light DREAM MARKETPLACE block layers.
 * Drawn only for the Dream Marketplace world, on top of the shared Earth scene (NexaEarth):
 *  - EarthMarketSky:   a string of bunting pennants (water blue, forest green, gold, white) swaying across the top
 *                      of the sky like a market day; VIP adds a small gold spark on the line
 *  - EarthMarketWater: a market stall boat on the water (striped green and white awning with a gold trim,
 *                      brown hull) drifting and bobbing; VIP lights a small gold lantern on it
 * Native views only, decorative, never receives input. Kept faint so the storefront stays readable.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark Dream Marketplace has its own layer (NexaDarkMarket).
 */

type Common = { width: number; height: number; horizonY: number };

const PENNANT_COLORS = ['#2E8FD6', '#2F7D4F', '#E6BE45', '#FFFFFF'];
const PENNANTS = 9;

export function EarthMarketSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { sway.stopAnimation(); sway.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(sway, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animated, sway]);

  const top = height * 0.075;
  const step = width / (PENNANTS + 1);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {/* the string: a gentle sag, drawn as two slightly tilted lines meeting in the middle */}
      <View style={{ position: 'absolute', left: -4, width: width / 2 + 4, top: top + 4, height: 1.5, backgroundColor: 'rgba(107,90,58,0.55)', transform: [{ rotate: '1.6deg' }] }} />
      <View style={{ position: 'absolute', left: width / 2, width: width / 2 + 4, top: top + 4, height: 1.5, backgroundColor: 'rgba(107,90,58,0.55)', transform: [{ rotate: '-1.6deg' }] }} />
      {Array.from({ length: PENNANTS }, (_, i) => {
        const x = step * (i + 1);
        const sag = 4 - Math.abs(i - (PENNANTS - 1) / 2) * 0.9;   // middle pennants hang a little lower
        const dir = i % 2 ? 1 : -1;
        return (
          <Animated.View key={'bp' + i} style={{ position: 'absolute', left: x, top: top + 4 + sag, width: 0, height: 0, opacity: 0.7, transform: [{ rotate: animated ? sway.interpolate({ inputRange: [0, 1], outputRange: [`${3 * dir}deg`, `${-3 * dir}deg`] }) : '0deg' }] }}>
            {/* the view is a zero-size pivot sitting on the string, so the flag swings from its hanging point */}
            <View style={{ position: 'absolute', left: -9, top: 0, width: 0, height: 0, borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 22, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: PENNANT_COLORS[i % PENNANT_COLORS.length] }} />
          </Animated.View>
        );
      })}
      {vip ? <View style={{ position: 'absolute', left: width * 0.5 - 4, top: top - 6, width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(201,162,39,0.8)' }} /> : null}
    </View>
  );
}

export function EarthMarketWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const drift = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [drift, bob].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const pp = (v: Animated.Value, ms: number) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const loops = [pp(drift, 9000), pp(bob, 2400)];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, drift, bob]);

  const w = 84; const left = width * 0.14; const top = horizonY + 44;
  const dx = animated ? drift.interpolate({ inputRange: [0, 1], outputRange: [-14, 14] }) : 0;
  const dy = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) : 0;
  const rot = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] }) : '0deg';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left, top, width: w, height: 52, opacity: 0.9, transform: [{ translateX: dx }, { translateY: dy }, { rotate: rot }] }}>
        {/* awning: alternating green and white stripes with a gold trim */}
        {Array.from({ length: 6 }, (_, k) => <View key={'st' + k} style={{ position: 'absolute', left: k * (w / 6), top: 0, width: w / 6, height: 16, backgroundColor: k % 2 ? '#FFFFFF' : '#2F7D4F' }} />)}
        <View style={{ position: 'absolute', left: 0, top: 15, width: w, height: 3, backgroundColor: '#C9A227' }} />
        {/* posts and counter */}
        <View style={{ position: 'absolute', left: 6, top: 18, width: 3, height: 16, backgroundColor: '#7C5232' }} />
        <View style={{ position: 'absolute', left: w - 9, top: 18, width: 3, height: 16, backgroundColor: '#7C5232' }} />
        <View style={{ position: 'absolute', left: 4, top: 30, width: w - 8, height: 6, borderRadius: 2, backgroundColor: '#A9825B' }} />
        {/* hull */}
        <View style={{ position: 'absolute', left: 0, top: 36, width: w, height: 12, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: '#8B5E3C' }} />
        {vip ? <View style={{ position: 'absolute', left: w / 2 - 4, top: 20, width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(230,190,69,0.95)' }} /> : null}
      </Animated.View>
    </View>
  );
}

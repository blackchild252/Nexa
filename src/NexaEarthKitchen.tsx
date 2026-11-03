import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light KITCHEN block layers.
 * Drawn only for the Kitchen world (restaurant), on top of the shared Earth scene (NexaEarth):
 *  - EarthKitchenSky:   four soft white steam wisps (gold-rimmed) rising and fading above the horizon,
 *                       swaying a little as they go; VIP adds a small gold spark beside one wisp
 *  - EarthKitchenWater: a small kitchen boat (brown hull with a gold stripe, white cabin, green roof, brown chimney)
 *                       bobbing on the water; three smoke puffs leave the chimney in turn and the two cabin windows
 *                       glow gold like a busy kitchen; VIP adds a soft gold halo behind the windows
 * Native views only, decorative, never receives input. Kept faint so the menu, cart and orders stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark Kitchen has its own layer (NexaDarkKitchen).
 */

type Common = { width: number; height: number; horizonY: number };

const WISPS: Array<[number, number]> = [[0.1, 0], [0.3, 2200], [0.55, 1100], [0.78, 3300]]; // [left fraction, start delay ms]
const PUFFS = 3;

export function EarthKitchenSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const rise = useRef(WISPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!animated) { rise.forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = rise.map((v, idx) => Animated.loop(Animated.sequence([
      Animated.delay(WISPS[idx][1]),
      Animated.timing(v, { toValue: 1, duration: 7000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(3300 - WISPS[idx][1]),
    ])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, rise]);

  const top = height * 0.46;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {WISPS.map(([l], idx) => (
        <Animated.View key={'sw' + idx} style={{ position: 'absolute', left: l * width, top, width: 10, height: 38, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: 'rgba(201,162,39,0.35)', opacity: animated ? rise[idx].interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.7, 0] }) : 0.45, transform: [{ translateY: animated ? rise[idx].interpolate({ inputRange: [0, 1], outputRange: [0, -90] }) : -idx * 8 }, { translateX: animated ? rise[idx].interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 9, -6] }) : 0 }, { scaleX: animated ? rise[idx].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) : 1 }] }} />
      ))}
      {vip ? <Animated.View style={{ position: 'absolute', left: WISPS[1][0] * width + 18, top: top - 24, width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(230,190,69,0.95)', opacity: animated ? rise[1].interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }) : 0.8 }} /> : null}
    </View>
  );
}

export function EarthKitchenWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const bob = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const puff = useRef(Array.from({ length: PUFFS }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (!animated) { [bob, glow, ...puff].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const pingpong = (v: Animated.Value, ms: number) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const loops = [
      pingpong(bob, 2800),
      pingpong(glow, 1900),
      ...puff.map((v, idx) => Animated.loop(Animated.sequence([
        Animated.delay(idx * 1200),
        Animated.timing(v, { toValue: 1, duration: 3600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay((PUFFS - 1 - idx) * 1200),
      ]))),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, bob, glow, puff]);

  const w = 110; const left = width * 0.58; const top = horizonY + 36;
  const dy = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) : 0;
  const rot = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: ['-0.8deg', '0.8deg'] }) : '0deg';
  const winOpacity = animated ? glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) : 0.8;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left, top, width: w, height: 64, opacity: 0.88, transform: [{ translateY: dy }, { rotate: rot }] }}>
        {/* chimney + three smoke puffs leaving it in turn */}
        <View style={{ position: 'absolute', left: 70, top: 8, width: 8, height: 18, backgroundColor: '#7C5232' }} />
        {puff.map((v, idx) => (
          <Animated.View key={'pf' + idx} style={{ position: 'absolute', left: 68, top: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.95)', opacity: animated ? v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.8, 0] }) : 0.5 - idx * 0.12, transform: [{ translateY: animated ? v.interpolate({ inputRange: [0, 1], outputRange: [0, -44] }) : -idx * 10 }, { translateX: animated ? v.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }) : idx * 5 }, { scale: animated ? v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.5] }) : 1 }] }} />
        ))}
        {/* cabin: green roof, white walls with gold trim, two gold-lit windows */}
        <View style={{ position: 'absolute', left: 10, top: 18, width: 78, height: 5, borderRadius: 2, backgroundColor: '#2F7D4F', borderWidth: 1, borderColor: 'rgba(201,162,39,0.85)' }} />
        <View style={{ position: 'absolute', left: 14, top: 23, width: 70, height: 25, borderRadius: 3, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(201,162,39,0.85)' }} />
        {vip ? <Animated.View style={{ position: 'absolute', left: 16, top: 25, width: 66, height: 21, borderRadius: 8, backgroundColor: 'rgba(255,225,140,0.35)', opacity: winOpacity }} /> : null}
        {[0, 1].map(j => (
          <Animated.View key={'wn' + j} style={{ position: 'absolute', left: 26 + j * 24, top: 29, width: 10, height: 10, borderRadius: 2, backgroundColor: 'rgba(230,190,69,0.98)', opacity: winOpacity }} />
        ))}
        {/* brown hull with a gold stripe */}
        <View style={{ position: 'absolute', left: 4, top: 48, width: w - 8, height: 12, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: '#8B5E3C' }} />
        <View style={{ position: 'absolute', left: 4, top: 50, width: w - 8, height: 2, backgroundColor: 'rgba(201,162,39,0.95)' }} />
      </Animated.View>
    </View>
  );
}

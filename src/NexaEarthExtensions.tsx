import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light EXTENSIONS block layers.
 * Drawn only for the Extensions world, on top of the shared Earth scene (NexaEarth):
 *  - EarthExtensionsSky:   three white-glass module tiles (gold rims) in the upper right, joined by thin gold links;
 *                          a small gold pulse travels along the links (connected capabilities); VIP adds a soft gold halo on the middle tile
 *  - EarthExtensionsWater: a small module barge on the water (brown hull, three module blocks in forest green, water blue and gold,
 *                          a mast with a gold lamp); the blocks light in turn like permissions being granted, bobbing gently
 * Native views only, decorative, never receives input. Kept faint so the extension cards, pills and audit lists stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene: Free renders the same layers static, and reduced motion wins.
 * Royal Dark Extensions has its own layer (NexaDarkExtensions).
 */

type Common = { width: number; height: number; horizonY: number };

const GOLD = 'rgba(230,190,69,0.98)';

function Link({ x1, y1, x2, y2, travel }: { x1: number; y1: number; x2: number; y2: number; travel: any }) {
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <View style={{ position: 'absolute', left: (x1 + x2) / 2 - len / 2, top: (y1 + y2) / 2 - 1, width: len, height: 2, transform: [{ rotate: `${ang}deg` }] }}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: len, height: 2, backgroundColor: 'rgba(230,190,69,0.7)' }} />
      <Animated.View style={{ position: 'absolute', left: 0, top: -2, width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD, transform: [{ translateX: travel.interpolate({ inputRange: [0, 1], outputRange: [0, len - 6] }) }] }} />
    </View>
  );
}

export function EarthExtensionsSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const drift = useRef(new Animated.Value(0)).current;
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [drift, travel].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(travel, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, drift, travel]);

  const P = [
    { x: width * 0.66, y: height * 0.09 },
    { x: width * 0.84, y: height * 0.14 },
    { x: width * 0.74, y: height * 0.23 },
  ];
  const bob = animated ? drift.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) : 0;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, transform: [{ translateY: bob }] }}>
        <Link x1={P[0].x} y1={P[0].y} x2={P[1].x} y2={P[1].y} travel={travel} />
        <Link x1={P[1].x} y1={P[1].y} x2={P[2].x} y2={P[2].y} travel={travel} />
        {P.map((p, i) => (
          <View key={'n' + i} style={{ position: 'absolute', left: p.x - 13, top: p.y - 13, width: 26, height: 26, borderRadius: 8, borderWidth: 2.5, borderColor: GOLD, backgroundColor: 'rgba(255,255,255,0.7)' }}>
            <View style={{ position: 'absolute', left: 7, top: 7, width: 8, height: 8, borderRadius: 2, backgroundColor: i === 1 ? '#1A70B8' : '#2F7D4F' }} />
          </View>
        ))}
        {vip ? <View style={{ position: 'absolute', left: P[1].x - 21, top: P[1].y - 21, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(230,190,69,0.22)' }} /> : null}
      </Animated.View>
    </View>
  );
}

export function EarthExtensionsWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const bob = useRef(new Animated.Value(0)).current;
  const lit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [bob, lit].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(lit, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, bob, lit]);

  const bx = width * 0.6; // barge left edge
  const by = horizonY + 26; // top of the lamp mast
  const blocks = ['#2F7D4F', '#1A70B8', 'rgba(230,190,69,0.98)'];
  const blockOpacity = (i: number) => (animated
    ? lit.interpolate({ inputRange: [0, i * 0.33, i * 0.33 + 0.12, i * 0.33 + 0.24, 1], outputRange: [0.55, 0.55, 1, 0.55, 0.55] })
    : 0.9);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left: bx, top: by, width: 84, height: 62, transform: [{ translateY: animated ? bob.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) : 0 }] }}>
        {/* mast + gold lamp */}
        <View style={{ position: 'absolute', left: 40, top: 0, width: 2, height: 22, backgroundColor: '#7C5232' }} />
        {vip ? <View style={{ position: 'absolute', left: 32, top: -8, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(230,190,69,0.28)' }} /> : null}
        <View style={{ position: 'absolute', left: 36, top: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD, borderWidth: 1, borderColor: '#B8912A' }} />
        {/* module blocks */}
        {blocks.map((c, i) => (
          <Animated.View key={'b' + i} style={{ position: 'absolute', left: 6 + i * 26, top: 24, width: 22, height: 18, borderRadius: 4, backgroundColor: c, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', opacity: blockOpacity(i) }} />
        ))}
        {/* hull */}
        <View style={{ position: 'absolute', left: 0, top: 42, width: 84, height: 10, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: '#8B5E3C', borderWidth: 1, borderColor: '#7C5232' }} />
        <View style={{ position: 'absolute', left: 0, top: 42, width: 84, height: 2, backgroundColor: GOLD }} />
      </Animated.View>
    </View>
  );
}

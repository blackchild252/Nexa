import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light HOME block layers.
 * Drawn only for the Home world, on top of the shared Earth scene (NexaEarth):
 *  - EarthHomeSky:   slow rotating gold sun rays + a small flock of birds
 *  - EarthHomeShore: the NEXA skyline on the far shore (gold-lit windows, beacon on the tallest tower)
 *  - EarthHomeWater: a sailboat drifting and bobbing on the water
 * Native views only, decorative, never receives input.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 */

type Common = { width: number; height: number; horizonY: number };

const RAYS = 8;

export function EarthHomeSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const spin = useRef(new Animated.Value(0)).current;
  const fly = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [spin, fly, flap].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 90000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(fly, { toValue: 1, duration: 26000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.sequence([
        Animated.timing(flap, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flap, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, spin, fly, flap]);

  const sunCx = width - width * 0.12 - 75;
  const sunCy = height * 0.1 + 75;
  const rayLen = Math.max(width, height) * 0.55;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {/* rotating sun rays: thin gold beams through the sun's centre (each bar makes two rays), the fan turns slowly */}
      <Animated.View style={{ position: 'absolute', left: sunCx, top: sunCy, width: 0, height: 0, transform: [{ rotate: animated ? spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) : '0deg' }] }}>
        {Array.from({ length: RAYS / 2 }, (_, i) => (
          <View key={'r' + i} style={{ position: 'absolute', left: -3, top: -rayLen, width: 6, height: rayLen * 2, borderRadius: 3, backgroundColor: 'rgba(255,215,120,0.10)', transform: [{ rotate: `${(180 / (RAYS / 2)) * i}deg` }] }} />
        ))}
      </Animated.View>
      {vip ? <View style={{ position: 'absolute', left: sunCx - 110, top: sunCy - 110, width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: 'rgba(201,162,39,0.30)' }} /> : null}

      {/* birds crossing the sky, wings flapping */}
      {[0, 1, 2].map(i => {
        const startX = -60 - i * 46; const y = height * (0.22 + i * 0.035);
        return (
          <Animated.View key={'b' + i} style={{ position: 'absolute', left: 0, top: y, flexDirection: 'row', transform: [{ translateX: animated ? fly.interpolate({ inputRange: [0, 1], outputRange: [startX, width + 60 - i * 46] }) : width * (0.18 + i * 0.16) }, { translateY: animated ? flap.interpolate({ inputRange: [0, 1], outputRange: [0, -3 - i] }) : 0 }] }}>
            <Animated.View style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: '#5B4632', transform: [{ rotate: '-22deg' }, { scaleY: animated ? flap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) : 1 }] }} />
            <Animated.View style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: '#5B4632', marginLeft: -1, transform: [{ rotate: '22deg' }, { scaleY: animated ? flap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) : 1 }] }} />
          </Animated.View>
        );
      })}
    </View>
  );
}

// [left fraction, width px, height px] far-shore towers; index 3 is the NEXA tower
const TOWERS: Array<[number, number, number]> = [
  [0.05, 14, 34], [0.11, 18, 52], [0.17, 12, 40], [0.235, 22, 92], [0.31, 15, 46],
  [0.36, 20, 62], [0.42, 12, 36], [0.47, 17, 50], [0.53, 14, 30],
];

export function EarthHomeShore({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const beacon = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) { beacon.stopAnimation(); beacon.setValue(0); return; }
    const l = Animated.loop(Animated.sequence([
      Animated.timing(beacon, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(beacon, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, [animated, beacon]);

  const base = horizonY - 24; // sits on the forest line
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {TOWERS.map(([l, w, h], i) => {
        const tall = i === 3;
        return (
          <View key={'tw' + i} style={{ position: 'absolute', left: l * width, top: base - h, width: w, height: h, backgroundColor: tall ? '#B9CFE0' : '#C9DAE8', borderTopLeftRadius: tall ? 6 : 2, borderTopRightRadius: tall ? 6 : 2, borderWidth: 1, borderColor: 'rgba(201,162,39,0.35)' }}>
            {/* gold-lit windows */}
            {Array.from({ length: Math.max(2, Math.floor(h / 14)) }, (_, r) => (
              <View key={r} style={{ position: 'absolute', left: w * 0.24, top: 6 + r * 12, width: w * 0.16, height: 4, backgroundColor: (r + i) % 3 === 0 ? 'rgba(255,215,120,0.95)' : 'rgba(255,235,170,0.55)' }} />
            ))}
            {tall ? <>
              <View style={{ position: 'absolute', left: w / 2 - 1, top: -16, width: 2, height: 16, backgroundColor: '#C9A227' }} />
              <Animated.View style={{ position: 'absolute', left: w / 2 - 5, top: -24, width: 10, height: 10, borderRadius: 5, backgroundColor: '#F4CF6A', opacity: animated ? beacon.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) : 0.85, transform: [{ scale: animated ? beacon.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] }) : 1 }] }} />
            </> : null}
          </View>
        );
      })}
    </View>
  );
}

export function EarthHomeWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const sail = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) { [sail, bob].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const pingpong = (v: Animated.Value, ms: number) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const loops = [pingpong(sail, 21000), pingpong(bob, 2200)];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, sail, bob]);

  const y = horizonY + 46;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left: width * 0.16, top: y, width: 56, height: 58, transform: [{ translateX: animated ? sail.interpolate({ inputRange: [0, 1], outputRange: [-12, width * 0.34] }) : width * 0.1 }, { translateY: animated ? bob.interpolate({ inputRange: [0, 1], outputRange: [-2, 2] }) : 0 }, { rotate: animated ? bob.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) : '0deg' }] }}>
        {/* mast + sails */}
        <View style={{ position: 'absolute', left: 27, top: 0, width: 2, height: 42, backgroundColor: '#5B4632' }} />
        <View style={{ position: 'absolute', left: 28, top: 2, width: 0, height: 0, borderLeftWidth: 20, borderBottomWidth: 36, borderLeftColor: 'transparent', borderBottomColor: '#FFFFFF' }} />
        <View style={{ position: 'absolute', left: 8, top: 12, width: 0, height: 0, borderRightWidth: 17, borderBottomWidth: 26, borderRightColor: 'transparent', borderBottomColor: '#F2F9FF' }} />
        {/* brown hull with a gold stripe */}
        <View style={{ position: 'absolute', left: 4, top: 42, width: 48, height: 10, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: '#7C5232', borderTopWidth: 2, borderTopColor: '#C9A227' }} />
      </Animated.View>
    </View>
  );
}

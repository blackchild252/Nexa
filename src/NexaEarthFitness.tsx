import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light FITNESS block layers.
 * Drawn only for the Fitness world (gym), on top of the shared Earth scene (NexaEarth):
 *  - EarthFitnessSky:   three little dumbbells (gold bar, green / water-blue / gold plates) lifting in turn,
 *                       left, middle, right, like a set of reps; VIP adds a small gold spark above the lifting one
 *  - EarthFitnessWater: a small rowing boat (brown hull with gold stripe, a white rower) on the water; two oars
 *                       swing from zero-size pivots on the sides of the hull while the boat bobs, and a soft wake
 *                       trails behind; VIP lights a gold pennant on the stern
 * Native views only, decorative, never receives input. Kept faint so the library, gym search and registration stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark Fitness has its own layer (NexaDarkFitness).
 */

type Common = { width: number; height: number; horizonY: number };

// [left fraction, top fraction, plate colour]
const BELLS: Array<[number, number, string]> = [[0.16, 0.14, '#2F7D4F'], [0.5, 0.09, '#1E78C2'], [0.8, 0.15, '#C9A227']];

export function EarthFitnessSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const rep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { rep.stopAnimation(); rep.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(rep, { toValue: 1, duration: 7200, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [animated, rep]);

  // each dumbbell lifts during its own third of the cycle: 5-point ramp, strictly ascending for all three
  const lift = (i: number) => rep.interpolate({ inputRange: [0, 0.01 + i * 0.3, 0.15 + i * 0.3, 0.29 + i * 0.3, 1], outputRange: [0, 0, -16, 0, 0] });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {BELLS.map(([l, t, color], i) => (
        <Animated.View key={'db' + i} style={{ position: 'absolute', left: l * width - 22, top: t * height, width: 44, height: 16, opacity: 0.85, transform: [{ translateY: animated ? lift(i) : -i * 3 }] }}>
          <View style={{ position: 'absolute', left: 9, top: 6, width: 26, height: 4, borderRadius: 2, backgroundColor: 'rgba(201,162,39,0.95)' }} />
          {[0, 1].map(side => (
            <View key={'pl' + side} style={{ position: 'absolute', left: side ? 32 : 0, top: 1, width: 12, height: 14, borderRadius: 3, backgroundColor: color, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }} />
          ))}
        </Animated.View>
      ))}
      {vip ? <Animated.View style={{ position: 'absolute', left: BELLS[1][0] * width - 3, top: BELLS[1][1] * height - 14, width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(230,190,69,0.95)', opacity: animated ? rep.interpolate({ inputRange: [0, 0.31, 0.45, 0.59, 1], outputRange: [0, 0, 1, 0, 0] }) : 0.8 }} /> : null}
    </View>
  );
}

export function EarthFitnessWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const bob = useRef(new Animated.Value(0)).current;
  const row = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [bob, row].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const pingpong = (v: Animated.Value, ms: number) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const loops = [pingpong(bob, 2800), pingpong(row, 1500)];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, bob, row]);

  const w = 120; const left = width * 0.6; const top = horizonY + 34;
  const dy = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) : 0;
  const rot = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: ['-0.8deg', '0.8deg'] }) : '0deg';
  const oar = (side: number) => animated ? row.interpolate({ inputRange: [0, 1], outputRange: [side ? '-28deg' : '28deg', side ? '28deg' : '-28deg'] }) : (side ? '-10deg' : '10deg');
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left, top, width: w, height: 56, opacity: 0.88, transform: [{ translateY: dy }, { rotate: rot }] }}>
        {/* rower: white body and head */}
        <View style={{ position: 'absolute', left: 50, top: 12, width: 14, height: 20, borderRadius: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(201,162,39,0.85)' }} />
        <View style={{ position: 'absolute', left: 52, top: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#F1D9BE', borderWidth: 1, borderColor: 'rgba(201,162,39,0.85)' }} />
        {/* gold pennant on the stern (VIP) */}
        {vip ? <View style={{ position: 'absolute', left: w - 12, top: 4, width: 2, height: 26, backgroundColor: '#7C5232' }} /> : null}
        {vip ? <View style={{ position: 'absolute', left: w - 10, top: 4, width: 12, height: 7, backgroundColor: 'rgba(230,190,69,0.98)' }} /> : null}
        {/* two oars swing from zero-size pivots at the sides of the hull */}
        {[0, 1].map(side => (
          <View key={'or' + side} style={{ position: 'absolute', left: side ? 66 : 48, top: 30, width: 0, height: 0 }}>
            <Animated.View style={{ position: 'absolute', left: side ? 0 : -34, top: -1, width: 34, height: 3, backgroundColor: '#7C5232', transform: [{ rotate: oar(side) }] }}>
              <View style={{ position: 'absolute', left: side ? 26 : 0, top: -2, width: 8, height: 7, borderRadius: 2, backgroundColor: 'rgba(201,162,39,0.95)' }} />
            </Animated.View>
          </View>
        ))}
        {/* brown hull with a gold stripe, and a soft wake */}
        <View style={{ position: 'absolute', left: 10, top: 32, width: w - 20, height: 14, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: '#8B5E3C' }} />
        <View style={{ position: 'absolute', left: 10, top: 35, width: w - 20, height: 2, backgroundColor: 'rgba(201,162,39,0.95)' }} />
        <View style={{ position: 'absolute', left: -14, top: 47, width: 46, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.8)' }} />
      </Animated.View>
    </View>
  );
}

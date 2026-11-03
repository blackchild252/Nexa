import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light ZEEZA block layers.
 * Drawn only for the Zeeza world, on top of the shared Earth scene (NexaEarth):
 *  - EarthZeezaSky:   soft white chat bubbles with a gold rim drifting up through the sky; one shows
 *                     three "typing" dots that pulse in turn (VIP adds a small gold heart-spark)
 *  - EarthZeezaWater: two linked rings (water blue + gold) drifting together on the water,
 *                     the Zeeza idea of "friends first"
 * Native views only, decorative, never receives input. Kept faint so Inbox / Friends / Chase stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark Zeeza is untouched (it keeps the world poster).
 */

type Common = { width: number; height: number; horizonY: number };

// [left fraction, top fraction, width, phase 0..1]
const BUBBLES: Array<[number, number, number, number]> = [[0.08, 0.2, 74, 0], [0.7, 0.14, 88, 0.35], [0.4, 0.3, 62, 0.65], [0.84, 0.34, 54, 0.85]];
const TYPING_BUBBLE = 1;

export function EarthZeezaSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const rise = useRef(new Animated.Value(0)).current;
  const dots = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [rise, dots].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(rise, { toValue: 1, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })),
      Animated.loop(Animated.timing(dots, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, rise, dots]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {BUBBLES.map(([l, t, w, phase], i) => {
        const h = w * 0.62;
        const dy = animated ? rise.interpolate({ inputRange: [0, 0.5, 1], outputRange: [10 + phase * 8, -14 - phase * 10, 10 + phase * 8] }) : 0;
        return (
          <Animated.View key={'zb' + i} style={{ position: 'absolute', left: l * width, top: t * height, width: w, height: h + 8, opacity: 0.62, transform: [{ translateY: dy }] }}>
            <View style={{ width: w, height: h, borderRadius: h / 2.2, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(201,162,39,0.5)' }} />
            {/* bubble tail: a small rotated square tucked under one corner */}
            <View style={{ position: 'absolute', left: i % 2 ? w * 0.7 : w * 0.16, top: h - 6, width: 12, height: 12, backgroundColor: 'rgba(255,255,255,0.9)', borderRightWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(201,162,39,0.5)', transform: [{ rotate: '45deg' }] }} />
            {i === TYPING_BUBBLE ? (
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: h, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {[0, 1, 2].map(k => {
                  // dots pulse in turn: dot k lights up from k*0.22 of the cycle (max 0.44 + 0.36 < 1, so the range always ascends)
                  const a = k * 0.22;
                  return <Animated.View key={'d' + k} style={{ width: 7, height: 7, borderRadius: 4, marginHorizontal: 3, backgroundColor: k === 1 ? '#C9A227' : '#1A70B8', opacity: animated ? dots.interpolate({ inputRange: [0, a, a + 0.18, a + 0.36, 1], outputRange: [0.35, 0.35, 1, 0.35, 0.35] }) : 0.7 }} />;
                })}
              </View>
            ) : null}
          </Animated.View>
        );
      })}
      {vip ? <View style={{ position: 'absolute', left: width * 0.5 - 5, top: height * 0.12, width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(201,162,39,0.75)' }} /> : null}
    </View>
  );
}

export function EarthZeezaWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { drift.stopAnimation(); drift.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animated, drift]);

  const d = 64; const cy = horizonY + 52; const cx = width * 0.5;
  const shift = animated ? drift.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] }) : 0;
  const shiftBack = animated ? drift.interpolate({ inputRange: [0, 1], outputRange: [10, -10] }) : 0;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left: cx - d + 10, top: cy - d / 2, width: d, height: d, borderRadius: d / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', transform: [{ translateX: shift }] }} />
      <Animated.View style={{ position: 'absolute', left: cx - 10, top: cy - d / 2, width: d, height: d, borderRadius: d / 2, borderWidth: 2, borderColor: 'rgba(255,225,140,0.9)', transform: [{ translateX: shiftBack }] }} />
    </View>
  );
}

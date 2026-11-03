import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark HOME block layer (, Home dark scene).
 * Sits on top of the Royal Dark cosmos (Home has no poster), under the depth layer, readability wash and content:
 *  - two thin gold shooting streaks crossing the upper sky in turn
 *  - five gold "command" nodes twinkling in turn along an arc (the NEXA network)
 *  - one gold beacon ring pulsing on the horizon, centre (echo of the Earth Light skyline beacon)
 *    (VIP: a little brighter)
 * Native views only, decorative, never receives input. Kept faint so the Home rails, orbs and Dami robot stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Home has its own layers (NexaEarthHome).
 */

const NODES: Array<[number, number]> = [[0.16, 0.2], [0.33, 0.13], [0.5, 0.1], [0.67, 0.13], [0.84, 0.2]]; // [left fraction, top fraction]
const HORIZON = 0.6; // same horizon as the Home cosmos

export function NexaDarkHome() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const streak = useRef(new Animated.Value(0)).current;
  const node = useRef(new Animated.Value(0)).current;
  const beacon = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [streak, node, beacon].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(streak, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(node, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(beacon, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, streak, node, beacon]);

  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  const horizonY = height * HORIZON;

  // streak k: visible during [s, s+0.18] of the 12 s cycle (strictly ascending ramps)
  const streakStart = [0.02, 0.5];
  const streakFade = (k: number) => streak.interpolate({ inputRange: [0, streakStart[k], streakStart[k] + 0.03, streakStart[k] + 0.18, 1], outputRange: [0, 0, 1, 0, 0] });
  const streakMove = (k: number) => streak.interpolate({ inputRange: [0, streakStart[k], streakStart[k] + 0.18, 1], outputRange: [0, 0, 120, 120] });
  // node i: twinkles once per cycle, lit in turn left to right
  const nodeOpacity = (i: number) => node.interpolate({ inputRange: [0, 0.02 + i * 0.18, 0.11 + i * 0.18, 0.2 + i * 0.18, 1], outputRange: [0.3, 0.3, 1, 0.3, 0.3] });
  const ringScale = animated ? beacon.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.5, 1] }) : 1;
  const ringOpacity = animated ? beacon.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.85, 0.25, 0.85] }) : 0.55;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {[0, 1].map(k => (
        <Animated.View
          key={'st' + k}
          style={{ position: 'absolute', left: width * (k ? 0.55 : 0.12), top: height * (k ? 0.08 : 0.16), width: 64, height: 1.5, borderRadius: 1, backgroundColor: gold + '0.35)', opacity: animated ? streakFade(k) : 0, transform: [{ translateX: animated ? streakMove(k) : 0 }, { translateY: animated ? streakMove(k).interpolate({ inputRange: [0, 120], outputRange: [0, 42] }) : 0 }, { rotate: '19deg' }] }}
        />
      ))}
      {NODES.map(([l, t], i) => (
        <Animated.View
          key={'nd' + i}
          style={{ position: 'absolute', left: l * width - 3, top: t * height, width: 6, height: 6, borderRadius: 3, backgroundColor: gold + '0.55)', opacity: animated ? nodeOpacity(i) : 0.55 }}
        />
      ))}
      <Animated.View
        style={{ position: 'absolute', left: width * 0.5 - 14, top: horizonY - 22, width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: gold + '0.4)', backgroundColor: gold + '0.05)', opacity: ringOpacity, transform: [{ scale: ringScale }] }}
      />
    </View>
  );
}

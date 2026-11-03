import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark FITNESS block layer.
 * Sits on top of the Fitness world poster (gym), under the depth layer, readability wash and content:
 *  - three faint gold dumbbell outlines lifting in turn across the top, like a set of reps
 *  - one gold heartbeat ring near the top left doing a double pulse (lub-dub) every ~2.4 s
 *    (VIP: a little brighter)
 * Native views only, decorative, never receives input. Kept faint so the library, gym search and registration stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Fitness has its own layers (NexaEarthFitness).
 */

const BELLS = [0.25, 0.55, 0.85]; // left fractions

export function NexaDarkFitness() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const rep = useRef(new Animated.Value(0)).current;
  const beat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [rep, beat].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(rep, { toValue: 1, duration: 7200, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(beat, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, rep, beat]);

  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  const lift = (i: number) => rep.interpolate({ inputRange: [0, 0.01 + i * 0.3, 0.15 + i * 0.3, 0.29 + i * 0.3, 1], outputRange: [0, 0, -14, 0, 0] });
  // lub-dub: two quick pulses in the first half of the cycle, rest in the second
  const ringScale = animated ? beat.interpolate({ inputRange: [0, 0.08, 0.16, 0.26, 0.34, 1], outputRange: [1, 1.35, 1.05, 1.25, 1, 1] }) : 1;
  const ringOpacity = animated ? beat.interpolate({ inputRange: [0, 0.08, 0.16, 0.26, 0.34, 1], outputRange: [0.4, 1, 0.5, 0.85, 0.4, 0.4] }) : 0.6;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {BELLS.map((l, i) => (
        <Animated.View key={'db' + i} style={{ position: 'absolute', left: l * width - 22, top: height * 0.1, width: 44, height: 16, opacity: 0.7, transform: [{ translateY: animated ? lift(i) : 0 }] }}>
          <View style={{ position: 'absolute', left: 9, top: 6, width: 26, height: 4, borderRadius: 2, backgroundColor: gold + '0.12)' }} />
          {[0, 1].map(side => (
            <View key={'pl' + side} style={{ position: 'absolute', left: side ? 32 : 0, top: 1, width: 12, height: 14, borderRadius: 3, borderWidth: 1, borderColor: gold + '0.28)', backgroundColor: gold + '0.06)' }} />
          ))}
        </Animated.View>
      ))}
      <Animated.View style={{ position: 'absolute', left: width * 0.08, top: height * 0.22, width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: gold + '0.35)', backgroundColor: gold + '0.05)', opacity: ringOpacity, transform: [{ scale: ringScale }] }} />
    </View>
  );
}

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark DEVELOPER CONSOLE block layer.
 * Drawn over a plain black Developer world (no poster), under the depth layer and readability wash:
 *  - a thin gold code window outline in the upper right with three code lines lighting in turn and a blinking cursor
 *  - one thin gold key outline low on the left, breathing (API keys)
 *  - three small gold request dots blinking in turn down the right edge (API calls)
 *    (VIP: a little brighter)
 * Native views only, decorative, never receives input. Kept faint so manifests, capability lists and API-key rows stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Developer Console has its own layers (NexaEarthDeveloper).
 */

const DOTS: Array<[number, number]> = [[0.95, 0.5], [0.95, 0.58], [0.95, 0.66]]; // [left fraction, top fraction]

export function NexaDarkDeveloper() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const run = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [run, breathe].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(run, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, run, breathe]);

  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  const lineOpacity = (i: number) => (animated
    ? run.interpolate({ inputRange: [0, i * 0.25, i * 0.25 + 0.08, i * 0.25 + 0.2, 1], outputRange: [0.25, 0.25, 1, 0.25, 0.25] })
    : 0.5);
  const cursor = animated ? run.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.15, 1, 0.15, 1] }) : 0.6;
  const dotOpacity = (i: number) => run.interpolate({ inputRange: [0, 0.02 + i * 0.3, 0.1 + i * 0.3, 0.18 + i * 0.3, 1], outputRange: [0.25, 0.25, 1, 0.25, 0.25] });
  const keyScale = animated ? breathe.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) : 1;
  const keyOpacity = animated ? breathe.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) : 0.75;
  const widths = [34, 22, 30];

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <View style={{ position: 'absolute', left: width * 0.68, top: height * 0.08, width: 70, height: 50, borderRadius: 8, borderWidth: 1.5, borderColor: gold + '0.4)', backgroundColor: gold + '0.04)' }}>
        {widths.map((w, i) => <Animated.View key={'c' + i} style={{ position: 'absolute', left: 8 + (i === 1 ? 8 : 0), top: 10 + i * 10, width: w, height: 3, borderRadius: 1, backgroundColor: gold + '0.55)', opacity: lineOpacity(i) }} />)}
        <Animated.View style={{ position: 'absolute', left: 8 + 30 + 4, top: 10 + 20 - 2, width: 3, height: 7, backgroundColor: gold + '0.7)', opacity: cursor }} />
      </View>
      <Animated.View style={{ position: 'absolute', left: width * 0.08, top: height * 0.8, width: 52, height: 24, opacity: keyOpacity, transform: [{ scale: keyScale }] }}>
        <View style={{ position: 'absolute', left: 0, top: 2, width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: gold + '0.4)' }} />
        <View style={{ position: 'absolute', left: 20, top: 11, width: 30, height: 2, backgroundColor: gold + '0.4)' }} />
        <View style={{ position: 'absolute', left: 38, top: 11, width: 2, height: 8, backgroundColor: gold + '0.4)' }} />
        <View style={{ position: 'absolute', left: 45, top: 11, width: 2, height: 6, backgroundColor: gold + '0.4)' }} />
      </Animated.View>
      {DOTS.map(([l, t], i) => (
        <Animated.View key={'dt' + i} style={{ position: 'absolute', left: l * width, top: t * height, width: 7, height: 7, borderRadius: 4, backgroundColor: gold + '0.7)', opacity: animated ? dotOpacity(i) : 0.5 }} />
      ))}
    </View>
  );
}

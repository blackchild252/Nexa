import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark EXTENSIONS block layer.
 * Drawn over the Extensions poster (own `extensions` world), under the depth layer and readability wash:
 *  - three thin gold module outlines in the upper right, joined by thin gold links, with one small gold pulse travelling along them
 *  - three small gold permission switches down the right edge, each knob sliding across in turn (consent granted)
 *    (VIP: a little brighter)
 * Native views only, decorative, never receives input. Kept faint so the extension cards, pills and audit lists stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Extensions has its own layers (NexaEarthExtensions).
 */

const SWITCHES: Array<[number, number]> = [[0.9, 0.5], [0.9, 0.58], [0.9, 0.66]]; // [left fraction, top fraction]

export function NexaDarkExtensions() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const travel = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [travel, flip].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(travel, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(flip, { toValue: 1, duration: 7200, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, travel, flip]);

  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  const P = [
    { x: width * 0.7, y: height * 0.1 },
    { x: width * 0.86, y: height * 0.15 },
    { x: width * 0.78, y: height * 0.23 },
  ];
  const knob = (i: number) => (animated
    ? flip.interpolate({ inputRange: [0, i * 0.3, i * 0.3 + 0.08, i * 0.3 + 0.2, 1], outputRange: [0, 0, 14, 14, 0] })
    : 14);
  const link = (a: { x: number; y: number }, b: { x: number; y: number }, k: string, withDot: boolean) => {
    const len = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    return (
      <View key={k} style={{ position: 'absolute', left: (a.x + b.x) / 2 - len / 2, top: (a.y + b.y) / 2 - 0.5, width: len, height: 1, backgroundColor: gold + '0.3)', transform: [{ rotate: `${ang}deg` }] }}>
        {withDot ? <Animated.View style={{ position: 'absolute', left: 0, top: -2, width: 5, height: 5, borderRadius: 3, backgroundColor: gold + '0.75)', transform: [{ translateX: animated ? travel.interpolate({ inputRange: [0, 1], outputRange: [0, len - 5] }) : len / 2 }] }} /> : null}
      </View>
    );
  };

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {link(P[0], P[1], 'l0', true)}
      {link(P[1], P[2], 'l1', false)}
      {P.map((p, i) => (
        <View key={'m' + i} style={{ position: 'absolute', left: p.x - 12, top: p.y - 12, width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: gold + '0.4)', backgroundColor: gold + '0.05)' }}>
          <View style={{ position: 'absolute', left: 8, top: 8, width: 6, height: 6, borderRadius: 1, backgroundColor: gold + '0.45)' }} />
        </View>
      ))}
      {SWITCHES.map(([l, t], i) => (
        <View key={'sw' + i} style={{ position: 'absolute', left: l * width, top: t * height, width: 28, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: gold + '0.4)' }}>
          <Animated.View style={{ position: 'absolute', left: 2, top: 2, width: 7, height: 7, borderRadius: 4, backgroundColor: gold + '0.7)', transform: [{ translateX: knob(i) }] }} />
        </View>
      ))}
    </View>
  );
}

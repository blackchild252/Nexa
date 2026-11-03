import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark NOTIFICATIONS block layer.
 * Notifications has no poster: the Royal Dark base stays plain black, with the depth layer and readability wash on top of this layer.
 *  - one gold bell in the upper right, swinging from a zero-size pivot at its top, with a faint ring pinging out as it rings
 *  - three small gold badge dots blinking in turn down the left edge (unread)
 *    (VIP: a little brighter)
 * Native views only, decorative, never receives input. Kept faint so the filters and notification cards stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Notifications has its own layers (NexaEarthNotifications).
 */

const BADGES: Array<[number, number]> = [[0.04, 0.3], [0.04, 0.38], [0.04, 0.46]]; // [left fraction, top fraction]

export function NexaDarkNotifications() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const ring = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [ring, blink].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(ring, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(blink, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, ring, blink]);

  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  const bellX = width * 0.78;
  const bellY = height * 0.075;
  // swing: rings for the first ~45% of the cycle, then rests
  const swing = animated ? ring.interpolate({ inputRange: [0, 0.05, 0.15, 0.25, 0.35, 0.45, 1], outputRange: ['0deg', '-16deg', '14deg', '-10deg', '6deg', '0deg', '0deg'] }) : '0deg';
  const pingScale = animated ? ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.9, 1.9] }) : 1.3;
  const pingOpacity = animated ? ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 0, 0] }) : 0.2;
  const badgeOpacity = (i: number) => blink.interpolate({ inputRange: [0, 0.02 + i * 0.28, 0.1 + i * 0.28, 0.18 + i * 0.28, 1], outputRange: [0.25, 0.25, 1, 0.25, 0.25] });

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left: bellX - 22, top: bellY - 4, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: gold + '0.5)', opacity: pingOpacity, transform: [{ scale: pingScale }] }} />
      {/* bell: zero-size pivot at the top centre, so it swings instead of sliding */}
      <Animated.View style={{ position: 'absolute', left: bellX, top: bellY, width: 0, height: 0, transform: [{ rotate: swing }] }}>
        <View style={{ position: 'absolute', left: -2, top: -4, width: 4, height: 4, borderRadius: 2, backgroundColor: gold + '0.5)' }} />
        <View style={{ position: 'absolute', left: -13, top: 0, width: 26, height: 24, borderTopLeftRadius: 13, borderTopRightRadius: 13, borderWidth: 1.5, borderBottomWidth: 0, borderColor: gold + '0.4)', backgroundColor: gold + '0.06)' }} />
        <View style={{ position: 'absolute', left: -17, top: 24, width: 34, height: 4, borderRadius: 2, backgroundColor: gold + '0.35)' }} />
        <View style={{ position: 'absolute', left: -3, top: 30, width: 6, height: 6, borderRadius: 3, backgroundColor: gold + '0.55)' }} />
      </Animated.View>
      {BADGES.map(([l, t], i) => (
        <Animated.View key={'bd' + i} style={{ position: 'absolute', left: l * width, top: t * height, width: 7, height: 7, borderRadius: 4, backgroundColor: gold + '0.7)', opacity: animated ? badgeOpacity(i) : 0.5 }} />
      ))}
    </View>
  );
}

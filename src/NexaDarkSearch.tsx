import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark SEARCH block layer.
 * Drawn over the Search poster (own `search` world, same picture as before), under the depth layer and readability wash:
 *  - one thin gold magnifying glass drifting slowly across the upper sky, with a faint ring pinging out of the lens
 *  - three small gold "result" dots blinking in turn down the right edge
 *    (VIP: a little brighter)
 * Native views only, decorative, never receives input. Kept faint so the search box, filters and result cards stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Search has its own layers (NexaEarthSearch).
 */

const HITS: Array<[number, number]> = [[0.94, 0.3], [0.94, 0.38], [0.94, 0.46]]; // [left fraction, top fraction]

export function NexaDarkSearch() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const drift = useRef(new Animated.Value(0)).current;
  const ping = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [drift, ping, blink].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(ping, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(blink, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, drift, ping, blink]);

  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  const x0 = width * 0.1;
  const span = width * 0.5;
  const top = height * 0.1;
  const moveX = animated ? drift.interpolate({ inputRange: [0, 1], outputRange: [0, span] }) : span * 0.4;
  const moveY = animated ? drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 10, 0] }) : 0;
  const pingScale = animated ? ping.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) : 1.3;
  const pingOpacity = animated ? ping.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }) : 0.18;
  const hitOpacity = (i: number) => blink.interpolate({ inputRange: [0, 0.02 + i * 0.3, 0.1 + i * 0.3, 0.18 + i * 0.3, 1], outputRange: [0.25, 0.25, 1, 0.25, 0.25] });

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left: x0, top, width: 46, height: 50, transform: [{ translateX: moveX }, { translateY: moveY }] }}>
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: gold + '0.5)', opacity: pingOpacity, transform: [{ scale: pingScale }] }} />
        <View style={{ position: 'absolute', left: 0, top: 0, width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: gold + '0.4)', backgroundColor: gold + '0.05)' }} />
        <View style={{ position: 'absolute', left: 6, top: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: gold + '0.35)' }} />
        <View style={{ position: 'absolute', left: 28, top: 30, width: 3, height: 18, borderRadius: 2, backgroundColor: gold + '0.4)', transform: [{ rotate: '-45deg' }] }} />
      </Animated.View>
      {HITS.map(([l, t], i) => (
        <Animated.View key={'ht' + i} style={{ position: 'absolute', left: l * width, top: t * height, width: 7, height: 7, borderRadius: 4, backgroundColor: gold + '0.7)', opacity: animated ? hitOpacity(i) : 0.5 }} />
      ))}
    </View>
  );
}

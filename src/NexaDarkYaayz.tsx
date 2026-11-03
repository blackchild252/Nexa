import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark YAAYZ block layer.
 * Sits on top of the Yaayz world poster, under the depth layer, readability wash and content:
 *  - three thin gold route lines crossing the screen at different angles, each with one gold dot travelling along it
 *    (like a journey being tracked); VIP: dots a little brighter
 *  - six small gold event lights that twinkle in turn near the top, like a venue or stadium at night
 * Native views only, decorative, never receives input. Kept faint so tickets and adverts stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Yaayz has its own layers (NexaEarthYaayz).
 */

// [top fraction, tilt degrees, travel duration ms]
const ROUTES: Array<[number, number, number]> = [[0.2, -8, 11000], [0.46, 5, 14000], [0.72, -4, 17000]];
// [left fraction, top fraction]
const LIGHTS: Array<[number, number]> = [[0.12, 0.07], [0.3, 0.11], [0.48, 0.06], [0.66, 0.12], [0.82, 0.075], [0.92, 0.14]];

export function NexaDarkYaayz() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const travel = useRef(ROUTES.map(() => new Animated.Value(0))).current;
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [...travel, twinkle].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      ...travel.map((v, i) => Animated.loop(Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ROUTES[i][2], easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]))),
      Animated.loop(Animated.timing(twinkle, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, travel, twinkle]);

  const span = width * 1.1;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {ROUTES.map(([t, tilt], i) => (
        <View key={'rt' + i} style={{ position: 'absolute', left: -width * 0.05, top: t * height, width: span, height: 0, transform: [{ rotate: `${tilt}deg` }] }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: span, height: 1, backgroundColor: 'rgba(212,175,55,0.09)' }} />
          <Animated.View style={{ position: 'absolute', left: 0, top: -2, width: 5, height: 5, borderRadius: 3, backgroundColor: vip ? 'rgba(255,215,0,0.7)' : 'rgba(212,175,55,0.55)', opacity: animated ? travel[i].interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }) : 0.5, transform: [{ translateX: animated ? travel[i].interpolate({ inputRange: [0, 1], outputRange: [0, span - 5] }) : span * (0.25 + i * 0.25) }] }} />
        </View>
      ))}
      {LIGHTS.map(([l, t], i) => {
        // light i is brightest at (i+0.5)/6 of the cycle: 5-point ramp, strictly ascending for every i
        const peak = (i + 0.5) / LIGHTS.length;
        const opacity = animated ? twinkle.interpolate({ inputRange: [0, Math.max(0.01, peak - 0.15), peak, Math.min(0.99, peak + 0.15), 1], outputRange: [0.25, 0.25, 1, 0.25, 0.25] }) : 0.55;
        return <Animated.View key={'ev' + i} style={{ position: 'absolute', left: l * width - 2, top: t * height, width: 4, height: 4, borderRadius: 2, backgroundColor: vip ? 'rgba(255,215,0,0.75)' : 'rgba(212,175,55,0.6)', opacity }} />;
      })}
    </View>
  );
}

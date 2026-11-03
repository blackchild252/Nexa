import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark BALL HOUSE block layer.
 * Sits on top of the Ball House world poster (stadium at night), under the depth layer, readability wash and content:
 *  - two faint gold floodlight beams coming in from the top corners toward the pitch, breathing in turn
 *    (left first, then right), like stadium floodlights being worked
 *  - one small gold ball crossing the screen on an arc every ~10 s, with two fading gold trail dots
 *    (VIP: a little brighter)
 * Native views only, decorative, never receives input. Kept faint so scores, fixtures and tables stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Ball House has its own layers (NexaEarthBall).
 */

const TRAIL = 2;

export function NexaDarkBall() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const breathe = useRef(new Animated.Value(0)).current;
  const kick = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [breathe, kick].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(breathe, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.sequence([
        Animated.timing(kick, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(kick, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, breathe, kick]);

  const beamH = height * 0.5;
  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  const top = height * 0.3;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {[0, 1].map(i => {
        // beam 0 is brightest at 1/4 of the cycle, beam 1 at 3/4: 5-point ramp, strictly ascending for both
        const peak = 0.25 + i * 0.5;
        const opacity = animated ? breathe.interpolate({ inputRange: [0, Math.max(0.01, peak - 0.25), peak, Math.min(0.99, peak + 0.25), 1], outputRange: [0.4, 0.4, 1, 0.4, 0.4] }) : 0.65;
        // zero-size pivot on the top corner, so the beam is angled from its base
        return (
          <View key={'fb' + i} style={{ position: 'absolute', left: i ? width : 0, top: 0, width: 0, height: 0, transform: [{ rotate: i ? '28deg' : '-28deg' }] }}>
            <Animated.View style={{ position: 'absolute', left: -20, top: 0, width: 40, height: beamH, backgroundColor: gold + '0.05)', opacity }} />
          </View>
        );
      })}
      {Array.from({ length: TRAIL }, (_, k) => (
        <Animated.View key={'bt' + k} style={{ position: 'absolute', left: 0, top, width: 4 - k, height: 4 - k, borderRadius: 2, backgroundColor: gold + (0.5 - k * 0.2).toFixed(2) + ')', opacity: animated ? kick.interpolate({ inputRange: [0, 0.08, 0.92, 1], outputRange: [0, 1, 1, 0] }) : 0.5, transform: [{ translateX: animated ? kick.interpolate({ inputRange: [0, 1], outputRange: [-30 - (k + 1) * 12, width + 10 - (k + 1) * 12] }) : width * 0.55 - (k + 1) * 12 }, { translateY: animated ? kick.interpolate({ inputRange: [0, 0.5, 1], outputRange: [30 + (k + 1) * 3, -60 + (k + 1) * 3, 30 + (k + 1) * 3] }) : (k + 1) * 3 }] }} />
      ))}
      <Animated.View style={{ position: 'absolute', left: 0, top, width: 7, height: 7, borderRadius: 4, backgroundColor: gold + '0.75)', opacity: animated ? kick.interpolate({ inputRange: [0, 0.08, 0.92, 1], outputRange: [0, 1, 1, 0] }) : 0.6, transform: [{ translateX: animated ? kick.interpolate({ inputRange: [0, 1], outputRange: [-30, width + 10] }) : width * 0.55 }, { translateY: animated ? kick.interpolate({ inputRange: [0, 0.5, 1], outputRange: [30, -60, 30] }) : 0 }] }} />
    </View>
  );
}

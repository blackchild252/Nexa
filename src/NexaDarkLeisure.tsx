import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark L.A. (Leisure Arena) block layer.
 * Sits on top of the world poster, under the depth layer, readability wash and content:
 *  - four thin gold arena rings in a row near the top (one per activity: Kitchen, Ball House, Game House, Fitness),
 *    pulsing in turn like venue lights coming on one after another (VIP: a little brighter)
 *  - one slow gold searchlight beam rising from the bottom edge and sweeping left and right, like an arena show
 * Native views only, decorative, never receives input. Kept faint so the activity cards stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light L.A. has its own layers (NexaEarthLeisure).
 */

// [left fraction, top fraction]
const RINGS: Array<[number, number]> = [[0.16, 0.08], [0.39, 0.06], [0.62, 0.08], [0.85, 0.06]];

export function NexaDarkLeisure() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const pulse = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [pulse, sweep].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, pulse, sweep]);

  const beamH = height * 0.62;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {RINGS.map(([l, t], i) => {
        // ring i is brightest at (i+0.5)/4 of the cycle: 5-point ramp, strictly ascending for every i
        const peak = (i + 0.5) / RINGS.length;
        const opacity = animated ? pulse.interpolate({ inputRange: [0, Math.max(0.01, peak - 0.2), peak, Math.min(0.99, peak + 0.2), 1], outputRange: [0.25, 0.25, 1, 0.25, 0.25] }) : 0.5;
        return <Animated.View key={'rg' + i} style={{ position: 'absolute', left: l * width - 13, top: t * height, width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: vip ? 'rgba(255,215,0,0.7)' : 'rgba(212,175,55,0.55)', opacity }} />;
      })}
      {/* searchlight: a zero-height pivot on the bottom edge, so the beam swings from its base */}
      <Animated.View style={{ position: 'absolute', left: width / 2, bottom: 0, width: 0, height: 0, transform: [{ rotate: animated ? sweep.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '16deg'] }) : '0deg' }] }}>
        <View style={{ position: 'absolute', left: -14, bottom: 0, width: 28, height: beamH, backgroundColor: vip ? 'rgba(255,215,0,0.06)' : 'rgba(212,175,55,0.045)' }} />
      </Animated.View>
    </View>
  );
}

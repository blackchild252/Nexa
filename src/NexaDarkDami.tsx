import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark DAMI block layer (, Dami dark scene).
 * Sits on top of the Royal Dark cosmos (Dami has no poster), under the depth layer, readability wash and content:
 *  - five small gold "thought" sparks orbiting the header Dami robot (the whole ring turns once per 26 s)
 *  - three faint gold "listening" ripples spreading across the cosmos water, like Dami hearing you
 *  - four gold motes floating up through the sky
 *    (VIP: a little brighter, plus one extra thin outer gold ring round the robot)
 * Native views only, decorative, never receives input. Kept faint so the chat bubbles and input bar stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Dami has its own layers (NexaEarthDami).
 */

/** Where the header robot sits in the embedded Dami screen (96px robot, 16px page padding, 18px top): same point Earth Light uses. */
const HALO_CX = 58;
const HALO_CY = 70;
const ORBIT_DEG = [0, 72, 144, 216, 288];
const MOTES: Array<[number, number, number]> = [[0.2, 0.36, 0], [0.45, 0.42, 0.35], [0.7, 0.34, 0.6], [0.88, 0.4, 0.15]]; // [left, top, phase]
const HORIZON = 0.5; // same horizon as the Dami cosmos

export function NexaDarkDami() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [spin, pulse, rise].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 26000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 6000, easing: Easing.out(Easing.quad), useNativeDriver: true })),
      Animated.loop(Animated.timing(rise, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, spin, pulse, rise]);

  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  const cy = height * HORIZON + 46;
  const rw = width * 0.62;
  const rh = 34;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {vip ? <View style={{ position: 'absolute', left: HALO_CX - 80, top: HALO_CY - 80, width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderColor: gold + '0.2)' }} /> : null}

      <Animated.View style={{ position: 'absolute', left: HALO_CX, top: HALO_CY, width: 0, height: 0, transform: [{ rotate: animated ? spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) : '0deg' }] }}>
        {ORBIT_DEG.map((deg, i) => (
          <View key={'or' + i} style={{ position: 'absolute', left: -2.5, top: -2.5, width: 5, height: 5, borderRadius: 3, backgroundColor: gold + (i % 2 ? '0.5)' : '0.8)'), transform: [{ rotate: `${deg}deg` }, { translateY: -64 }] }} />
        ))}
      </Animated.View>

      {[0, 1, 2].map(i => {
        const phase = i / 3;
        // ripples start at different sizes so they spread as three separate rings; static (Free / reduced motion) shows three fixed rings
        const scale = animated ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4 + phase * 0.6, 1.4 + phase * 0.6] }) : 0.6 + i * 0.28;
        const opacity = animated ? pulse.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.4 - phase * 0.14, 0.18, 0] }) : 0.26 - i * 0.06;
        return <Animated.View key={'rp' + i} style={{ position: 'absolute', left: (width - rw) / 2, top: cy - rh / 2, width: rw, height: rh, borderRadius: rh, borderWidth: 1, borderColor: gold + '0.6)', opacity, transform: [{ scale }] }} />;
      })}

      {MOTES.map(([x, y, phase], i) => (
        <Animated.View
          key={'mt' + i}
          style={{ position: 'absolute', left: x * width, top: height * y, width: 4, height: 4, borderRadius: 2, backgroundColor: gold + '0.7)', opacity: animated ? rise.interpolate({ inputRange: [0, 0.15 + phase * 0.1, 0.85, 1], outputRange: [0, 0.8, 0.8, 0] }) : 0.45, transform: [{ translateY: animated ? rise.interpolate({ inputRange: [0, 1], outputRange: [0, -70] }) : 0 }] }}
        />
      ))}
    </View>
  );
}

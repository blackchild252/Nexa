import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark SKY MONEY block layer.
 * Sits on top of the Sky Money world poster, under the readability wash and the content:
 *  - six small gold sparks rising slowly like coins lifting out of a vault (each fades in and out)
 *  - one thin gold "ledger gleam" line sweeping down the screen every ~9 s (VIP: a little brighter and thicker)
 * Native views only, decorative, never receives input. Kept faint so the money screens stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Sky Money has its own layers (NexaEarthMoney).
 */

// [left fraction, start-top fraction, size, phase 0..0.75]
const SPARKS: Array<[number, number, number, number]> = [[0.12, 0.78, 5, 0], [0.3, 0.86, 4, 0.25], [0.5, 0.8, 6, 0.5], [0.68, 0.9, 4, 0.12], [0.84, 0.82, 5, 0.38], [0.92, 0.7, 3, 0.62]];

export function NexaDarkMoney() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const lift = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [lift, sweep].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(lift, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, lift, sweep]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {SPARKS.map(([l, t, size, phase], i) => {
        // each spark rises 0.5 of the screen over the cycle, offset by its phase; fade in/out via a 3-point ramp
        const a = phase; const b = Math.min(0.99, phase + 0.5);
        const rising = animated ? lift.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.5] }) : 0;
        const opacity = animated ? lift.interpolate({ inputRange: [0, Math.max(0.01, a), (a + b) / 2, b, 1], outputRange: [0.25, 0.25, 0.7, 0.05, 0.05] }) : 0.35;
        return <Animated.View key={'ds' + i} style={{ position: 'absolute', left: l * width, top: t * height, width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(212,175,55,0.9)', opacity, transform: [{ translateY: rising }] }} />;
      })}
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: vip ? 3 : 2, backgroundColor: vip ? 'rgba(255,215,0,0.16)' : 'rgba(212,175,55,0.10)', opacity: animated ? sweep.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }) : 0.5, transform: [{ translateY: animated ? sweep.interpolate({ inputRange: [0, 1], outputRange: [height * 0.12, height * 0.92] }) : height * 0.5 }] }} />
    </View>
  );
}

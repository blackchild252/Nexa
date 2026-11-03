import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark KITCHEN block layer.
 * Sits on top of the Kitchen world poster (restaurant and open kitchen), under the depth layer, readability wash and content:
 *  - three warm gold heat-lamp glows across the top (a soft halo with a small bright filament), lit in turn
 *    left, middle, right, like the pass at a busy restaurant
 *  - four very faint gold steam wisps rising slowly from the lower screen and fading
 *    (VIP: a little brighter)
 * Native views only, decorative, never receives input. Kept faint so the menu, cart and orders stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Kitchen has its own layers (NexaEarthKitchen).
 */

const LAMPS = [0.2, 0.5, 0.8];
const WISPS: Array<[number, number]> = [[0.14, 0], [0.38, 2400], [0.62, 1200], [0.86, 3600]]; // [left fraction, start delay ms]

export function NexaDarkKitchen() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const pulse = useRef(new Animated.Value(0)).current;
  const rise = useRef(WISPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!animated) { [pulse, ...rise].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })),
      ...rise.map((v, idx) => Animated.loop(Animated.sequence([
        Animated.delay(WISPS[idx][1]),
        Animated.timing(v, { toValue: 1, duration: 8000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(3600 - WISPS[idx][1]),
      ]))),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, pulse, rise]);

  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {LAMPS.map((peak, idx) => {
        // each lamp is brightest at its own point of the cycle: 5-point ramp, strictly ascending for all three
        const opacity = animated ? pulse.interpolate({ inputRange: [0, Math.max(0.01, peak - 0.17), peak, Math.min(0.99, peak + 0.17), 1], outputRange: [0.35, 0.35, 1, 0.35, 0.35] }) : 0.7;
        return (
          <Animated.View key={'hl' + idx} style={{ position: 'absolute', left: peak * width - 45, top: height * 0.04, width: 90, height: 90, opacity }}>
            <View style={{ position: 'absolute', left: 0, top: 0, width: 90, height: 90, borderRadius: 45, backgroundColor: gold + '0.06)' }} />
            <View style={{ position: 'absolute', left: 39, top: 39, width: 12, height: 12, borderRadius: 6, backgroundColor: gold + '0.14)' }} />
            <View style={{ position: 'absolute', left: 43, top: 43, width: 4, height: 4, borderRadius: 2, backgroundColor: gold + '0.8)' }} />
          </Animated.View>
        );
      })}
      {WISPS.map(([l], idx) => (
        <Animated.View key={'st' + idx} style={{ position: 'absolute', left: l * width, top: height * 0.82, width: 8, height: 44, borderRadius: 4, backgroundColor: gold + '0.07)', opacity: animated ? rise[idx].interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }) : 0.5, transform: [{ translateY: animated ? rise[idx].interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.4] }) : -idx * 10 }, { translateX: animated ? rise[idx].interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 8, -6] }) : 0 }] }} />
      ))}
    </View>
  );
}

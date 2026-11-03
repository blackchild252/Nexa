import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark ZEEZA block layer (, Zeeza dark scene).
 * Sits on top of the Zeeza world poster (social lounge), under the depth layer, readability wash and content:
 *  - four thin gold chat-bubble outlines drifting up and down; one shows three "typing" dots pulsing in turn
 *  - two linked gold rings drifting together near the bottom ("friends first")
 *    (VIP: a little brighter, plus one small gold spark by the typing bubble)
 * Native views only, decorative, never receives input. Kept faint so Inbox / Friends / Chase stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Zeeza has its own layers (NexaEarthZeeza). Search and Profile use the separate `profile` world and get nothing here.
 */

// [left fraction, top fraction, width, phase 0..1]
const BUBBLES: Array<[number, number, number, number]> = [[0.08, 0.2, 74, 0], [0.7, 0.14, 88, 0.35], [0.4, 0.3, 62, 0.65], [0.84, 0.34, 54, 0.85]];
const TYPING_BUBBLE = 1;

export function NexaDarkZeeza() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const rise = useRef(new Animated.Value(0)).current;
  const dots = useRef(new Animated.Value(0)).current;
  const link = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [rise, dots, link].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(rise, { toValue: 1, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })),
      Animated.loop(Animated.timing(dots, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.sequence([
        Animated.timing(link, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(link, { toValue: 0, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, rise, dots, link]);

  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  const ringsLeft = width * 0.3;
  const ringsTop = height * 0.8;
  const drift = animated ? link.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] }) : 0;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {BUBBLES.map(([l, t, w, phase], i) => {
        const h = w * 0.62;
        const dy = animated ? rise.interpolate({ inputRange: [0, 0.5, 1], outputRange: [10 + phase * 8, -14 - phase * 10, 10 + phase * 8] }) : 0;
        return (
          <Animated.View key={'zb' + i} style={{ position: 'absolute', left: l * width, top: t * height, width: w, height: h + 8, transform: [{ translateY: dy }] }}>
            <View style={{ width: w, height: h, borderRadius: h / 2.2, borderWidth: 1, borderColor: gold + '0.3)', backgroundColor: gold + '0.04)' }} />
            <View style={{ position: 'absolute', left: i % 2 ? w * 0.7 : w * 0.16, top: h - 6, width: 12, height: 12, borderRightWidth: 1, borderBottomWidth: 1, borderColor: gold + '0.3)', backgroundColor: gold + '0.04)', transform: [{ rotate: '45deg' }] }} />
            {i === TYPING_BUBBLE ? (
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: h, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {[0, 1, 2].map(k => {
                  // dot k lights up from k*0.22 of the cycle; the ramp always ascends (max 0.44 + 0.36 < 1)
                  const a = k * 0.22;
                  return <Animated.View key={'d' + k} style={{ width: 6, height: 6, borderRadius: 3, marginHorizontal: 3, backgroundColor: gold + '0.7)', opacity: animated ? dots.interpolate({ inputRange: [0, a, a + 0.18, a + 0.36, 1], outputRange: [0.3, 0.3, 1, 0.3, 0.3] }) : 0.6 }} />;
                })}
              </View>
            ) : null}
          </Animated.View>
        );
      })}

      {vip ? <Animated.View style={{ position: 'absolute', left: BUBBLES[TYPING_BUBBLE][0] * width - 8, top: BUBBLES[TYPING_BUBBLE][1] * height - 10, width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,215,0,0.9)', opacity: animated ? dots.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] }) : 0.7 }} /> : null}

      <Animated.View style={{ position: 'absolute', left: ringsLeft, top: ringsTop, width: 84, height: 44, transform: [{ translateX: drift }] }}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: gold + '0.32)' }} />
        <View style={{ position: 'absolute', left: 30, top: 0, width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: gold + '0.5)' }} />
      </Animated.View>
    </View>
  );
}

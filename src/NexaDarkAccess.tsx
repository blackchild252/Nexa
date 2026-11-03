import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark ACCESS block layers.
 * One light layer for the four screens that sit outside the sidebar directory, drawn over a plain black world (no poster):
 *  - subscription: four thin gold tier steps rising, lit in turn, and one thin gold membership ring breathing low on the left
 *  - auth (Login / Signup): a thin gold padlock outline with a breathing keyhole, and two small gold dots blinking down the right edge
 *  - staff: three thin gold person outlines lit in turn
 *  - disputes: a thin gold balance scale gently tilting
 *    (VIP: a little brighter)
 * Native views only, decorative, never receives input, ONE looping value per layer. Kept faint so forms, cards and lists stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light has its own layers (NexaEarthAccess).
 */

export type AccessKind = 'subscription' | 'auth' | 'staff' | 'disputes';

export function NexaDarkAccess({ kind }: { kind: AccessKind }) {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const run = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { run.stopAnimation(); run.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(run, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [animated, run]);

  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  const lit = (i: number, n: number) => (animated
    ? run.interpolate({ inputRange: [0, i / n, i / n + 0.08, i / n + 0.2, 1], outputRange: [0.25, 0.25, 1, 0.25, 0.25] })
    : 0.6);
  const breathe = animated ? run.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.5] }) : 0.75;
  const tilt = animated ? run.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['-6deg', '6deg', '-6deg', '6deg', '-6deg'] }) : '0deg';
  const edge = gold + '0.4)';
  const box = { position: 'absolute' as const, left: width * 0.66, top: height * 0.08 };

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {kind === 'subscription' ? (
        <>
          <View style={{ ...box, width: 70, height: 36 }}>
            {[10, 18, 26, 34].map((h, i) => <Animated.View key={'st' + i} style={{ position: 'absolute', left: i * 14, top: 34 - h, width: 9, height: h, borderRadius: 2, borderWidth: 1.5, borderColor: edge, backgroundColor: gold + '0.06)', opacity: lit(i, 4) }} />)}
          </View>
          <Animated.View style={{ position: 'absolute', left: width * 0.08, top: height * 0.8, width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: edge, opacity: breathe }} />
        </>
      ) : null}
      {kind === 'auth' ? (
        <>
          <View style={{ ...box, width: 40, height: 48 }}>
            <View style={{ position: 'absolute', left: 8, top: 0, width: 24, height: 26, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1.5, borderBottomWidth: 0, borderColor: edge }} />
            <View style={{ position: 'absolute', left: 0, top: 20, width: 40, height: 28, borderRadius: 6, borderWidth: 1.5, borderColor: edge, backgroundColor: gold + '0.04)' }} />
            <Animated.View style={{ position: 'absolute', left: 17, top: 30, width: 6, height: 6, borderRadius: 3, backgroundColor: gold + '0.7)', opacity: breathe }} />
            <View style={{ position: 'absolute', left: 19, top: 35, width: 2, height: 7, backgroundColor: gold + '0.5)' }} />
          </View>
          {[0.5, 0.58].map((t, i) => <Animated.View key={'ad' + i} style={{ position: 'absolute', left: width * 0.95, top: t * height, width: 7, height: 7, borderRadius: 4, backgroundColor: gold + '0.7)', opacity: lit(i, 2) }} />)}
        </>
      ) : null}
      {kind === 'staff' ? (
        <View style={{ ...box, width: 84, height: 26 }}>
          {[0, 1, 2].map(i => (
            <Animated.View key={'pp' + i} style={{ position: 'absolute', left: i * 28, top: 0, width: 22, height: 26, opacity: lit(i, 3) }}>
              <View style={{ position: 'absolute', left: 6, top: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: edge }} />
              <View style={{ position: 'absolute', left: 0, top: 13, width: 22, height: 11, borderTopLeftRadius: 11, borderTopRightRadius: 11, borderWidth: 1.5, borderBottomWidth: 0, borderColor: edge }} />
            </Animated.View>
          ))}
        </View>
      ) : null}
      {kind === 'disputes' ? (
        <View style={{ ...box, width: 76, height: 50 }}>
          <View style={{ position: 'absolute', left: 37, top: 6, width: 2, height: 40, backgroundColor: edge }} />
          <View style={{ position: 'absolute', left: 26, top: 46, width: 24, height: 2, backgroundColor: edge }} />
          <Animated.View style={{ position: 'absolute', left: 6, top: 6, width: 64, height: 2, backgroundColor: gold + '0.55)', transform: [{ rotate: tilt }] }}>
            {[0, 64].map(x => (
              <React.Fragment key={'pn' + x}>
                <View style={{ position: 'absolute', left: x - 0.5, top: 2, width: 1, height: 12, backgroundColor: edge }} />
                <View style={{ position: 'absolute', left: x - 8, top: 13, width: 16, height: 7, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 1.5, borderTopWidth: 0, borderColor: edge }} />
              </React.Fragment>
            ))}
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light BALL HOUSE block layers.
 * Drawn only for the Ball House world (football), on top of the shared Earth scene (NexaEarth):
 *  - EarthBallSky:   a football (white, dark patches, gold rim) arcing across the sky and spinning, with three
 *                    fading trail dots behind it; VIP adds a small gold spark on the ball
 *  - EarthBallWater: a small floating football pitch (green mown stripes, white lines and centre circle, two goals)
 *                    bobbing on the water, with a floodlight pole at each end whose gold lamp lights in turn;
 *                    VIP adds a soft gold halo on the lit lamp
 * Native views only, decorative, never receives input. Kept faint so scores, fixtures and tables stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark Ball House has its own layer (NexaDarkBall).
 */

type Common = { width: number; height: number; horizonY: number };

const TRAIL = 3;
const STRIPES = 6;

export function EarthBallSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const kick = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { kick.stopAnimation(); kick.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(kick, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(kick, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animated, kick]);

  const top = height * 0.2;
  // the ball flies left to right on an arc (up to 50 px, down again); the trail dots sit a little behind it on the same arc
  const ballX = animated ? kick.interpolate({ inputRange: [0, 1], outputRange: [-40, width + 20] }) : width * 0.3;
  const ballY = animated ? kick.interpolate({ inputRange: [0, 0.5, 1], outputRange: [40, -50, 40] }) : 0;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {Array.from({ length: TRAIL }, (_, k) => (
        <Animated.View key={'tl' + k} style={{ position: 'absolute', left: 0, top, width: 6 - k, height: 6 - k, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.9)', opacity: 0.6 - k * 0.15, transform: [{ translateX: animated ? kick.interpolate({ inputRange: [0, 1], outputRange: [-40 - (k + 1) * 16, width + 20 - (k + 1) * 16] }) : width * 0.3 - (k + 1) * 16 }, { translateY: animated ? kick.interpolate({ inputRange: [0, 0.5, 1], outputRange: [40 + (k + 1) * 3, -50 + (k + 1) * 3, 40 + (k + 1) * 3] }) : 8 + k * 3 }] }} />
      ))}
      <Animated.View style={{ position: 'absolute', left: 0, top, width: 22, height: 22, opacity: 0.85, transform: [{ translateX: ballX }, { translateY: ballY }, { rotate: animated ? kick.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) : '0deg' }] }}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(201,162,39,0.85)' }} />
        <View style={{ position: 'absolute', left: 8, top: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#2B2B2B' }} />
        <View style={{ position: 'absolute', left: 3, top: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#2B2B2B' }} />
        <View style={{ position: 'absolute', left: 15, top: 12, width: 4, height: 4, borderRadius: 2, backgroundColor: '#2B2B2B' }} />
        {vip ? <View style={{ position: 'absolute', left: 9, top: -7, width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(230,190,69,0.95)' }} /> : null}
      </Animated.View>
    </View>
  );
}

export function EarthBallWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const bob = useRef(new Animated.Value(0)).current;
  const lamp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [bob, lamp].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(lamp, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, bob, lamp]);

  const w = 150; const h = 44; const left = width * 0.12; const top = horizonY + 40;
  const dy = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) : 0;
  const rot = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: ['-0.8deg', '0.8deg'] }) : '0deg';
  // two floodlights: the left one is brightest in the first half of the cycle, the right one in the second half
  const lampOpacity = (i: number) => animated ? lamp.interpolate({ inputRange: [0, 0.25 + i * 0.5, 1], outputRange: [0.35, 1, 0.35] }) : 0.7;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left, top, width: w, height: h + 30, opacity: 0.88, transform: [{ translateY: dy }, { rotate: rot }] }}>
        {/* floodlight poles with gold lamps */}
        {[0, 1].map(i => (
          <View key={'fl' + i} style={{ position: 'absolute', left: i ? w - 8 : 2, top: 0, width: 6, height: 44 }}>
            <View style={{ position: 'absolute', left: 2, top: 8, width: 2, height: 36, backgroundColor: '#7C5232' }} />
            {vip ? <Animated.View style={{ position: 'absolute', left: -6, top: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,225,140,0.35)', opacity: lampOpacity(i) }} /> : null}
            <Animated.View style={{ position: 'absolute', left: -1, top: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(230,190,69,0.98)', opacity: lampOpacity(i) }} />
          </View>
        ))}
        {/* pitch: alternating mown stripes, white lines, centre circle, two goals */}
        <View style={{ position: 'absolute', left: 8, top: 36, width: w - 16, height: h - 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#2F7D4F', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }}>
          {Array.from({ length: STRIPES }, (_, k) => <View key={'sp' + k} style={{ position: 'absolute', left: k * ((w - 18) / STRIPES), top: 0, width: (w - 18) / STRIPES, height: h - 10, backgroundColor: k % 2 ? '#3E9160' : 'transparent' }} />)}
          <View style={{ position: 'absolute', left: (w - 18) / 2, top: 0, width: 1, height: h - 10, backgroundColor: 'rgba(255,255,255,0.9)' }} />
          <View style={{ position: 'absolute', left: (w - 18) / 2 - 8, top: (h - 10) / 2 - 8, width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }} />
          <View style={{ position: 'absolute', left: 0, top: (h - 10) / 2 - 7, width: 6, height: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }} />
          <View style={{ position: 'absolute', right: 0, top: (h - 10) / 2 - 7, width: 6, height: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }} />
        </View>
        {/* brown float under the pitch */}
        <View style={{ position: 'absolute', left: 4, top: 36 + h - 8, width: w - 8, height: 6, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: '#8B5E3C' }} />
      </Animated.View>
    </View>
  );
}

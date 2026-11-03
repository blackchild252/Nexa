import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light GAME HOUSE block layers.
 * Drawn only for the Game House world (gaming lounge), on top of the shared Earth scene (NexaEarth):
 *  - EarthGameSky:   three little puzzle pieces (four blocks each: green, water blue, gold) drifting down the sky
 *                    and fading, one after another; VIP adds a small gold spark beside the gold piece
 *  - EarthGameWater: a small game raft on the water (brown float, white controller with a gold cross pad and four
 *                    round buttons); the four buttons light in turn like a game being played;
 *                    VIP adds a soft gold halo on the lit button
 * Native views only, decorative, never receives input. Kept faint so entry, featured games and notes stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark Game House has its own layer (NexaDarkGame).
 */

type Common = { width: number; height: number; horizonY: number };

// [left fraction, top fraction, start delay ms, colour]
const PIECES: Array<[number, number, number, string]> = [[0.14, 0.1, 0, '#2F7D4F'], [0.52, 0.06, 3000, '#1E78C2'], [0.82, 0.12, 6000, '#C9A227']];
const CYCLE = 6000;
// L-shaped piece: four 8 px blocks
const BLOCKS: Array<[number, number]> = [[0, 0], [0, 9], [0, 18], [9, 18]];
const BUTTONS: Array<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // diamond: up, right, down, left

export function EarthGameSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const fall = useRef(PIECES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!animated) { fall.forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = fall.map((v, idx) => Animated.loop(Animated.sequence([
      Animated.delay(PIECES[idx][2]),
      Animated.timing(v, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(CYCLE - PIECES[idx][2]),
    ])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, fall]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {PIECES.map(([l, t, , color], idx) => (
        <Animated.View key={'pc' + idx} style={{ position: 'absolute', left: l * width, top: t * height, width: 17, height: 26, opacity: animated ? fall[idx].interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 0.75, 0.75, 0] }) : 0.5, transform: [{ translateY: animated ? fall[idx].interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.32] }) : idx * 10 }, { rotate: animated ? fall[idx].interpolate({ inputRange: [0, 1], outputRange: [idx % 2 ? '12deg' : '-12deg', idx % 2 ? '-12deg' : '12deg'] }) : '0deg' }] }}>
          {BLOCKS.map(([x, y], b) => <View key={'b' + b} style={{ position: 'absolute', left: x, top: y, width: 8, height: 8, borderRadius: 2, backgroundColor: color, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)' }} />)}
        </Animated.View>
      ))}
      {vip ? <Animated.View style={{ position: 'absolute', left: PIECES[2][0] * width - 10, top: PIECES[2][1] * height - 6, width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(230,190,69,0.95)', opacity: animated ? fall[2].interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }) : 0.8 }} /> : null}
    </View>
  );
}

export function EarthGameWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const bob = useRef(new Animated.Value(0)).current;
  const play = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [bob, play].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(play, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, bob, play]);

  const w = 120; const left = width * 0.14; const top = horizonY + 44;
  const dy = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) : 0;
  const rot = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: ['-0.8deg', '0.8deg'] }) : '0deg';
  // four buttons, each brightest in its own quarter of the cycle
  const btnOpacity = (i: number) => animated ? play.interpolate({ inputRange: [0, 0.01 + i * 0.24, 0.12 + i * 0.24, 0.23 + i * 0.24, 1], outputRange: [0.35, 0.35, 1, 0.35, 0.35] }) : 0.7;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left, top, width: w, height: 52, opacity: 0.88, transform: [{ translateY: dy }, { rotate: rot }] }}>
        {/* controller body */}
        <View style={{ position: 'absolute', left: 6, top: 4, width: w - 12, height: 34, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(201,162,39,0.85)' }} />
        {/* gold cross pad on the left */}
        <View style={{ position: 'absolute', left: 24, top: 16, width: 20, height: 6, borderRadius: 2, backgroundColor: 'rgba(201,162,39,0.95)' }} />
        <View style={{ position: 'absolute', left: 31, top: 9, width: 6, height: 20, borderRadius: 2, backgroundColor: 'rgba(201,162,39,0.95)' }} />
        {/* four round buttons on the right, lit in turn */}
        {BUTTONS.map(([bx, by], i) => (
          <View key={'bt' + i} style={{ position: 'absolute', left: 82 + bx * 8, top: 15 + by * 8, width: 8, height: 8 }}>
            {vip ? <Animated.View style={{ position: 'absolute', left: -4, top: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,225,140,0.35)', opacity: btnOpacity(i) }} /> : null}
            <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: i % 2 ? '#1E78C2' : '#2F7D4F', borderWidth: 1, borderColor: 'rgba(230,190,69,0.98)', opacity: btnOpacity(i) }} />
          </View>
        ))}
        {/* brown float under the controller */}
        <View style={{ position: 'absolute', left: 0, top: 40, width: w, height: 8, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: '#8B5E3C' }} />
        <View style={{ position: 'absolute', left: 0, top: 42, width: w, height: 2, backgroundColor: 'rgba(201,162,39,0.95)' }} />
      </Animated.View>
    </View>
  );
}

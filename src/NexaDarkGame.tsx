import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark GAME HOUSE block layer.
 * Sits on top of the Game House world poster (gaming lounge), under the depth layer, readability wash and content:
 *  - three small gold puzzle pieces (four blocks each) drifting slowly down the screen and fading, one after another
 *  - four gold controller-button glows in a diamond near the top right, lit in turn
 *    (VIP: a little brighter)
 * Native views only, decorative, never receives input. Kept faint so entry, featured games and notes stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Game House has its own layers (NexaEarthGame).
 */

const PIECES: Array<[number, number]> = [[0.12, 0], [0.46, 3000], [0.8, 6000]]; // [left fraction, start delay ms]
const CYCLE = 6000;
const BLOCKS: Array<[number, number]> = [[0, 0], [0, 9], [0, 18], [9, 18]];
const BUTTONS: Array<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left

export function NexaDarkGame() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const play = useRef(new Animated.Value(0)).current;
  const fall = useRef(PIECES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!animated) { [play, ...fall].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(play, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })),
      ...fall.map((v, idx) => Animated.loop(Animated.sequence([
        Animated.delay(PIECES[idx][1]),
        Animated.timing(v, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(CYCLE - PIECES[idx][1]),
      ]))),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, play, fall]);

  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  const btnOpacity = (i: number) => animated ? play.interpolate({ inputRange: [0, 0.01 + i * 0.24, 0.12 + i * 0.24, 0.23 + i * 0.24, 1], outputRange: [0.3, 0.3, 1, 0.3, 0.3] }) : 0.6;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {PIECES.map(([l], idx) => (
        <Animated.View key={'pc' + idx} style={{ position: 'absolute', left: l * width, top: height * 0.08, width: 17, height: 26, opacity: animated ? fall[idx].interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 1, 1, 0] }) : 0.5, transform: [{ translateY: animated ? fall[idx].interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.5] }) : idx * 12 }] }}>
          {BLOCKS.map(([x, y], b) => <View key={'b' + b} style={{ position: 'absolute', left: x, top: y, width: 8, height: 8, borderRadius: 2, backgroundColor: gold + '0.10)', borderWidth: 1, borderColor: gold + '0.22)' }} />)}
        </Animated.View>
      ))}
      {BUTTONS.map(([bx, by], i) => (
        <Animated.View key={'bt' + i} style={{ position: 'absolute', left: width * 0.84 + bx * 14, top: height * 0.07 + by * 14, width: 10, height: 10, borderRadius: 5, backgroundColor: gold + '0.14)', borderWidth: 1, borderColor: gold + '0.35)', opacity: btnOpacity(i) }} />
      ))}
    </View>
  );
}

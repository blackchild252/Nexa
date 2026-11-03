import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark PROFILE block layer.
 * Drawn over the Profile poster (own `profile` world), under the depth layer and readability wash:
 *  - two thin gold gear outlines meshing in the upper right, turning slowly in opposite directions (settings)
 *  - one thin gold shield outline low on the left, breathing, with a small keyhole dot (private / secure)
 *  - three small gold session dots blinking in turn down the right edge
 *    (VIP: a little brighter)
 * Native views only, decorative, never receives input. Kept faint so the Appearance tiles, cards and session list stay readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Profile has its own layers (NexaEarthProfile).
 */

const DOTS: Array<[number, number]> = [[0.95, 0.5], [0.95, 0.58], [0.95, 0.66]]; // [left fraction, top fraction]

function Gear({ size, teeth, color, spin }: { size: number; teeth: number; color: string; spin: any }) {
  const c = size / 2;
  const r = size * 0.4;
  const items = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    items.push(<View key={'t' + i} style={{ position: 'absolute', left: c + r * Math.cos(a) - 3, top: c + r * Math.sin(a) - 3, width: 6, height: 6, borderRadius: 1, backgroundColor: color, transform: [{ rotate: `${(a * 180) / Math.PI}deg` }] }} />);
  }
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate: spin }] }}>
      {items}
      <View style={{ position: 'absolute', left: c - r, top: c - r, width: r * 2, height: r * 2, borderRadius: r, borderWidth: 1.5, borderColor: color }} />
      <View style={{ position: 'absolute', left: c - 4, top: c - 4, width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: color }} />
    </Animated.View>
  );
}

export function NexaDarkProfile() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const turn = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [turn, breathe, blink].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(turn, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(blink, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, turn, breathe, blink]);

  const gold = vip ? 'rgba(255,215,0,' : 'rgba(212,175,55,';
  const spinA = animated ? turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) : '0deg';
  const spinB = animated ? turn.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) : '0deg';
  const shieldScale = animated ? breathe.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) : 1;
  const shieldOpacity = animated ? breathe.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) : 0.75;
  const dotOpacity = (i: number) => blink.interpolate({ inputRange: [0, 0.02 + i * 0.3, 0.1 + i * 0.3, 0.18 + i * 0.3, 1], outputRange: [0.25, 0.25, 1, 0.25, 0.25] });

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <View style={{ position: 'absolute', left: width * 0.78, top: height * 0.09 }}>
        <Gear size={48} teeth={8} color={gold + '0.4)'} spin={spinA} />
      </View>
      <View style={{ position: 'absolute', left: width * 0.78 - 34, top: height * 0.09 + 36 }}>
        <Gear size={36} teeth={6} color={gold + '0.32)'} spin={spinB} />
      </View>
      <Animated.View style={{ position: 'absolute', left: width * 0.08, top: height * 0.8, width: 44, height: 52, opacity: shieldOpacity, transform: [{ scale: shieldScale }] }}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: 44, height: 34, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderWidth: 1.5, borderBottomWidth: 0, borderColor: gold + '0.4)', backgroundColor: gold + '0.05)' }} />
        <View style={{ position: 'absolute', left: 6, top: 26, width: 32, height: 32, borderWidth: 1.5, borderLeftColor: gold + '0.4)', borderBottomColor: gold + '0.4)', borderTopColor: 'transparent', borderRightColor: 'transparent', transform: [{ rotate: '-45deg' }, { scale: 0.7 }] }} />
        <View style={{ position: 'absolute', left: 19, top: 14, width: 6, height: 6, borderRadius: 3, backgroundColor: gold + '0.55)' }} />
        <View style={{ position: 'absolute', left: 21, top: 19, width: 2, height: 8, backgroundColor: gold + '0.45)' }} />
      </Animated.View>
      {DOTS.map(([l, t], i) => (
        <Animated.View key={'dt' + i} style={{ position: 'absolute', left: l * width, top: t * height, width: 7, height: 7, borderRadius: 4, backgroundColor: gold + '0.7)', opacity: animated ? dotOpacity(i) : 0.5 }} />
      ))}
    </View>
  );
}

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light PROFILE block layers.
 * Drawn only for the Profile world, on top of the shared Earth scene (NexaEarth):
 *  - EarthProfileSky:   two white-glass gear rings with gold teeth meshing in the upper right, turning slowly in
 *                       opposite directions (settings); VIP adds a small gold spark by the big gear
 *  - EarthProfileWater: a little harbour cottage on a pier (brown walls, forest-green roof, gold window glowing,
 *                       gold flag swaying from a zero-size pivot on the pole), bobbing gently (VIP: soft halo on the window)
 * Native views only, decorative, never receives input. Kept faint so the Appearance tiles, cards and session list stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark Profile has its own layer (NexaDarkProfile).
 */

type Common = { width: number; height: number; horizonY: number };

function Gear({ size, teeth, spin }: { size: number; teeth: number; spin: any }) {
  const c = size / 2;
  const r = size * 0.4;
  const items = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    items.push(<View key={'t' + i} style={{ position: 'absolute', left: c + r * Math.cos(a) - 4, top: c + r * Math.sin(a) - 4, width: 8, height: 8, borderRadius: 2, backgroundColor: 'rgba(230,190,69,0.98)', transform: [{ rotate: `${(a * 180) / Math.PI}deg` }] }} />);
  }
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate: spin }] }}>
      {items}
      <View style={{ position: 'absolute', left: c - r, top: c - r, width: r * 2, height: r * 2, borderRadius: r, borderWidth: 3, borderColor: 'rgba(230,190,69,0.98)', backgroundColor: 'rgba(255,255,255,0.6)' }} />
      <View style={{ position: 'absolute', left: c - 5, top: c - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.98)', borderWidth: 1.5, borderColor: '#B8912A' }} />
    </Animated.View>
  );
}

export function EarthProfileSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const turn = useRef(new Animated.Value(0)).current;
  const glint = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [turn, glint].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(turn, { toValue: 1, duration: 26000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.timing(glint, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, turn, glint]);

  const spinA = animated ? turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) : '0deg';
  const spinB = animated ? turn.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) : '0deg';
  const sparkOpacity = animated ? glint.interpolate({ inputRange: [0, 0.3, 0.4, 0.5, 1], outputRange: [0.2, 0.2, 1, 0.2, 0.2] }) : 0.7;
  const gx = width * 0.74;
  const gy = height * 0.1;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <View style={{ position: 'absolute', left: gx, top: gy }}>
        <Gear size={54} teeth={8} spin={spinA} />
      </View>
      <View style={{ position: 'absolute', left: gx - 38, top: gy + 40 }}>
        <Gear size={40} teeth={6} spin={spinB} />
      </View>
      {vip ? <Animated.View style={{ position: 'absolute', left: gx + 58, top: gy - 4, width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(230,190,69,0.95)', opacity: sparkOpacity }} /> : null}
    </View>
  );
}

export function EarthProfileWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const bob = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [bob, wave].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(wave, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, bob, wave]);

  const cx = width * 0.2; // cottage left edge
  const cy = horizonY + 30; // roof peak
  const flag = animated ? wave.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['-8deg', '6deg', '-8deg', '6deg', '-8deg'] }) : '0deg';
  const glow = animated ? wave.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.6] }) : 0.9;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left: cx, top: cy, width: 76, height: 78, transform: [{ translateY: animated ? bob.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) : 0 }] }}>
        {/* pole + flag: the flag hangs from a zero-size pivot at the top of the pole, so it swings instead of sliding */}
        <View style={{ position: 'absolute', left: 52, top: -14, width: 2, height: 28, backgroundColor: '#7C5232' }} />
        <View style={{ position: 'absolute', left: 54, top: -14, width: 0, height: 0 }}>
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: [{ rotate: flag }] }}>
            <View style={{ position: 'absolute', left: 0, top: 0, width: 14, height: 8, backgroundColor: 'rgba(230,190,69,0.98)' }} />
          </Animated.View>
        </View>
        {/* roof (forest green) */}
        <View style={{ position: 'absolute', left: 4, top: 0, width: 0, height: 0, borderLeftWidth: 30, borderRightWidth: 30, borderBottomWidth: 20, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#2F7D4F' }} />
        {/* walls, door, window */}
        <View style={{ position: 'absolute', left: 8, top: 20, width: 52, height: 28, backgroundColor: '#8B5E3C', borderWidth: 1, borderColor: '#7C5232' }} />
        <View style={{ position: 'absolute', left: 14, top: 30, width: 10, height: 18, backgroundColor: '#5E3D24' }} />
        {vip ? <View style={{ position: 'absolute', left: 33, top: 26, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(230,190,69,0.28)' }} /> : null}
        <Animated.View style={{ position: 'absolute', left: 38, top: 31, width: 10, height: 10, backgroundColor: 'rgba(230,190,69,0.98)', borderWidth: 1, borderColor: '#B8912A', opacity: glow }} />
        {/* pier */}
        <View style={{ position: 'absolute', left: 0, top: 48, width: 76, height: 4, backgroundColor: '#7C5232' }} />
        {[6, 34, 66].map(x => <View key={'pp' + x} style={{ position: 'absolute', left: x, top: 52, width: 4, height: 14, backgroundColor: '#7C5232' }} />)}
      </Animated.View>
    </View>
  );
}

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light DEVELOPER CONSOLE block layers.
 * Drawn only for the Developer world, on top of the shared Earth scene (NexaEarth):
 *  - EarthDeveloperSky:   a white-glass code window (gold rim, three little dots) in the upper right with three code lines
 *                         that light in turn, and a gold blinking cursor (VIP: small gold spark by the window)
 *  - EarthDeveloperWater: a small workshop on a pier (brown walls, forest-green roof, gold key hanging over the door
 *                         swinging from a zero-size pivot, gold window glowing), bobbing gently (VIP: soft halo on the window)
 * Native views only, decorative, never receives input. Kept faint so manifests, capability lists and API-key rows stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene: Free renders the same layers static, and reduced motion wins.
 * Royal Dark Developer Console has its own layer (NexaDarkDeveloper).
 */

type Common = { width: number; height: number; horizonY: number };
const GOLD = 'rgba(230,190,69,0.98)';

export function EarthDeveloperSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const run = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { run.stopAnimation(); run.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(run, { toValue: 1, duration: 4800, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [animated, run]);

  const lineOpacity = (i: number) => (animated
    ? run.interpolate({ inputRange: [0, i * 0.25, i * 0.25 + 0.1, i * 0.25 + 0.22, 1], outputRange: [0.45, 0.45, 1, 0.45, 0.45] })
    : 0.85);
  const cursor = animated ? run.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.1, 1, 0.1, 1] }) : 0.8;
  const lx = width * 0.66;
  const ly = height * 0.08;
  const widths = [46, 30, 40];

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <View style={{ position: 'absolute', left: lx, top: ly, width: 76, height: 58, borderRadius: 10, borderWidth: 2.5, borderColor: GOLD, backgroundColor: 'rgba(255,255,255,0.7)' }}>
        {['#2F7D4F', '#1A70B8', '#8B5E3C'].map((c, i) => <View key={'d' + i} style={{ position: 'absolute', left: 7 + i * 9, top: 6, width: 5, height: 5, borderRadius: 3, backgroundColor: c }} />)}
        {widths.map((w, i) => <Animated.View key={'c' + i} style={{ position: 'absolute', left: 8 + (i === 1 ? 8 : 0), top: 18 + i * 10, width: w, height: 4, borderRadius: 2, backgroundColor: i === 1 ? '#1A70B8' : '#2F7D4F', opacity: lineOpacity(i) }} />)}
        <Animated.View style={{ position: 'absolute', left: 8 + 40 + 4, top: 18 + 20 - 2, width: 3, height: 8, backgroundColor: GOLD, opacity: cursor }} />
      </View>
      {vip ? <View style={{ position: 'absolute', left: lx + 82, top: ly + 2, width: 5, height: 5, borderRadius: 3, backgroundColor: GOLD }} /> : null}
    </View>
  );
}

export function EarthDeveloperWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const bob = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [bob, wave].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 3300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 3300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(wave, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, bob, wave]);

  const cx = width * 0.14; // workshop left edge
  const cy = horizonY + 30; // roof peak
  const swing = animated ? wave.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['-10deg', '8deg', '-10deg', '8deg', '-10deg'] }) : '0deg';
  const glow = animated ? wave.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.6] }) : 0.9;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left: cx, top: cy, width: 76, height: 78, transform: [{ translateY: animated ? bob.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) : 0 }] }}>
        <View style={{ position: 'absolute', left: 4, top: 0, width: 0, height: 0, borderLeftWidth: 30, borderRightWidth: 30, borderBottomWidth: 20, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#2F7D4F' }} />
        <View style={{ position: 'absolute', left: 8, top: 20, width: 52, height: 28, backgroundColor: '#8B5E3C', borderWidth: 1, borderColor: '#7C5232' }} />
        <View style={{ position: 'absolute', left: 14, top: 30, width: 10, height: 18, backgroundColor: '#5E3D24' }} />
        {/* key: hangs from a zero-size pivot above the door, so it swings instead of sliding */}
        <View style={{ position: 'absolute', left: 19, top: 22, width: 0, height: 0 }}>
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: [{ rotate: swing }] }}>
            <View style={{ position: 'absolute', left: -1, top: 0, width: 2, height: 9, backgroundColor: GOLD }} />
            <View style={{ position: 'absolute', left: -4, top: 8, width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: GOLD }} />
          </Animated.View>
        </View>
        {vip ? <View style={{ position: 'absolute', left: 33, top: 26, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(230,190,69,0.28)' }} /> : null}
        <Animated.View style={{ position: 'absolute', left: 38, top: 31, width: 10, height: 10, backgroundColor: GOLD, borderWidth: 1, borderColor: '#B8912A', opacity: glow }} />
        <View style={{ position: 'absolute', left: 0, top: 48, width: 76, height: 4, backgroundColor: '#7C5232' }} />
        {[6, 34, 66].map(x => <View key={'pp' + x} style={{ position: 'absolute', left: x, top: 52, width: 4, height: 14, backgroundColor: '#7C5232' }} />)}
      </Animated.View>
    </View>
  );
}

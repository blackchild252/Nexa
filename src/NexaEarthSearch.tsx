import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light SEARCH block layers.
 * Drawn only for the Search world, on top of the shared Earth scene (NexaEarth):
 *  - EarthSearchSky:   a white-glass magnifying glass (gold rim, brown handle) drifting slowly across the upper sky,
 *                      with a small glint blinking on the lens (VIP: small gold spark beside it)
 *  - EarthSearchWater: a lighthouse (brown rock, white tower with a gold band, gold lamp) on the water at the right;
 *                      a soft gold beam sweeps from a zero-size pivot at the lamp (VIP: soft gold halo round the lamp)
 * Native views only, decorative, never receives input. Kept faint so the search box, filters and result cards stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark Search has its own layer (NexaDarkSearch).
 */

type Common = { width: number; height: number; horizonY: number };

export function EarthSearchSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const drift = useRef(new Animated.Value(0)).current;
  const glint = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [drift, glint].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(glint, { toValue: 1, duration: 3400, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, drift, glint]);

  const x0 = width * 0.12;
  const span = width * 0.5;
  const top = height * 0.11;
  const moveX = animated ? drift.interpolate({ inputRange: [0, 1], outputRange: [0, span] }) : span * 0.4;
  const moveY = animated ? drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 8, 0] }) : 0;
  const glintOpacity = animated ? glint.interpolate({ inputRange: [0, 0.3, 0.4, 0.5, 1], outputRange: [0.15, 0.15, 1, 0.15, 0.15] }) : 0.6;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left: x0, top, width: 48, height: 52, transform: [{ translateX: moveX }, { translateY: moveY }] }}>
        <View style={{ position: 'absolute', left: 30, top: 30, width: 5, height: 20, borderRadius: 3, backgroundColor: '#7C5232', transform: [{ rotate: '-45deg' }] }} />
        <View style={{ position: 'absolute', left: 0, top: 0, width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: 'rgba(230,190,69,0.98)', backgroundColor: 'rgba(255,255,255,0.55)' }} />
        <Animated.View style={{ position: 'absolute', left: 8, top: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.98)', opacity: glintOpacity }} />
        {vip ? <Animated.View style={{ position: 'absolute', left: 38, top: -2, width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(230,190,69,0.95)', opacity: glintOpacity }} /> : null}
      </Animated.View>
    </View>
  );
}

export function EarthSearchWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { sweep.stopAnimation(); sweep.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [animated, sweep]);

  const lx = width * 0.82; // lighthouse centre x
  const ly = horizonY + 24; // lamp centre y
  const angle = animated ? sweep.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-16deg', '16deg', '-16deg'] }) : '0deg';
  const lamp = animated ? sweep.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0.6, 1, 0.6, 1, 0.6] }) : 0.85;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {/* beam: zero-size pivot at the lamp, so it sweeps instead of sliding */}
      <Animated.View style={{ position: 'absolute', left: lx, top: ly, width: 0, height: 0, transform: [{ rotate: angle }] }}>
        <View style={{ position: 'absolute', left: -170, top: -5, width: 170, height: 10, borderTopLeftRadius: 5, borderBottomLeftRadius: 5, backgroundColor: 'rgba(255,215,120,0.16)' }} />
      </Animated.View>
      <View style={{ position: 'absolute', left: lx - 20, top: ly + 40, width: 40, height: 14, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: '#8B5E3C' }} />
      <View style={{ position: 'absolute', left: lx - 8, top: ly + 6, width: 16, height: 36, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#7C5232' }} />
      <View style={{ position: 'absolute', left: lx - 8, top: ly + 20, width: 16, height: 5, backgroundColor: 'rgba(230,190,69,0.98)' }} />
      <View style={{ position: 'absolute', left: lx - 9, top: ly, width: 18, height: 8, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: '#7C5232' }} />
      {vip ? <View style={{ position: 'absolute', left: lx - 12, top: ly - 10, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(230,190,69,0.26)' }} /> : null}
      <Animated.View style={{ position: 'absolute', left: lx - 4, top: ly - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(230,190,69,0.98)', opacity: lamp }} />
    </View>
  );
}

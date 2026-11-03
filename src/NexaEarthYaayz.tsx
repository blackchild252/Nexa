import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light YAAYZ block layers.
 * Drawn only for the Yaayz world (adverts + tickets: travel, events), on top of the shared Earth scene (NexaEarth):
 *  - EarthYaayzSky:   a small airplane crossing the sky with a fading contrail; VIP adds a small gold spark on the wing
 *  - EarthYaayzWater: a ferry (brown hull, white cabin with gold-lit windows, gold pennant) drifting and bobbing,
 *                     above a dotted gold route line whose dots glow in turn ("your route")
 * Native views only, decorative, never receives input. Kept faint so tickets and adverts stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark Yaayz has its own layer (NexaDarkYaayz).
 */

type Common = { width: number; height: number; horizonY: number };

const TRAIL = 6;
const ROUTE_DOTS = 7;

export function EarthYaayzSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const fly = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { fly.stopAnimation(); fly.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(fly, { toValue: 1, duration: 22000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(fly, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animated, fly]);

  const top = height * 0.17;
  const x = animated ? fly.interpolate({ inputRange: [0, 1], outputRange: [-150, width + 40] }) : width * 0.34;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      <Animated.View style={{ position: 'absolute', left: 0, top, width: 150, height: 30, opacity: 0.85, transform: [{ translateX: x }, { rotate: '-6deg' }] }}>
        {/* contrail: dashes behind the plane, fading away */}
        {Array.from({ length: TRAIL }, (_, k) => (
          <View key={'tr' + k} style={{ position: 'absolute', left: 4 + k * 15, top: 14, width: 10, height: 2, borderRadius: 1, backgroundColor: `rgba(255,255,255,${(0.9 - k * 0.14).toFixed(2)})` }} />
        ))}
        {/* fuselage, wing and tail */}
        <View style={{ position: 'absolute', left: 98, top: 9, width: 34, height: 9, borderRadius: 5, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(46,143,214,0.85)' }} />
        <View style={{ position: 'absolute', left: 116, top: 4, width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(46,143,214,0.9)' }} />
        <View style={{ position: 'absolute', left: 99, top: 4, width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(46,143,214,0.9)' }} />
        <View style={{ position: 'absolute', left: 126, top: 11, width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(201,162,39,0.9)' }} />
        {vip ? <View style={{ position: 'absolute', left: 117, top: 0, width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(230,190,69,0.95)' }} /> : null}
      </Animated.View>
    </View>
  );
}

export function EarthYaayzWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const drift = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [drift, bob, glow].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const pp = (v: Animated.Value, ms: number) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const loops = [pp(drift, 10000), pp(bob, 2600), Animated.loop(Animated.timing(glow, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true }))];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, drift, bob, glow]);

  const w = 92; const left = width * 0.56; const top = horizonY + 30;
  const dx = animated ? drift.interpolate({ inputRange: [0, 1], outputRange: [-16, 16] }) : 0;
  const dy = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) : 0;
  const rot = animated ? bob.interpolate({ inputRange: [0, 1], outputRange: ['-1deg', '1deg'] }) : '0deg';
  const routeTop = horizonY + 96;
  const step = (width * 0.8) / (ROUTE_DOTS - 1);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {/* dotted gold route line: dots glow one after another along the water */}
      {Array.from({ length: ROUTE_DOTS }, (_, i) => {
        const peak = (i + 0.5) / ROUTE_DOTS;
        const opacity = animated ? glow.interpolate({ inputRange: [0, Math.max(0.01, peak - 0.18), peak, Math.min(0.99, peak + 0.18), 1], outputRange: [0.3, 0.3, 1, 0.3, 0.3] }) : 0.6;
        return <Animated.View key={'rd' + i} style={{ position: 'absolute', left: width * 0.1 + i * step - 3, top: routeTop + Math.sin(i * 0.9) * 5, width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(230,190,69,0.95)', opacity }} />;
      })}
      <Animated.View style={{ position: 'absolute', left, top, width: w, height: 46, opacity: 0.9, transform: [{ translateX: dx }, { translateY: dy }, { rotate: rot }] }}>
        {/* gold pennant on the mast */}
        <View style={{ position: 'absolute', left: w / 2 - 1, top: 0, width: 2, height: 14, backgroundColor: '#7C5232' }} />
        <View style={{ position: 'absolute', left: w / 2 + 1, top: 1, width: 12, height: 6, backgroundColor: '#C9A227' }} />
        {/* white cabin with gold-lit windows */}
        <View style={{ position: 'absolute', left: 14, top: 14, width: w - 28, height: 16, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: '#FFFFFF' }} />
        {Array.from({ length: 5 }, (_, k) => <View key={'wn' + k} style={{ position: 'absolute', left: 21 + k * 11, top: 19, width: 6, height: 6, borderRadius: 1.5, backgroundColor: k % 2 ? 'rgba(255,225,140,0.95)' : 'rgba(95,176,232,0.9)' }} />)}
        {/* brown hull with a gold stripe */}
        <View style={{ position: 'absolute', left: 0, top: 30, width: w, height: 14, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: '#8B5E3C' }} />
        <View style={{ position: 'absolute', left: 4, top: 33, width: w - 8, height: 2, backgroundColor: '#C9A227' }} />
        {vip ? <View style={{ position: 'absolute', left: w / 2 - 4, top: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(230,190,69,0.95)' }} /> : null}
      </Animated.View>
    </View>
  );
}

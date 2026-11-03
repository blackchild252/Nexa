import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light NOTIFICATIONS block layers.
 * Drawn only for the Notifications world, on top of the shared Earth scene (NexaEarth):
 *  - EarthNotificationsSky:   three small white envelopes with a gold seal arriving one after another
 *                             (drifting down and fading), VIP adds a small gold spark by the middle one
 *  - EarthNotificationsWater: a bell buoy (brown and white float, mast, gold bell swinging from a zero-size pivot,
 *                             gold lamp) bobbing on the water, with two soft sound rings spreading (VIP: gold halo on the lamp)
 * Native views only, decorative, never receives input. Kept faint so the filters and notification cards stay readable.
 * Motion follows the subscription rules exactly like the rest of the scene:
 * Free renders the same layers static, and reduced motion wins.
 * Royal Dark Notifications has its own layer (NexaDarkNotifications).
 */

type Common = { width: number; height: number; horizonY: number };

// [left fraction, top fraction]
const MAIL: Array<[number, number]> = [[0.14, 0.1], [0.46, 0.06], [0.76, 0.13]];

export function EarthNotificationsSky({ width, height }: Pick<Common, 'width' | 'height'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const arrive = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { arrive.stopAnimation(); arrive.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(arrive, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [animated, arrive]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {MAIL.map(([l, t], i) => {
        // envelope i arrives from 0.02 + i*0.3 of the cycle (max 0.62 + 0.24 < 1, so every ramp ascends)
        const s = 0.02 + i * 0.3;
        const opacity = animated ? arrive.interpolate({ inputRange: [0, s, s + 0.06, s + 0.24, 1], outputRange: [0, 0, 0.85, 0, 0] }) : 0.6;
        const move = animated ? arrive.interpolate({ inputRange: [0, s, s + 0.24, 1], outputRange: [0, 0, 46, 46] }) : 0;
        return (
          <Animated.View key={'ev' + i} style={{ position: 'absolute', left: l * width, top: t * height, width: 40, height: 28, opacity, transform: [{ translateX: move }, { translateY: move }] }}>
            <View style={{ width: 40, height: 28, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: 'rgba(201,162,39,0.5)' }} />
            <View style={{ position: 'absolute', left: 6, top: 3, width: 28, height: 28, borderRightWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(201,162,39,0.4)', transform: [{ rotate: '45deg' }, { scale: 0.7 }] }} />
            <View style={{ position: 'absolute', left: 16, top: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(201,162,39,0.95)' }} />
          </Animated.View>
        );
      })}
      {vip ? <Animated.View style={{ position: 'absolute', left: MAIL[1][0] * width + 44, top: MAIL[1][1] * height - 8, width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(230,190,69,0.95)', opacity: animated ? arrive.interpolate({ inputRange: [0, 0.32, 0.4, 0.5, 1], outputRange: [0.2, 0.2, 1, 0.2, 0.2] }) : 0.7 }} /> : null}
    </View>
  );
}

export function EarthNotificationsWater({ width, horizonY }: Pick<Common, 'width' | 'horizonY'>) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const bob = useRef(new Animated.Value(0)).current;
  const toll = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [bob, toll].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(toll, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true })),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, bob, toll]);

  const bx = width * 0.6; // buoy centre x
  const by = horizonY + 34; // buoy float top
  const swing = animated ? toll.interpolate({ inputRange: [0, 0.05, 0.15, 0.25, 0.35, 0.45, 1], outputRange: ['0deg', '-18deg', '16deg', '-11deg', '6deg', '0deg', '0deg'] }) : '0deg';
  const lamp = animated ? toll.interpolate({ inputRange: [0, 0.05, 0.45, 0.6, 1], outputRange: [0.5, 1, 1, 0.5, 0.5] }) : 0.85;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {[0, 1].map(i => {
        // sound rings spread from the buoy in turn: ring 1 starts later (0.5); each lasts 0.4 of the cycle, so both ramps ascend and end before it wraps
        const s = i * 0.5;
        const scale = animated ? toll.interpolate({ inputRange: [0, s + 0.02, s + 0.42, 1], outputRange: [0.5, 0.5, 1.6, 1.6] }) : 0.8 + i * 0.5;
        const opacity = animated ? toll.interpolate({ inputRange: [0, s + 0.02, s + 0.42, 1], outputRange: [0, 0.5, 0, 0] }) : 0.3 - i * 0.1;
        return <Animated.View key={'sr' + i} style={{ position: 'absolute', left: bx - 50, top: by + 8, width: 100, height: 26, borderRadius: 26, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)', opacity, transform: [{ scale }] }} />;
      })}
      <Animated.View style={{ position: 'absolute', left: bx - 18, top: by, width: 36, height: 68, transform: [{ translateY: animated ? bob.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) : 0 }, { rotate: animated ? bob.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) : '0deg' }] }}>
        <View style={{ position: 'absolute', left: 17, top: 4, width: 2, height: 30, backgroundColor: '#7C5232' }} />
        <View style={{ position: 'absolute', left: 16, top: 0, width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(230,190,69,0.98)', opacity: lamp }} />
        {vip ? <View style={{ position: 'absolute', left: 11, top: -5, width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(230,190,69,0.28)' }} /> : null}
        <View style={{ position: 'absolute', left: 18, top: 8, width: 0, height: 0 }}>
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: [{ rotate: swing }] }}>
            <View style={{ position: 'absolute', left: -7, top: 0, width: 14, height: 12, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: 'rgba(230,190,69,0.98)', borderWidth: 1, borderBottomWidth: 0, borderColor: '#B8912A' }} />
            <View style={{ position: 'absolute', left: -9, top: 12, width: 18, height: 2, backgroundColor: '#B8912A' }} />
          </Animated.View>
        </View>
        <View style={{ position: 'absolute', left: 0, top: 34, width: 36, height: 20, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#7C5232' }} />
        <View style={{ position: 'absolute', left: 1, top: 42, width: 34, height: 5, backgroundColor: '#8B5E3C' }} />
        <View style={{ position: 'absolute', left: 1, top: 47, width: 34, height: 1.5, backgroundColor: 'rgba(230,190,69,0.98)' }} />
      </Animated.View>
    </View>
  );
}

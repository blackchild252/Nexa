import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { useMotion } from './motion';

/**
 * Royal Dark DREAM MARKETPLACE block layer.
 * Sits on top of the Dream Marketplace world poster, under the depth layer, readability wash and content:
 *  - three faint gold showroom spotlight beams from the top edge, breathing in turn (like display lighting)
 *  - one diagonal gold glint sweeping across the screen every ~8 s, like light crossing a glass display
 *    (VIP: a little brighter and wider)
 * Native views only, decorative, never receives input. Kept faint so the storefront stays readable.
 * Motion follows the subscription rules: Free renders the same layer static, reduced motion wins.
 * Earth Light Dream Marketplace has its own layers (NexaEarthMarket).
 */

// [left fraction, beam width]
const BEAMS: Array<[number, number]> = [[0.16, 70], [0.5, 90], [0.84, 70]];

export function NexaDarkMarket() {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const breathe = useRef(new Animated.Value(0)).current;
  const glint = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [breathe, glint].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const loops = [
      Animated.loop(Animated.timing(breathe, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.sequence([
        Animated.timing(glint, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glint, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, breathe, glint]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {BEAMS.map(([l, w], i) => {
        // beam i is brightest at i/3 of the cycle: 5-point ramp, strictly ascending for every i
        const peak = (i + 0.5) / BEAMS.length;
        const opacity = animated ? breathe.interpolate({ inputRange: [0, Math.max(0.01, peak - 0.25), peak, Math.min(0.99, peak + 0.25), 1], outputRange: [0.35, 0.35, 1, 0.35, 0.35] }) : 0.6;
        return <Animated.View key={'bm' + i} style={{ position: 'absolute', left: l * width - w / 2, top: 0, width: w, height: height * 0.42, backgroundColor: 'rgba(212,175,55,0.05)', opacity, transform: [{ scaleY: 1 }] }} />;
      })}
      <Animated.View style={{ position: 'absolute', left: -40, top: -height * 0.1, width: vip ? 46 : 32, height: height * 1.3, backgroundColor: vip ? 'rgba(255,215,0,0.09)' : 'rgba(212,175,55,0.06)', opacity: animated ? glint.interpolate({ inputRange: [0, 0.12, 0.88, 1], outputRange: [0, 1, 1, 0] }) : 0.4, transform: [{ rotate: '18deg' }, { translateX: animated ? glint.interpolate({ inputRange: [0, 1], outputRange: [0, width + 120] }) : width * 0.6 }] }} />
    </View>
  );
}

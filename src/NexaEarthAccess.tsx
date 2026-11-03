import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotion } from './motion';

/**
 * Earth Light ACCESS block layers.
 * One light pair of layers for the four screens outside the sidebar directory, drawn on top of the shared Earth scene (NexaEarth):
 *  - subscription: sky = four tier steps (blue, deep blue, green, gold) with gold rims, caps lit in turn;
 *                  water = three buoys (green, blue, gold) whose lamps glow in turn
 *  - auth (Login / Signup): sky = a white-glass padlock with a gold shackle and a glowing keyhole;
 *                  water = a small lighthouse with a pulsing gold lamp
 *  - staff: sky = three little people (green, blue, gold heads) bobbing in turn; water = a small boat with three crew heads
 *  - disputes: sky = a gold balance scale gently tilting; water = a small seesaw plank on a pivot with a gold and a blue ball
 *    (VIP: a soft halo or a small gold spark)
 * Native views only, decorative, never receives input, ONE looping value per layer. Kept faint so forms, cards and lists stay readable.
 * Motion follows the subscription rules: Free renders the same layers static, reduced motion wins.
 * Royal Dark has its own layer (NexaDarkAccess).
 */

export type EarthAccessKind = 'subscription' | 'auth' | 'staff' | 'disputes';
const GOLD = 'rgba(230,190,69,0.98)';
const GLASS = 'rgba(255,255,255,0.75)';
const PEOPLE = ['#2F7D4F', '#1A70B8', '#E6BE45'];

function useLoop(ms: number) {
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const vip = allows('vip-spotlight');
  const run = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) { run.stopAnimation(); run.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(run, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [animated, run, ms]);
  const lit = (i: number, n: number) => (animated
    ? run.interpolate({ inputRange: [0, i / n, i / n + 0.08, i / n + 0.2, 1], outputRange: [0.45, 0.45, 1, 0.45, 0.45] })
    : 0.85);
  const pulse = animated ? run.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.6] }) : 0.9;
  const tilt = (deg: number) => (animated ? run.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [`-${deg}deg`, `${deg}deg`, `-${deg}deg`, `${deg}deg`, `-${deg}deg`] }) : '0deg');
  const bob = (px: number) => (animated ? run.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, px, 0] }) : 0);
  return { animated, vip, lit, pulse, tilt, bob };
}

export function EarthAccessSky({ kind, width, height }: { kind: EarthAccessKind; width: number; height: number }) {
  const { vip, lit, pulse, tilt, bob } = useLoop(4800);
  const lx = width * 0.66;
  const ly = height * 0.08;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {kind === 'subscription' ? (
        <View style={{ position: 'absolute', left: lx, top: ly, width: 70, height: 38 }}>
          {[10, 18, 26, 34].map((h, i) => (
            <View key={'st' + i} style={{ position: 'absolute', left: i * 14, top: 36 - h, width: 10, height: h, borderRadius: 3, borderWidth: 1.5, borderColor: GOLD, backgroundColor: ['#5FB0E8', '#1A70B8', '#2F7D4F', '#E6BE45'][i] }}>
              <Animated.View style={{ position: 'absolute', left: -1.5, top: -4, width: 10, height: 4, borderRadius: 2, backgroundColor: GOLD, opacity: lit(i, 4) }} />
            </View>
          ))}
        </View>
      ) : null}
      {kind === 'auth' ? (
        <View style={{ position: 'absolute', left: lx, top: ly, width: 44, height: 52 }}>
          <View style={{ position: 'absolute', left: 9, top: 0, width: 26, height: 28, borderTopLeftRadius: 13, borderTopRightRadius: 13, borderWidth: 3, borderBottomWidth: 0, borderColor: GOLD }} />
          <View style={{ position: 'absolute', left: 0, top: 22, width: 44, height: 30, borderRadius: 7, borderWidth: 2.5, borderColor: GOLD, backgroundColor: GLASS }} />
          <Animated.View style={{ position: 'absolute', left: 19, top: 32, width: 7, height: 7, borderRadius: 4, backgroundColor: '#8B5E3C', opacity: pulse }} />
          <View style={{ position: 'absolute', left: 21.5, top: 38, width: 2, height: 7, backgroundColor: '#8B5E3C' }} />
        </View>
      ) : null}
      {kind === 'staff' ? (
        <View style={{ position: 'absolute', left: lx, top: ly, width: 84, height: 34 }}>
          {[0, 1, 2].map(i => (
            <Animated.View key={'pp' + i} style={{ position: 'absolute', left: i * 28, top: 0, width: 22, height: 34, transform: [{ translateY: bob(i % 2 ? 4 : 3) }], opacity: lit(i, 3) }}>
              <View style={{ position: 'absolute', left: 5, top: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: PEOPLE[i], borderWidth: 1.5, borderColor: GOLD }} />
              <View style={{ position: 'absolute', left: 0, top: 15, width: 22, height: 15, borderTopLeftRadius: 11, borderTopRightRadius: 11, backgroundColor: GLASS, borderWidth: 1.5, borderBottomWidth: 0, borderColor: GOLD }} />
            </Animated.View>
          ))}
        </View>
      ) : null}
      {kind === 'disputes' ? (
        <View style={{ position: 'absolute', left: lx, top: ly, width: 76, height: 54 }}>
          <View style={{ position: 'absolute', left: 36.5, top: 6, width: 3, height: 44, backgroundColor: '#8B5E3C' }} />
          <View style={{ position: 'absolute', left: 24, top: 49, width: 28, height: 4, borderRadius: 2, backgroundColor: '#8B5E3C' }} />
          <Animated.View style={{ position: 'absolute', left: 6, top: 5, width: 64, height: 3, borderRadius: 2, backgroundColor: GOLD, transform: [{ rotate: tilt(6) }] }}>
            {[0, 64].map(x => (
              <React.Fragment key={'pn' + x}>
                <View style={{ position: 'absolute', left: x - 0.5, top: 3, width: 1, height: 13, backgroundColor: GOLD }} />
                <View style={{ position: 'absolute', left: x - 9, top: 15, width: 18, height: 8, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: GLASS, borderWidth: 1.5, borderTopWidth: 0, borderColor: GOLD }} />
              </React.Fragment>
            ))}
          </Animated.View>
        </View>
      ) : null}
      {vip ? <View style={{ position: 'absolute', left: lx + 90, top: ly + 2, width: 5, height: 5, borderRadius: 3, backgroundColor: GOLD }} /> : null}
    </View>
  );
}

export function EarthAccessWater({ kind, width, horizonY }: { kind: EarthAccessKind; width: number; horizonY: number }) {
  const { vip, lit, pulse, tilt, bob } = useLoop(3600);
  const cx = width * 0.14;
  const cy = horizonY + 30;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} accessible={false}>
      {kind === 'subscription' ? (
        <Animated.View style={{ position: 'absolute', left: cx, top: cy, width: 78, height: 50, transform: [{ translateY: bob(3) }] }}>
          {[18, 28, 38].map((h, i) => (
            <View key={'by' + i} style={{ position: 'absolute', left: i * 26, top: 44 - h, width: 20, height: h + 6 }}>
              <View style={{ position: 'absolute', left: 8.5, top: 8, width: 3, height: h - 2, backgroundColor: '#8B5E3C' }} />
              <Animated.View style={{ position: 'absolute', left: 3, top: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: PEOPLE[i], borderWidth: 1.5, borderColor: GOLD, opacity: lit(i, 3) }} />
            </View>
          ))}
          <View style={{ position: 'absolute', left: 0, top: 46, width: 78, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' }} />
        </Animated.View>
      ) : null}
      {kind === 'auth' ? (
        <Animated.View style={{ position: 'absolute', left: cx, top: cy - 20, width: 44, height: 74, transform: [{ translateY: bob(2) }] }}>
          <View style={{ position: 'absolute', left: 6, top: 0, width: 0, height: 0, borderLeftWidth: 16, borderRightWidth: 16, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#2F7D4F' }} />
          {vip ? <View style={{ position: 'absolute', left: 8, top: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(230,190,69,0.28)' }} /> : null}
          <Animated.View style={{ position: 'absolute', left: 14, top: 12, width: 16, height: 12, backgroundColor: GOLD, borderWidth: 1, borderColor: '#B8912A', opacity: pulse }} />
          <View style={{ position: 'absolute', left: 10, top: 24, width: 24, height: 44, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#8B5E3C' }} />
          <View style={{ position: 'absolute', left: 10, top: 40, width: 24, height: 9, backgroundColor: '#2F7D4F' }} />
          <View style={{ position: 'absolute', left: 0, top: 68, width: 44, height: 5, borderRadius: 2, backgroundColor: '#7C5232' }} />
        </Animated.View>
      ) : null}
      {kind === 'staff' ? (
        <Animated.View style={{ position: 'absolute', left: cx, top: cy, width: 80, height: 50, transform: [{ translateY: bob(3) }] }}>
          {[0, 1, 2].map(i => <View key={'cr' + i} style={{ position: 'absolute', left: 8 + i * 22, top: 6, width: 12, height: 12, borderRadius: 6, backgroundColor: PEOPLE[i], borderWidth: 1.5, borderColor: GOLD }} />)}
          {[0, 1, 2].map(i => <View key={'cb' + i} style={{ position: 'absolute', left: 5 + i * 22, top: 20, width: 18, height: 12, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: GLASS }} />)}
          <View style={{ position: 'absolute', left: 0, top: 30, width: 80, height: 14, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: '#8B5E3C', borderWidth: 1, borderColor: '#7C5232' }} />
          <View style={{ position: 'absolute', left: 0, top: 30, width: 80, height: 2, backgroundColor: GOLD }} />
        </Animated.View>
      ) : null}
      {kind === 'disputes' ? (
        <View style={{ position: 'absolute', left: cx, top: cy, width: 84, height: 40 }}>
          <View style={{ position: 'absolute', left: 36, top: 22, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#7C5232' }} />
          <Animated.View style={{ position: 'absolute', left: 6, top: 20, width: 72, height: 4, borderRadius: 2, backgroundColor: '#8B5E3C', transform: [{ rotate: tilt(8) }] }}>
            <View style={{ position: 'absolute', left: 0, top: -12, width: 12, height: 12, borderRadius: 6, backgroundColor: GOLD }} />
            <View style={{ position: 'absolute', left: 60, top: -12, width: 12, height: 12, borderRadius: 6, backgroundColor: '#1A70B8', borderWidth: 1.5, borderColor: GOLD }} />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

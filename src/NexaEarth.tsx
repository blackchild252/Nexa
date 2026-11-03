import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMotion } from './motion';
import { EarthHomeShore, EarthHomeSky, EarthHomeWater } from './NexaEarthHome';
import { EarthDamiSky, EarthDamiWater } from './NexaEarthDami';
import { EarthZeezaSky, EarthZeezaWater } from './NexaEarthZeeza';
import { EarthMoneySky, EarthMoneyWater } from './NexaEarthMoney';
import { EarthMarketSky, EarthMarketWater } from './NexaEarthMarket';
import { EarthYaayzSky, EarthYaayzWater } from './NexaEarthYaayz';
import { EarthLeisureSky, EarthLeisureWater } from './NexaEarthLeisure';
import { EarthBallSky, EarthBallWater } from './NexaEarthBall';
import { EarthKitchenSky, EarthKitchenWater } from './NexaEarthKitchen';
import { EarthGameSky, EarthGameWater } from './NexaEarthGame';
import { EarthFitnessSky, EarthFitnessWater } from './NexaEarthFitness';
import { EarthNotificationsSky, EarthNotificationsWater } from './NexaEarthNotifications';
import { EarthSearchSky, EarthSearchWater } from './NexaEarthSearch';
import { EarthProfileSky, EarthProfileWater } from './NexaEarthProfile';
import { EarthExtensionsSky, EarthExtensionsWater } from './NexaEarthExtensions';
import { EarthDeveloperSky, EarthDeveloperWater } from './NexaEarthDeveloper';
import { EarthAccessSky, EarthAccessWater, type EarthAccessKind } from './NexaEarthAccess';

/**
 * NEXA Earth Light scene — the light-theme counterpart of NexaCosmos.
 * Sky (white/pale blue, drifting clouds) · sun with a touch of gold · land (brown hills) ·
 * forest (green tree line) · water (blue, shimmering, with a gold sun path).
 * Fully native and dependency-free. Decorative only: never receives input.
 * Motion follows the subscription rules exactly like the cosmos: Free renders the same scene, static.
 */
export type EarthVariant = 'home' | 'dami' | 'zeeza' | 'money' | 'market' | 'yaayz' | 'leisure' | 'ball' | 'kitchen' | 'game' | 'fitness' | 'calm' | 'notifications' | 'search' | 'profile' | 'extensions' | 'developer' | 'subscription' | 'auth' | 'staff' | 'disputes';

function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

function Tri({ w, h, color, style }: { w: number; h: number; color: string; style?: any }) {
  return <View style={[{ width: 0, height: 0, borderLeftWidth: w / 2, borderRightWidth: w / 2, borderBottomWidth: h, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }, style]} />;
}

// [left fraction, width fraction, height px, color]
const LAND_BACK: Array<[number, number, number, string]> = [[-0.15, 0.7, 120, '#A9825B'], [0.3, 0.75, 150, '#9B7350'], [0.7, 0.6, 110, '#B08A62']];
const LAND_FRONT: Array<[number, number, number, string]> = [[-0.2, 0.75, 90, '#8B5E3C'], [0.35, 0.8, 110, '#7C5232'], [0.85, 0.5, 80, '#8B5E3C']];
const CLOUDS: Array<[number, number, number, number]> = [[0.05, 0.1, 150, 0], [0.55, 0.05, 110, 0.4], [0.3, 0.2, 190, 0.7]];

export function NexaEarth({ variant = 'home', dim = 0 }: { variant?: EarthVariant; dim?: number }) {
  const { width, height } = useWindowDimensions();
  const { allows } = useMotion();
  const animated = allows('world-ambient');
  const isAccess = variant === 'subscription' || variant === 'auth' || variant === 'staff' || variant === 'disputes';
  const vip = allows('vip-spotlight');

  const drift = useRef(new Animated.Value(0)).current;
  const sun = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) { [drift, sun, sway, shimmer].forEach(v => { v.stopAnimation(); v.setValue(0); }); return; }
    const pingpong = (v: Animated.Value, ms: number) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const loops = [pingpong(drift, 16000), pingpong(sun, 3600), pingpong(sway, 2600), Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true }))];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [animated, drift, sun, sway, shimmer]);

  const horizonY = height * (variant === 'home' ? 0.62 : variant === 'dami' ? 0.55 : 0.68);
  const waterH = height - horizonY;
  const trees = useMemo(() => { const r = rng(20260930); return Array.from({ length: 26 }, () => ({ x: r(), h: 26 + r() * 30, shade: r() > 0.5 ? '#2F7D4F' : '#3E9160' })); }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
      <LinearGradient colors={['#9CCBF0', '#CFE8FA', '#F2F9FF', '#FFFFFF']} locations={[0, 0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />

      {/* sun with a touch of gold */}
      <Animated.View style={{ position: 'absolute', right: width * 0.12, top: height * 0.1, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,215,120,0.28)', opacity: animated ? sun.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) : 0.85, transform: [{ scale: animated ? sun.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) : 1 }] }} />
      <View style={{ position: 'absolute', right: width * 0.12 + 42, top: height * 0.1 + 42, width: 66, height: 66, borderRadius: 33, backgroundColor: '#F4CF6A' }} />
      {vip ? <Animated.View style={{ position: 'absolute', right: width * 0.12 - 30, top: height * 0.1 - 30, width: 210, height: 210, borderRadius: 105, backgroundColor: 'rgba(255,225,140,0.16)', opacity: sun }} /> : null}

      {/* drifting clouds */}
      {CLOUDS.map(([l, t, w, phase], i) => (
        <Animated.View key={'c' + i} style={{ position: 'absolute', left: l * width, top: height * (0.06 + t), width: w, height: w * 0.32, opacity: 0.92, transform: [{ translateX: animated ? drift.interpolate({ inputRange: [0, 1], outputRange: [-24 * (1 + phase), 34 * (1 + phase)] }) : 0 }] }}>
          <View style={{ position: 'absolute', left: 0, bottom: 0, width: w, height: w * 0.2, borderRadius: w, backgroundColor: '#FFFFFF' }} />
          <View style={{ position: 'absolute', left: w * 0.14, bottom: w * 0.08, width: w * 0.42, height: w * 0.26, borderRadius: w, backgroundColor: '#FFFFFF' }} />
          <View style={{ position: 'absolute', left: w * 0.42, bottom: w * 0.06, width: w * 0.36, height: w * 0.22, borderRadius: w, backgroundColor: '#F7FBFF' }} />
        </Animated.View>
      ))}

      {variant === 'home' ? <EarthHomeSky width={width} height={height} /> : null}
      {variant === 'dami' ? <EarthDamiSky width={width} height={height} /> : null}
      {variant === 'zeeza' ? <EarthZeezaSky width={width} height={height} /> : null}
      {variant === 'money' ? <EarthMoneySky width={width} height={height} /> : null}
      {variant === 'market' ? <EarthMarketSky width={width} height={height} /> : null}
      {variant === 'yaayz' ? <EarthYaayzSky width={width} height={height} /> : null}
      {variant === 'leisure' ? <EarthLeisureSky width={width} height={height} /> : null}
      {variant === 'ball' ? <EarthBallSky width={width} height={height} /> : null}
      {variant === 'kitchen' ? <EarthKitchenSky width={width} height={height} /> : null}
      {variant === 'game' ? <EarthGameSky width={width} height={height} /> : null}
      {variant === 'fitness' ? <EarthFitnessSky width={width} height={height} /> : null}
      {variant === 'notifications' ? <EarthNotificationsSky width={width} height={height} /> : null}
      {variant === 'search' ? <EarthSearchSky width={width} height={height} /> : null}
      {variant === 'profile' ? <EarthProfileSky width={width} height={height} /> : null}
      {variant === 'extensions' ? <EarthExtensionsSky width={width} height={height} /> : null}
      {variant === 'developer' ? <EarthDeveloperSky width={width} height={height} /> : null}
      {isAccess ? <EarthAccessSky kind={variant as EarthAccessKind} width={width} height={height} /> : null}

      {/* distant land (brown) */}
      {LAND_BACK.map(([l, w, h, c], i) => <Tri key={'lb' + i} w={w * width} h={h} color={c} style={{ position: 'absolute', left: l * width, top: horizonY - h }} />)}
      {variant === 'home' ? <EarthHomeShore width={width} horizonY={horizonY} /> : null}
      {/* forest tree line (green) with a gold rim of morning light */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: horizonY - 22, height: 26, backgroundColor: '#2F7D4F' }} />
      {trees.map((t, i) => <Animated.View key={'t' + i} style={{ position: 'absolute', left: t.x * width - 10, top: horizonY - 22 - t.h + 6, transform: [{ rotate: animated ? sway.interpolate({ inputRange: [0, 1], outputRange: [i % 2 ? '-1.6deg' : '1.6deg', i % 2 ? '1.6deg' : '-1.6deg'] }) : '0deg' }] }}>
        <Tri w={22} h={t.h} color={t.shade} />
      </Animated.View>)}
      <View style={{ position: 'absolute', left: 0, right: 0, top: horizonY - 23, height: 1.5, backgroundColor: 'rgba(201,162,39,0.55)' }} />
      {/* near land (brown) */}
      {LAND_FRONT.map(([l, w, h, c], i) => <Tri key={'lf' + i} w={w * width} h={h} color={c} style={{ position: 'absolute', left: l * width, top: horizonY - h + 14 }} />)}

      {/* water (blue) */}
      <LinearGradient colors={['#5FB0E8', '#2E8FD6', '#1E6FB0']} locations={[0, 0.45, 1]} style={{ position: 'absolute', left: 0, right: 0, top: horizonY + 6, height: waterH }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: horizonY + 5, height: 2, backgroundColor: 'rgba(201,162,39,0.7)' }} />
      {Array.from({ length: 8 }, (_, i) => {
        const w = 190 - i * 18; const dir = i % 2 ? 1 : -1;
        return <Animated.View key={'w' + i} style={{ position: 'absolute', top: horizonY + 16 + i * 13, right: width * 0.12 + 75 - w / 2, width: w, height: 2, borderRadius: 2, backgroundColor: i < 4 ? 'rgba(255,225,140,0.85)' : 'rgba(255,255,255,0.75)', opacity: animated ? shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.85, 0.2] }) : 0.5 - i * 0.04, transform: [{ translateX: animated ? shimmer.interpolate({ inputRange: [0, 1], outputRange: [-9 * dir, 9 * dir] }) : 0 }] }} />;
      })}

      {variant === 'home' ? <EarthHomeWater width={width} horizonY={horizonY} /> : null}
      {variant === 'dami' ? <EarthDamiWater width={width} horizonY={horizonY} /> : null}
      {variant === 'zeeza' ? <EarthZeezaWater width={width} horizonY={horizonY} /> : null}
      {variant === 'money' ? <EarthMoneyWater width={width} horizonY={horizonY} /> : null}
      {variant === 'market' ? <EarthMarketWater width={width} horizonY={horizonY} /> : null}
      {variant === 'yaayz' ? <EarthYaayzWater width={width} horizonY={horizonY} /> : null}
      {variant === 'leisure' ? <EarthLeisureWater width={width} horizonY={horizonY} /> : null}
      {variant === 'ball' ? <EarthBallWater width={width} horizonY={horizonY} /> : null}
      {variant === 'kitchen' ? <EarthKitchenWater width={width} horizonY={horizonY} /> : null}
      {variant === 'game' ? <EarthGameWater width={width} horizonY={horizonY} /> : null}
      {variant === 'fitness' ? <EarthFitnessWater width={width} horizonY={horizonY} /> : null}
      {variant === 'notifications' ? <EarthNotificationsWater width={width} horizonY={horizonY} /> : null}
      {variant === 'search' ? <EarthSearchWater width={width} horizonY={horizonY} /> : null}
      {variant === 'profile' ? <EarthProfileWater width={width} horizonY={horizonY} /> : null}
      {variant === 'extensions' ? <EarthExtensionsWater width={width} horizonY={horizonY} /> : null}
      {variant === 'developer' ? <EarthDeveloperWater width={width} horizonY={horizonY} /> : null}
      {isAccess ? <EarthAccessWater kind={variant as EarthAccessKind} width={width} horizonY={horizonY} /> : null}

      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,255,255,${Math.max(0, Math.min(0.8, variant === 'profile' || variant === 'extensions' || variant === 'developer' || isAccess ? Math.max(dim, 0.18) : dim))})` }]} />
    </View>
  );
}

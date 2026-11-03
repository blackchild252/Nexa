import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, themedStyles } from './theme';
import { NEXA_COSMOS_WORLDS, NEXA_WORLDS, NexaWorld } from './nexaWorlds';
import { NexaCosmos } from './NexaCosmos';
import { NexaEarth, type EarthVariant } from './NexaEarth';
import { NexaDarkHome } from './NexaDarkHome';
import { NexaDarkDami } from './NexaDarkDami';
import { NexaDarkZeeza } from './NexaDarkZeeza';
import { NexaDarkNotifications } from './NexaDarkNotifications';
import { NexaDarkMoney } from './NexaDarkMoney';
import { NexaDarkMarket } from './NexaDarkMarket';
import { NexaDarkYaayz } from './NexaDarkYaayz';
import { NexaDarkLeisure } from './NexaDarkLeisure';
import { NexaDarkBall } from './NexaDarkBall';
import { NexaDarkKitchen } from './NexaDarkKitchen';
import { NexaDarkGame } from './NexaDarkGame';
import { NexaDarkFitness } from './NexaDarkFitness';
import { NexaDarkSearch } from './NexaDarkSearch';
import { NexaDarkProfile } from './NexaDarkProfile';
import { NexaDarkExtensions } from './NexaDarkExtensions';
import { NexaDarkDeveloper } from './NexaDarkDeveloper';
import { NexaDarkAccess } from './NexaDarkAccess';
import { isAtmosphereWorld, NexaModuleAtmosphere } from './NexaModuleAtmosphere';
import { NexaDepthLayer } from './NexaDepthLayer';
import { useThemeMode } from './ThemeProvider';
import { NexaSceneAccent } from './NexaSceneAccent';
import { KeyboardSafe } from './KeyboardSafe';
import { NexaCinematicFrame } from './NexaCinematicFrame';
import { getNexaSceneContract } from './nexaSceneContract';

const HOME_CINEMATIC_BACKGROUND = require('../assets/design/NEXA_HOME_CINEMATIC_BACKGROUND_V1.png');

type Props = {
  children: React.ReactNode;
  world: NexaWorld;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  position?: 'top' | 'center' | 'bottom';
};

/**
 * Shared environmental layer. Artwork is decorative and never receives input.
 * Royal Dark: cosmos (Home/Dami) or the world poster + dark readability wash.
 * Earth Light (V5.21.0): the native Earth scene for every world, plus a pale readability wash.
 * Both keep the same layer order (environment → depth → readability → content).
 */
export function NexaWorldBackground({ children, world, style, intensity = 0.46, position = 'center' }: Props) {
  const { mode } = useThemeMode();
  const light = mode === 'light';
  const source = NEXA_WORLDS[world];
  const cosmos = NEXA_COSMOS_WORLDS.includes(world);
  const imagePosition = position === 'top' ? 'top' : position === 'bottom' ? 'bottom' : 'center';
  const isAccess = world === 'subscription' || world === 'auth' || world === 'staff' || world === 'disputes';
  const earthVariant: EarthVariant = isAccess ? (world as EarthVariant) : world === 'developer' ? 'developer' : world === 'extensions' ? 'extensions' : world === 'profile' ? 'profile' : world === 'search' ? 'search' : world === 'notifications' ? 'notifications' : world === 'home' ? 'home' : world === 'dami' ? 'dami' : world === 'zeeza' ? 'zeeza' : world === 'sky-money' ? 'money' : world === 'dream-marketplace' ? 'market' : world === 'yaayz' ? 'yaayz' : world === 'leisure' ? 'leisure' : world === 'ball-house' ? 'ball' : world === 'kitchen' ? 'kitchen' : world === 'game-house' ? 'game' : world === 'fitness' ? 'fitness' : 'calm';
  const sceneContract = getNexaSceneContract(world);
  const showSharedAccent = sceneContract.depth === 'quiet-orb';
  const showReadability = (light ? earthVariant === 'notifications' || earthVariant === 'calm' || earthVariant === 'search' || earthVariant === 'zeeza' || earthVariant === 'money' || earthVariant === 'market' || earthVariant === 'yaayz' || earthVariant === 'leisure' || earthVariant === 'ball' || earthVariant === 'kitchen' || earthVariant === 'game' || earthVariant === 'fitness' : !cosmos) || (light && (earthVariant === 'profile' || earthVariant === 'extensions' || earthVariant === 'developer' || isAccess));
  return (
    <View style={[styles.root, style]}>
      {light ? <NexaEarth variant={earthVariant} dim={earthVariant === 'notifications' || earthVariant === 'calm' || earthVariant === 'search' || earthVariant === 'zeeza' || earthVariant === 'money' || earthVariant === 'market' || earthVariant === 'yaayz' || earthVariant === 'leisure' || earthVariant === 'ball' || earthVariant === 'kitchen' || earthVariant === 'game' || earthVariant === 'fitness' || isAccess ? 0.18 : 0} /> : null}
      {light && (earthVariant === 'home' || earthVariant === 'dami') ? <LinearGradient pointerEvents="none" colors={['rgba(244,250,255,0.05)', 'rgba(244,250,255,0.22)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.lightReadabilityGuard} /> : null}
      {!light && cosmos && world === 'dami' ? <NexaCosmos variant="dami" dim={0.28} /> : null}
      {!light && world === 'home' ? <Image source={HOME_CINEMATIC_BACKGROUND} resizeMode="cover" accessible={false} style={[styles.image, styles.homeCinematicImage]} /> : null}
      {!light && source ? <Image source={source} resizeMode="cover" accessible={false} style={[styles.image, { opacity: Math.max(0, Math.min(0.7, intensity)), pointerEvents: 'none' }]} /> : null}
      {!light && world === 'home' ? <NexaDarkHome /> : null}
      {!light && world === 'dami' ? <NexaDarkDami /> : null}
      {!light && world === 'zeeza' ? <NexaDarkZeeza /> : null}
      {!light && world === 'notifications' ? <NexaDarkNotifications /> : null}
      {!light && world === 'sky-money' ? <NexaDarkMoney /> : null}
      {!light && world === 'dream-marketplace' ? <NexaDarkMarket /> : null}
      {!light && world === 'yaayz' ? <NexaDarkYaayz /> : null}
      {!light && world === 'leisure' ? <NexaDarkLeisure /> : null}
      {!light && world === 'ball-house' ? <NexaDarkBall /> : null}
      {!light && world === 'kitchen' ? <NexaDarkKitchen /> : null}
      {!light && world === 'game-house' ? <NexaDarkGame /> : null}
      {!light && world === 'fitness' ? <NexaDarkFitness /> : null}
      {!light && world === 'search' ? <NexaDarkSearch /> : null}
      {!light && world === 'profile' ? <NexaDarkProfile /> : null}
      {!light && world === 'extensions' ? <NexaDarkExtensions /> : null}
      {!light && world === 'developer' ? <NexaDarkDeveloper /> : null}
      {!light && isAtmosphereWorld(world) ? <NexaModuleAtmosphere world={world} /> : null}
      {!light && isAccess ? <NexaDarkAccess kind={world as 'subscription' | 'auth' | 'staff' | 'disputes'} /> : null}
      {!light && showSharedAccent ? <NexaSceneAccent world={world} /> : null}
      <NexaCinematicFrame world={world} />
      <NexaDepthLayer emphasis={Math.max(0.3, Math.min(0.7, intensity + 0.08))} />
      {showReadability ? <LinearGradient
        pointerEvents="none"
        colors={theme.gradients.readability}
        start={{ x: 0, y: imagePosition === 'top' ? 0 : 0.18 }}
        end={{ x: 0, y: imagePosition === 'bottom' ? 1 : 0.92 }}
        style={styles.overlay}
      /> : null}
      <View pointerEvents="none" style={styles.edgeVignette} />
      {world === 'auth' ? <View style={styles.content}>{children}</View> : <KeyboardSafe style={styles.content}>{children}</KeyboardSafe>}
    </View>
  );
}

export function NexaWorldSurface({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

const styles = themedStyles(() => StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: theme.colors.deepBlack },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  homeCinematicImage: { opacity: 0.96 },
  overlay: { ...StyleSheet.absoluteFillObject },
  edgeVignette: { ...StyleSheet.absoluteFillObject, borderWidth: 18, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 22 },
  lightReadabilityGuard: { ...StyleSheet.absoluteFillObject },
  content: { flex: 1 },
  surface: {
    backgroundColor: theme.materials.glass.background,
    borderWidth: 1,
    borderColor: theme.materials.glass.border,
    borderRadius: theme.radius.lg,
  },
}));

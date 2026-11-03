import '../sentry';
import '../webAlertShim';
import '../nexaAppStatePause';
import '../nexaAutoRefresh';
import React, { useEffect, useRef } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import '../nexaDefaultFont';
import { NEXA_FONTS } from '../nexaFonts';
import { theme } from '../theme';
import { AuthProvider, AuthGate } from '../auth';
import { PushRegistration } from '../pushRegistration';
import { PushTaps } from '../pushTaps';
import { BASIC_MOTION_LEVEL, MotionProvider, useMotion } from '../motion';
import { NexaNavProvider } from '../NexaNavKeys';
import { ThemeProvider, startupBackground, useThemeMode } from '../ThemeProvider';
import { useNexaTextScale } from '../nexaTextScale';
import { useNexaFontChoice } from '../nexaFontChoice';
import { NexaLocationProvider } from '../nexaLocation';
import { NexaDemoBanner } from '../demoMode';
import { NexaInAppNotificationPopup } from '../NexaInAppNotificationPopup';

function RootNavigator(){
  const { level, reducedMotion } = useMotion();
  const animation = reducedMotion || level < BASIC_MOTION_LEVEL ? 'none' : 'fade_from_bottom';
  return <Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:theme.colors.background},animation}}>
    <Stack.Screen name="auth/login"/>
    <Stack.Screen name="auth/signup"/>
    <Stack.Screen name="onboarding"/>
    <Stack.Screen name="(tabs)"/>
    <Stack.Screen name="wallet"/>
    <Stack.Screen name="subscription"/>
  </Stack>;
}

/**
 * V5.21.0: the whole navigation tree is re-keyed when the interface changes, so every screen (and
 * every module-level style) renders with the new palette. The current route is restored afterwards.
 */
function ThemedShell(){
  const { mode } = useThemeMode();
  // Text size and font type are part of the appearance key: changing either re-renders every screen.
  const appearance = `${mode}|${useNexaTextScale()}|${useNexaFontChoice()}`;
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  const seenMode = useRef(appearance);
  const livePath = useRef(pathname);
  livePath.current = pathname;
  if (seenMode.current === appearance) lastPath.current = pathname;
  useEffect(() => {
    if (seenMode.current === appearance) return;
    seenMode.current = appearance;
    const target = lastPath.current;
    // M4499: replace only when the rebuild really lost the screen. If the user is still on it, do nothing (no flash).
    if (target && target !== '/') setTimeout(() => { try { if (livePath.current !== target) router.replace(target as any); } catch { /* keep the initial route */ } }, 60);
  }, [appearance]);
  return <>
    <StatusBar style={mode === 'light' ? 'dark' : 'light'} backgroundColor={theme.colors.background}/>
    <NexaNavProvider key={appearance}><RootNavigator/></NexaNavProvider>
    <AuthGate/>
    <PushRegistration/>
    <PushTaps/>
    <NexaDemoBanner/>
    <NexaInAppNotificationPopup/>
  </>;
}

/**
 * fonts were only ever loaded by the legacy root app/_layout.tsx, which Expo Router ignores
 * because src/app exists. Every NexaInter-* family therefore fell back to a system font. They are registered
 * here, in the layout that is actually mounted. If loading fails the app still renders (system fallback).
 */
function useNexaFontsReady(){
  const [loaded, error] = useFonts({
    ...Ionicons.font,
    [NEXA_FONTS.regular]: require('../../assets/fonts/NexaInter-Regular.otf'),
    [NEXA_FONTS.medium]: require('../../assets/fonts/NexaInter-Medium.otf'),
    [NEXA_FONTS.semibold]: require('../../assets/fonts/NexaInter-SemiBold.otf'),
    [NEXA_FONTS.bold]: require('../../assets/fonts/NexaInter-Bold.otf'),
    [NEXA_FONTS.extraBold]: require('../../assets/fonts/NexaInter-ExtraBold.otf'),
    [NEXA_FONTS.black]: require('../../assets/fonts/NexaInter-Black.otf'),
  });
  return loaded || !!error;
}

export default function RootLayout(){
  const fontsReady = useNexaFontsReady();
  if (!fontsReady) return <View style={{flex:1,backgroundColor:startupBackground()}}/>;
  return <ThemeProvider><AuthProvider><NexaLocationProvider><MotionProvider><ThemedShell/></MotionProvider></NexaLocationProvider></AuthProvider></ThemeProvider>;
}
export { NexaErrorScreen as ErrorBoundary } from '../NexaErrorScreen';

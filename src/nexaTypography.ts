import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { NEXA_FONTS } from './nexaFonts';

/** NEXA typography + responsive layout contract. Inter is bundled so the UI does not
 * silently change fonts between Android, iOS and web. */
export type NexaFontWeight = keyof typeof NEXA_FONTS;

export const fontFamilyFor = (weight: NexaFontWeight = 'regular') => NEXA_FONTS[weight];

export function responsiveScale(width: number, value: number, minWidth = 320, maxWidth = 720) {
  const clamped = Math.max(minWidth, Math.min(maxWidth, width));
  const factor = clamped / 390;
  return Math.round(value * Math.max(0.92, Math.min(1.12, factor)) * 10) / 10;
}

export function responsiveGutter(width: number) {
  return Math.max(16, Math.min(24, width * 0.046));
}

export function useNexaResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  const scale = (value: number) => responsiveScale(width, value);
  return {
    width,
    height,
    fontScale,
    gutter: responsiveGutter(width),
    contentMaxWidth: Math.min(width, 720),
    scale,
    isCompact: width < 360,
    isWide: width >= 600,
  };
}

export const typography = StyleSheet.create({
  display: { fontFamily: fontFamilyFor('black'), fontSize: 36, lineHeight: 38, letterSpacing: -0.5 },
  title: { fontFamily: fontFamilyFor('bold'), fontSize: 32, lineHeight: 34, letterSpacing: -0.25 },
  heading: { fontFamily: fontFamilyFor('bold'), fontSize: 27, lineHeight: 29 },
  section: { fontFamily: fontFamilyFor('semibold'), fontSize: 22, lineHeight: 24 },
  body: { fontFamily: fontFamilyFor('regular'), fontSize: 20, lineHeight: 23 },
  bodyMedium: { fontFamily: fontFamilyFor('medium'), fontSize: 20, lineHeight: 23 },
  label: { fontFamily: fontFamilyFor('semibold'), fontSize: 18, lineHeight: 19 },
  caption: { fontFamily: fontFamilyFor('regular'), fontSize: 17, lineHeight: 18 },
  micro: { fontFamily: fontFamilyFor('semibold'), fontSize: 16, lineHeight: 16, letterSpacing: 0.2 },
});

export const PLATFORM_SANS = Platform.select({
  android: 'sans-serif',
  ios: 'SF Pro Text',
  web: 'Inter',
  default: 'sans-serif',
});

/**
 * NEXA permanent visual system — two interfaces, one token contract.
 *
 *   dark  = Royal Dark  : black + royal gold (unchanged since V2.1)
 *   light = Earth Light : white sky, blue water, brown land, green forest, a touch of gold
 *
 * `theme` is a live view of the ACTIVE mode: every property read resolves against the current
 * mode (see themeMode.ts). Feature screens keep consuming `theme` and `s`; nothing else needs to
 * know which interface is on. Change this file when the visual identity is intentionally changed.
 * Compatibility alias names (royalGold, goldBright, ...) are kept for both modes; in Earth Light
 * they map to the earth palette (see comments on `lightTheme`).
 */
import { currentThemeMode, isBuildingStyles, withThemeMode, themedStyles as themedStylesEngine, type ThemeMode } from './themeMode';
import { DESIGN_PROFILES, designIcon, designStyle, scaleRadius } from './themeDesign';
import { NEXA_FONTS } from './nexaFonts';

// Kept dependency-free because historical theme contracts intentionally load theme.ts in isolation.
// nexaTextScale.ts publishes the live preference on globalThis; when absent, the baseline is 1.
// nexaFontChoice.ts publishes the live font type the same way (`__NEXA_FONT_FAMILY__`; '' = bundled Inter).
const INTER_WEIGHT: Record<string, string> = { 'NexaInter-Regular': '400', 'NexaInter-Medium': '500', 'NexaInter-SemiBold': '600', 'NexaInter-Bold': '700', 'NexaInter-ExtraBold': '800', 'NexaInter-Black': '900' };
const scaleTextStyle = <T = any>(value: T): T => {
  const rawScale = Number((globalThis as any).__NEXA_TEXT_SCALE__ || 1);
  const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;
  const family = String((globalThis as any).__NEXA_FONT_FAMILY__ || '');
  if ((scale === 1 && !family) || value == null) return value;
  const walk = (node: any): any => {
    if (node == null) return node;
    if (Array.isArray(node)) return node.map(walk);
    if (typeof node !== 'object') return node;
    const out: Record<string, any> = {};
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (typeof v === 'number' && scale !== 1 && (key === 'fontSize' || key === 'lineHeight' || key === 'letterSpacing')) out[key] = Math.round(v * scale * 100) / 100;
      else if (family && key === 'fontFamily' && typeof v === 'string' && INTER_WEIGHT[v]) {
        out[key] = family;
        if (node.fontWeight == null) out.fontWeight = INTER_WEIGHT[v];
      } else out[key] = walk(v);
    }
    return out;
  };
  return walk(value) as T;
};

const darkTheme = {
  interface: { version: '2.3', release: '6.2.54', designFamily: 'Royal Fusion / Royal Gold Dark' },
  design: DESIGN_PROFILES.dark,
  colors: {
    royalGold: '#D4AF37',
    brightGold: '#FFD700',
    ivoryText: '#F8F5E9',
    graphite: '#1A1A1A',
    charcoal: '#2A2A2A',
    deepBlack: '#000000',

    // Compatibility aliases used throughout the cumulative app.
    background: '#000000',
    backgroundSoft: '#1A1A1A',
    surface: '#1A1A1A',
    surfaceElevated: '#2A2A2A',
    surfacePressed: '#2A2A2A',
    surfaceGlow: '#1A1A1A',
    border: '#D4AF37',
    borderStrong: '#D4AF37',
    borderGold: '#D4AF37',
    gold: '#D4AF37',
    goldBright: '#FFD700',
    goldHot: '#FFD700',
    goldSoft: '#D4AF37',
    goldText: '#D4AF37',
    goldWash: '#2A2A2A',
    card: '#1A1A1A',
    borderQuiet: '#6B5A24',
    borderSoft: 'rgba(212,175,55,0.28)',
    borderGoldSoft: 'rgba(212,175,55,0.40)',
    overlayScrim: 'rgba(0,0,0,0.78)',
    overlay: '#000000',
    focus: '#FFD700',
    successSoft: '#173A27',
    infoSoft: '#13283A',
    warningSoft: '#3B2C13',
    errorSoft: '#3A1717',
    champagne: '#F8F5E9',
    text: '#F8F5E9',
    textSecondary: '#F8F5E9',
    muted: '#A9A9A9',
    success: '#2ECC71',
    info: '#3498DB',
    warning: '#F5A623',
    error: '#E74C3C',
    danger: '#E74C3C',
    errorText: '#F26B5C', // B263: error-coloured TEXT on dark surfaces (4.8:1 on #2A2A2A); error/danger stay for fills
    black: '#000000',
  },
  gradients: {
    gold: ['#FFD700', '#D4AF37'] as const,
    app: ['#000000', '#1A1A1A'] as const,
    goldSoft: ['rgba(255,215,0,0.16)', 'rgba(212,175,55,0.03)'] as const,
    readability: ['rgba(0,0,0,0.46)', 'rgba(0,0,0,0.84)'] as const,
  },
  materials: {
    base: { background: '#000000', opacity: 1 },
    surface: { background: '#1A1A1A', opacity: 0.96 },
    elevated: { background: '#2A2A2A', opacity: 0.96 },
    glass: { background: 'rgba(10,10,10,0.76)', border: 'rgba(212,175,55,0.28)' },
  },
  typography: {
    display: { fontFamily: NEXA_FONTS.black, fontSize: 34, lineHeight: 38, fontWeight: '900' as const, letterSpacing: -0.5 },
    title: { fontFamily: NEXA_FONTS.bold, fontSize: 30, lineHeight: 34, fontWeight: '900' as const, letterSpacing: 0.2 },
    heading: { fontFamily: NEXA_FONTS.bold, fontSize: 25, lineHeight: 29, fontWeight: '700' as const },
    section: { fontFamily: NEXA_FONTS.semibold, fontSize: 20, lineHeight: 24, fontWeight: '600' as const },
    body: { fontFamily: NEXA_FONTS.regular, fontSize: 18, lineHeight: 23 },
    caption: { fontFamily: NEXA_FONTS.regular, fontSize: 15, lineHeight: 18 },
    label: { fontFamily: NEXA_FONTS.semibold, fontSize: 16, lineHeight: 19, fontWeight: '600' as const },
    micro: { fontFamily: NEXA_FONTS.semibold, fontSize: 15, lineHeight: 18, fontWeight: '600' as const },
  },
  radius: { sm: 12, md: 16, lg: 18, xl: 20, pill: 999 },
  spacing: { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 32 },
  accessibility: { minTouchTarget: 44, preferredTouchTarget: 48, contrast: { body: 4.5, large: 3, ui: 3 } },
  layout: {
    pagePadding: 18,
    sectionGap: 14,
    cardPadding: 18,
    listRowMinHeight: 56,
    compactControlHeight: 44,
    primaryControlHeight: 48,
  },
  shadow: {
    card: {
      shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
    },
    gold: {
      shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.24, shadowRadius: 14, elevation: 6,
    },
    glow: {
      shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.22, shadowRadius: 18, elevation: 5,
    },
  },
};

type Theme = typeof darkTheme;

/**
 * EARTH LIGHT — sky (white/pale blue) · water (blue) · land (brown) · forest (green) · gold touch.
 * Alias mapping (so existing screens re-skin without edits):
 *   royalGold  → forest green   (primary buttons; `black` = white text on them)
 *   brightGold / goldBright / goldHot → water blue (active tab, accent text, links)
 *   gold / borderGold / borderStrong  → real gold (the "touch of gold": frames, rims, glow)
 *   deepBlack / background / surface  → sky white / pale sky / white
 *   text / ivoryText → deep land brown; muted → warm grey-brown
 */
const lightColors: Theme['colors'] = {
  royalGold: '#2A7147',
  brightGold: '#1767A9',
  ivoryText: '#2A2118',
  graphite: '#FFFFFF',
  charcoal: '#E4F0F9',
  deepBlack: '#F2F9FF',

  background: '#F2F9FF',
  backgroundSoft: '#F8FBFE',
  surface: '#FFFFFF',
  surfaceElevated: '#EAF3FA',
  surfacePressed: '#DCEBF7',
  surfaceGlow: '#FFFFFF',
  border: '#CDBB98',
  borderStrong: '#C9A227',
  borderGold: '#C9A227',
  gold: '#C9A227',
  goldBright: '#1767A9',
  goldHot: '#1867AA',
  goldSoft: '#C9A227',
  goldText: '#1767A9',
  goldWash: '#DCEBF7',
  card: '#FFFFFF',
  borderQuiet: '#D9CBAA',
  borderSoft: 'rgba(201,162,39,0.30)',
  borderGoldSoft: 'rgba(201,162,39,0.45)',
  overlayScrim: 'rgba(30,45,60,0.52)',
  overlay: '#F2F9FF',
  focus: '#1767A9',
  successSoft: '#DDF1E4',
  infoSoft: '#DCEBF7',
  warningSoft: '#FBEFD5',
  errorSoft: '#F8DCD8',
  champagne: '#2A2118',
  text: '#2A2118',
  textSecondary: '#4A3B2C',
  muted: '#6B6254',
  success: '#1D7343',
  info: '#1565A8',
  warning: '#8A5A1C',
  error: '#B83629',
  danger: '#B83629',
  errorText: '#B83629',
  black: '#FFFFFF',
};

const lightTheme: Theme = {
  ...darkTheme,
  interface: { ...darkTheme.interface, designFamily: 'Royal Fusion / Earth Light' },
  // Earth Light has its own design (+): rounder shapes, lighter type, airier cards.
  // radius + typography are derived from the dark values with the same rules the style-sheet
  // transform uses (designStyle), so inline `theme.radius.*` and themed sheets always agree.
  design: DESIGN_PROFILES.light,
  radius: {
    sm: scaleRadius(darkTheme.radius.sm), md: scaleRadius(darkTheme.radius.md), lg: scaleRadius(darkTheme.radius.lg),
    xl: scaleRadius(darkTheme.radius.xl), pill: darkTheme.radius.pill,
  },
  typography: designStyle('light', darkTheme.typography),
  layout: { ...darkTheme.layout, pagePadding: 20, sectionGap: 16, cardPadding: 20, listRowMinHeight: 58, primaryControlHeight: 50 },
  colors: lightColors,
  gradients: {
    gold: ['#E6C566', '#C9A227'] as const,
    app: ['#F2F9FF', '#F4EBDB'] as const,
    goldSoft: ['rgba(201,162,39,0.18)', 'rgba(201,162,39,0.03)'] as const,
    readability: ['rgba(244,250,255,0.30)', 'rgba(244,250,255,0.88)'] as const,
  } as any,
  materials: {
    base: { background: '#F2F9FF', opacity: 1 },
    surface: { background: '#FFFFFF', opacity: 0.96 },
    elevated: { background: '#EAF3FA', opacity: 0.96 },
    glass: { background: 'rgba(255,255,255,0.78)', border: 'rgba(201,162,39,0.40)' },
  },
  shadow: {
    card: { shadowColor: '#4F7A99', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 5 },
    gold: { shadowColor: '#C9A227', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 5 },
    glow: { shadowColor: '#1E78C2', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 5 },
  },
};

const THEMES: Record<ThemeMode, Theme> = { dark: darkTheme, light: lightTheme };
export const getTheme = (mode: ThemeMode): Theme => THEMES[mode];

/** Live theme: every property read resolves against the active interface. */
export const theme: Theme = new Proxy({} as Theme, {
  get: (_t, key) => {
    const mode = currentThemeMode();
    // Style sheets are built from base tokens and then passed through designStyle(), so a token like
    // theme.radius.md is not scaled twice. Inline reads (no build in progress) get the designed values.
    if (mode === 'light' && isBuildingStyles() && (key === 'radius' || key === 'typography')) return (darkTheme as any)[key];
    return (THEMES[mode] as any)[key];
  },
  has: (_t, key) => key in darkTheme,
  ownKeys: () => Reflect.ownKeys(darkTheme),
  getOwnPropertyDescriptor: (_t, key) => (key in darkTheme ? { enumerable: true, configurable: true, value: (THEMES[currentThemeMode()] as any)[key] } : undefined),
});

export type RoyalStatus = 'success' | 'info' | 'warning' | 'error';
export const statusColor = (status: RoyalStatus) => theme.colors[status];

/* ------------------------------------------------------------------ */
/* Hard-coded dark literals → Earth Light equivalents                  */
/* ------------------------------------------------------------------ */
const norm = (c: string) => c.replace(/\s+/g, '').toLowerCase();

const LIGHT_LITERALS: Record<string, string> = {
  '#d4af37': '#C9A227', '#ffd700': '#1767A9', '#f8f5e9': '#2A2118',
  '#a9a9a9': '#6B6254', '#666': '#6B6254', '#666666': '#6B6254', '#756e61': '#6B6254', '#9b9b9b': '#6B6254', '#8a8a8a': '#6B6254',
  '#9b907a': '#7A6A4F', '#d8cdb4': '#6B5A3A',
  '#ef8d8d': '#B3382C', '#8b4b4b': '#A94438', '#ef9b9b': '#B3382C', '#ff8f8f': '#B3382C', '#ff9b9b': '#B3382C', '#f87171': '#B83629', '#d6a0a0': '#A94438',
  '#111111': '#111111', '#8bd6a2': '#7CCB96', '#80b8ff': '#78B0F5', '#ffe082': '#F7D673', // Zeeza inbox category pills: dark label stays on a pastel fill in both themes
  '#9bd8ff': '#1565A8', '#9ff0b5': '#1D7343', '#9fe0b0': '#1D7343',
  '#ffd27a': '#8A5A1C', '#ffcc9a': '#8A5A1C', '#f4cf78': '#8A5A1C', '#f1c75b': '#8A5A1C',
  '#aeb6c3': '#5F6B76', '#7f8794': '#5F6B76', '#9aa4b2': '#5F6B76', '#8f97a3': '#5F6B76', '#6f7785': '#5F6B76', '#687180': '#5F6B76', '#52606d': '#5F6B76', '#444': '#8A7F6E',
  '#3b2c13': '#FBEFD5', '#332a18': '#F3E6C8', '#173a27': '#DDF1E4', '#17261e': '#E3F2E8', '#08100b': '#EAF6EE',
  '#5b342b': '#E3B7AE', '#5b2a2a': '#E3B7AE', '#7b3030': '#F0C4BD', '#2a1717': '#F8E4E0',
  '#2a2a2a': '#EAF3FA', '#1a1a1a': '#FFFFFF', '#000000': '#2A2118', '#000': '#2A2118',
  '#303946': '#D3E2EE', '#232a35': '#E4EEF6', '#252b35': '#E4EEF6', '#1b2028': '#EEF4F9', '#18202c': '#EEF4F9', '#12161c': '#F2F7FB',
  '#15110a': '#F7F1E3', '#0d0b08': '#F7F1E3', '#050403': '#F7F1E3', '#15130f': '#F7F1E3', '#100e0a': '#F7F1E3',
  'rgba(10,10,10,0.76)': 'rgba(255,255,255,0.82)', 'rgba(26,26,26,0.85)': 'rgba(255,255,255,0.88)',
  'rgba(20,14,32,0.82)': 'rgba(255,255,255,0.84)', 'rgba(14,10,22,0.85)': 'rgba(255,255,255,0.86)', 'rgba(8,5,16,0.55)': 'rgba(255,255,255,0.55)',
  'rgba(0,0,0,0.94)': 'rgba(242,249,255,0.96)', 'rgba(0,0,0,0.78)': 'rgba(30,45,60,0.52)', 'rgba(0,0,0,.78)': 'rgba(30,45,60,0.52)',
  'rgba(0,0,0,0.62)': 'rgba(30,45,60,0.40)', 'rgba(0,0,0,.65)': 'rgba(30,45,60,0.45)', 'rgba(0,0,0,0.5)': 'rgba(30,45,60,0.35)',
};

/** Map one color string for the given mode. Dark returns the input untouched. */
export function mapColorForMode(value: string, mode: ThemeMode): string {
  if (mode === 'dark' || typeof value !== 'string') return value;
  const key = norm(value);
  if (LIGHT_LITERALS[key]) return LIGHT_LITERALS[key];
  const gold = /^rgba\(212,175,55,([0-9.]+)\)$/.exec(key);
  if (gold) return `rgba(201,162,39,${Math.min(1, Number(gold[1]) + 0.1).toFixed(2)})`;
  const yellow = /^rgba\(255,215,0,([0-9.]+)\)$/.exec(key);
  if (yellow) return `rgba(30,120,194,${yellow[1]})`;
  return value;
}

/** Theme-aware color literal: `tc('#9b907a')` resolves against the active interface. */
export const tc = (value: string): string => mapColorForMode(value, currentThemeMode());

const COLOR_KEYS = /color$|Color$|^tint$/i;
/** Recursively remap color-valued style props (backgroundColor, color, borderColor, shadowColor...). */
export function remapColorsForMode(mode: ThemeMode, value: any): any {
  if (mode === 'dark' || value == null) return value;
  if (Array.isArray(value)) return value.map(v => remapColorsForMode(mode, v));
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value)) {
      const v = value[k];
      out[k] = typeof v === 'string' && COLOR_KEYS.test(k) ? mapColorForMode(v, mode) : remapColorsForMode(mode, v);
    }
    return out;
  }
  return value;
}

/**
 * Full interface remap for a finished style sheet: colours first, then the interface's design
 * (shape, type weight, frame, shadow). Royal Dark returns the sheet untouched.
 */
export function remapStylesForMode(mode: ThemeMode, value: any): any {
  if (mode === 'dark' || value == null) return value;
  return designStyle(mode, remapColorsForMode(mode, value));
}

/** Design for an inline style object in the ACTIVE interface: `style={ds({ borderRadius: 16, ... })}`. */
export const ds = <T = any>(style: T): T => scaleTextStyle(designStyle(currentThemeMode(), style));

/** Icon name in the ACTIVE interface's icon look (Earth Light = filled friendly icons). */
export const di = (name: string, focused: boolean = true): string => designIcon(name, currentThemeMode(), focused);

/** Module-level style holder for BOTH interfaces (drop-in for StyleSheet.create / plain style objects). */
// Return type is intentionally loose: plain style objects widen literals like flexDirection:'row' to string,
// which RN accepts at runtime but StyleSheet-typed props reject. Keys are still checked.
export function themedStyles<T extends Record<string, any>>(factory: () => T): { [K in keyof T]: any } {
  const styles = themedStylesEngine(factory, remapStylesForMode) as { [K in keyof T]: any };
  return new Proxy(styles as any, {
    get: (target, key) => scaleTextStyle((target as any)[key]),
    has: (target, key) => key in target,
    ownKeys: target => Reflect.ownKeys(target),
    getOwnPropertyDescriptor: (target, key) => ({ enumerable: true, configurable: true, value: (target as any)[key] }),
  }) as { [K in keyof T]: any };
}
export { withThemeMode };

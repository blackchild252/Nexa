/**
 * NEXA design profiles — pure logic, no React Native imports.
 *
 * Colours already switch with the interface (theme.ts). This module makes the two interfaces
 * differ in LOOKS beyond colour, while keeping the same screens, layout and navigation:
 *
 *   Royal Dark  — the original look, untouched: tight corners, heavy type, gold glow, snappy motion.
 *   Earth Light — an organic look: rounder shapes, lighter type, thin frames, soft lifted shadows,
 *                 filled friendly icons, calm floating motion.
 *
 * Royal Dark is the identity transform: every function returns its input unchanged, so nothing
 * about the dark interface can drift because of this file.
 */
import type { ThemeMode } from './themeMode';

export type DesignProfile = {
  id: 'royal-dark' | 'earth-light';
  name: string;
  shape: { radiusScale: number; pillFrom: number };
  type: { weightMap: Record<string, string>; letterSpacingScale: number };
  frame: { thickBorderTo: number };
  shadow: { radiusScale: number; opacityScale: number; offsetYScale: number; elevationScale: number };
  motion: { pressScale: number; springSpeedDelta: number; bounceDelta: number; enterMsDelta: number; travelScale: number };
  icons: 'outline' | 'filled';
};

export const DESIGN_PROFILES: Record<ThemeMode, DesignProfile> = {
  dark: {
    id: 'royal-dark', name: 'Royal Dark',
    shape: { radiusScale: 1, pillFrom: 100 },
    type: { weightMap: {}, letterSpacingScale: 1 },
    frame: { thickBorderTo: 0 },
    shadow: { radiusScale: 1, opacityScale: 1, offsetYScale: 1, elevationScale: 1 },
    motion: { pressScale: 0, springSpeedDelta: 0, bounceDelta: 0, enterMsDelta: 0, travelScale: 1 },
    icons: 'outline',
  },
  light: {
    id: 'earth-light', name: 'Earth Light',
    shape: { radiusScale: 1.3, pillFrom: 100 },
    type: { weightMap: { '900': '800', '800': '700', '700': '600' }, letterSpacingScale: 0.5 },
    frame: { thickBorderTo: 1 },
    shadow: { radiusScale: 1.4, opacityScale: 0.7, offsetYScale: 1.25, elevationScale: 0.7 },
    motion: { pressScale: 0.01, springSpeedDelta: -4, bounceDelta: -3, enterMsDelta: 80, travelScale: 1.5 },
    icons: 'filled',
  },
};

export const designProfile = (mode: ThemeMode): DesignProfile => DESIGN_PROFILES[mode];

const RADIUS_KEY = /^border(Top|Bottom)?(Left|Right)?Radius$/;

/** Scale one corner radius. Pills and circles (>= pillFrom) and hairline radii (<= 2) are left alone. */
export function scaleRadius(value: number, mode: ThemeMode = 'light'): number {
  const p = DESIGN_PROFILES[mode].shape;
  if (!Number.isFinite(value) || value <= 2 || value >= p.pillFrom || p.radiusScale === 1) return value;
  return Math.round(value * p.radiusScale);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Apply the interface's design profile to a style value (object, array or nested styles).
 * Dark returns the very same reference. Colours are NOT touched here (see theme.ts).
 */
export function designStyle<T = any>(mode: ThemeMode, value: T): T {
  if (mode === 'dark' || value == null) return value;
  const d = DESIGN_PROFILES[mode];
  const walk = (node: any): any => {
    if (node == null) return node;
    if (Array.isArray(node)) return node.map(walk);
    if (typeof node !== 'object') return node;
    const out: Record<string, any> = {};
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === 'number') {
        if (RADIUS_KEY.test(k)) out[k] = scaleRadius(v, mode);
        else if (k === 'letterSpacing') out[k] = v > 0 ? r2(v * d.type.letterSpacingScale) : v;
        else if (k === 'borderWidth' && d.frame.thickBorderTo > 0 && v > d.frame.thickBorderTo) out[k] = v >= 2 ? v - 0.5 : d.frame.thickBorderTo;
        else if (k === 'shadowRadius') out[k] = r2(v * d.shadow.radiusScale);
        else if (k === 'shadowOpacity') out[k] = r2(Math.min(1, v * d.shadow.opacityScale));
        else if (k === 'elevation') out[k] = Math.round(v * d.shadow.elevationScale);
        else out[k] = v;
      } else if (typeof v === 'string' && k === 'fontWeight') {
        out[k] = d.type.weightMap[v] ?? v;
      } else if (k === 'shadowOffset' && v && typeof v === 'object' && typeof v.height === 'number') {
        out[k] = { ...v, height: r2(v.height * d.shadow.offsetYScale) };
      } else {
        out[k] = walk(v);
      }
    }
    return out;
  };
  return walk(value) as T;
}

/**
 * Icon look. Royal Dark keeps outline icons. Earth Light shows the filled version of a small,
 * known-safe set of Ionicons names (anything not in the set is returned unchanged, so an unknown
 * name can never turn into a broken glyph). `focused === false` keeps the outline (inactive tabs).
 */
export const EARTH_FILLED_ICONS: readonly string[] = Object.freeze([
  'home', 'wallet', 'people', 'storefront', 'ticket', 'sparkles', 'person', 'notifications', 'search',
  'cart', 'fitness', 'football', 'restaurant', 'barbell', 'game-controller', 'extension-puzzle', 'code-slash',
  'chatbubbles', 'compass', // Zeeza section keys
  'card', // NEXA Membership directory entry
  'alert-circle', // Report to AAMI Central directory entry
]);

export function designIcon(name: string, mode: ThemeMode, focused: boolean = true): string {
  if (mode === 'dark' || !focused || !name.endsWith('-outline')) return name;
  const base = name.slice(0, -'-outline'.length);
  return EARTH_FILLED_ICONS.includes(base) ? base : name;
}

/** Motion feel for press and enter animations (dark = original numbers). */
export const motionProfile = (mode: ThemeMode) => DESIGN_PROFILES[mode].motion;

/**
 * NEXA theme mode engine — pure logic, no React Native imports.
 *
 * Two interfaces share one token contract:
 *   'dark'  = Royal Dark  (black + royal gold)
 *   'light' = Earth Light (sky white, water blue, land brown, forest green, touch of gold)
 *
 * `theme` (see theme.ts) reads the ACTIVE mode on every access, so screens that render after
 * a switch pick up the new palette. Module-level style sheets are built once per mode with
 * `themedStyles()` and resolved lazily, so nothing is frozen to one palette.
 */
export type ThemeMode = 'dark' | 'light';
export const THEME_MODES: readonly ThemeMode[] = Object.freeze(['dark', 'light'] as ThemeMode[]);
export const DEFAULT_THEME_MODE: ThemeMode = 'dark';
export const THEME_STORAGE_KEY = 'nexa.theme.mode';

export function normalizeThemeMode(value: unknown): ThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

/**
 * M4500: what the person CHOOSES. 'default' follows the phone; 'dark' and 'light' are fixed.
 * `ThemeMode` above stays the RESOLVED look (what the screens draw), so the style engine is unchanged.
 * The same storage key holds the choice: a saved 'dark' or 'light' from earlier versions is read back exactly as it was,
 * and nothing saved means 'default' (the starting choice).
 */
export type ThemePreference = 'default' | 'dark' | 'light';
export const THEME_PREFERENCES: readonly ThemePreference[] = Object.freeze(['default', 'dark', 'light'] as ThemePreference[]);
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'default';
export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === 'dark' || value === 'light' ? value : 'default';
}
/** M4501: Default follows the phone (a missing or unknown phone setting counts as dark); Dark and Light ignore it. */
export function resolveThemeMode(preference: unknown, systemScheme: unknown): ThemeMode {
  const pref = normalizeThemePreference(preference);
  if (pref === 'dark' || pref === 'light') return pref;
  return systemScheme === 'light' ? 'light' : 'dark';
}

let activeMode: ThemeMode = DEFAULT_THEME_MODE;
let buildOverride: ThemeMode | null = null;
const listeners = new Set<(mode: ThemeMode) => void>();

/** Mode used by every `theme.*` / `tc()` read right now (a style build can force its own mode). */
export function currentThemeMode(): ThemeMode { return buildOverride ?? activeMode; }
export function getActiveThemeMode(): ThemeMode { return activeMode; }
/** True while a module-level style sheet is being built (see `themedStyles`). */
export function isBuildingStyles(): boolean { return buildOverride !== null; }

export function setActiveThemeMode(mode: ThemeMode): void {
  const next = normalizeThemeMode(mode);
  if (next === activeMode) return;
  activeMode = next;
  listeners.forEach(fn => { try { fn(next); } catch { /* a bad listener must not block a theme switch */ } });
}

export function subscribeThemeMode(fn: (mode: ThemeMode) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Run `fn` as if `mode` were active (used to pre-build one style sheet per mode). */
export function withThemeMode<T>(mode: ThemeMode, fn: () => T): T {
  const previous = buildOverride;
  buildOverride = mode;
  try { return fn(); } finally { buildOverride = previous; }
}

/**
 * Build a module-level style object once per mode and resolve it lazily.
 * `remap` converts leftover hard-coded dark literals for the light build.
 * Returns a Proxy with the same keys as the factory output.
 */
export function themedStyles<T extends Record<string, any>>(factory: () => T, remap?: (mode: ThemeMode, value: any) => any): T {
  const build = (mode: ThemeMode): T => withThemeMode(mode, () => {
    const raw = factory();
    return remap ? remap(mode, raw) : raw;
  });
  const sets: Record<ThemeMode, T> = { dark: build('dark'), light: build('light') };
  return new Proxy({} as T, {
    get: (_t, key) => (sets[currentThemeMode()] as any)[key],
    has: (_t, key) => key in sets.dark,
    ownKeys: () => Reflect.ownKeys(sets.dark),
    getOwnPropertyDescriptor: (_t, key) => (key in sets.dark ? { enumerable: true, configurable: true, value: (sets[currentThemeMode()] as any)[key] } : undefined),
  });
}

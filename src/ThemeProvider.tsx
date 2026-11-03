import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Appearance, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { loadNexaTypographyPreferences } from './nexaTypographyPreferences';
import { loadNexaHomeSpacingPreference } from './nexaHomeSpacing';
import { DEFAULT_THEME_MODE, DEFAULT_THEME_PREFERENCE, THEME_STORAGE_KEY, getActiveThemeMode, normalizeThemePreference, resolveThemeMode, setActiveThemeMode, subscribeThemeMode, type ThemeMode, type ThemePreference } from './themeMode';

/**
 * NEXA appearance provider.
 * Loads the saved choice (Default / Royal Dark / Earth Light) BEFORE the first screen renders so there is
 * no flash of the wrong theme, persists changes, and tells the tree to re-render on a switch.
 * Preference is stored on the device only (a display setting, not an account or money boundary).
 */
type ThemeContextValue = { mode: ThemeMode; preference: ThemePreference; setPreference: (preference: ThemePreference) => Promise<void>; setMode: (preference: ThemePreference) => Promise<void>; ready: boolean };
const ThemeContext = createContext<ThemeContextValue>({ mode: DEFAULT_THEME_MODE, preference: DEFAULT_THEME_PREFERENCE, setPreference: async () => {}, setMode: async () => {}, ready: false });

// M4503: read the saved choice at once where the phone allows it (native, synchronous), so the very first frame already has the right look.
function readSavedPreferenceNow(): ThemePreference | null {
  try {
    const raw = (SecureStore as any).getItem?.(THEME_STORAGE_KEY);
    return typeof raw === 'string' ? normalizeThemePreference(raw) : null;
  } catch { return null; }
}
// Start-up background colours (same values as the Royal Dark and Earth Light backgrounds).
const SHELL_BACKGROUND: Record<ThemeMode, string> = { dark: '#000000', light: '#F2F9FF' };

/** M4503: background for the very first frames (before fonts and the saved choice finish loading). */
export function startupBackground(): string {
  return SHELL_BACKGROUND[resolveThemeMode(readSavedPreferenceNow() ?? DEFAULT_THEME_PREFERENCE, Appearance.getColorScheme?.())];
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default follows the phone, light or dark, on any phone. Changes are only taken while the app is on screen: some Android phones
  // briefly report the other scheme as the app goes to the background, which must not flip the look. The phone is read again on return.
  const [systemScheme, setSystemScheme] = useState<string | null>(() => Appearance.getColorScheme?.() ?? null);
  useEffect(() => {
    const readPhone = () => setSystemScheme(Appearance.getColorScheme?.() ?? null);
    const phoneSub = Appearance.addChangeListener?.(() => { if (AppState.currentState === 'active') readPhone(); });
    const appSub = AppState.addEventListener('change', state => { if (state === 'active') readPhone(); });
    return () => { phoneSub?.remove?.(); appSub?.remove?.(); };
  }, []);
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const saved = readSavedPreferenceNow();
    const first = saved ?? DEFAULT_THEME_PREFERENCE;
    setActiveThemeMode(resolveThemeMode(first, Appearance.getColorScheme?.()));
    return first;
  });
  const [mode, setModeState] = useState<ThemeMode>(getActiveThemeMode());
  const [ready, setReady] = useState(false);

  useEffect(() => subscribeThemeMode(setModeState), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (active) setPreferenceState(saved ? normalizeThemePreference(saved) : DEFAULT_THEME_PREFERENCE);
      } catch { /* storage unavailable (e.g. web): stay on the default interface */ }
      try { await loadNexaTypographyPreferences(); } catch { /* standard reading setup stays active */ }
      try { await loadNexaHomeSpacingPreference(); } catch { /* automatic Home spacing stays active */ }
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, []);

  // M4501 and M4504: the look is always resolved from the choice and the phone's current setting. With Default the app follows
  // the phone live; with Dark or Light the phone setting is ignored.
  useEffect(() => { setActiveThemeMode(resolveThemeMode(preference, systemScheme)); }, [preference, systemScheme]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    const chosen = normalizeThemePreference(next);
    setPreferenceState(chosen);
    try { await SecureStore.setItemAsync(THEME_STORAGE_KEY, chosen); } catch { /* still applied for this session */ }
  }, []);

  const value = useMemo(() => ({ mode, preference, setPreference, setMode: setPreference, ready }), [mode, preference, setPreference, ready]);
  // Until the saved choice is read, render an empty shell (a few ms) instead of the wrong theme.
  if (!ready) return <View style={{ flex: 1, backgroundColor: SHELL_BACKGROUND[resolveThemeMode(preference, systemScheme)] }} />;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() { return useContext(ThemeContext); }

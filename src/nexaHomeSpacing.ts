import { useSyncExternalStore } from 'react';

/** B263 / M4166: how much extra space sits above the Home header. Home screen and its menu panel only. */
export type NexaHomeSpacing = 0 | 8 | 16 | 24;
export const NEXA_HOME_SPACINGS: readonly NexaHomeSpacing[] = [0, 8, 16, 24];
export const NEXA_HOME_SPACING_LABELS: Record<NexaHomeSpacing, string> = {
  0: 'Standard',
  8: 'A little more',
  16: 'More',
  24: 'Most',
};
export const NEXA_HOME_SPACING_STORAGE_KEY = 'nexa.home.topSpacing';

let activeSpacing: NexaHomeSpacing = 0;
const listeners = new Set<() => void>();

export function normalizeNexaHomeSpacing(value: unknown): NexaHomeSpacing {
  const n = Number(value);
  return NEXA_HOME_SPACINGS.includes(n as NexaHomeSpacing) ? (n as NexaHomeSpacing) : 0;
}

export function getNexaHomeSpacing(): NexaHomeSpacing { return activeSpacing; }

export function setNexaHomeSpacing(value: unknown): NexaHomeSpacing {
  const next = normalizeNexaHomeSpacing(value);
  if (next === activeSpacing) return next;
  activeSpacing = next;
  listeners.forEach(fn => { try { fn(); } catch { /* one listener must not block the others */ } });
  return next;
}

export function subscribeNexaHomeSpacing(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useNexaHomeSpacing(): NexaHomeSpacing {
  return useSyncExternalStore(subscribeNexaHomeSpacing, getNexaHomeSpacing, getNexaHomeSpacing);
}

export async function loadNexaHomeSpacingPreference(): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(NEXA_HOME_SPACING_STORAGE_KEY);
      if (stored != null) setNexaHomeSpacing(stored);
      return;
    }
  } catch { /* native storage path below */ }
  try {
    const SecureStore = await import('expo-secure-store');
    const stored = await SecureStore.getItemAsync(NEXA_HOME_SPACING_STORAGE_KEY);
    if (stored != null) setNexaHomeSpacing(stored);
  } catch { /* preference is optional; automatic safe-area spacing stays active */ }
}

export async function persistNexaHomeSpacingPreference(value: NexaHomeSpacing): Promise<void> {
  setNexaHomeSpacing(value);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(NEXA_HOME_SPACING_STORAGE_KEY, String(value));
      return;
    }
  } catch { /* native storage path below */ }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(NEXA_HOME_SPACING_STORAGE_KEY, String(value));
  } catch { /* in-memory preference is still active for this session */ }
}

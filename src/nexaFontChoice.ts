import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { DEFAULT_NEXA_FONT_CHOICE, normalizeNexaFontChoice, systemFamilyFor, type NexaFontChoice } from './nexaFontFamilies';

/**
 * Live font-type preference. Mirrors nexaTextScale.ts: it publishes the active family on globalThis
 * (`__NEXA_FONT_FAMILY__`, '' = bundled Inter) so theme.ts can stay dependency-free.
 */
let activeChoice: NexaFontChoice = DEFAULT_NEXA_FONT_CHOICE;
(globalThis as any).__NEXA_FONT_FAMILY__ = '';
const listeners = new Set<() => void>();

export function getNexaFontChoice(): NexaFontChoice { return activeChoice; }

export function setNexaFontChoice(value: unknown): NexaFontChoice {
  const next = normalizeNexaFontChoice(value);
  if (next === activeChoice) return next;
  activeChoice = next;
  (globalThis as any).__NEXA_FONT_FAMILY__ = systemFamilyFor(next, Platform.OS);
  listeners.forEach(fn => { try { fn(); } catch { /* one listener must not block the others */ } });
  return next;
}

export function subscribeNexaFontChoice(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useNexaFontChoice(): NexaFontChoice {
  return useSyncExternalStore(subscribeNexaFontChoice, getNexaFontChoice, getNexaFontChoice);
}

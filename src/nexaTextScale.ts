import { useSyncExternalStore } from 'react';

export type NexaTextScale = 1 | 1.15 | 1.3 | 1.45;
export const NEXA_TEXT_SCALES: readonly NexaTextScale[] = [1, 1.15, 1.3, 1.45];
export const NEXA_TEXT_SCALE_LABELS: Record<NexaTextScale, string> = {
  1: '100% Default',
  1.15: 'Large',
  1.3: 'Extra large',
  1.45: 'Maximum readable',
};
export const NEXA_TEXT_SCALE_STORAGE_KEY = 'nexa.text.scale';

let activeTextScale: NexaTextScale = 1;
(globalThis as any).__NEXA_TEXT_SCALE__ = 1;
const listeners = new Set<() => void>();

export function normalizeNexaTextScale(value: unknown): NexaTextScale {
  const n = Number(value);
  return NEXA_TEXT_SCALES.includes(n as NexaTextScale) ? n as NexaTextScale : 1;
}

export function getNexaTextScale(): NexaTextScale { return activeTextScale; }

export function setNexaTextScale(value: unknown): NexaTextScale {
  const next = normalizeNexaTextScale(value);
  if (next === activeTextScale) return next;
  activeTextScale = next;
  (globalThis as any).__NEXA_TEXT_SCALE__ = next;
  listeners.forEach(fn => { try { fn(); } catch { /* one listener must not block the others */ } });
  return next;
}

export function subscribeNexaTextScale(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function scaleTextStyle<T = any>(value: T): T {
  const scale = activeTextScale;
  if (scale === 1 || value == null) return value;
  const walk = (node: any): any => {
    if (node == null) return node;
    if (Array.isArray(node)) return node.map(walk);
    if (typeof node !== 'object') return node;
    const out: Record<string, any> = {};
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (typeof v === 'number' && (key === 'fontSize' || key === 'lineHeight' || key === 'letterSpacing')) {
        out[key] = Math.round(v * scale * 100) / 100;
      } else {
        out[key] = walk(v);
      }
    }
    return out;
  };
  return walk(value) as T;
}

export function useNexaTextScale(): NexaTextScale {
  return useSyncExternalStore(subscribeNexaTextScale, getNexaTextScale, getNexaTextScale);
}

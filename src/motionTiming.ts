// M4516: one shared timing scale for animation durations (milliseconds).
// Before this file, durations ran from 90 ms to 90 s with no scale. New animation code should pick a step from here
// instead of typing a raw number. Values below match what the app already used, so adopting a step never changes the look.
export const MOTION_MS = Object.freeze({
  /** No motion (reduced motion, or a reset). */
  instant: 0,
  /** Eye blink: close, then open. */
  blinkClose: 90,
  blinkOpen: 140,
  /** Avatar eye blink reopen duration (preserves the existing avatar animation). */
  avatarBlinkOpen: 120,
  /** Screen and card enter: basic, richer, richest (plan tiers). */
  enterBasic: 260,
  enterRich: 340,
  enterMax: 420,
  /** Smaller enter used by list items: basic, richer, richest. */
  itemBasic: 240,
  itemRich: 280,
  itemMax: 320,
  /** Side menu panel slide. */
  menu: 280,
  /** Short pulse and breathing loops. */
  pulse: 850,
  breathe: 1500,
});
export type MotionStep = keyof typeof MOTION_MS;
/** Plan level (30, 60, 100) to the enter step for screens and cards. */
export const enterMs = (level: number): number => (level >= 100 ? MOTION_MS.enterMax : level >= 60 ? MOTION_MS.enterRich : MOTION_MS.enterBasic);
/** Plan level (30, 60, 100) to the enter step for list items. */
export const itemEnterMs = (level: number): number => (level >= 100 ? MOTION_MS.itemMax : level >= 60 ? MOTION_MS.itemRich : MOTION_MS.itemBasic);

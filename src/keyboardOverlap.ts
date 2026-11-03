/**
 * M4506: how much of a box the keyboard covers, in window coordinates.
 * Zero when there is no keyboard, when the numbers are unusable, or when the window was already resized.
 */
export function keyboardOverlap(boxBottom: number, keyboardTop: number | null): number {
  if (keyboardTop == null || !Number.isFinite(boxBottom) || !Number.isFinite(keyboardTop)) return 0;
  return Math.max(0, Math.round(boxBottom - keyboardTop));
}

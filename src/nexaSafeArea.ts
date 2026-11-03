/**
 * M4508: safe-area numbers in one place (pure, no React) so the phone's own insets are used
 * instead of fixed pixel values. With no inset the results equal the old fixed values.
 */
export const TAB_BAR_BASE_HEIGHT = 76;
export const TAB_BAR_BASE_PADDING_BOTTOM = 9;
export const MENU_BASE_TOP_PADDING = 44;
export const ADD_SHEET_BASE_PADDING_BOTTOM = 24;

const clamp = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

export function tabBarMetrics(bottomInset: number | null | undefined) {
  const inset = clamp(bottomInset);
  return { height: TAB_BAR_BASE_HEIGHT + inset, paddingBottom: TAB_BAR_BASE_PADDING_BOTTOM + inset };
}

/** Side menu: never closer to the top than before, and always below the status bar / notch. */
export function menuTopPadding(topInset: number | null | undefined) {
  return Math.max(MENU_BASE_TOP_PADDING, clamp(topInset) + 12);
}

export function addSheetBottomPadding(bottomInset: number | null | undefined) {
  return ADD_SHEET_BASE_PADDING_BOTTOM + clamp(bottomInset);
}

/** Routes that sit inside the tab dock. The dock (or Home itself) already handles the bottom inset there. */
const TAB_ROOTS = new Set(['/', '/money', '/zeeza', '/marketplace', '/yaayz', '/leisure', '/profile', '/search']);

/**
 * Stack screens (wallet, staff, Dami, module sub-screens, auth...) have no dock, so they keep clear of the gesture bar.
 * Pass the path through normalizePath (nexaNavKeys.ts) first; this file stays free of imports so it is testable on its own.
 */
export function stackScreenNeedsBottomInset(normalizedPath: string | null | undefined) {
  return !TAB_ROOTS.has(String(normalizedPath || '/'));
}

export function stackBottomInset(normalizedPath: string | null | undefined, bottomInset: number | null | undefined) {
  return stackScreenNeedsBottomInset(normalizedPath) ? clamp(bottomInset) : 0;
}

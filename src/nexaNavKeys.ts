/**
 * NEXA Navigation Keys — pure logic (V5.19.0 / B55).
 *
 * Decides WHERE the global navigation keys (Back · Search · Home · Menu) appear
 * and what they say. No React / Expo imports so it stays unit-testable.
 * Destination resolution itself stays in `nexaNavigation.ts`.
 */

/** Routes that draw their own full-bleed chrome and must NOT get the global bar. */
const HIDDEN_EXACT = new Set(['', '/', '/index', '/(tabs)', '/(tabs)/index', '/dami']);
const HIDDEN_PREFIX = ['/auth', '/zeeza/call', '/zeeza/group-call', '/zeeza/share'];

export function normalizePath(pathname: string | null | undefined): string {
  const raw = String(pathname || '').trim();
  if (!raw) return '/';
  const noQuery = raw.split('?')[0].split('#')[0];
  const trimmed = noQuery.length > 1 ? noQuery.replace(/\/+$/, '') : noQuery;
  // Expo Router may expose the tab route group in pathname values. Route groups
  // are structural and must not change NEXA's navigation identity.
  const withoutTabsGroup = trimmed.replace(/^\/\(tabs\)(?=\/|$)/, '') || '/';
  return withoutTabsGroup;
}

/**
 * M4510: menu moves replace the previous menu hop instead of stacking, so Back does not walk through every menu stop.
 * `lastMenuHop` is the normalized path the menu last pushed to. If the user is still on it, the next menu move replaces it.
 */
export function menuMoveMode(currentPath: string | null | undefined, lastMenuHop: string | null | undefined) {
  if (!lastMenuHop) return 'push';
  return normalizePath(currentPath) === normalizePath(lastMenuHop) ? 'replace' : 'push';
}

export function navKeysVisible(pathname: string | null | undefined): boolean {
  const p = normalizePath(pathname);
  if (HIDDEN_EXACT.has(p)) return false;
  return !HIDDEN_PREFIX.some((prefix) => p === prefix || p.startsWith(prefix + '/'));
}

const TITLES: Array<[string, string]> = [
  ['/money', 'Sky Money'],
  ['/wallet', 'Sky Wallet'],
  ['/subscription', 'NEXA Membership'],
  ['/zeeza/profile', 'Zeeza Profile'],
  ['/zeeza/inbox', 'Zeeza Inbox'],
  ['/zeeza', 'Zeeza'],
  ['/marketplace/vendor', 'Vendor Dashboard'],
  ['/marketplace', 'Dream Marketplace'],
  ['/yaayz', 'Yaayz'],
  ['/leisure/ball-house', 'Ball House'],
  ['/leisure/kitchen', 'Kitchen'],
  ['/leisure/game-house', 'Game House'],
  ['/leisure/fitness', 'Fitness'],
  ['/leisure', 'L.A.'],
  ['/lifestyle', 'Lifestyle'],
  ['/search', 'Search'],
  ['/profile', 'Profile'],
  ['/extensions', 'Extensions'],
  ['/developer', 'Developer Console'],
  ['/staff', 'Staff'],
];

export function titleForPath(pathname: string | null | undefined): string {
  const raw = String(pathname || '').trim();
  const p = normalizePath(raw);
  const query = raw.split('?')[1]?.split('#')[0] || '';
  const params = new URLSearchParams(query);
  if (p === '/money' && params.get('view') === 'subscription') return 'NEXA Membership';
  for (const [prefix, title] of TITLES) {
    if (p === prefix || p.startsWith(prefix + '/')) return title;
  }
  return 'NEXA';
}

/** Directory item id that owns a pathname (used to highlight the active menu row). */
export function directoryIdForPath(pathname: string | null | undefined): string {
  const raw = String(pathname || '').trim();
  const p = normalizePath(raw);
  const query = raw.split('?')[1]?.split('#')[0] || '';
  const params = new URLSearchParams(query);
  if (p === '/money' && params.get('view') === 'subscription') return 'subscription';
  if (p === '/' || p === '/index' || p === '/(tabs)') return 'home';
  if (p === '/dami') return 'dami';
  if (p.startsWith('/leisure/ball-house')) return 'ball';
  if (p.startsWith('/leisure/kitchen')) return 'kitchen';
  if (p.startsWith('/leisure/game-house')) return 'game';
  if (p.startsWith('/leisure/fitness')) return 'fitness';
  if (p.startsWith('/leisure')) return 'leisure';
  if (p.startsWith('/lifestyle')) return 'zeeza';
  if (p.startsWith('/money') || p.startsWith('/wallet')) return 'money';
  if (p.startsWith('/zeeza')) return 'zeeza';
  if (p.startsWith('/marketplace/vendor')) return 'vendor';
  if (p.startsWith('/marketplace')) return 'marketplace';
  if (p.startsWith('/yaayz')) return 'yaayz';
  if (p.startsWith('/search')) return 'search';
  if (p.startsWith('/subscription')) return 'subscription';
  if (p.startsWith('/profile')) return 'profile';
  if (p.startsWith('/extensions')) return 'extensions';
  if (p.startsWith('/developer')) return 'developer';
  return '';
}

export type BackDecision = 'back' | 'home';

/** Back never dead-ends: with no history (deep link / push tap) it falls back to Home. */
export function decideBack(canGoBack: boolean): BackDecision {
  return canGoBack ? 'back' : 'home';
}

export const NAV_KEYS = Object.freeze(['back', 'search', 'home', 'menu'] as const);
export type NavKey = typeof NAV_KEYS[number];

/**
 * M4491: true only when the screen on show is the module's own root screen, so a menu row
 * does nothing there. On any sub-screen of the same module the row must still navigate.
 * `targetPathname` is the pathname of the row's navigation target (Home is '/').
 */
export function isOnModuleRoot(currentPathname: string | null | undefined, targetPathname: string | null | undefined): boolean {
  const cur = normalizePath(currentPathname);
  const tgt = normalizePath(targetPathname);
  const same = (a: string, b: string) => a === b || (a === '/' && b === '/index') || (a === '/index' && b === '/');
  return same(cur, tgt);
}

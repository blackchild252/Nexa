/** Active Expo Router route inventory used by navigation regression contracts. */
export const NEXA_ROUTE_INVENTORY = Object.freeze([
  '/(tabs)', '/(tabs)/zeeza', '/(tabs)/money', '/(tabs)/marketplace', '/(tabs)/yaayz', '/(tabs)/leisure',
  '/(tabs)/search', '/(tabs)/profile', '/auth/login', '/auth/signup', '/onboarding', '/auth/recover', '/auth/verify-email', '/auth/google-callback', '/dami',
  '/wallet', '/subscription', '/help', '/marketplace/vendor', '/marketplace/disputes', '/zeeza/call', '/zeeza/group-call',
  '/zeeza/inbox', '/zeeza/activation-code', '/zeeza/profile', '/extensions', '/developer', '/staff', '/admin/zeeza-referrals', '/leisure/ball-house',
  '/leisure/fitness', '/leisure/game-house', '/leisure/kitchen', '/lifestyle', '/verification', '/identity-verification', '/central-reports',
  '/leisure/kitchen/ref/[code]', '/zeeza/share/[token]',
] as const);

export const USER_VENDOR_DIRECTORY = Object.freeze(['home','zeeza','money','marketplace','vendor','yaayz','leisure','profile','subscription'] as const);
export const NAVIGATION_QUICK_ACCESS = Object.freeze(['search','add','home','menu'] as const);


/** B361: validates that a canonical route target belongs to the known route inventory. */
export function isKnownNexaRoute(pathname: string): boolean {
  const value = String(pathname || '').trim();
  if (!value) return false;
  return NEXA_ROUTE_INVENTORY.some((route) => {
    const pattern = '^' + route
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\[.*?\\\]/g, '[^/]+') + '$';
    return new RegExp(pattern).test(value);
  });
}

// Standalone customer-care Help route.
const NEXA_HELP_ROUTE = '/help';

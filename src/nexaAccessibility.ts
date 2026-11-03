/** Canonical NEXA navigation accessibility labels.
 * Visible labels, directory semantics and screen-reader labels consume this
 * authority so they cannot drift independently.
 */
export const NEXA_NAV_LABELS = Object.freeze({
  home: 'Home',
  dami: 'Dami',
  zeeza: 'Zeeza',
  money: 'Sky Money',
  marketplace: 'Dream Marketplace',
  vendor: 'Business Hub',
  yaayz: 'Yaayz',
  leisure: 'L.A.',
  ball: 'Ball House',
  kitchen: 'Kitchen',
  game: 'Game House',
  fitness: 'Fitness',
  notifications: 'Notifications',
  search: 'Search',
  subscription: 'NEXA Membership',
  profile: 'Profile',
  extensions: 'Extensions',
  developer: 'Developer Console',
} as const);

export type NexaNavigationLabelId = keyof typeof NEXA_NAV_LABELS;

export function navigationAccessibilityLabel(id: string): string {
  return NEXA_NAV_LABELS[id as NexaNavigationLabelId] || 'NEXA destination';
}

export const NEXA_QUICK_ACCESS_LABELS = Object.freeze({
  search: 'Search NEXA',
  add: 'Open NEXA Add actions',
  home: 'NEXA Home',
  menu: 'Open NEXA directory',
} as const);

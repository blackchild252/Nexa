/** Canonical public NEXA names. Internal route/API identifiers remain backward-compatible. */
export const NEXA_LOGO = require('../assets/branding/nexa-logo.png');

export const BRAND = {
  app: 'NEXA',
  assistant: 'Dami',
  money: 'Sky Money',
  wallet: 'Sky Wallet',
  savings: 'Sky Savings',
  groupSavings: 'Sky Group Savings',
  storeSavings: 'Sky Store Savings',
  marketWatch: 'Sky Market Watch',
  insights: 'Sky Insights',
  marketplace: 'Dream Marketplace',
  zeeza: 'Zeeza',
  yaayz: 'Yaayz',
  leisure: 'L.A.',
  lifestyle: 'Lifestyle',
  profile: 'Profile',
} as const;

// Compatibility note: legacy IDs such as `money`, `ajo`, `groups`, `/api/money/...`
// are intentionally retained internally so existing data and links keep working.

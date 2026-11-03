/**
 * NEXA Subscription Centre structural authority.
 *
 * The Centre is presented inside Sky Money. The legacy /subscription route is
 * compatibility-only and must not become a second subscription implementation.
 */
export const SUBSCRIPTION_CENTRE_RELEASE = '6.2.54';

export const SUBSCRIPTION_CENTRE_CANONICAL_TARGET = Object.freeze({
  pathname: '/(tabs)/money',
  params: { view: 'subscription' },
} as const);

/** Canonical presentation metadata for every Subscription Centre section.
 * IDs are structural authorities; labels and accessibility labels must not drift
 * into separate route or component-local definitions.
 */
export const SUBSCRIPTION_CENTRE_SECTIONS = Object.freeze([
  { id: 'account-access', label: 'ACCOUNT & ACCESS', accessibilityLabel: 'Subscription Centre account and vendor membership section' },
  { id: 'rewards-economy', label: 'REWARDS & ECONOMY', accessibilityLabel: 'Subscription Centre rewards and Aami economy section' },
  { id: 'current-plan-billing', label: 'CURRENT PLAN & BILLING', accessibilityLabel: 'Subscription Centre current plan and billing section' },
  { id: 'spending-cap', label: 'SPENDING & CAP', accessibilityLabel: 'Subscription Centre spending and cap section' },
  { id: 'membership-plans', label: 'MEMBERSHIP PLANS', accessibilityLabel: 'Subscription Centre membership plans section' },
  { id: 'service-fees', label: 'SERVICE FEES', accessibilityLabel: 'Subscription Centre transparent service fees section' },
  { id: 'experience', label: 'EXPERIENCE', accessibilityLabel: 'Subscription Centre experience section' },
] as const);

export type SubscriptionCentreSectionId = typeof SUBSCRIPTION_CENTRE_SECTIONS[number]['id'];

/** Category order is derived from the canonical section definitions; it cannot drift separately. */
export const SUBSCRIPTION_CENTRE_CATEGORIES: ReadonlyArray<SubscriptionCentreSectionId> = Object.freeze(
  SUBSCRIPTION_CENTRE_SECTIONS.map(section => section.id)
);

const SUBSCRIPTION_CENTRE_SECTION_BY_ID = Object.freeze(
  Object.fromEntries(SUBSCRIPTION_CENTRE_SECTIONS.map(section => [section.id, section])) as Record<SubscriptionCentreSectionId, typeof SUBSCRIPTION_CENTRE_SECTIONS[number]>
);

/** Resolve a section by stable ID so presentation order can change without silently relabeling content. */
export function subscriptionCentreSection(id: SubscriptionCentreSectionId) {
  return SUBSCRIPTION_CENTRE_SECTION_BY_ID[id];
}

export const SUBSCRIPTION_SERVICE_FEES = Object.freeze([
  { label: 'Wallet transfer', code: 'wallet_transfer' },
  { label: 'Wallet withdrawal', code: 'wallet_withdrawal' },
  { label: 'Sky Savings contribution', code: 'ajo_contribution' },
  { label: 'Dream Marketplace service', code: 'marketplace_service' },
  { label: 'Yaayz service', code: 'yaayz_service' },
  { label: 'Kitchen service', code: 'kitchen_service' },
  { label: 'Zeeza premium action', code: 'zeeza_premium_action' },
  { label: 'Dami enhanced action', code: 'dami_enhanced_action' },
  { label: 'Extension service', code: 'extension_service' },
] as const);

export type SubscriptionServiceFeeCode = typeof SUBSCRIPTION_SERVICE_FEES[number]['code'];

const SUBSCRIPTION_SERVICE_FEE_BY_CODE = Object.freeze(
  Object.fromEntries(SUBSCRIPTION_SERVICE_FEES.map(fee => [fee.code, fee])) as Record<SubscriptionServiceFeeCode, typeof SUBSCRIPTION_SERVICE_FEES[number]>
);

/** Resolve a service-fee definition by its stable server-facing code. */
export function subscriptionServiceFee(code: SubscriptionServiceFeeCode) {
  return SUBSCRIPTION_SERVICE_FEE_BY_CODE[code];
}

export const SUBSCRIPTION_CENTRE_POLICY = Object.freeze({
  canonicalRoute: '/(tabs)/money?view=subscription',
  canonicalTarget: SUBSCRIPTION_CENTRE_CANONICAL_TARGET,
  compatibilityRoute: '/subscription',
  presentationOwner: 'Sky Money',
  categoryOrder: SUBSCRIPTION_CENTRE_CATEGORIES,
  serviceFees: SUBSCRIPTION_SERVICE_FEES,
  vendorMembershipIsSeparate: true,
  aamiIsSeparateFromSkyWalletCash: true,
} as const);

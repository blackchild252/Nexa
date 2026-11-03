// Web stand-in: Google's consent SDK only exists in the mobile app.
// Metro picks this file instead of adConsent.ts for web builds, so the native-only
// `react-native-google-mobile-ads` module is never bundled for web (same pattern as YaayzNativeAd.web.tsx).
export type AdConsentReadiness = {
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
  status: string;
};

const WEB_READINESS: AdConsentReadiness = { canRequestAds: false, privacyOptionsRequired: false, status: 'NOT_APPLICABLE' };

export async function prepareAdConsent(): Promise<AdConsentReadiness> { return WEB_READINESS; }
export async function getAdConsentInfo(): Promise<AdConsentReadiness> { return WEB_READINESS; }
export async function showAdPrivacyOptions(): Promise<AdConsentReadiness> { return WEB_READINESS; }

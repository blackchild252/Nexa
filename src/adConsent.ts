import { AdsConsent } from 'react-native-google-mobile-ads';

export type AdConsentReadiness = {
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
  status: string;
};

function normalize(info: any): AdConsentReadiness {
  return {
    canRequestAds: Boolean(info?.canRequestAds),
    privacyOptionsRequired: String(info?.privacyOptionsRequirementStatus || '').toUpperCase() === 'REQUIRED',
    status: String(info?.status || 'UNKNOWN').toUpperCase(),
  };
}

export async function prepareAdConsent(): Promise<AdConsentReadiness> {
  let info: any;
  try {
    info = await AdsConsent.requestInfoUpdate();
    info = await AdsConsent.loadAndShowConsentFormIfRequired();
  } catch {
    try { info = await AdsConsent.getConsentInfo(); } catch { info = undefined; }
  }
  return normalize(info);
}

export async function getAdConsentInfo(): Promise<AdConsentReadiness> {
  try { return normalize(await AdsConsent.getConsentInfo()); } catch { return { canRequestAds: false, privacyOptionsRequired: false, status: 'UNKNOWN' }; }
}

export async function showAdPrivacyOptions(): Promise<AdConsentReadiness> {
  const current = await getAdConsentInfo();
  if (!current.privacyOptionsRequired) return current;
  try { return normalize(await AdsConsent.showPrivacyOptionsForm()); } catch { return current; }
}

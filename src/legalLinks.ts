import { validateExternalUrl } from './safeExternalNavigation';

// Store-required legal pages. The URLs are supplied per build (EAS environment variables) so the
// published policy host can change without a code release. Expo only inlines direct
// `process.env.EXPO_PUBLIC_*` references, so each variable is read literally.
const PRIVACY_URL = String(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || '').trim();
const TERMS_URL = String(process.env.EXPO_PUBLIC_TERMS_URL || '').trim();

export type LegalLink = { id: 'privacy' | 'terms'; label: string; url: string | null };

function checked(url: string): string | null {
  const result = validateExternalUrl(url);
  return result.ok ? result.url : null;
}

export const LEGAL_LINKS: LegalLink[] = [
  { id: 'privacy', label: 'Privacy Policy', url: checked(PRIVACY_URL) },
  { id: 'terms', label: 'Terms of Service', url: checked(TERMS_URL) },
];

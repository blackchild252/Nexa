import { NEXA_FONT_CHOICE_STORAGE_KEY, normalizeNexaFontChoice, type NexaFontChoice } from './nexaFontFamilies';
import { setNexaFontChoice } from './nexaFontChoice';
import { NEXA_TEXT_SCALE_STORAGE_KEY, normalizeNexaTextScale, setNexaTextScale, type NexaTextScale } from './nexaTextScale';

/** Device-only reading preferences (text size + font type): read at start-up, saved on change. */
async function readStored(key: string): Promise<string | null> {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  } catch { /* native storage path below */ }
  try {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(key);
  } catch { return null; }
}

async function writeStored(key: string, value: string): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') { localStorage.setItem(key, value); return; }
  } catch { /* native storage path below */ }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(key, value);
  } catch { /* the choice still applies for this session */ }
}

/** Restore the saved text size and font type before the first screen is shown. */
export async function loadNexaTypographyPreferences(): Promise<void> {
  const [scale, font] = await Promise.all([readStored(NEXA_TEXT_SCALE_STORAGE_KEY), readStored(NEXA_FONT_CHOICE_STORAGE_KEY)]);
  if (scale != null) setNexaTextScale(scale);
  if (font != null) setNexaFontChoice(font);
}

export async function persistNexaFontChoice(value: NexaFontChoice): Promise<void> {
  const next = setNexaFontChoice(value);
  await writeStored(NEXA_FONT_CHOICE_STORAGE_KEY, normalizeNexaFontChoice(next));
}

export async function persistNexaTextScale(value: NexaTextScale): Promise<void> {
  const next = setNexaTextScale(value);
  await writeStored(NEXA_TEXT_SCALE_STORAGE_KEY, String(normalizeNexaTextScale(next)));
}

/** Back to the standard NEXA reading setup: Standard size + NEXA Inter. */
export async function resetNexaTypographyPreferences(): Promise<void> {
  await persistNexaTextScale(1);
  await persistNexaFontChoice('inter');
}

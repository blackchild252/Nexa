/**
 * NEXA font-type authority (pure logic, no React Native imports).
 *
 * Four reading fonts are offered. "inter" is the bundled NEXA font and the default.
 * The other three use fonts already installed on the phone, so nothing extra is downloaded.
 */
export type NexaFontChoice = 'inter' | 'system' | 'serif' | 'mono';
export const NEXA_FONT_CHOICES: readonly NexaFontChoice[] = ['inter', 'system', 'serif', 'mono'];
export const DEFAULT_NEXA_FONT_CHOICE: NexaFontChoice = 'inter';
export const NEXA_FONT_CHOICE_STORAGE_KEY = 'nexa.font.choice';
export const NEXA_FONT_CHOICE_LABELS: Record<NexaFontChoice, string> = {
  inter: 'NEXA Inter',
  system: 'Phone default',
  serif: 'Classic serif',
  mono: 'Typewriter',
};
export const NEXA_FONT_CHOICE_NOTES: Record<NexaFontChoice, string> = {
  inter: 'Clean modern sans-serif (standard)',
  system: 'The font your phone normally uses',
  serif: 'Book-style letters with small feet',
  mono: 'Every letter the same width',
};

export function normalizeNexaFontChoice(value: unknown): NexaFontChoice {
  return NEXA_FONT_CHOICES.includes(value as NexaFontChoice) ? (value as NexaFontChoice) : DEFAULT_NEXA_FONT_CHOICE;
}

/** Concrete family for a choice on a platform. Returns '' for the bundled Inter (no remap). */
export function systemFamilyFor(choice: NexaFontChoice, os: string): string {
  if (choice === 'inter') return '';
  if (os === 'android') return choice === 'serif' ? 'serif' : choice === 'mono' ? 'monospace' : 'sans-serif';
  if (os === 'ios') return choice === 'serif' ? 'Georgia' : choice === 'mono' ? 'Menlo' : 'System';
  return choice === 'serif' ? 'Georgia, serif' : choice === 'mono' ? 'Menlo, Consolas, monospace' : 'system-ui, sans-serif';
}

/** Weight that each bundled Inter file stands for (used when a remapped style has no fontWeight). */
export const NEXA_INTER_WEIGHTS: Record<string, '400' | '500' | '600' | '700' | '800' | '900'> = Object.freeze({
  'NexaInter-Regular': '400',
  'NexaInter-Medium': '500',
  'NexaInter-SemiBold': '600',
  'NexaInter-Bold': '700',
  'NexaInter-ExtraBold': '800',
  'NexaInter-Black': '900',
});

const INTER_BY_WEIGHT: Record<string, string> = {
  '100': 'NexaInter-Regular', '200': 'NexaInter-Regular', '300': 'NexaInter-Regular', '400': 'NexaInter-Regular', normal: 'NexaInter-Regular',
  '500': 'NexaInter-Medium', '600': 'NexaInter-SemiBold', '700': 'NexaInter-Bold', bold: 'NexaInter-Bold',
  '800': 'NexaInter-ExtraBold', '900': 'NexaInter-Black',
};

/**
 * Default-font authority for ALL text. Most NEXA screens never set a fontFamily, so Android showed its
 * own system font there while other screens showed Inter. This resolves the family for any text style:
 *  - an explicit non-NEXA family (e.g. an intentional monospace) is left alone;
 *  - no family, or a NexaInter-* family, becomes the user's chosen font (NEXA Inter by default).
 * `chosenFamily` is '' for bundled Inter, otherwise the system family from systemFamilyFor().
 */
export function resolveNexaTextStyle(style: Record<string, any> | undefined | null, chosenFamily: string): Record<string, any> | null {
  const s = style || {};
  const fam = s.fontFamily as string | undefined;
  const isInter = typeof fam === 'string' && fam.startsWith('NexaInter-');
  if (fam && !isInter) return null; // explicit custom family: do not touch
  const weight = s.fontWeight == null ? undefined : String(s.fontWeight);
  if (chosenFamily) {
    const w = weight ?? (isInter ? NEXA_INTER_WEIGHTS[fam as string] : undefined);
    return w ? { fontFamily: chosenFamily, fontWeight: w } : { fontFamily: chosenFamily };
  }
  if (isInter) return null; // already the right bundled file
  return { fontFamily: INTER_BY_WEIGHT[weight ?? '400'] || 'NexaInter-Regular', fontWeight: 'normal' };
}

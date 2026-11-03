/**
 * NEXA font-family authority.
 *
 * Kept dependency-free so both the visual theme and React Native typography
 * helpers consume exactly the same font-family tokens without duplicating them.
 */
export const NEXA_FONTS = Object.freeze({
  regular: 'NexaInter-Regular',
  medium: 'NexaInter-Medium',
  semibold: 'NexaInter-SemiBold',
  bold: 'NexaInter-Bold',
  extraBold: 'NexaInter-ExtraBold',
  black: 'NexaInter-Black',
});

export type NexaFontWeight = keyof typeof NEXA_FONTS;

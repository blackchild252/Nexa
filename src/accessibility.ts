export const ACCESSIBILITY = {
  minTouchTarget: 44,
  recommendedTouchTarget: 48,
  maxTextScaleLayoutRisk: 1.3,
  maxSupportedTextScale: 1.45,
  focusRingWidth: 2,
  contrastMode: 'ivory-on-royal-dark',
} as const;

export function buttonA11y(label: string) {
  return { accessibilityRole: 'button' as const, accessibilityLabel: label };
}

export function selectedA11y(label: string, selected: boolean) {
  return { accessibilityRole: 'tab' as const, accessibilityLabel: label, accessibilityState: { selected } };
}

export { imageA11y, decorativeImageA11y } from './imageAccessibility';


export const DEVICE_CERTIFICATION = {
  required: ['touch-targets', 'text-scaling', 'screen-reader-labels', 'keyboard-focus'],
  minimumTouchTarget: 44,
  recommendedTouchTarget: 48,
  maxLayoutRiskScale: 1.3,
} as const;

export function accessibilityCertification(input: Partial<Record<typeof DEVICE_CERTIFICATION.required[number], boolean>> = {}) {
  const missing = DEVICE_CERTIFICATION.required.filter((key) => input[key] !== true);
  return { certified: missing.length === 0, missing };
}

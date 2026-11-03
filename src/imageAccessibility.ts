export function imageA11y(label: string) {
  return { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label };
}

export function decorativeImageA11y() {
  return { accessible: false };
}

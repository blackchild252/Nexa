/** NEXA WCAG contrast utilities — dependency-free and unit-testable. */

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex) {
  const raw = String(hex || '').replace('#', '').trim();
  const expanded = raw.length === 3 ? raw.split('').map(x => x + x).join('') : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) throw new Error(`Unsupported color: ${hex}`);
  const rgb = [0, 2, 4].map(i => parseInt(expanded.slice(i, i + 2), 16));
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export function minimumContrast(requirement) {
  return requirement === 'body' ? 4.5 : 3;
}

export function meetsContrast(foreground, background, requirement = 'body') {
  return contrastRatio(foreground, background) >= minimumContrast(requirement);
}

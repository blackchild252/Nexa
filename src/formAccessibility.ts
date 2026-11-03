export function fieldA11y(label: string, error?: unknown) {
  return {
    accessibilityLabel: label,
    accessibilityState: error ? { invalid: true } : undefined,
    'aria-label': label,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${slug(label)}-error` : undefined,
  };
}

export function errorA11y(label: string, message: string) {
  return {
    nativeID: `${slug(label)}-error`,
    accessibilityRole: 'alert',
    accessibilityLiveRegion: 'assertive',
    'aria-live': 'assertive',
    'aria-atomic': true,
    accessibilityLabel: `${label} error: ${message}`,
  };
}

export function formSubmitA11y(label: string, busy = false) {
  return {
    accessibilityRole: 'button',
    accessibilityLabel: busy ? `${label}, submitting` : label,
    accessibilityState: { disabled: busy, busy },
    'aria-busy': busy,
  };
}

function slug(value: unknown) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'field';
}

/** Shared modal/dialog accessibility contract for native and web surfaces. */
export function modalA11y(label: string, description?: string) {
  return {
    accessible: true,
    accessibilityViewIsModal: true,
    importantForAccessibility: 'yes' as const,
    accessibilityLabel: label,
    'aria-modal': true,
    ...(description ? { 'aria-describedby': description } : {}),
  };
}

/** A backdrop must not become an extra screen-reader destination. */
export function modalBackdropA11y() {
  return {
    accessible: false,
    importantForAccessibility: 'no-hide-descendants' as const,
    'aria-hidden': true,
  };
}

/** Consistent accessible intent for modal dismissal controls. */
export function modalCloseA11y(label = 'Close dialog') {
  return {
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    accessibilityHint: 'Close this dialog and return to the previous screen',
    'aria-label': label,
  };
}

export const NEXA_MODAL_ACCESSIBILITY_CONTRACT = Object.freeze({
  modalContextIsExplicit: true,
  modalSurfaceIsIsolated: true,
  backdropIsHidden: true,
  closeIntentIsExplicit: true,
  existingOnRequestClosePreserved: true,
  visualLayoutPreserved: true,
});

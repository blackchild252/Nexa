import { useEffect, useRef, type RefObject } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform } from 'react-native';

/**
 * Shared modal focus lifecycle: move focus into the active dialog, keep web
 * keyboard traversal inside it, and restore the previously focused element.
 * Native Modal already provides platform isolation; this adds the missing
 * deterministic focus lifecycle without changing modal/navigation authority.
 */
export function useModalFocus(open: boolean, surfaceRef: RefObject<any>) {
  const previousWebFocus = useRef<any>(null);

  useEffect(() => {
    if (!open) return;

    if (Platform.OS === 'web') {
      const doc = (globalThis as any).document;
      previousWebFocus.current = doc?.activeElement ?? null;
      const surface = surfaceRef.current;
      surface?.focus?.();

      const onKeyDown = (event: any) => {
        if (event.key !== 'Tab') return;
        const root = surfaceRef.current;
        if (!root?.querySelectorAll) return;
        const nodes = Array.from(root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))
          .filter((node: any) => !node.disabled && node.getAttribute?.('aria-hidden') !== 'true');
        if (!nodes.length) {
          event.preventDefault();
          root.focus?.();
          return;
        }
        const first = nodes[0] as any;
        const last = nodes[nodes.length - 1] as any;
        if (event.shiftKey && doc.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && doc.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      surface?.addEventListener?.('keydown', onKeyDown);
      return () => {
        surface?.removeEventListener?.('keydown', onKeyDown);
        previousWebFocus.current?.focus?.();
        previousWebFocus.current = null;
      };
    }

    const node = findNodeHandle(surfaceRef.current);
    if (node != null) {
      const timer = setTimeout(() => AccessibilityInfo.setAccessibilityFocus(node), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, surfaceRef]);
}

export const NEXA_MODAL_FOCUS_CONTRACT = Object.freeze({
  focusEntersDialog: true,
  webTabTraversalContained: true,
  nativeAccessibilityFocusRequested: true,
  previousWebFocusRestored: true,
  existingModalAuthorityPreserved: true,
});

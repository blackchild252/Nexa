/** Canonical client-side consequential-action guard. Prevents double submits
 * before React has a chance to re-render a disabled control. Business logic
 * and server idempotency remain the authoritative safety boundaries. */
export type NexaInteractionGuard = {
  tryBegin: (key: string) => boolean;
  end: (key?: string) => void;
  isActive: (key?: string) => boolean;
  activeKey: () => string | null;
};

export function createNexaInteractionGuard(): NexaInteractionGuard {
  let active: string | null = null;
  return {
    tryBegin(key) {
      if (active) return false;
      active = String(key || 'action');
      return true;
    },
    end(key) {
      if (key == null || active === key) active = null;
    },
    isActive(key) {
      return key == null ? active !== null : active === key;
    },
    activeKey() {
      return active;
    },
  };
}

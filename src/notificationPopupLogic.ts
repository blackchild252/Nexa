// Pure rules for the in-app notification popup. No imports, so tests can run it directly.
export const POPUP_FRESH_MS = 3 * 60 * 1000;
export const POPUP_QUEUE_MAX = 100;

// A notification is fresh when its timestamp is valid, not in the future, and less than three minutes old.
export function recentEnough(iso: unknown, nowMs: number = Date.now()): boolean {
  if (typeof iso !== 'string' || iso.length === 0) return false;
  const created = Date.parse(iso);
  if (!Number.isFinite(created) || !Number.isFinite(nowMs)) return false;
  const age = nowMs - created;
  return age >= 0 && age < POPUP_FRESH_MS;
}

// Take the next queued item that is still fresh. Items that waited too long behind a burst are dropped.
export function takeNextFresh<T extends { createdAt: string }>(queue: T[], nowMs: number = Date.now()): T | undefined {
  while (queue.length) {
    const next = queue.shift() as T;
    if (recentEnough(next.createdAt, nowMs)) return next;
  }
  return undefined;
}

import { AppState, AppStateStatus } from 'react-native';

export const NEXA_AUTO_REFRESH_INTERVAL_MS = 30_000;
export const NEXA_AUTO_REFRESH_MIN_INTERVAL_MS = 5_000;
export const NEXA_AUTO_REFRESH_STAGGER_MS = 50;
export const NEXA_AUTO_REFRESH_MAX_FAILURE_BACKOFF_MS = 120_000;

type Listener = (reason: 'interval' | 'foreground') => void | Promise<void>;

let installed = false;
let timer: ReturnType<typeof setInterval> | null = null;
let active = AppState.currentState === 'active';
let lastEmitAt = 0;
let listeners = new Set<Listener>();
let pending = new Set<Listener>();
let failures = new Map<Listener, number>();
let nextAllowedAt = new Map<Listener, number>();
let previousState: AppStateStatus = AppState.currentState;

function emit(reason: 'interval' | 'foreground') {
  if (!active) return;
  const now = Date.now();
  if (now - lastEmitAt < NEXA_AUTO_REFRESH_MIN_INTERVAL_MS) return;
  lastEmitAt = now;
  Array.from(listeners).forEach((listener, index) => {
    if (pending.has(listener) || now < (nextAllowedAt.get(listener) || 0)) return;
    pending.add(listener);
    const run = () => {
      try {
        Promise.resolve(listener(reason))
          .then(() => { failures.delete(listener); nextAllowedAt.delete(listener); })
          .catch(() => {
            const count = (failures.get(listener) || 0) + 1;
            failures.set(listener, count);
            const backoff = Math.min(NEXA_AUTO_REFRESH_MAX_FAILURE_BACKOFF_MS, NEXA_AUTO_REFRESH_MIN_INTERVAL_MS * (2 ** Math.min(count - 1, 5)));
            nextAllowedAt.set(listener, Date.now() + backoff);
          })
          .finally(() => pending.delete(listener));
      } catch {
        const count = (failures.get(listener) || 0) + 1;
        failures.set(listener, count);
        nextAllowedAt.set(listener, Date.now() + NEXA_AUTO_REFRESH_MIN_INTERVAL_MS);
        pending.delete(listener);
      }
    };
    if (index === 0) run(); else setTimeout(run, index * NEXA_AUTO_REFRESH_STAGGER_MS);
  });
}

function install() {
  if (installed) return;
  installed = true;
  const subscription = AppState.addEventListener('change', (next) => {
    const wasBackground = previousState !== 'active' && next === 'active';
    previousState = next;
    active = next === 'active';
    if (wasBackground) emit('foreground');
  });
  timer = setInterval(() => emit('interval'), NEXA_AUTO_REFRESH_INTERVAL_MS);
  // Keep the native subscription alive for the application lifetime. The coordinator itself is
  // intentionally process-wide so screens can mount/unmount without creating competing timers.
  void subscription;
}

export function subscribeNexaAutoRefresh(listener: Listener, enabled = true) {
  install();
  if (!enabled) return () => {};
  listeners.add(listener);
  return () => { listeners.delete(listener); pending.delete(listener); };
}

export function isNexaAutoRefreshActive() { return active; }
export function nexAutoRefreshSubscriberCount() { return listeners.size; }

export function __resetNexaAutoRefreshForTests() {
  listeners = new Set();
  pending = new Set();
  failures = new Map();
  nextAllowedAt = new Map();
  lastEmitAt = 0;
  active = true;
  previousState = 'active';
  if (timer) clearInterval(timer);
  timer = null;
  installed = false;
}

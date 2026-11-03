/**
 * M4512: pauses ambient animation loops while the app is in the background and restarts them on return.
 * Pure (no React Native import) so it can be tested alone. The glue that plugs it into Animated.loop is
 * src/nexaAppStatePause.ts.
 *
 * A stopped JS-driven Animated.loop cannot be started again, so on return a fresh loop is built from the
 * same animation and config.
 */
export type LoopLike = {
  start: (cb?: (r: { finished: boolean }) => void) => void;
  stop: () => void;
  reset: () => void;
  [key: string]: any;
};

type Entry = { inner: LoopLike; anim: any; config: any; cb?: (r: { finished: boolean }) => void; started: boolean; paused: boolean };

export function createLoopRegistry(makeLoop: (anim: any, config?: any) => LoopLike) {
  const entries = new Set<Entry>();
  let active = true;

  const run = (e: Entry) => {
    e.inner.start((r) => {
      if (e.paused) return; // stopped by the pause, not finished
      e.started = false;
      entries.delete(e);
      if (e.cb) e.cb(r);
    });
  };

  function create(anim: any, config?: any): LoopLike {
    const e: Entry = { inner: makeLoop(anim, config), anim, config, started: false, paused: false };
    return {
      start(cb) {
        e.cb = cb;
        e.started = true;
        entries.add(e);
        if (!active) { e.paused = true; return; }
        e.paused = false;
        run(e);
      },
      stop() {
        e.started = false;
        e.paused = false;
        entries.delete(e);
        e.inner.stop();
      },
      reset() { e.inner.reset(); },
      _startNativeLoop(...args: any[]) { return e.inner._startNativeLoop ? e.inner._startNativeLoop(...args) : undefined; },
      _isUsingNativeDriver() { return e.inner._isUsingNativeDriver ? !!e.inner._isUsingNativeDriver() : false; },
    } as LoopLike;
  }

  function setActive(next: boolean) {
    if (next === active) return;
    active = next;
    entries.forEach((e) => {
      if (!e.started) return;
      if (!next && !e.paused) { e.paused = true; e.inner.stop(); }
      else if (next && e.paused) { e.paused = false; e.inner = makeLoop(e.anim, e.config); run(e); }
    });
  }

  return { create, setActive, isActive: () => active, size: () => entries.size };
}

/** Only 'background' pauses and only 'active' resumes; brief 'inactive' states (shade, system dialogs) change nothing. */
export function appStateToActive(state: string | null | undefined, current: boolean): boolean {
  if (state === 'background') return false;
  if (state === 'active') return true;
  return current;
}

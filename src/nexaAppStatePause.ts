import { Animated, AppState } from 'react-native';
import { appStateToActive, createLoopRegistry } from './nexaLoopRegistry';

/** M4512: every Animated.loop in the app (world backgrounds, pulses) pauses in the background and resumes on return. */
let installed = false;
export function installAppStatePause() {
  if (installed) return;
  try {
    const original = Animated.loop.bind(Animated);
    const registry = createLoopRegistry((anim, config) => original(anim, config) as any);
    (Animated as any).loop = (anim: any, config?: any) => registry.create(anim, config);
    registry.setActive(appStateToActive(AppState.currentState, true));
    AppState.addEventListener('change', (state) => registry.setActive(appStateToActive(state, registry.isActive())));
    installed = true;
  } catch { /* if Animated cannot be patched on this build, loops simply keep their old behaviour */ }
}
installAppStatePause();

// V5.54.3 — react-native-web's Alert.alert is a silent no-op, so on web every error, confirmation and
// destructive-action prompt (133 call sites) showed nothing. This installs a browser-dialog implementation.
// Native builds are untouched (the install is skipped unless Platform.OS === 'web').
import { Alert, Platform } from 'react-native';

type AlertButton = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: (value?: string) => void };

export function webAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  env: { alert?: (m: string) => void; confirm?: (m: string) => boolean } = (typeof window !== 'undefined' ? (window as any) : {}),
) {
  const text = [title, message].filter((part) => part && String(part).trim()).join('\n\n');
  const list = Array.isArray(buttons) ? buttons : [];
  const cancel = list.find((b) => b.style === 'cancel');
  const actions = list.filter((b) => b !== cancel);
  try {
    if (list.length <= 1 || !env.confirm) {
      env.alert?.(text);
      list[0]?.onPress?.();
      return;
    }
    // A browser confirm() has two outcomes: OK runs the first non-cancel button, Cancel runs the cancel button.
    const ok = env.confirm(text);
    const chosen = ok ? actions[0] : (cancel || undefined);
    chosen?.onPress?.();
  } catch {
    // A dialog failure must never break the calling screen.
  }
}

export function installWebAlertShim(platform: string = Platform.OS) {
  if (platform !== 'web') return false;
  (Alert as any).alert = (title: string, message?: string, buttons?: AlertButton[]) => webAlert(title, message, buttons);
  return true;
}

installWebAlertShim();

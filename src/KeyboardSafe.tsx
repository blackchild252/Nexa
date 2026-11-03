import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, StyleProp, View, ViewStyle } from 'react-native';
import { keyboardOverlap } from './keyboardOverlap';

/**
 * M4506: keeps text inputs visible above the keyboard on screens that had no keyboard handling.
 *
 * It pads the bottom of its own box by exactly the part of the box the keyboard covers (measured in
 * window coordinates), so it needs no tab-bar or header offset. If the system already resized the
 * window, or a screen inside has its own keyboard handling, the covered part is zero and nothing is
 * added. On web it is a plain View.
 */
export function KeyboardSafe({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<View>(null);
  const keyboardTop = useRef<number | null>(null);
  const [pad, setPad] = useState(0);

  const recompute = useCallback(() => {
    if (keyboardTop.current == null) { setPad(0); return; }
    const node = ref.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((_x, y, _w, h) => setPad(keyboardOverlap(y + h, keyboardTop.current)));
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e: KeyboardEvent) => {
      keyboardTop.current = e?.endCoordinates?.screenY ?? null;
      recompute();
    });
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      keyboardTop.current = null;
      setPad(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, [recompute]);

  if (Platform.OS === 'web') return <View style={style}>{children}</View>;
  return <View ref={ref} collapsable={false} onLayout={recompute} style={[style, pad > 0 ? { paddingBottom: pad } : null]}>{children}</View>;
}

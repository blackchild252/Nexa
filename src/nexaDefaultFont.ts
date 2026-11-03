import { StyleSheet, Text, TextInput } from 'react-native';
import { resolveNexaTextStyle } from './nexaFontFamilies';

/**
 * Makes every <Text> and <TextInput> in NEXA use the NEXA font (or the font the user chose in
 * Settings) even when a screen never set a fontFamily. Imported once by the root layout.
 * Guarded: if a future React Native changes how Text is built, this simply does nothing.
 */
function patch(component: any) {
  if (!component || component.__nexaFontPatched) return;
  const original = component.render;
  if (typeof original !== 'function') return;
  component.render = function nexaRender(props: any, ref: any) {
    let next = props;
    try {
      const resolved = resolveNexaTextStyle(StyleSheet.flatten(props?.style) as any, String((globalThis as any).__NEXA_FONT_FAMILY__ || ''));
      if (resolved) next = { ...props, style: [props?.style, resolved] };
    } catch { /* never block text from rendering */ }
    return original.call(this, next, ref);
  };
  component.__nexaFontPatched = true;
}

patch(Text);
patch(TextInput);

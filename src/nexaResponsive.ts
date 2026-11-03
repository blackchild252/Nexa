import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const MIN_TOUCH_TARGET = 44;
export const MINIMUM_READABLE_FONT_SIZE = 13;

export function responsiveLayout(width: number, height: number, fontScale = 1) {
  const compactPhone = width < 360;
  const phone = width < 600;
  const wideScreen = width >= 600;
  const landscape = width > height;
  const gutter = Math.max(14, Math.min(24, width * 0.046));
  const contentWidth = Math.min(Math.max(width - gutter * 2, 0), 720);
  const directoryWidth = Math.min(Math.max(width * 0.82, 280), 380);
  const safeBottom = Math.max(0, Math.round(height * 0.012));
  const readableScale = Math.max(1, fontScale);
  const minimumReadableFontSize = Math.max(MINIMUM_READABLE_FONT_SIZE, Math.round(13 * readableScale));
  const dockOrb = Math.min(96, Math.max(compactPhone ? 64 : 68, (contentWidth - 18) / 4));
  return { width, height, compactPhone, phone, wideScreen, landscape, orientation: landscape ? 'landscape' : 'portrait', gutter, contentWidth, directoryWidth, safeBottom, minimumReadableFontSize, dockOrb } as const;
}

export function safeAreaPadding(insets: { top: number; bottom: number; left: number; right: number }) {
  return { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right };
}

export function useNexaResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return { ...responsiveLayout(width, height, fontScale), insets, safeAreaPadding: safeAreaPadding(insets) };
}

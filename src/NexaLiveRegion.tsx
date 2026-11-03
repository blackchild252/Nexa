import React from 'react';
import { Platform, Text, View } from 'react-native';

type Politeness = 'polite' | 'assertive';

/** Shared dynamic-status announcement primitive. Visual UI remains unchanged. */
export function NexaLiveRegion({ message, politeness = 'polite', label = 'NEXA status update' }: { message?: string; politeness?: Politeness; label?: string }) {
  if (!message) return null;
  const webA11y = Platform.OS === 'web' ? ({ 'aria-live': politeness, role: 'status' } as any) : {};
  return <View
    accessible
    accessibilityRole="alert"
    accessibilityLiveRegion={politeness}
    accessibilityLabel={`${label}: ${message}`}
    importantForAccessibility="yes"
    {...webA11y}
    style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', left: -10000, top: 0 }}
  >
    <Text>{message}</Text>
  </View>;
}

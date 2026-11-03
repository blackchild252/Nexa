import React from 'react';
import { Text, View } from 'react-native';
import { ds, theme } from './theme';
import { NexaLiveRegion } from './NexaLiveRegion';
import { NexaLoadingPulse, NexaMotionSurface, NexaPressable } from './motion';

type NexaDataStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  compact?: boolean;
};

/** Shared B71 async-state treatment: readable, retryable, and visually quiet. */
export function NexaDataState({ title, message, actionLabel = 'Try again', onAction, loading = false, compact = false }: NexaDataStateProps) {
  return <View accessibilityLiveRegion="polite" style={ds({ marginTop: compact ? 10 : 16, padding: compact ? 12 : 16, borderRadius: 14, backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border })}>
    <NexaLiveRegion message={`${title}. ${message}`} label="Data state" />
    {loading ? <NexaMotionSurface motion="loading" style={ds({ alignItems:'center', marginBottom: 9 })}><NexaLoadingPulse size={compact ? 'small' : 'large'} /></NexaMotionSurface> : null}
    <Text style={ds({ color: theme.colors.text, fontSize: compact ? 15 : 17, lineHeight: compact ? 21 : 24, fontWeight: '800' })}>{title}</Text>
    <Text style={ds({ color: theme.colors.textSecondary, fontSize: 16, lineHeight: 20, marginTop: 5 })}>{message}</Text>
    {onAction && !loading ? <NexaPressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={ds({ alignSelf: 'flex-start', minHeight: 44, marginTop: 11, paddingHorizontal: 14, borderRadius: 11, backgroundColor: theme.colors.goldBright, justifyContent: 'center', alignItems: 'center' })}>
      <Text style={ds({ color: theme.colors.black, fontWeight: '900', fontSize: 16 })}>{actionLabel}</Text>
    </NexaPressable> : null}
  </View>;
}

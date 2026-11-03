import * as Sentry from '@sentry/react-native';
import { scrubBreadcrumb, scrubEvent } from './telemetryScrub';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryEnabled = Boolean(dsn);

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend: (event: any) => scrubEvent(event),
    beforeBreadcrumb: (crumb: any) => scrubBreadcrumb(crumb),
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!sentryEnabled) return;
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context || {})) scope.setExtra(key, value);
    Sentry.captureException(error);
  });
}

export function setUserId(id?: string | null) {
  if (!sentryEnabled) return;
  Sentry.setUser(id ? { id } : null);
}

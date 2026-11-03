import { ACCESSIBILITY } from './accessibility';

/** Shared interaction-size contract. Keeps visual styling local while guaranteeing a usable hit area. */
export function touchTargetStyle(style: any = {}) {
  return [{ minWidth: ACCESSIBILITY.minTouchTarget, minHeight: ACCESSIBILITY.minTouchTarget }, style];
}

/** Shared text reflow contract for user-facing labels that must survive NEXA text scaling. */
export function reflowTextA11y(extra: Record<string, any> = {}) {
  return {
    allowFontScaling: true,
    maxFontSizeMultiplier: 1.45,
    ...extra,
  };
}


/** Shared semantic-group contract for related controls and navigation regions. */
export function accessibilityGroup(label: string, role: 'group'|'toolbar'|'region' = 'group') {
  return { accessibilityRole: role, accessibilityLabel: label };
}

/** Describes the action a control performs without duplicating its visible label. */
export function actionHint(hint: string) {
  return { accessibilityHint: hint, 'aria-description': hint };
}

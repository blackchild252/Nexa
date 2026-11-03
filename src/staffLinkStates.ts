// Staff link states and Staff login door wording (M7787, first slice).
// Plain data only: no React, no network. The screen that uses it is not built yet.
// Wording rules: one identical refusal for every sign-in failure (never say whether the account is
// staff, or whose staff), and every state has a spoken label so a screen reader gets the full meaning.

export type StaffLinkState = "pending" | "approved" | "rejected" | "suspended" | "removed";

export type StaffLinkStateView = {
  label: string;
  detail: string;
  accessibilityLabel: string;
  canWork: boolean;
};

export const STAFF_LINK_STATES: Record<StaffLinkState, StaffLinkStateView> = {
  pending: { label: "Waiting for approval", detail: "Your link has been requested. You can start once it is approved.", accessibilityLabel: "Staff link status: waiting for approval. You cannot work yet.", canWork: false },
  approved: { label: "Approved", detail: "Your link is active.", accessibilityLabel: "Staff link status: approved. You can work.", canWork: true },
  rejected: { label: "Not approved", detail: "This link was not approved. Ask your boss if you need to know more.", accessibilityLabel: "Staff link status: not approved. You cannot work.", canWork: false },
  suspended: { label: "Paused", detail: "Your link is paused for now. It will come back when it is resumed.", accessibilityLabel: "Staff link status: paused. You cannot work until it is resumed.", canWork: false },
  removed: { label: "Ended", detail: "This link has ended. Your NEXA account is not affected.", accessibilityLabel: "Staff link status: ended. Your NEXA account is not affected.", canWork: false },
};

// Anything the server sends that is not a known state is shown as not able to work (fail closed).
export function staffLinkStateView(state: unknown): StaffLinkStateView {
  if (typeof state === "string" && Object.prototype.hasOwnProperty.call(STAFF_LINK_STATES, state)) {
    return STAFF_LINK_STATES[state as StaffLinkState];
  }
  return { label: "Unavailable", detail: "We could not read this link. Try again later.", accessibilityLabel: "Staff link status unavailable. You cannot work.", canWork: false };
}

// One message for every door refusal: wrong account, no link, wrong boss, paused, too many tries.
export const STAFF_DOOR_REFUSAL = "We could not sign you in as staff. Check your details and try again.";

export const STAFF_DOOR_COPY = {
  title: "Staff login",
  hint: "Use your own NEXA account. You will be asked for your 2FA code.",
  buttonLabel: "Sign in as staff",
  buttonAccessibilityLabel: "Sign in as staff with your NEXA account",
} as const;

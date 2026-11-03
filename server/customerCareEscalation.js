'use strict';

const TIERS = Object.freeze(['customer_care', 'administrative_director', 'ceo', 'founder']);
function nextEscalationTier(currentTier, requestedTier) {
  const current = TIERS.indexOf(String(currentTier || 'customer_care'));
  if (current < 0) return { ok: false, code: 'invalid_current_tier', error: 'Current escalation tier is invalid.' };
  if (current >= TIERS.length - 1) return { ok: false, code: 'terminal_tier', error: 'This case is already at the highest escalation tier.' };
  const next = TIERS[current + 1];
  if (requestedTier !== undefined && requestedTier !== next) return { ok: false, code: 'invalid_transition', error: `Escalation must move one tier at a time to ${next}.` };
  return { ok: true, from: TIERS[current], to: next };
}
function normalizeEscalationReason(value) {
  const reason = String(value || '').trim();
  if (reason.length < 4) return { ok: false, error: 'Provide an escalation reason of at least 4 characters.' };
  if (reason.length > 500) return { ok: false, error: 'Escalation reason must be 500 characters or fewer.' };
  return { ok: true, value: reason };
}
module.exports = { TIERS, nextEscalationTier, normalizeEscalationReason };

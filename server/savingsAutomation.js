"use strict";
function normalizeRule(input = {}) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) throw new Error("amount must be greater than zero.");
  const cadence = ["weekly","monthly"].includes(String(input.cadence)) ? String(input.cadence) : "monthly";
  const currency = String(input.currency || "NGN").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("currency must be a 3-letter code.");
  return { amount, cadence, currency, active: input.active !== false };
}
function nextDue(rule, now = new Date()) {
  const d = new Date(now); if (rule.cadence === "weekly") d.setUTCDate(d.getUTCDate() + 7); else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0,10);
}
function goalPlan(goal, rule, now = new Date()) {
  const remaining = Math.max(0, Number(goal.targetAmount) - Number(goal.currentAmount));
  const amount = Math.min(remaining, Number(rule.amount));
  return { goalId: goal.id, currency: goal.currency, remaining, suggestedContribution: amount, cadence: rule.cadence, nextDue: nextDue(rule, now), complete: remaining <= 0 };
}
module.exports = { normalizeRule, nextDue, goalPlan };

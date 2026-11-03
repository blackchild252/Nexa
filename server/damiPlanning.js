"use strict";

const MAX_PLAN_STEPS = 6;
const MAX_TEXT = 240;

function clean(value, max = MAX_TEXT) { return String(value || "").trim().slice(0, max); }

function normalizePlan(raw = {}) {
  const steps = Array.isArray(raw.steps) ? raw.steps.slice(0, MAX_PLAN_STEPS).map((step, index) => ({
    index,
    intent: clean(step?.intent, 80),
    purpose: clean(step?.purpose, 180),
    requiresConfirmation: step?.requiresConfirmation === true,
    reversible: step?.reversible !== false,
  })).filter(step => step.intent) : [];
  return {
    goal: clean(raw.goal, 300),
    steps,
    requiresConfirmation: raw.requiresConfirmation === true || steps.some(step => step.requiresConfirmation),
    crossModule: new Set(steps.map(step => step.intent.split(".")[0])).size > 1,
  };
}

function safetySummary(plan) {
  const normalized = normalizePlan(plan);
  return {
    goal: normalized.goal,
    stepCount: normalized.steps.length,
    crossModule: normalized.crossModule,
    requiresConfirmation: normalized.requiresConfirmation,
    reversibleSteps: normalized.steps.filter(step => step.reversible).length,
  };
}

module.exports = { MAX_PLAN_STEPS, normalizePlan, safetySummary };

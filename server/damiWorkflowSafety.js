"use strict";

const CONSEQUENTIAL = new Set(["money", "iou", "split"]);

function readiness(steps = [], completed = []) {
  const done = new Set((Array.isArray(completed) ? completed : []).map(Number));
  return (Array.isArray(steps) ? steps : []).map((step, index) => {
    const dependsOn = (Array.isArray(step?.dependsOn) ? step.dependsOn : []).map(Number).filter(Number.isInteger);
    const blockedBy = dependsOn.filter(d => !done.has(d));
    const intent = String(step?.intent || "general");
    return {
      index,
      intent,
      dependsOn,
      blockedBy,
      ready: blockedBy.length === 0 && !done.has(index),
      requiresConfirmation: Boolean(step?.requiresConfirmation) || CONSEQUENTIAL.has(intent),
      consequenceSafe: !CONSEQUENTIAL.has(intent) || Boolean(step?.requiresConfirmation),
    };
  });
}

function audit(steps = [], completed = [], confirmed = false, confirmation = null) {
  const confirmationValid = confirmation && typeof confirmation === "object" ? require("./damiReplaySafety").confirmationValid({
    confirmationRequired: true,
    confirmed: Boolean(confirmed),
    createdAt: confirmation.confirmedAt || confirmation.createdAt,
  }, confirmation.now || Date.now(), confirmation.maxAgeMs || 120000) : Boolean(confirmed);
  return readiness(steps, completed).map(step => ({
    ...step,
    confirmationValid: step.requiresConfirmation ? confirmationValid : true,
    executable: step.ready && step.consequenceSafe && (!step.requiresConfirmation || confirmationValid),
  }));
}

module.exports = { readiness, audit };

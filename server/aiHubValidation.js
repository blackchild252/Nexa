"use strict";
const text = (v, max=5000) => String(v ?? "").trim().slice(0,max);
function transitionWorkflowStatus(current, next, definitionChanged = false) {
  const allowed = {
    draft: new Set(["draft", "awaiting_approval", "cancelled"]),
    awaiting_approval: new Set(["awaiting_approval", "draft", "approved", "cancelled"]),
    approved: new Set(["approved", "active", "cancelled"]),
    active: new Set(["active", "archived", "cancelled"]),
    archived: new Set(),
    cancelled: new Set(),
  };
  if (!allowed[current] || !allowed[current].has(next)) return { ok: false, error: "Invalid workflow lifecycle transition." };
  if (current === "archived" || current === "cancelled") return { ok: false, error: "Archived and cancelled workflows are terminal." };
  if (current !== "draft" && definitionChanged) return { ok: false, error: "Only draft workflows can be edited." };
  return { ok: true, current, next, definitionChanged: Boolean(definitionChanged) };
}
function validateActionConfirmations(steps, confirmed, confirmedActions) {
  if (confirmed !== true) return { ok: false, status: 428, error: "Explicit confirmation is required to run this workflow." };
  if (!Array.isArray(steps) || !Array.isArray(confirmedActions)) return { ok: false, status: 428, error: "Explicit action confirmation is required for every workflow step." };
  const required = steps.map((_, index) => index);
  const supplied = confirmedActions;
  if (supplied.some((index) => !Number.isInteger(index) || index < 0 || index >= steps.length) || new Set(supplied).size !== supplied.length || required.some((index) => !supplied.includes(index)) || supplied.length !== required.length) {
    return { ok: false, status: 428, error: "Explicit action confirmation is required for every workflow step." };
  }
  return { ok: true, confirmedActions: required };
}
function validateSteps(steps) {
  if (!Array.isArray(steps) || steps.length < 1 || steps.length > 20) return { error: "A workflow must contain 1–20 steps." };
  const allowed = new Set(["create_task", "save_note"]);
  for (const s of steps) {
    if (!s || !allowed.has(s.type)) return { error: "Only create_task and save_note workflow steps are supported." };
    if (!text(s.title || s.content, 500)) return { error: "Each workflow step needs text." };
  }
  return { value: steps.map(s => s.type === "create_task" ? {type:s.type,title:text(s.title,200),dueAt:s.dueAt?text(s.dueAt,40):null} : {type:s.type,content:text(s.content,1000)}) };
}
module.exports={validateSteps,transitionWorkflowStatus,validateActionConfirmations};

"use strict";

function plan(rows = []) {
  const out = { verify:[], review:[], mismatch:[], internal:[] };
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.source === "internal") { out.internal.push(String(row.id)); continue; }
    const mapped = String(row?.mappedStatus || "");
    if (row?.safeToApply && mapped === "completed") out.verify.push(String(row.id));
    else if (row?.safeToApply) out.review.push(String(row.id));
    else out.mismatch.push(String(row.id));
  }
  return { ...out, actionable: out.verify.length + out.review.length, exceptions: out.mismatch.length };
}

module.exports = { plan };

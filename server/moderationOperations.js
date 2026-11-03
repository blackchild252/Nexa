"use strict";

const QUEUES = Object.freeze(["normal", "elevated", "urgent"]);
function moderationQueue(reports = []) {
  const counts = Object.fromEntries(QUEUES.map((q) => [q, 0]));
  for (const report of Array.isArray(reports) ? reports : []) {
    const q = QUEUES.includes(String(report?.escalation)) ? String(report.escalation) : "normal";
    counts[q] += 1;
  }
  return { total: Object.values(counts).reduce((a,b)=>a+b,0), counts, urgent: counts.urgent };
}
module.exports = { QUEUES, moderationQueue };

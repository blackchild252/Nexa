"use strict";

function summarize(rows = []) {
  const safe = Array.isArray(rows) ? rows : [];
  const out = { pending:0, retry:0, sending:0, delivered:0, dead:0, failed:0, staleSending:0, total:safe.length };
  for (const row of safe) {
    const status = String(row?.status || "");
    if (Object.prototype.hasOwnProperty.call(out, status)) out[status] += 1;
    if (status === "sending" && row?.updatedAt && Date.parse(row.updatedAt) < Date.now() - 15 * 60 * 1000) out.staleSending += 1;
  }
  out.actionRequired = out.staleSending > 0 || out.failed > 0;
  return out;
}

module.exports = { summarize };

"use strict";

const DOMAINS = Object.freeze(["marketplace", "yaayz", "kitchen"]);
function summarizeFulfillment(input = {}) {
  const out = {};
  for (const domain of DOMAINS) {
    const rows = Array.isArray(input[domain]) ? input[domain] : [];
    out[domain] = { total: rows.length, pending: rows.filter(r => ["pending","processing","confirmed"].includes(String(r?.status))).length, exceptions: rows.filter(r => ["cancelled","refunded","failed","disputed"].includes(String(r?.status))).length };
  }
  return out;
}
module.exports = { DOMAINS, summarizeFulfillment };

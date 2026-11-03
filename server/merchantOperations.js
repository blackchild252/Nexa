"use strict";

const FULFILLMENT = Object.freeze(["pending", "confirmed", "fulfilled", "refunded", "cancelled"]);

function summarizeMerchantRows(rows = []) {
  const counts = Object.fromEntries(FULFILLMENT.map((s) => [s, 0]));
  for (const row of Array.isArray(rows) ? rows : []) {
    const status = FULFILLMENT.includes(String(row?.status)) ? String(row.status) : "pending";
    counts[status] += 1;
  }
  return { total: rows.length, counts, needsAttention: counts.pending + counts.confirmed };
}

function venueReadiness(input = {}) {
  const required = ["ownerVerified", "contactReady", "fulfillmentReady"];
  const missing = required.filter((key) => input[key] !== true);
  return { ready: missing.length === 0, missing };
}

module.exports = { FULFILLMENT, summarizeMerchantRows, venueReadiness };

"use strict";

const LIFECYCLE = Object.freeze(["pending", "confirmed", "fulfilled", "refunded", "cancelled"]);

function normalizeLifecycleStatus(value, fallback = "pending") {
  const status = String(value || "").trim().toLowerCase();
  return LIFECYCLE.includes(status) ? status : fallback;
}

function summarizeLifecycle(rows = []) {
  const counts = Object.fromEntries(LIFECYCLE.map((s) => [s, 0]));
  for (const row of rows) counts[normalizeLifecycleStatus(row?.status)] += 1;
  return { total: rows.length, counts };
}

module.exports = { LIFECYCLE, normalizeLifecycleStatus, summarizeLifecycle };

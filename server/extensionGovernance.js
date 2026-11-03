"use strict";

const crypto = require("crypto");
const { SCOPES } = require("./extensions");

const RISK = Object.freeze({
  low: 1,
  medium: 2,
  high: 3,
});

const SCOPE_RISK = Object.freeze({
  "profile.read": "low",
  "money.read": "medium",
  "market.read": "low",
  "mall.read": "medium",
  "chat.read": "high",
  "notifications.send": "medium",
});

function classifyScopes(scopes = []) {
  const unique = [...new Set(scopes.map(String))];
  const unknown = unique.filter((scope) => !SCOPES[scope]);
  if (unknown.length) throw new Error(`Unknown extension scope: ${unknown[0]}`);
  const level = unique.reduce((max, scope) => Math.max(max, RISK[SCOPE_RISK[scope] || "high"]), 1);
  return level >= 3 ? "high" : level === 2 ? "medium" : "low";
}

function governanceDecision({ requestedScopes = [], developerVerified = false, published = false } = {}) {
  const risk = classifyScopes(requestedScopes);
  if (risk === "high" && !developerVerified) return { allowed: false, risk, reason: "high-risk scope requires verified developer" };
  if (published && !developerVerified) return { allowed: false, risk, reason: "published extensions require verified developer" };
  return { allowed: true, risk, reason: "policy-satisfied" };
}

function manifestDigest(manifest) {
  return crypto.createHash("sha256").update(JSON.stringify(manifest, Object.keys(manifest).sort())).digest("hex");
}

module.exports = { RISK, SCOPE_RISK, classifyScopes, governanceDecision, manifestDigest };

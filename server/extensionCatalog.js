"use strict";

const { governanceDecision } = require("./extensionGovernance");

const STATUSES = Object.freeze(["draft", "review", "published", "suspended", "revoked"]);

function normalizeListing(input = {}) {
  const title = String(input.title || input.name || "").trim();
  if (!title || title.length > 100) throw new Error("Extension listing title is required and must be at most 100 characters.");
  const description = String(input.description || "").trim().slice(0, 600);
  const categories = [...new Set((Array.isArray(input.categories) ? input.categories : []).map(String).map(v => v.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
  const requestedScopes = [...new Set((Array.isArray(input.requestedScopes) ? input.requestedScopes : []).map(String).map(v => v.trim()).filter(Boolean))].slice(0, 20);
  return { title, description, categories, requestedScopes, icon: String(input.icon || "").trim().slice(0, 500) };
}

function reviewDecision(listing, { developerVerified = false } = {}) {
  const normalized = normalizeListing(listing);
  const governance = governanceDecision({ requestedScopes: normalized.requestedScopes, developerVerified, published: true });
  return governance.allowed
    ? { status: "published", risk: governance.risk, reason: governance.reason }
    : { status: "review", risk: governance.risk, reason: governance.reason };
}

function searchableText(listing) {
  const item = normalizeListing(listing);
  return [item.title, item.description, ...item.categories].join(" ").toLowerCase();
}

module.exports = { STATUSES, normalizeListing, reviewDecision, searchableText };

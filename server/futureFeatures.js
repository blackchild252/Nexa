"use strict";

// Controlled registry for future product surfaces. A registry entry is not a
// feature launch: it documents dependencies and prevents isolated additions
// from bypassing shared NEXA foundations.
const FEATURES = Object.freeze({
  "merchant-tools": { status: "candidate", dependencies: ["auth", "payments", "notifications", "operations"] },
  "creator-commerce": { status: "candidate", dependencies: ["auth", "marketplace", "payments", "notifications"] },
  "family-groups": { status: "candidate", dependencies: ["auth", "groups", "notifications", "safety"] },
  "cross-module-insights": { status: "candidate", dependencies: ["dami", "search", "operations", "privacy"] },
});

function getFeature(id) { return FEATURES[String(id || "").trim()] || null; }
function listFeatures() { return Object.entries(FEATURES).map(([id, value]) => ({ id, ...value })); }
function canStart(id, available = []) {
  const feature = getFeature(id);
  if (!feature) return false;
  const set = new Set(available);
  return feature.dependencies.every(dep => set.has(dep));
}

module.exports = { FEATURES, getFeature, listFeatures, canStart };

"use strict";

const PRIVACY_POLICY_VERSION = "2026-10-01.v2";
const LEGAL_DOCUMENTS = Object.freeze([
  { id: "privacy", label: "Privacy Policy", env: "EXPO_PUBLIC_PRIVACY_POLICY_URL", path: "docs/legal/PRIVACY_POLICY.md" },
  { id: "terms", label: "Terms of Service", env: "EXPO_PUBLIC_TERMS_URL", path: "docs/legal/TERMS_OF_SERVICE.md" },
]);
const REQUIRED_PRIVACY_TOPICS = Object.freeze([
  "information we collect", "how we use information", "sharing", "retention", "security",
  "account deletion", "data export", "children", "international", "contact",
  "advertising", "ai", "permissions"
]);
const REQUIRED_TERMS_TOPICS = Object.freeze([
  "accounts", "acceptable use", "user content", "marketplace", "payments", "intellectual property",
  "termination", "disclaimers", "liability", "disputes", "changes", "contact"
]);
function normalizePolicyVersion(value) { return String(value || "").trim(); }
function legalDocumentReady(doc = {}, body = "") {
  return Boolean(doc.id && doc.label && doc.env && doc.path && String(body).trim());
}
function requiredTopicsPresent(body, topics) {
  const text = String(body || "").toLowerCase();
  return topics.every((topic) => text.includes(topic));
}
function consentGate({ canRequestAds = false, consentUpdated = false } = {}) {
  return { canRequestAds: Boolean(canRequestAds), consentUpdated: Boolean(consentUpdated), adsAllowed: Boolean(canRequestAds && consentUpdated) };
}
function privacyOptionsAvailable(status) { return String(status || "").toUpperCase() === "REQUIRED"; }
function sanitizeConsentDiagnostics(info = {}) {
  return {
    canRequestAds: Boolean(info.canRequestAds),
    isConsentFormAvailable: Boolean(info.isConsentFormAvailable),
    privacyOptionsRequired: privacyOptionsAvailable(info.privacyOptionsRequirementStatus),
    status: String(info.status || "UNKNOWN").toUpperCase().slice(0, 20),
  };
}
function policyAcceptanceRecord({ userId, policyVersion = PRIVACY_POLICY_VERSION, acceptedAt = new Date().toISOString() } = {}) {
  return { userId: String(userId || ""), policyVersion: normalizePolicyVersion(policyVersion), acceptedAt: String(acceptedAt) };
}
module.exports = { PRIVACY_POLICY_VERSION, LEGAL_DOCUMENTS, REQUIRED_PRIVACY_TOPICS, REQUIRED_TERMS_TOPICS, normalizePolicyVersion, legalDocumentReady, requiredTopicsPresent, consentGate, privacyOptionsAvailable, sanitizeConsentDiagnostics, policyAcceptanceRecord };

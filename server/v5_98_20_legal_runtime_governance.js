"use strict";

const crypto = require("crypto");
const PRIVACY_POLICY_VERSION = "2026-10-01.v3";
const TERMS_VERSION = "2026-10-01.v3";
const LEGAL_MIN_AGE = 18;

function secureHttpsUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.hash = "";
    return url.toString();
  } catch (_) { return null; }
}

function legalRuntimeStatus(env = process.env) {
  const privacyUrl = secureHttpsUrl(env.EXPO_PUBLIC_PRIVACY_POLICY_URL);
  const termsUrl = secureHttpsUrl(env.EXPO_PUBLIC_TERMS_URL);
  return {
    minimumAge: LEGAL_MIN_AGE,
    childrenAllowed: false,
    privacy: { version: PRIVACY_POLICY_VERSION, published: Boolean(privacyUrl), url: privacyUrl },
    terms: { version: TERMS_VERSION, published: Boolean(termsUrl), url: termsUrl },
    publicationReady: Boolean(privacyUrl && termsUrl),
    acceptanceEnabled: Boolean(privacyUrl && termsUrl),
  };
}

function validateAcceptance(input = {}, status = legalRuntimeStatus()) {
  if (!status.acceptanceEnabled) throw new Error("Legal documents are not published for production acceptance.");
  if (input.privacyAccepted !== true || input.termsAccepted !== true) throw new Error("Privacy Policy and Terms acceptance are required.");
  if (input.ageConfirmed !== true) throw new Error("NEXA is restricted to users aged 18 and above.");
  return true;
}

function acceptanceRecord({ userId, acceptedAt = new Date().toISOString() } = {}) {
  return {
    id: crypto.randomUUID(),
    userId: String(userId || ""),
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    termsVersion: TERMS_VERSION,
    acceptedAt: String(acceptedAt),
  };
}

function acceptanceSummary(row = null) {
  if (!row) return { accepted: false, privacyPolicyVersion: null, termsVersion: null, acceptedAt: null };
  return { accepted: true, privacyPolicyVersion: String(row.privacyPolicyVersion), termsVersion: String(row.termsVersion), acceptedAt: String(row.acceptedAt) };
}

module.exports = { PRIVACY_POLICY_VERSION, TERMS_VERSION, LEGAL_MIN_AGE, secureHttpsUrl, legalRuntimeStatus, validateAcceptance, acceptanceRecord, acceptanceSummary };

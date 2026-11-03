"use strict";

// NEXA platform content boundary: users are 18+, but NEXA does not permit 18+ / explicit adult content.
// This is a deterministic first boundary for user-entered text. Image/video surfaces must still use their
// existing AI moderation or human-report path; this module never pretends text scanning is image moderation.
const BLOCKED_PATTERNS = [
  /\bporn(?:ography|ographic)?\b/i,
  /\bsex(?:ual|ually)?\s+(?:act|acts|content|video|photo|images?)\b/i,
  /\bexplicit\s+sexual\b/i,
  /\bnude(?:s|d|ity)?\b/i,
  /\bnudity\b/i,
  /\bonlyfans\b/i,
  /\bescort(?:s|ing)?\b/i,
  /\badult\s+(?:content|video|photo|images?)\b/i,
  /\bsex\s+work(?:er)?s?\b/i,
];

function checkText(value) {
  const text = String(value || "").trim();
  const hit = BLOCKED_PATTERNS.find((pattern) => pattern.test(text));
  return hit ? { allowed: false, reason: "NEXA does not allow 18+ or explicit adult content." } : { allowed: true, reason: null };
}
function assertText(value) {
  const result = checkText(value);
  if (!result.allowed) throw Object.assign(new Error(result.reason), { status: 422, code: "CONTENT_POLICY_REJECTED" });
  return String(value || "").trim();
}
module.exports = { checkText, assertText, BLOCKED_PATTERNS };

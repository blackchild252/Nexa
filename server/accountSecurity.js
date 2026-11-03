"use strict";

const crypto = require("crypto");

const RECOVERY_TTL_MS = 30 * 60 * 1000;
const RECOVERY_BYTES = 32;
const PRIVACY_LEVELS = Object.freeze(["public", "friends", "private"]);
const PRIVACY_POLICY_VERSION = "2026-10-01.v3";
const PRIVACY_KEYS = Object.freeze(["visibility", "discoverable", "allowFriendRequests", "allowInboxRequests"]);

function normalizePrivacy(input = {}) {
  const visibility = PRIVACY_LEVELS.includes(String(input.visibility || "")) ? String(input.visibility) : "friends";
  const boolOrDefault = (value, fallback) => typeof value === "boolean" ? value : fallback;
  return {
    visibility,
    discoverable: boolOrDefault(input.discoverable, true),
    allowFriendRequests: boolOrDefault(input.allowFriendRequests, true),
    allowInboxRequests: boolOrDefault(input.allowInboxRequests, true),
  };
}

function validatePrivacyPatch(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Privacy settings must be an object.");
  for (const key of Object.keys(input)) if (!PRIVACY_KEYS.includes(key)) throw new Error(`Unknown privacy setting: ${key}`);
  if (input.visibility !== undefined && !PRIVACY_LEVELS.includes(String(input.visibility))) throw new Error("Invalid profile visibility.");
  for (const key of ["discoverable", "allowFriendRequests", "allowInboxRequests"]) {
    if (input[key] !== undefined && typeof input[key] !== "boolean") throw new Error(`${key} must be boolean.`);
  }
  return true;
}

function createRecoveryToken(userId, now = Date.now()) {
  const token = crypto.randomBytes(RECOVERY_BYTES).toString("hex");
  return { userId: String(userId), token, tokenHash: crypto.createHash("sha256").update(token).digest("hex"), expiresAt: new Date(now + RECOVERY_TTL_MS).toISOString() };
}

function verifyRecoveryToken(record, token, now = Date.now()) {
  if (!record || !token || new Date(record.expiresAt).getTime() <= now || record.consumedAt) return false;
  const hash = crypto.createHash("sha256").update(String(token)).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(String(record.tokenHash)));
}

function securitySummary({ sessions = 0, recoveryPending = false, privacy = {} } = {}) {
  return { sessions: Number(sessions) || 0, recoveryPending: Boolean(recoveryPending), privacy: normalizePrivacy(privacy), privacyPolicyVersion: PRIVACY_POLICY_VERSION };
}

module.exports = { RECOVERY_TTL_MS, RECOVERY_BYTES, PRIVACY_LEVELS, PRIVACY_POLICY_VERSION, PRIVACY_KEYS, normalizePrivacy, validatePrivacyPatch, createRecoveryToken, verifyRecoveryToken, securitySummary };

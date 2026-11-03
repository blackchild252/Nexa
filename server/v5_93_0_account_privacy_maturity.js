"use strict";

const crypto = require("crypto");

const ACCOUNT_STATES = Object.freeze(["active", "closed"]);
const INTEGRITY_ALGORITHM = "sha256";

function accountState(row) {
  const state = String(row?.accountStatus || "active");
  return ACCOUNT_STATES.includes(state) ? state : "active";
}

function isAccountActive(row) {
  return accountState(row) === "active";
}

function assertAccountActive(row, message = "This NEXA account is closed.") {
  if (!row || !isAccountActive(row)) {
    throw Object.assign(new Error(message), { status: 403, code: "ACCOUNT_CLOSED" });
  }
  return true;
}

function canonicalBundlePayload(bundle) {
  const copy = JSON.parse(JSON.stringify(bundle || {}));
  delete copy.integrity;
  return JSON.stringify(copy);
}

function bundleChecksum(bundle) {
  return crypto.createHash(INTEGRITY_ALGORITHM).update(canonicalBundlePayload(bundle), "utf8").digest("hex");
}

function attachBundleIntegrity(bundle) {
  const copy = JSON.parse(JSON.stringify(bundle));
  copy.integrity = { algorithm: INTEGRITY_ALGORITHM, checksum: bundleChecksum(copy) };
  return copy;
}

function verifyBundleIntegrity(bundle) {
  if (!bundle?.integrity) return { present: false, valid: true };
  if (bundle.integrity.algorithm !== INTEGRITY_ALGORITHM || !/^[a-f0-9]{64}$/i.test(String(bundle.integrity.checksum || ""))) {
    return { present: true, valid: false };
  }
  return { present: true, valid: bundleChecksum(bundle) === String(bundle.integrity.checksum).toLowerCase() };
}

function safeAuditMetadata(value, redact) {
  return typeof redact === "function" ? redact(value && typeof value === "object" ? value : {}) : {};
}

module.exports = {
  ACCOUNT_STATES,
  INTEGRITY_ALGORITHM,
  accountState,
  isAccountActive,
  assertAccountActive,
  canonicalBundlePayload,
  bundleChecksum,
  attachBundleIntegrity,
  verifyBundleIntegrity,
  safeAuditMetadata,
};

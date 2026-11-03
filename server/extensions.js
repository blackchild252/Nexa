"use strict";

// NEXA V3.58 Extension Framework.
// This module defines the safe metadata/permission boundary only. It does not
// execute arbitrary extension code or expose server secrets.

const crypto = require("crypto");
const packageVersion = require("../package.json").version;

const EXTENSION_VERSION = "1.1";
// Keep extension compatibility tied to the actual application release.
const NEXA_PLATFORM_VERSION = String(packageVersion || "0.0.0");
const STATUSES = Object.freeze(["registered", "enabled", "disabled", "revoked"]);

const SCOPES = Object.freeze({
  "profile.read": "Read the signed-in user's public profile.",
  "money.read": "Read the signed-in user's money summaries and activity.",
  "market.read": "Read informational market-watch data.",
  "mall.read": "Read the signed-in user's Mall catalog/order information.",
  "chat.read": "Read conversations explicitly made available to the extension.",
  "notifications.send": "Request delivery of a NEXA notification after explicit user action.",
});

const SECRET_KEY_RE = /(secret|password|passwd|token|api[_-]?key|private[_-]?key|credential|authorization|cookie)/i;

function cleanText(value, field, max = 160) {
  const text = String(value == null ? "" : value).trim();
  if (!text || text.length > max) throw new Error(`${field} is required and must be at most ${max} characters.`);
  return text;
}

function normalizeScopes(scopes) {
  if (!Array.isArray(scopes)) throw new Error("requestedScopes must be an array.");
  const unique = [...new Set(scopes.map((s) => String(s).trim()).filter(Boolean))];
  if (unique.length > 20) throw new Error("An extension may request at most 20 scopes.");
  const unknown = unique.filter((scope) => !SCOPES[scope]);
  if (unknown.length) throw new Error(`Unknown extension scope: ${unknown[0]}`);
  return unique;
}

function validatePublicConfig(config) {
  if (config == null) return {};
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("publicConfig must be an object.");
  const json = JSON.stringify(config);
  if (json.length > 8192) throw new Error("publicConfig is too large.");
  for (const key of Object.keys(config)) {
    if (SECRET_KEY_RE.test(key)) throw new Error(`Secret-bearing configuration is not allowed: ${key}`);
    const value = config[key];
    if (value && typeof value === "object") validatePublicConfig(value);
  }
  return config;
}

function normalizeCompatibility(input = {}) {
  const compatibility = input && typeof input === "object" ? input : {};
  const minNexaVersion = String(compatibility.minNexaVersion || "3.58.0").trim();
  const maxNexaVersion = String(compatibility.maxNexaVersion || "").trim();
  const versionRe = /^\d+\.\d+\.\d+$/;
  if (!versionRe.test(minNexaVersion)) throw new Error("compatibility.minNexaVersion must use x.y.z version format.");
  if (maxNexaVersion && !versionRe.test(maxNexaVersion)) throw new Error("compatibility.maxNexaVersion must use x.y.z version format.");
  if (maxNexaVersion && compareVersions(minNexaVersion, maxNexaVersion) > 0) throw new Error("compatibility.minNexaVersion cannot exceed maxNexaVersion.");
  return { minNexaVersion, maxNexaVersion };
}

function compareVersions(a, b) {
  const aa = String(a).split(".").map(Number); const bb = String(b).split(".").map(Number);
  for (let i=0;i<3;i++) { if ((aa[i]||0) !== (bb[i]||0)) return (aa[i]||0) - (bb[i]||0); }
  return 0;
}

function isVersionCompatible(version, compatibility = {}) {
  if (compatibility.minNexaVersion && compareVersions(version, compatibility.minNexaVersion) < 0) return false;
  if (compatibility.maxNexaVersion && compareVersions(version, compatibility.maxNexaVersion) > 0) return false;
  return true;
}

function normalizeRegistration(input = {}) {
  const requestedScopes = normalizeScopes(input.requestedScopes || []);
  return {
    name: cleanText(input.name, "name", 80),
    slug: cleanText(input.slug, "slug", 80).toLowerCase(),
    version: cleanText(input.version || EXTENSION_VERSION, "version", 32),
    description: String(input.description || "").trim().slice(0, 500),
    requestedScopes,
    publicConfig: validatePublicConfig(input.publicConfig),
    compatibility: normalizeCompatibility(input.compatibility),
  };
}

function generateId() {
  return `ext_${crypto.randomBytes(12).toString("hex")}`;
}

function consentSatisfied(requestedScopes, consentedScopes) {
  const granted = new Set(consentedScopes || []);
  return requestedScopes.every((scope) => granted.has(scope));
}

function canEnable(extension, consentedScopes) {
  if (!extension || extension.status === "revoked") return false;
  return consentSatisfied(extension.requestedScopes, consentedScopes);
}

function hasGrantedScope(extension, scope, consentedScopes) {
  if (!extension || extension.status !== "enabled") return false;
  if (!SCOPES[scope]) return false;
  const requested = new Set(extension.requestedScopes || []);
  const granted = new Set(consentedScopes || []);
  return requested.has(scope) && granted.has(scope);
}

function capabilityAvailability(extension, consentedScopes, platformVersion = NEXA_PLATFORM_VERSION) {
  if (!extension || extension.status === "revoked") return { enabled: false, reason: "revoked", scopes: [] };
  if (!isVersionCompatible(platformVersion, { minNexaVersion: extension.minNexaVersion || "3.58.0", maxNexaVersion: extension.maxNexaVersion || "" })) return { enabled: false, reason: "incompatible", scopes: [] };
  if (extension.status !== "enabled") return { enabled: false, reason: extension.status || "not-enabled", scopes: [] };
  const requested = Array.isArray(extension.requestedScopes) ? extension.requestedScopes : [];
  const granted = new Set(Array.isArray(consentedScopes) ? consentedScopes : []);
  const scopes = requested.filter((scope) => granted.has(scope) && SCOPES[scope]);
  if (!scopes.length) return { enabled: false, reason: "consent-required", scopes: [] };
  return { enabled: true, reason: "enabled", scopes };
}

function normalizeUpdate(input = {}) {
  const out = {};
  if (Object.prototype.hasOwnProperty.call(input, "name")) out.name = cleanText(input.name, "name", 80);
  if (Object.prototype.hasOwnProperty.call(input, "version")) out.version = cleanText(input.version, "version", 32);
  if (Object.prototype.hasOwnProperty.call(input, "description")) out.description = String(input.description || "").trim().slice(0, 500);
  if (Object.prototype.hasOwnProperty.call(input, "publicConfig")) out.publicConfig = validatePublicConfig(input.publicConfig);
  if (Object.prototype.hasOwnProperty.call(input, "compatibility")) out.compatibility = normalizeCompatibility(input.compatibility);
  if (!Object.keys(out).length) throw new Error("At least one editable field is required.");
  return out;
}

function auditAction({ extensionId, userId, action, metadata = {} }) {
  return {
    id: `exa_${crypto.randomBytes(12).toString("hex")}`,
    extensionId,
    userId,
    action,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

function frameworkManifest() {
  return {
    version: EXTENSION_VERSION,
    execution: "metadata-only; arbitrary third-party code is not executed by the NEXA server",
    scopes: SCOPES,
    lifecycle: STATUSES,
    consent: "explicit per-user consent is required before an extension can be enabled",
    secrets: "server secrets are never exposed to extensions; publicConfig rejects secret-like keys",
    audit: "registration, consent, lifecycle and revocation changes are audit logged",
  };
}

module.exports = {
  EXTENSION_VERSION,
  STATUSES,
  SCOPES,
  SECRET_KEY_RE,
  normalizeScopes,
  validatePublicConfig,
  normalizeRegistration,
  generateId,
  consentSatisfied,
  canEnable,
  hasGrantedScope,
  capabilityAvailability,
  normalizeUpdate,
  normalizeCompatibility,
  compareVersions,
  isVersionCompatible,
  NEXA_PLATFORM_VERSION,
  auditAction,
  frameworkManifest,
};

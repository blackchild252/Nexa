"use strict";

const { SCOPES, normalizeScopes, validatePublicConfig, normalizeCompatibility, NEXA_PLATFORM_VERSION } = require("./extensions");

const MANIFEST_VERSION = "1.0";
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 ._-]{1,78}[A-Za-z0-9]$/;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9._-]{0,78}[a-z0-9])?$/;

function clean(value, field, max) {
  const text = String(value == null ? "" : value).trim();
  if (!text || text.length > max) throw new Error(`${field} is required and must be at most ${max} characters.`);
  return text;
}

function validateManifest(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Extension manifest must be an object.");
  const name = clean(input.name, "name", 80);
  if (!NAME_RE.test(name)) throw new Error("name contains unsupported characters.");
  const slug = clean(input.slug, "slug", 80).toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length < 2) throw new Error("slug must contain lowercase letters, numbers, dots, underscores or hyphens.");
  const version = clean(input.version || "1.0.0", "version", 32);
  const description = String(input.description || "").trim().slice(0, 500);
  const requestedScopes = normalizeScopes(input.requestedScopes || []);
  const publicConfig = validatePublicConfig(input.publicConfig || {});
  const compatibility = normalizeCompatibility(input.compatibility);
  return {
    manifestVersion: MANIFEST_VERSION,
    name,
    slug,
    version,
    description,
    requestedScopes,
    publicConfig,
    compatibility,
  };
}

function developerManifest() {
  return {
    manifestVersion: MANIFEST_VERSION,
    execution: "controlled-capability-api; NEXA does not execute arbitrary extension code",
    registration: { method: "POST", path: "/api/extensions", contentType: "application/json" },
    validation: { method: "POST", path: "/api/extensions/developer/validate" },
    discovery: { method: "GET", path: "/api/extensions/developer/capabilities" },
    rateLimit: { windowMs: 60000, maxRequests: 60, key: "clientId" },
    identity: {
      createKey: { method: "POST", path: "/api/extensions/:id/identity/keys" },
      list: { method: "GET", path: "/api/extensions/:id/identity" },
      revokeKey: { method: "DELETE", path: "/api/extensions/:id/identity/keys/:keyId" },
      rotateKey: { method: "POST", path: "/api/extensions/:id/identity/keys/:keyId/rotate" },
    },
    platform: { currentVersion: NEXA_PLATFORM_VERSION },
    lifecycle: ["registered", "enabled", "disabled", "revoked"],
    consent: "Every requested scope requires explicit user consent before enablement.",
    scopes: Object.entries(SCOPES).map(([id, description]) => ({ id, description, access: id === "notifications.send" ? "action" : "read" })),
    rules: [
      "Only requested and consented scopes are usable.",
      "The extension receives user-scoped data, never raw server secrets.",
      "publicConfig is for non-secret settings only.",
      "Notifications are delivered by NEXA; device push tokens are never exposed.",
      "API keys are shown only at creation/rotation and stored as one-way hashes; last-used time is metadata only.",
      "Runtime credentials are rate-limited per client identity.",
      "Every extension declares a compatible NEXA version range.",
    ],
  };
}

function capabilityCatalog() {
  return Object.entries(SCOPES).map(([id, description]) => ({
    id,
    description,
    type: id === "notifications.send" ? "action" : "read",
    endpoint: id === "notifications.send"
      ? "/api/extensions/:id/capabilities/notifications.send"
      : `/api/extensions/:id/capabilities/${id}`,
  }));
}

module.exports = { MANIFEST_VERSION, validateManifest, developerManifest, capabilityCatalog };

"use strict";

// NEXA V3.57 internal contract registry.
// This module is dependency-light so contract tests can run without the full server stack.

const API_CONTRACT_VERSION = "1.0";
const SUPPORTED_API_VERSIONS = Object.freeze(["1.0"]);
const API_VERSION_HEADER = "X-NEXA-API-Version";
const CONTRACT_HEADER = "X-NEXA-Contract-Version";

const ERROR_CODES = Object.freeze({
  INVALID_REQUEST: "INVALID_REQUEST",
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
});

const HTTP_STATUS_BY_CODE = Object.freeze({
  INVALID_REQUEST: 400,
  AUTHENTICATION_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 400,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

const AUTH_CONTRACT = Object.freeze({
  scheme: "Bearer",
  authenticatedRoutes: "require a valid NEXA session token",
  userContext: ["id", "email", "name", "username"],
  rule: "authorization is evaluated server-side; client-supplied user IDs are never trusted for ownership",
});

const EXTENSION_CONTRACT = Object.freeze({
  version: "1.0",
  execution: "metadata-only; arbitrary third-party code is not executed by the NEXA server",
  consent: "explicit per-user consent is required before enabling an extension",
  secrets: "server secrets are never exposed; public configuration rejects secret-like keys",
  lifecycle: ["registered", "enabled", "disabled", "revoked"],
  audit: "registration, consent, lifecycle, and revocation changes are audit logged",
});

const WEBHOOK_CONTRACT = Object.freeze({
  version: "1.0",
  requiredHeaders: ["Content-Type", "X-NEXA-Event-Signature"],
  envelope: ["id", "type", "version", "occurredAt", "data"],
  idempotency: "event id is the stable replay/idempotency key",
  rule: "verify authenticity before processing; persist accepted event IDs before side effects",
});

const API_CONTRACTS = Object.freeze({
  response: {
    success: "JSON object defined by the endpoint contract; HTTP status identifies outcome",
    error: {
      status: "HTTP status code",
      error: "safe human-readable message",
      code: "stable machine-readable error code",
      requestId: "request correlation ID or null",
    },
  },
  authentication: AUTH_CONTRACT,
  webhooks: WEBHOOK_CONTRACT,
  extensions: EXTENSION_CONTRACT,
  versioning: {
    current: API_CONTRACT_VERSION,
    supported: SUPPORTED_API_VERSIONS,
    compatibility: "additive changes are preferred within a contract version; breaking changes require a new major contract version",
    headers: [API_VERSION_HEADER, CONTRACT_HEADER],
  },
});


function negotiateApiVersion(value) {
  const requested = String(value || API_CONTRACT_VERSION).trim();
  if (!SUPPORTED_API_VERSIONS.includes(requested)) return { ok: false, requested, supported: SUPPORTED_API_VERSIONS.slice() };
  return { ok: true, version: requested };
}

function errorResponse(code, message, requestId = null, details = undefined) {
  const normalizedCode = ERROR_CODES[code] || code || ERROR_CODES.INTERNAL_ERROR;
  const status = HTTP_STATUS_BY_CODE[normalizedCode] || 500;
  const body = {
    status,
    error: String(message || "Request failed."),
    code: normalizedCode,
    requestId: requestId || null,
  };
  if (details !== undefined) body.details = details;
  return { status, body };
}

function applyContractHeaders(res) {
  res.setHeader(API_VERSION_HEADER, API_CONTRACT_VERSION);
  res.setHeader(CONTRACT_HEADER, API_CONTRACT_VERSION);
  return res;
}

function webhookEnvelope({ id, type, data, occurredAt = new Date().toISOString(), version = WEBHOOK_CONTRACT.version }) {
  if (!id || !type) throw new Error("Webhook event id and type are required.");
  return { id: String(id), type: String(type), version: String(version), occurredAt: String(occurredAt), data: data === undefined ? null : data };
}

function contractManifest() {
  return {
    apiVersion: API_CONTRACT_VERSION,
    headers: { apiVersion: API_VERSION_HEADER, contractVersion: CONTRACT_HEADER },
    errors: ERROR_CODES,
    authentication: AUTH_CONTRACT,
    webhooks: WEBHOOK_CONTRACT,
    extensions: EXTENSION_CONTRACT,
  };
}

module.exports = {
  API_CONTRACT_VERSION,
  API_VERSION_HEADER,
  CONTRACT_HEADER,
  ERROR_CODES,
  HTTP_STATUS_BY_CODE,
  AUTH_CONTRACT,
  WEBHOOK_CONTRACT,
  EXTENSION_CONTRACT,
  API_CONTRACTS,
  errorResponse,
  applyContractHeaders,
  webhookEnvelope,
  contractManifest,
  SUPPORTED_API_VERSIONS,
  negotiateApiVersion,
};

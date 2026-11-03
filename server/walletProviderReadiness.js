"use strict";
const contract = require("./walletProviderContract");

const REQUIRED_LIVE_ENV = Object.freeze(["NEXA_WALLET_PROVIDER", "NEXA_WALLET_WEBHOOK_SECRET", "NEXA_WALLET_PROVIDER_ADAPTER"]);
const SUPPORTED_MODES = Object.freeze(["sandbox", "live"]);
const KNOWN_ADAPTER_IDS = Object.freeze([]); // No live wallet adapter is registered in this release.

function walletProviderReadiness(env = process.env) {
  const rawMode = String(env.NEXA_WALLET_MODE || "sandbox").trim().toLowerCase() || "sandbox";
  const modeValid = SUPPORTED_MODES.includes(rawMode);
  const production = String(env.NODE_ENV || "").trim().toLowerCase() === "production";
  const missing = [];
  if (!modeValid) missing.push("NEXA_WALLET_MODE");
  if (rawMode === "sandbox" && production) missing.push("NEXA_WALLET_MODE");
  if (rawMode === "live") {
    for (const key of REQUIRED_LIVE_ENV) if (contract.isPlaceholder(env[key])) missing.push(key);
  }
  const adapterId = String(env.NEXA_WALLET_PROVIDER_ADAPTER || "").trim().toLowerCase();
  const adapterAvailable = rawMode === "sandbox" || KNOWN_ADAPTER_IDS.includes(adapterId);
  if (rawMode === "live" && !adapterAvailable && !missing.includes("NEXA_WALLET_PROVIDER_ADAPTER")) missing.push("registered_live_adapter");
  const timeoutMs = contract.normalizeTimeout(env.NEXA_WALLET_PROVIDER_TIMEOUT_MS, 8000);
  const configured = modeValid && (rawMode === "sandbox" || REQUIRED_LIVE_ENV.every((key) => !contract.isPlaceholder(env[key])));
  const ready = configured && adapterAvailable && !(production && rawMode === "sandbox");
  const status = !modeValid ? "invalid_mode" : production && rawMode === "sandbox" ? "blocked_sandbox_in_production" : rawMode === "sandbox" ? "sandbox" : ready ? "ready" : "not_connected";
  const healthStatus = !modeValid ? "blocked" : contract.classifyProviderHealth({ mode: rawMode, configured, adapterAvailable, outage: String(env.NEXA_WALLET_PROVIDER_OUTAGE || "") === "1", lastSuccessAt: env.NEXA_WALLET_PROVIDER_LAST_SUCCESS_AT || null });
  return Object.freeze({ mode: modeValid ? rawMode : "invalid", status, healthStatus, ready, readyForCredentials: modeValid && rawMode === "live", configured, adapterAvailable, live: rawMode === "live", timeoutMs, missing: [...new Set(missing)], reason: ready ? (rawMode === "sandbox" ? "sandbox_simulation_only" : "configured") : status });
}
module.exports = { REQUIRED_LIVE_ENV, SUPPORTED_MODES, KNOWN_ADAPTER_IDS, walletProviderReadiness };

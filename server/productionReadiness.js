"use strict";

const REQUIRED_LIVE_PAYMENT = Object.freeze(["PAYSTACK_SECRET_KEY"]);
const REQUIRED_LIVE_WALLET = Object.freeze(["NEXA_WALLET_PROVIDER", "NEXA_WALLET_WEBHOOK_SECRET"]);

function missing(env, keys) { return keys.filter((k) => !String(env?.[k] || "").trim()); }
function productionReadiness({ env = process.env, packageVersion, dbPathConfigured = false, walletAdapterAvailable = false, webhookSignatureTested = false } = {}) {
  const production = String(env.NODE_ENV || "").toLowerCase() === "production";
  const issues = [];
  if (!/^\d+\.\d+\.\d+$/.test(String(packageVersion || ""))) issues.push("invalid_release_version");
  if (production && !dbPathConfigured) issues.push("persistent_db_path_required");
  if (production && String(env.PAYMENT_MODE || "live").toLowerCase() === "mock") issues.push("mock_payments_forbidden_in_production");
  if (production) {
    const paymentMissing = missing(env, REQUIRED_LIVE_PAYMENT);
    if (paymentMissing.length) issues.push("missing_payment_provider_configuration");
    if (!webhookSignatureTested) issues.push("payment_webhook_signature_not_validated");
    const walletMissing = missing(env, REQUIRED_LIVE_WALLET);
    if (walletMissing.length || !walletAdapterAvailable) issues.push("wallet_live_provider_not_ready");
  }
  return { production, ready: issues.length === 0, issues };
}
module.exports = { REQUIRED_LIVE_PAYMENT, REQUIRED_LIVE_WALLET, productionReadiness };

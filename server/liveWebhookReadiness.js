"use strict";

function liveWebhookReadiness({ mode="sandbox", providerConfigured=false, webhookSecretConfigured=false, signatureVerificationTested=false } = {}) {
  const live = String(mode).toLowerCase() === "live";
  if (!live) return { mode:"sandbox", ready:true, blockers:[] };
  const blockers = [];
  if (!providerConfigured) blockers.push("provider_not_configured");
  if (!webhookSecretConfigured) blockers.push("webhook_secret_not_configured");
  if (!signatureVerificationTested) blockers.push("webhook_signature_not_validated");
  return { mode:"live", ready:blockers.length === 0, blockers };
}
module.exports = { liveWebhookReadiness };

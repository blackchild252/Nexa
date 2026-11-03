"use strict";

const PROVIDER_STATES = Object.freeze(["pending", "completed", "failed", "reversed"]);
const INTERNAL_SOURCES = new Set(["internal"]);

function mapProviderStatus(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (["success", "successful", "paid", "completed"].includes(raw)) return "completed";
  if (["failed", "failure", "cancelled", "canceled"].includes(raw)) return "failed";
  if (["reversed", "reversal"].includes(raw)) return "reversed";
  return "pending";
}

function reconciliationDecision(transaction = {}, provider = {}) {
  if (!transaction.providerReference || INTERNAL_SOURCES.has(String(transaction.source || ""))) {
    return { applicable: false, reason: "internal_transaction" };
  }
  const mappedStatus = mapProviderStatus(provider.status);
  const providerReference = String(provider.providerReference || transaction.providerReference);
  const referenceMatches = providerReference === String(transaction.providerReference);
  const amountMatches = provider.amountMinor == null || Number(provider.amountMinor) === Number(transaction.amountMinor);
  const currencyMatches = !provider.currency || String(provider.currency).toUpperCase() === String(transaction.currency).toUpperCase();
  return {
    applicable: true,
    mappedStatus,
    referenceMatches,
    amountMatches,
    currencyMatches,
    safeToApply: referenceMatches && amountMatches && currencyMatches,
  };
}

function buildSettlementReport(transactions = [], providerResults = []) {
  const byRef = new Map((Array.isArray(providerResults) ? providerResults : []).map((p) => [String(p.providerReference || ""), p]));
  return (Array.isArray(transactions) ? transactions : []).map((tx) => {
    const provider = byRef.get(String(tx.providerReference || ""));
    return { transactionId: tx.id, providerReference: tx.providerReference || null, decision: reconciliationDecision(tx, provider || {}) };
  });
}

module.exports = { PROVIDER_STATES, mapProviderStatus, reconciliationDecision, buildSettlementReport };

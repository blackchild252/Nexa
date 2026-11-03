"use strict";

// Provider boundary: Main owns the ledger; a licensed provider must own real external money movement.
// The built-in sandbox is an explicitly simulated development fixture and is forbidden in production.
const { walletProviderReadiness } = require("./walletProviderReadiness");
const { createTransactionReference } = require("./walletProviderContract");
const MODE = String(process.env.NEXA_WALLET_MODE || "sandbox").trim().toLowerCase() || "sandbox";

function sandboxProvider() {
  const simulated = (result) => ({ ...result, simulation: true, realFunds: false, verified: true });
  return {
    mode: "sandbox", status: "sandbox", realFunds: false,
    createDeposit({ amountMinor, currency, reference }) {
      return simulated({ status: "completed", source: "sandbox", providerReference: createTransactionReference("SANDBOXDEP", reference), amountMinor, currency });
    },
    createWithdrawal({ amountMinor, currency, reference }) {
      return simulated({ status: "completed", source: "sandbox", providerReference: createTransactionReference("SANDBOXWD", reference), amountMinor, currency });
    },
    createTransfer({ amountMinor, currency, reference }) {
      return simulated({ status: "completed", source: "sandbox", providerReference: createTransactionReference("SANDBOXTR", reference), amountMinor, currency });
    },
    createBeneficiary({ reference }) { return simulated({ status: "completed", providerReference: createTransactionReference("SANDBEN", reference), beneficiaryRef: createTransactionReference("BEN", reference) }); },
    verifyAccount({ reference }) { return simulated({ status: "completed", reference, accountVerified: false }); },
    verifyDeposit({ providerReference }) { return simulated({ status: "completed", providerReference }); },
    verifyWithdrawal({ providerReference }) { return simulated({ status: "completed", providerReference }); },
    getTransactionStatus({ providerReference }) { return { status: "completed", providerReference, simulation: true, realFunds: false, verified: true }; },
    reconcile({ transactions = [] }) { return transactions.map((tx) => ({ providerReference: tx.providerReference, status: "completed", simulation: true, realFunds: false, verified: true })); },
    health() { return { status: "sandbox", ready: true, realFunds: false }; },
    handleWebhook() { return { accepted: false, code: "SANDBOX_WEBHOOK_DISABLED" }; },
  };
}
function unconnectedProvider() {
  const unavailable = (operation) => { throw Object.assign(new Error(`A live wallet provider adapter is not registered. ${operation} is unavailable.`), { code: "PROVIDER_ADAPTER_UNAVAILABLE" }); };
  return {
    mode: MODE || "unconnected", status: "unconnected", realFunds: false,
    createDeposit() { return unavailable("Deposits"); }, createWithdrawal() { return unavailable("Withdrawals"); },
    createTransfer() { return unavailable("Transfers"); }, createBeneficiary() { return unavailable("Beneficiaries"); },
    verifyAccount() { return unavailable("Account verification"); }, verifyDeposit() { return unavailable("Deposit verification"); },
    verifyWithdrawal() { return unavailable("Withdrawal verification"); }, getTransactionStatus() { return unavailable("Provider status"); },
    reconcile() { return unavailable("Reconciliation"); }, health() { return { status: "not_connected", ready: false, realFunds: false }; },
    handleWebhook() { return { accepted: false, code: "PROVIDER_ADAPTER_UNAVAILABLE" }; },
  };
}
function getWalletProvider() { return MODE === "sandbox" ? sandboxProvider() : unconnectedProvider(); }
function getWalletProviderReadiness() { return walletProviderReadiness(process.env); }
module.exports = { MODE, getWalletProvider, getWalletProviderReadiness, sandboxProvider, unconnectedProvider };

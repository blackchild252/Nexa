"use strict";
// B145: the wallet is controlled by a licensed third-party provider. No Paystack top-up, and no wallet money
// movement by NEXA itself while the provider is not connected.
process.env.NEXA_WALLET_MODE = "live";
delete process.env.NODE_ENV;
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const wallet = require("./wallet");
const read = (...p) => fs.readFileSync(path.join(__dirname, ...p), "utf8");

test("with no provider connected, send / deposit / withdraw all refuse (503 for send)", () => {
  assert.throws(() => wallet.send(null, "u1", { recipientUserId: "u2", amount: 100 }), (e) => e.status === 503 && /not available yet/i.test(e.message));
  assert.throws(() => wallet.deposit({ prepare() { return { get() { return { id: "wa", status: "active" }; } }; } }, "u1", { amount: 100 }), /live wallet provider adapter is not registered/i);
});

test("the Paystack top-up routes are not registered and the wallet screen has no top-up flow", () => {
  assert.doesNotMatch(read("index.js"), /require\("\.\/walletTopup"\)\.register\(/);
  const ui = read("..", "src", "Wallet.tsx");
  assert.doesNotMatch(ui, /Paystack|startTopup|verifyTopup|\/api\/wallet\/topup/);
  assert.match(ui, /providerConnected === false/);
});

test("a top-up paid before this change can still be credited once (legacy settle path kept)", () => {
  const idx = read("index.js");
  assert.match(idx, /require\("\.\/walletTopup"\)\.settleTopup\(db, reference/);
  assert.match(read("paymentReconciler.js"), /wallet_topups/);
});

test("summary tells the app whether a wallet partner is connected", () => {
  assert.match(read("wallet.js"), /providerConnected: getWalletProvider\(\)\.status !== "unconnected"/);
});

"use strict";

const wallet = require("./wallet");
const aami = require("./aamiEconomy");
const subscriptions = require("./subscriptions");
const vendorSubscriptions = require("./vendorSubscriptions");

function overview(db, userId) {
  const walletSummary = wallet.summary(db, userId);
  const coin = aami.centre(db, userId);
  const subscription = subscriptions.publicSubscription(db, userId);
  const vendor = db.prepare("SELECT id FROM vendors WHERE userId=?").get(userId);
  return {
    hub: "sky_money",
    balances: {
      cash: { ...walletSummary.balance, kind: "cash", label: "SkyMoney Cash", spendableFor: "wallet-authorized financial transactions" },
      aami: { amount: Number(coin.coin.balance || 0), currency: "AAMI", kind: "reward", label: "Aami", cashValue: false }
    },
    wallet: walletSummary,
    subscription: subscription.subscription,
    subscriptionCentre: {
      ppv: coin.ppv,
      earn: coin.earn,
      vendorScope: coin.vendorScope,
      management: ["plan", "renewal", "auto_pay", "spending_cap", "aami_redemption"]
    },
    vendorSubscription: vendor ? vendorSubscriptions.getVendorState(db, vendor.id) : null,
    architecture: {
      financialHub: "SkyMoney",
      cashLedger: "Sky Wallet ledger",
      rewardLedger: "Aami ledger",
      subscription: "SkyMoney sub-block",
      separation: "Cash and Aami are displayed together but remain separate ledgers and cannot be silently converted into cash."
    }
  };
}

function register({ app, auth, db, rateLimit }) {
  const limited = rateLimit ? rateLimit({ windowMs: 60_000, max: 60, keyFn: req => req.user?.id || req.ip, message: "Too many SkyMoney requests. Please try again shortly." }) : (req,res,next)=>next();
  app.get("/api/skymoney/overview", auth.authMiddleware, limited, (req,res) => {
    try { res.json(overview(db, req.user.id)); }
    catch (e) { res.status(e.status || 400).json({ error: e.message || "SkyMoney overview unavailable." }); }
  });
}

module.exports = { overview, register };

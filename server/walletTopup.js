"use strict";
// B144 — Wallet top-up through Paystack. Funds land in the NEXA Wallet ledger and stay there for in-app use.
//
// Flow: POST /api/wallet/topup/initialize creates a pending top-up and a Paystack checkout. The wallet is credited
// only after Paystack confirms the payment (webhook charge.success, the verify route, or the pending-payment
// reconciler), with reference, currency and amount checked by the same matcher the other payment flows use.
// The credit is written once: the pending -> completed UPDATE is guarded, and the wallet transaction carries a
// unique idempotency key derived from the reference.
//
// In-app only: Paystack-funded money cannot be withdrawn, and keeps that restriction when sent to another user.
// withdrawableMinor() subtracts the restricted part (and any pending debits) from the balance.
const crypto = require("crypto");
const payments = require("./payments");
const wallet = require("./wallet");

const MIN_TOPUP_MINOR = 10_000;          // ₦100
const MAX_TOPUP_MINOR = 100_000_000;     // ₦1,000,000 per top-up
const MAX_PENDING_PER_USER = 5;

function ensureSchema(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS wallet_topups (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  amountMinor INTEGER NOT NULL CHECK (amountMinor > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  transactionId TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  completedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_user ON wallet_topups(userId, createdAt DESC);
`);
}

function parseAmountMinor(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero.");
  const scaled = amount * 100;
  const minor = Math.round(scaled);
  if (Math.abs(scaled - minor) > 1e-6) throw new Error("Amount can have at most 2 decimal places.");
  if (minor < MIN_TOPUP_MINOR) throw new Error("The minimum top-up is ₦100.");
  if (minor > MAX_TOPUP_MINOR) throw new Error("The maximum single top-up is ₦1,000,000.");
  return minor;
}

function publicTopup(row) {
  return row && { id: row.id, reference: row.reference, amount: Number(row.amountMinor) / 100, currency: row.currency, status: row.status, createdAt: row.createdAt, completedAt: row.completedAt || null };
}

function createTopup(db, userId, amountMinor) {
  ensureSchema(db);
  wallet.ensureWallet(db, userId);
  const pending = db.prepare("SELECT COUNT(*) AS n FROM wallet_topups WHERE userId=? AND status='pending' AND createdAt>?")
    .get(userId, new Date(Date.now() - 24 * 3600 * 1000).toISOString()).n;
  if (pending >= MAX_PENDING_PER_USER) throw Object.assign(new Error("You have several unfinished top-ups. Complete or wait for them before starting another."), { status: 429 });
  const t = new Date().toISOString();
  const row = { id: `wtu_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`, userId, reference: `wallet-topup-${crypto.randomBytes(10).toString("hex")}`, amountMinor, currency: "NGN" };
  db.prepare("INSERT INTO wallet_topups(id,userId,reference,amountMinor,currency,status,createdAt,updatedAt) VALUES(?,?,?,?,?,'pending',?,?)")
    .run(row.id, row.userId, row.reference, row.amountMinor, row.currency, t, t);
  return row;
}

// Credit the wallet for a confirmed Paystack payment. Safe to call repeatedly and concurrently.
// Returns { outcome, topup } where outcome is one of: credited | already_credited | mismatch | not_found.
function settleTopup(db, reference, providerResult) {
  ensureSchema(db);
  const topup = db.prepare("SELECT * FROM wallet_topups WHERE reference=?").get(String(reference || ""));
  if (!topup) return { outcome: "not_found", topup: null };
  if (topup.status === "completed") return { outcome: "already_credited", topup };
  const ok = payments.matchesExpectedPayment(providerResult, { currency: topup.currency, total: Number(topup.amountMinor) / 100, paymentRef: topup.reference }, topup.reference);
  if (!ok) return { outcome: "mismatch", topup };
  const done = db.transaction(() => {
    const t = new Date().toISOString();
    const changed = db.prepare("UPDATE wallet_topups SET status='completed',updatedAt=?,completedAt=? WHERE id=? AND status='pending'").run(t, t, topup.id);
    if (!changed.changes) return false;
    const tx = wallet.recordProviderTransaction(db, {
      userId: topup.userId, type: "deposit", direction: "credit", amountMinor: topup.amountMinor, currency: topup.currency,
      source: "paystack", reference: topup.reference, providerReference: topup.reference, idempotencyKey: `topup:${topup.reference}`,
      description: "Wallet top-up (Paystack)", metadata: { provider: "paystack", inAppOnly: true, topupId: topup.id },
    }, { status: "completed", providerReference: topup.reference });
    db.prepare("UPDATE wallet_topups SET transactionId=? WHERE id=?").run(tx.id, topup.id);
    return true;
  })();
  return { outcome: done ? "credited" : "already_credited", topup: db.prepare("SELECT * FROM wallet_topups WHERE id=?").get(topup.id) };
}

// Paystack-funded money is for in-app use only, and the restriction travels with transfers: the in-app-only part of
// a transfer is recorded in both transactions' metadata (inAppOnlyMinor). Money is treated as spent first, so the
// restricted part of a balance is min(balance, funded + restricted received - restricted sent). Only the remainder
// could ever be withdrawn. (If restricted and unrestricted money are mixed, this errs on the side of restricting.)
function inAppOnlyMinor(db, userId, currency = "NGN") {
  ensureSchema(db);
  // B144: replay the ledger in order. Paystack top-ups add restricted money, transfers move the restricted part
  // (recorded as inAppOnlyMinor on both sides), withdrawals only ever take the unrestricted part, and every other
  // spend (NEXA fees and charges) uses restricted money first. So spending a top-up frees later unrestricted money.
  const rows = db.prepare(
    "SELECT l.amountMinor AS amountMinor, t.id AS txId, t.type AS type, t.source AS source, CAST(json_extract(metadata,'$.inAppOnlyMinor') AS INTEGER) AS restrictedMinor " +
    "FROM wallet_ledger_entries l LEFT JOIN wallet_transactions t ON t.id = l.transactionId WHERE l.userId=? AND l.currency=? ORDER BY l.createdAt ASC, l.rowid ASC"
  ).all(userId, currency);
  let restricted = 0;
  for (const r of rows) {
    const amount = Number(r.amountMinor) || 0;
    if (r.txId && r.type === "deposit" && r.source === "paystack") restricted += amount;
    else if (r.txId && r.type === "transfer") restricted += (amount > 0 ? 1 : -1) * Math.max(0, Number(r.restrictedMinor) || 0);
    else if (r.txId && r.type === "withdrawal") { /* comes out of the withdrawable part */ }
    else if (amount < 0) restricted += amount;
    restricted = Math.max(0, restricted);
  }
  return Math.min(Math.max(0, wallet.balanceMinor(db, userId, currency)), restricted);
}
function withdrawableMinor(db, userId, currency = "NGN") {
  return Math.max(0, wallet.balanceMinor(db, userId, currency) - wallet.pendingDebitMinor(db, userId, currency) - inAppOnlyMinor(db, userId, currency));
}

function register({ app, auth, db, rateLimit }) {
  ensureSchema(db);
  const limited = rateLimit ? rateLimit({ windowMs: 60_000, max: 10, keyFn: (req) => req.user?.id || req.ip, message: "Too many top-up attempts. Please try again shortly." }) : (req, res, next) => next();
  const isMock = () => String(process.env.PAYMENT_MODE || "live").toLowerCase() === "mock";

  app.post("/api/wallet/topup/initialize", auth.authMiddleware, limited, async (req, res) => {
    try {
      if (!payments.isEnabled()) return res.status(409).json({ error: "Wallet top-up with Paystack is not enabled yet." });
      if (!isMock() && !process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ error: "Paystack is not configured." });
      const amountMinor = parseAmountMinor(req.body?.amount);
      const topup = createTopup(db, req.user.id, amountMinor);
      let pay;
      try {
        pay = await payments.initialize({ email: String(req.user.email), amountMinor, currency: topup.currency, reference: topup.reference, metadata: { walletTopupId: topup.id, userId: req.user.id, purpose: "wallet_topup" } });
      } catch (providerError) {
        // Paystack never gave a checkout link, so nothing can have been paid: close the row so failed starts do not
        // count toward the unfinished-top-up limit.
        db.prepare("UPDATE wallet_topups SET status='failed',updatedAt=? WHERE id=? AND status='pending'").run(new Date().toISOString(), topup.id);
        throw providerError;
      }
      if (isMock()) {
        // Development adapter only: no real funds move.
        const settled = settleTopup(db, topup.reference, { status: "success", reference: topup.reference, currency: topup.currency, amount: amountMinor });
        return res.status(201).json({ topup: publicTopup(settled.topup), payment: pay, balance: wallet.money(wallet.balanceMinor(db, req.user.id)), inAppOnly: true });
      }
      return res.status(201).json({ topup: publicTopup(db.prepare("SELECT * FROM wallet_topups WHERE id=?").get(topup.id)), payment: { checkoutUrl: pay.authorization_url, authorization_url: pay.authorization_url, reference: topup.reference }, inAppOnly: true });
    } catch (e) {
      if (e.status === 429) return res.status(429).json({ error: e.message });
      const clientError = /amount|minimum|maximum/i.test(e.message || "");
      return res.status(clientError ? 400 : 502).json({ error: clientError ? e.message : "Could not start the top-up right now. Please try again." });
    }
  });

  app.post("/api/wallet/topup/verify", auth.authMiddleware, limited, async (req, res) => {
    const reference = String(req.body?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "Payment reference is required." });
    const topup = db.prepare("SELECT * FROM wallet_topups WHERE reference=? AND userId=?").get(reference, req.user.id);
    if (!topup) return res.status(404).json({ error: "Top-up not found." });
    const balance = () => wallet.money(wallet.balanceMinor(db, req.user.id));
    if (topup.status === "completed") return res.json({ verified: true, topup: publicTopup(topup), balance: balance() });
    try {
      const result = await payments.verify(reference);
      const settled = settleTopup(db, reference, result);
      if (settled.outcome === "credited" || settled.outcome === "already_credited") return res.json({ verified: true, topup: publicTopup(settled.topup), balance: balance() });
      return res.json({ verified: false, status: result?.status || "unknown", topup: publicTopup(settled.topup || topup), balance: balance() });
    } catch (e) { return res.status(502).json({ error: "Could not verify the top-up right now." }); }
  });

  // Self-heal for a missed webhook: re-check the caller's own recent pending top-ups with Paystack.
  app.post("/api/wallet/topup/recheck", auth.authMiddleware, limited, async (req, res) => {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const pending = db.prepare("SELECT * FROM wallet_topups WHERE userId=? AND status='pending' AND createdAt>? ORDER BY createdAt DESC LIMIT 5").all(req.user.id, since);
    let credited = 0;
    for (const row of pending) {
      try { const r = settleTopup(db, row.reference, await payments.verify(row.reference)); if (r.outcome === "credited") credited += 1; } catch (_) { /* provider unavailable: leave pending */ }
    }
    res.json({ checked: pending.length, credited, balance: wallet.money(wallet.balanceMinor(db, req.user.id)) });
  });

  app.get("/api/wallet/topups", auth.authMiddleware, (req, res) => {
    const rows = db.prepare("SELECT * FROM wallet_topups WHERE userId=? ORDER BY createdAt DESC LIMIT 50").all(req.user.id);
    res.json({ topups: rows.map(publicTopup), inAppOnlyAmount: inAppOnlyMinor(db, req.user.id) / 100, withdrawableAmount: withdrawableMinor(db, req.user.id) / 100 });
  });
}

module.exports = { register, ensureSchema, createTopup, settleTopup, parseAmountMinor, inAppOnlyMinor, withdrawableMinor, publicTopup, MIN_TOPUP_MINOR, MAX_TOPUP_MINOR };

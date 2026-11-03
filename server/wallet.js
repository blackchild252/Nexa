"use strict";

const crypto = require("crypto");
const { getWalletProvider } = require("./walletProvider");
const walletHistory = require("./walletHistory");

const CURRENCY = "NGN";
const MAX_SANDBOX_AMOUNT_MINOR = 100_000_000; // ₦1,000,000 per sandbox operation.
const WALLET_MODE = String(process.env.NEXA_WALLET_MODE || "sandbox").trim().toLowerCase() || "sandbox";

// V5.9.0 B45: provider-backed wallet transactions settle the ledger only after confirmed completion.

function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`; }
function cleanCurrency(value) {
  const currency = String(value || CURRENCY).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid currency.");
  if (currency !== CURRENCY) throw new Error(`Wallet currently supports ${CURRENCY} only.`);
  return currency;
}
function toMinor(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than zero.");
  const scaled = amount * 100;
  const minor = Math.round(scaled);
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error("Invalid amount.");
  if (Math.abs(scaled - minor) > 1e-6) throw new Error("Amount can have at most 2 decimal places.");
  if (minor > MAX_SANDBOX_AMOUNT_MINOR) throw new Error("Amount exceeds the current wallet sandbox limit.");
  return minor;
}
function money(minor, currency = CURRENCY) { return { amount: Number(minor) / 100, currency }; }

function ensureWallet(db, userId, currency = CURRENCY) {
  const c = cleanCurrency(currency);
  const existing = db.prepare("SELECT * FROM wallet_accounts WHERE userId=? AND currency=?").get(userId, c);
  if (existing) return existing;
  const createdAt = now();
  const account = { id: id("wa"), userId, currency: c, status: "active", providerStatus: WALLET_MODE === "sandbox" ? "sandbox" : "unconnected", createdAt, updatedAt: createdAt };
  db.prepare("INSERT INTO wallet_accounts(id,userId,currency,status,providerStatus,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)")
    .run(account.id, account.userId, account.currency, account.status, account.providerStatus, account.createdAt, account.updatedAt);
  return account;
}

function balanceMinor(db, userId, currency = CURRENCY) {
  const c = cleanCurrency(currency);
  const row = db.prepare("SELECT COALESCE(SUM(amountMinor),0) AS balanceMinor FROM wallet_ledger_entries WHERE userId=? AND currency=?").get(userId, c);
  return Number(row?.balanceMinor || 0);
}

// B144: a pending debit (for example a withdrawal waiting on the provider) holds its amount, so the same money
// cannot be spent twice before the provider answers.
function pendingDebitMinor(db, userId, currency = CURRENCY) {
  const c = cleanCurrency(currency);
  const row = db.prepare("SELECT COALESCE(SUM(amountMinor),0) AS n FROM wallet_transactions WHERE userId=? AND currency=? AND direction='debit' AND status='pending'").get(userId, c);
  return Number(row?.n || 0);
}
function availableMinor(db, userId, currency = CURRENCY) {
  const c = cleanCurrency(currency);
  return balanceMinor(db, userId, c) - pendingDebitMinor(db, userId, c);
}

function publicTransaction(db, row) {
  if (!row) return null;
  const counterpart = row.counterpartyUserId
    ? db.prepare("SELECT id,name,username FROM users WHERE id=?").get(row.counterpartyUserId)
    : null;
  return {
    id: row.id,
    type: row.type,
    direction: row.direction,
    amount: Number(row.amountMinor) / 100,
    currency: row.currency,
    status: row.status,
    source: row.source,
    reference: row.reference,
    description: (counterpart && row.type === "transfer" && row.direction === "credit" && row.description === `Received from ${row.counterpartyUserId}`) ? `Received from ${counterpart.name || counterpart.username || "a NEXA friend"}` : (row.description || ""),
    counterparty: counterpart ? { id: counterpart.id, name: counterpart.name || "NEXA user", username: counterpart.username || null } : null,
    createdAt: row.createdAt,
    completedAt: row.completedAt || null,
  };
}

function normalizeProviderStatus(value) {
  return walletHistory.normalizeWalletTxStatus(value);
}

function recordProviderTransaction(db, input, providerResult = {}) {
  const createdAt = now();
  const transactionId = id("wtx");
  const reference = input.reference || `NEXA-${crypto.randomBytes(7).toString("hex").toUpperCase()}`;
  const normalizedStatus = normalizeProviderStatus(providerResult.status);
  const completedAt = normalizedStatus === "completed" ? createdAt : null;
  db.prepare(`INSERT INTO wallet_transactions
    (id,userId,type,direction,amountMinor,currency,status,source,counterpartyUserId,reference,providerReference,idempotencyKey,description,createdAt,completedAt,metadata)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      transactionId, input.userId, input.type, input.direction, input.amountMinor, input.currency, normalizedStatus, input.source,
      input.counterpartyUserId || null, reference, providerResult.providerReference || input.providerReference || null, input.idempotencyKey || null,
      input.description || "", createdAt, completedAt, JSON.stringify(input.metadata || {})
    );
  if (normalizedStatus === "completed") {
    db.prepare("INSERT INTO wallet_ledger_entries(id,transactionId,userId,amountMinor,currency,createdAt) VALUES(?,?,?,?,?,?)")
      .run(id("wle"), transactionId, input.userId, input.direction === "credit" ? input.amountMinor : -input.amountMinor, input.currency, createdAt);
  }
  return db.prepare("SELECT * FROM wallet_transactions WHERE id=?").get(transactionId);
}

function settleProviderTransaction(db, transactionId, nextStatus) {
  const next = normalizeProviderStatus(nextStatus);
  const row = db.prepare("SELECT * FROM wallet_transactions WHERE id=?").get(transactionId);
  if (!row) throw new Error("Wallet transaction not found.");
  if (row.status !== "pending" || next === "pending") return row;
  return db.transaction(() => {
    const completedAt = next === "completed" ? now() : null;
    const changed = db.prepare("UPDATE wallet_transactions SET status=?,completedAt=CASE WHEN ?='completed' THEN ? ELSE completedAt END WHERE id=? AND status='pending'")
      .run(next, next, completedAt, transactionId);
    if (changed.changes !== 1) return db.prepare("SELECT * FROM wallet_transactions WHERE id=?").get(transactionId);
    if (next === "completed") {
      const existingLedger = db.prepare("SELECT 1 FROM wallet_ledger_entries WHERE transactionId=? LIMIT 1").get(transactionId);
      if (!existingLedger) {
        db.prepare("INSERT INTO wallet_ledger_entries(id,transactionId,userId,amountMinor,currency,createdAt) VALUES(?,?,?,?,?,?)")
          .run(id("wle"), transactionId, row.userId, row.direction === "credit" ? row.amountMinor : -row.amountMinor, row.currency, completedAt || now());
      }
    } else if (next === "failed" || next === "reversed") {
      // Provider failure/reversal does not invent a ledger entry.
    }
    return db.prepare("SELECT * FROM wallet_transactions WHERE id=?").get(transactionId);
  })();
}

function getIdempotent(db, userId, key) {
  if (!key) return null;
  return db.prepare("SELECT * FROM wallet_transactions WHERE userId=? AND idempotencyKey=?").get(userId, key);
}
// B144: a replayed key must describe the same request; reusing it for a different one is refused, not answered
// with the old result.
function assertSameRequest(row, expect) {
  const same = row.type === expect.type && Number(row.amountMinor) === expect.amountMinor && row.currency === expect.currency
    && (expect.counterpartyUserId === undefined || String(row.counterpartyUserId || "") === String(expect.counterpartyUserId || ""));
  if (!same) throw Object.assign(new Error("This request key was already used for a different request."), { status: 409 });
}

// B145: the sandbox provider invents money. It must never run in production, whatever the env says.
function assertSandboxAllowed(provider) {
  if (provider && provider.mode === "sandbox" && String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    throw Object.assign(new Error("Sandbox wallet money is disabled in production. Use Add Money with Paystack."), { status: 403 });
  }
}

// B145: wallet features are controlled by a licensed third-party provider. Until one is connected (live mode),
// NEXA moves no wallet money itself. The sandbox adapter stays available outside production for development.
function assertProviderConnected(provider) {
  if (!provider || provider.status === "unconnected") {
    throw Object.assign(new Error("Sky Wallet is not available yet. It will open once our licensed wallet partner is connected."), { status: 503 });
  }
}

// B146 (CP2): true only when NEXA wallet money can really exist: a connected provider, or the sandbox adapter outside
// production. Where it is false (production before a wallet partner is connected) nobody can fund a wallet, so fees
// that debit the wallet are waived instead of blocking checkout. NEXA_FEES_WAIVED=1 forces the waiver, =0 forces charging.
function walletCanHoldMoney() {
  const provider = getWalletProvider();
  if (!provider || provider.status === "unconnected") return false;
  if (provider.mode === "sandbox" && String(process.env.NODE_ENV || "").toLowerCase() === "production") return false;
  return true;
}
function serviceFeesWaived() {
  const forced = String(process.env.NEXA_FEES_WAIVED || "").trim();
  if (forced === "1") return true;
  if (forced === "0") return false;
  return !walletCanHoldMoney();
}

function assertActive(db, userId, currency) {
  const account = ensureWallet(db, userId, currency);
  if (account.status !== "active") throw new Error("Wallet is not active.");
  return account;
}

function deposit(db, userId, { amount, currency = CURRENCY, idempotencyKey, description = "Sandbox wallet deposit" } = {}) {
  const c = cleanCurrency(currency); const minor = toMinor(amount);
  assertActive(db, userId, c);
  const existing = getIdempotent(db, userId, idempotencyKey);
  if (existing) { assertSameRequest(existing, { type: "deposit", amountMinor: minor, currency: c }); return { transaction: publicTransaction(db, existing), balance: money(balanceMinor(db, userId, c), c), idempotent: true }; }
  const provider = getWalletProvider();
  assertSandboxAllowed(provider);
  const reference = `DEP-${crypto.randomBytes(7).toString("hex").toUpperCase()}`;
  const providerResult = provider.createDeposit({ amountMinor: minor, currency: c, reference });
  const tx = db.transaction(() => recordProviderTransaction(db, { userId, type: "deposit", direction: "credit", amountMinor: minor, currency: c, source: providerResult.source, providerReference: providerResult.providerReference, reference, idempotencyKey, description, metadata: { providerMode: provider.mode, simulated: providerResult.simulation === true, realFunds: providerResult.realFunds === true } }, providerResult))();
  return { transaction: publicTransaction(db, tx), balance: money(balanceMinor(db, userId, c), c), idempotent: false };
}

function withdraw(db, userId, { amount, currency = CURRENCY, idempotencyKey, description = "Sandbox wallet withdrawal", feePreviewId } = {}) {
  const c = cleanCurrency(currency); const minor = toMinor(amount);
  assertActive(db, userId, c);
  const existing = getIdempotent(db, userId, idempotencyKey);
  if (existing) { assertSameRequest(existing, { type: "withdrawal", amountMinor: minor, currency: c }); return { transaction: publicTransaction(db, existing), balance: money(balanceMinor(db, userId, c), c), idempotent: true }; }
  const provider = getWalletProvider();
  assertSandboxAllowed(provider);
  const reference = `WD-${crypto.randomBytes(7).toString("hex").toUpperCase()}`;
  const tx = db.transaction(() => {
    const { chargeServiceFee } = require("./subscriptions");
    const feeKey = `wallet-withdrawal:${idempotencyKey || reference}`;
    const preview = require("./subscriptions").assertFeePreview(db, userId, feePreviewId, "wallet_withdrawal", { amountMinor: minor, currency:c });
    if (availableMinor(db, userId, c) < minor + Math.round(preview.fee.amount * 100)) throw new Error("Insufficient wallet balance for withdrawal and NEXA service fee.");
    if (minor + Math.round(preview.fee.amount * 100) > require("./walletTopup").withdrawableMinor(db, userId, c)) throw new Error("Money added with Paystack stays in your NEXA Wallet for in-app use and can't be withdrawn.");
    const fee = chargeServiceFee(db, userId, "wallet_withdrawal", { idempotencyKey:feeKey, withinTransaction:true, previewId:feePreviewId, actionAmountMinor:minor, currency:c });
    const providerResult = provider.createWithdrawal({ amountMinor: minor, currency: c, reference });
    const transaction = recordProviderTransaction(db, { userId, type: "withdrawal", direction: "debit", amountMinor: minor, currency: c, source: providerResult.source, providerReference: providerResult.providerReference, reference, idempotencyKey, description, metadata: { providerMode: provider.mode, simulated: providerResult.simulation === true, realFunds: providerResult.realFunds === true, serviceFee: fee.fee } }, providerResult);
    return { transaction, fee: fee.fee };
  })();
  return { transaction: publicTransaction(db, tx.transaction), fee: tx.fee, balance: money(balanceMinor(db, userId, c), c), idempotent: false };
}

function send(db, userId, { recipientUserId, amount, currency = CURRENCY, idempotencyKey, description = "NEXA Wallet transfer", feePreviewId } = {}) {
  const c = cleanCurrency(currency); const minor = toMinor(amount);
  if (!recipientUserId || String(recipientUserId) === String(userId)) throw new Error("Choose another NEXA user.");
  assertProviderConnected(getWalletProvider());
  assertSandboxAllowed(getWalletProvider());
  assertActive(db, userId, c);
  const existing = getIdempotent(db, userId, idempotencyKey);
  if (existing) { assertSameRequest(existing, { type: "transfer", amountMinor: minor, currency: c, counterpartyUserId: recipientUserId }); return { transaction: publicTransaction(db, existing), balance: money(balanceMinor(db, userId, c), c), idempotent: true }; }
  const friendship = db.prepare("SELECT 1 FROM friendships WHERE userId=? AND friendId=?").get(userId, recipientUserId);
  if (!friendship) throw new Error("Wallet transfers are currently limited to your Zeeza friends.");
  const recipient = db.prepare("SELECT id,name,username,accountStatus FROM users WHERE id=?").get(recipientUserId);
  if (!recipient || recipient.accountStatus === "closed") throw new Error("Recipient is unavailable.");
  assertActive(db, recipientUserId, c);
  const senderRow = db.prepare("SELECT name,username FROM users WHERE id=?").get(userId);
  const senderName = (senderRow && (senderRow.name || senderRow.username)) || "a NEXA friend";
  const reference = `NEXA-${crypto.randomBytes(7).toString("hex").toUpperCase()}`;
  const result = db.transaction(() => {
    const { chargeServiceFee, assertFeePreview } = require("./subscriptions");
    const feeKey = `wallet-transfer:${idempotencyKey || reference}`;
    const preview = assertFeePreview(db, userId, feePreviewId, "wallet_transfer", { amountMinor: minor, currency:c });
    if (availableMinor(db, userId, c) < minor + Math.round(preview.fee.amount * 100)) throw new Error("Insufficient wallet balance for transfer and NEXA service fee.");
    const fee = chargeServiceFee(db, userId, "wallet_transfer", { idempotencyKey:feeKey, withinTransaction:true, previewId:feePreviewId, actionAmountMinor:minor, currency:c });
    // B144: Paystack-funded money stays in-app wherever it goes. The part of this transfer that is in-app-only
    // (spent first, after the fee) is recorded on both sides so the recipient inherits the restriction.
    const restrictedMinor = Math.min(minor, require("./walletTopup").inAppOnlyMinor(db, userId, c));
    const createdAt = now();
    const senderId = id("wtx"); const recipientId = id("wtx");
    const senderDescription = description || "NEXA Wallet transfer";
    const insert = db.prepare(`INSERT INTO wallet_transactions
      (id,userId,type,direction,amountMinor,currency,status,source,counterpartyUserId,reference,providerReference,idempotencyKey,description,createdAt,completedAt,metadata)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    insert.run(senderId,userId,"transfer","debit",minor,c,"completed","internal",recipientUserId,reference,null,idempotencyKey,senderDescription,createdAt,createdAt,JSON.stringify({ sandbox: WALLET_MODE === "sandbox", inAppOnlyMinor: restrictedMinor }));
    insert.run(recipientId,recipientUserId,"transfer","credit",minor,c,"completed","internal",userId,reference,null,null,`Received from ${senderName}`,createdAt,createdAt,JSON.stringify({ sandbox: WALLET_MODE === "sandbox", inAppOnlyMinor: restrictedMinor }));
    const led = db.prepare("INSERT INTO wallet_ledger_entries(id,transactionId,userId,amountMinor,currency,createdAt) VALUES(?,?,?,?,?,?)");
    led.run(id("wle"),senderId,userId,-minor,c,createdAt);
    led.run(id("wle"),recipientId,recipientUserId,minor,c,createdAt);
    return { transaction: db.prepare("SELECT * FROM wallet_transactions WHERE id=?").get(senderId), fee: fee.fee };
  })();
  return { transaction: publicTransaction(db, result.transaction), fee: result.fee, balance: money(balanceMinor(db, userId, c), c), idempotent: false };
}

function reconcileProviderStatus(db, userId, transactionId) {
  const row = db.prepare("SELECT * FROM wallet_transactions WHERE id=? AND userId=?").get(transactionId, userId);
  if (!row) throw new Error("Wallet transaction not found.");
  if (row.source === "paystack") return { transaction: publicTransaction(db, row), reconciliation: { applicable: false, reason: "paystack_topup" } };
  if (!row.providerReference || row.source === "internal") return { transaction: publicTransaction(db, row), reconciliation: { applicable: false, reason: "internal_transaction" } };
  const provider = getWalletProvider();
  const verify = row.type === "deposit" ? provider.verifyDeposit : row.type === "withdrawal" ? provider.verifyWithdrawal : null;
  const result = verify ? verify.call(provider, { providerReference: row.providerReference, reference: row.reference, amountMinor: row.amountMinor, currency: row.currency }) : provider.getTransactionStatus({ providerReference: row.providerReference, reference: row.reference, amountMinor: row.amountMinor, currency: row.currency });
  const providerStatus = String(result?.status || "unknown").toLowerCase();
  const mapped = normalizeProviderStatus(providerStatus);
  let updated = false;
  if (row.status === "pending" && mapped !== "pending") {
    const before = db.prepare("SELECT status FROM wallet_transactions WHERE id=? AND userId=?").get(row.id, userId);
    const settled = settleProviderTransaction(db, row.id, mapped);
    updated = Boolean(before && settled && before.status !== settled.status);
  }
  const fresh = db.prepare("SELECT * FROM wallet_transactions WHERE id=? AND userId=?").get(row.id, userId);
  return { transaction: publicTransaction(db, fresh), reconciliation: { applicable: true, providerStatus, mappedStatus: mapped, updated } };
}

function providerTransactionStatus(db, userId, transactionId) {
  const row = db.prepare("SELECT * FROM wallet_transactions WHERE id=? AND userId=?").get(transactionId, userId);
  if (!row) throw new Error("Wallet transaction not found.");
  if (row.source === "paystack") return { transaction: publicTransaction(db, row), provider: { status: row.status, source: row.source } };
  if (!row.providerReference || row.source === "internal") return { transaction: publicTransaction(db, row), provider: { status: row.status, source: row.source } };
  const provider = getWalletProvider();
  const verify = row.type === "deposit" ? provider.verifyDeposit : row.type === "withdrawal" ? provider.verifyWithdrawal : null;
  const result = verify ? verify.call(provider, { providerReference: row.providerReference, reference: row.reference, amountMinor: row.amountMinor, currency: row.currency }) : provider.getTransactionStatus({ providerReference: row.providerReference, reference: row.reference, amountMinor: row.amountMinor, currency: row.currency });
  return { transaction: publicTransaction(db, row), provider: { mode: provider.mode, status: result.status, providerReference: result.providerReference || row.providerReference } };
}

// B144: NEXA membership and service-fee charges reduce the balance (they are ledger entries) but live in
// nexa_subscription_charges. They are shown in history as type "fee" so every balance change has a visible row.
const TX_COLUMNS = "id,userId,type,direction,amountMinor,currency,status,source,counterpartyUserId,reference,providerReference,idempotencyKey,description,createdAt,completedAt,metadata";
function feeChargesTableExists(db) { return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='nexa_subscription_charges'").get()); }
function historyRows(db, where, params, limit) {
  const fees = feeChargesTableExists(db)
    ? ` UNION ALL SELECT id,userId,'fee' AS type,'debit' AS direction,amountMinor,currency,status,'internal' AS source,NULL AS counterpartyUserId,reference,NULL AS providerReference,NULL AS idempotencyKey,COALESCE(description,'') AS description,createdAt,createdAt AS completedAt,'{}' AS metadata FROM nexa_subscription_charges WHERE ${where} AND status='completed'`
    : "";
  const all = fees ? [...params, ...params] : params;
  return db.prepare(`SELECT * FROM (SELECT ${TX_COLUMNS} FROM wallet_transactions WHERE ${where}${fees}) ORDER BY createdAt DESC, id ASC LIMIT ${limit}`).all(...all);
}
function historyPage(db, userId, query = {}) {
  const currency = cleanCurrency(query.currency || CURRENCY);
  const { from, to } = walletHistory.validateDateRange(query.from, query.to);
  const limit = walletHistory.clampHistoryLimit(query.limit);
  const cursor = walletHistory.decodeCursor(query.cursor);
  const params = [userId, currency];
  let where = "userId=? AND currency=?";
  if (from) { where += " AND createdAt>=?"; params.push(`${from}T00:00:00.000Z`); }
  if (to) { where += " AND createdAt<=?"; params.push(`${to}T23:59:59.999Z`); }
  const rows = historyRows(db, where, params, 101);
  const page = walletHistory.paginateRows(rows, limit, cursor);
  return { transactions: page.rows.map(row => publicTransaction(db, row)), hasMore: page.hasMore, nextCursor: page.nextCursor, historyFingerprint: walletHistory.transactionHistoryFingerprint(page.rows) };
}

function summary(db, userId, currency = CURRENCY) {
  const c = cleanCurrency(currency); ensureWallet(db, userId, c);
  const balance = balanceMinor(db, userId, c);
  const transactions = historyRows(db, "userId=? AND currency=?", [userId, c], 50).map(row => publicTransaction(db, row));
  const account = db.prepare("SELECT * FROM wallet_accounts WHERE userId=? AND currency=?").get(userId, c);
  const user = db.prepare("SELECT id,email,name,username FROM users WHERE id=?").get(userId);
  return { mode: WALLET_MODE, providerConnected: getWalletProvider().status !== "unconnected", identity: user ? { id:user.id, email:user.email, name:user.name || "NEXA user", username:user.username || null } : null, account: { id: account.id, currency: c, status: account.status, providerStatus: account.providerStatus }, balance: money(balance, c), transactions };
}

function friends(db, userId) {
  return db.prepare(`SELECT u.id,u.name,u.username FROM friendships f JOIN users u ON u.id=f.friendId WHERE f.userId=? AND u.accountStatus='active' ORDER BY u.name`).all(userId);
}

function createWalletRouter({ app, auth, db, rateLimit, sendPush }) {
  const limited = rateLimit ? rateLimit({ windowMs: 60_000, max: 30, keyFn: req => req.user?.id || req.ip, message: "Too many wallet actions. Please try again shortly." }) : (req,res,next)=>next();
  app.get("/api/wallet", auth.authMiddleware, (req,res) => { try { res.json(summary(db, req.user.id)); } catch (e) { res.status(400).json({ error: e.message || "Wallet unavailable." }); } });
  app.get("/api/wallet/transactions", auth.authMiddleware, (req,res) => {
    try { res.json(historyPage(db, req.user.id, req.query || {})); }
    catch(e) { res.status(400).json({error:e.message||"Wallet history unavailable."}); }
  });
  app.get("/api/wallet/friends", auth.authMiddleware, (req,res) => res.json({ friends: friends(db, req.user.id) }));
  app.post("/api/wallet/deposit", auth.authMiddleware, limited, (req,res) => {
    try { const result = deposit(db, req.user.id, req.body || {}); res.status(result.idempotent ? 200 : 201).json(result); }
    catch (e) { res.status(e.status || 400).json({ error: e.message || "Deposit could not be created." }); }
  });
  app.post("/api/wallet/withdraw", auth.authMiddleware, limited, (req,res) => {
    try { const result = withdraw(db, req.user.id, req.body || {}); res.status(result.idempotent ? 200 : 201).json(result); }
    catch (e) { const status = e.status || (/Insufficient|in-app use/.test(e.message) ? 409 : 400); res.status(status).json({ error: e.message || "Withdrawal could not be created." }); }
  });
  app.post("/api/wallet/send", auth.authMiddleware, limited, (req,res) => {
    try {
      const result = send(db, req.user.id, req.body || {});
      res.status(result.idempotent ? 200 : 201).json(result);
      if (!result.idempotent && typeof sendPush === "function") {
        try {
          const me = db.prepare("SELECT name,username FROM users WHERE id=?").get(req.user.id);
          const who = (me && (me.name || me.username)) || "A NEXA friend";
          Promise.resolve(sendPush(String(req.body.recipientUserId), "Money received", `${who} sent you ₦${Number(result.transaction.amount).toLocaleString("en-NG")}.`, { screen: "wallet", type: "wallet_transfer", dedupeKey: `wallet-transfer:${result.transaction.reference}` })).catch(() => {});
        } catch (_) { /* a push failure must never undo a completed transfer */ }
      }
    }
    catch (e) { const status = e.status || (/Insufficient/.test(e.message) ? 409 : 400); res.status(status).json({ error: e.message || "Transfer could not be completed." }); }
  });
  app.post("/api/wallet/transactions/:id/reconcile", auth.authMiddleware, limited, (req,res) => { try { return res.json(reconcileProviderStatus(db, req.user.id, req.params.id)); } catch (e) { const status = /not found/i.test(e.message) ? 404 : 409; return res.status(status).json({ error: e.message || "Provider reconciliation is unavailable." }); } });
  app.post("/api/wallet/transactions/:id/provider-status", auth.authMiddleware, limited, (req,res) => {
    try { return res.json(providerTransactionStatus(db, req.user.id, req.params.id)); }
    catch (e) { const status = /not found/i.test(e.message) ? 404 : 409; return res.status(status).json({ error: e.message || "Provider status is unavailable." }); }
  });
}

module.exports = { walletCanHoldMoney, serviceFeesWaived, createWalletRouter, deposit, withdraw, send, summary, historyPage, availableMinor, pendingDebitMinor, toMinor, balanceMinor, money, ensureWallet, providerTransactionStatus, reconcileProviderStatus, normalizeProviderStatus, recordProviderTransaction, settleProviderTransaction, WALLET_MODE, MAX_SANDBOX_AMOUNT_MINOR };

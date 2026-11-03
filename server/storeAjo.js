"use strict";

const productStock = require("./productStock");

function createStoreAjoRouter({ db, auth, payments, genRowId }) {
  const A = auth.authMiddleware;
  const now = () => new Date().toISOString();
  const cleanCurrency = (v) => String(v || "NGN").trim().toUpperCase();
  const getAjo = (id, userId) => db.prepare("SELECT * FROM money_store_ajo_accounts WHERE id=? AND userId=?").get(id, userId);
  const contributionTotal = (id) => Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM money_store_ajo_contributions WHERE ajoId=? AND status='paid'").get(id)?.total || 0);
  const ensureSchema = () => {
    const cols = db.prepare("PRAGMA table_info(money_store_ajo_accounts)").all();
    if (!cols.some(c => c.name === "discountRate")) db.exec("ALTER TABLE money_store_ajo_accounts ADD COLUMN discountRate REAL NOT NULL DEFAULT 0");
    if (!cols.some(c => c.name === "termMonths")) db.exec("ALTER TABLE money_store_ajo_accounts ADD COLUMN termMonths INTEGER NOT NULL DEFAULT 2");
    if (!cols.some(c => c.name === "variantId")) db.exec("ALTER TABLE money_store_ajo_accounts ADD COLUMN variantId TEXT");
    if (!cols.some(c => c.name === "variantLabel")) db.exec("ALTER TABLE money_store_ajo_accounts ADD COLUMN variantLabel TEXT");
    const contribCols = db.prepare("PRAGMA table_info(money_store_ajo_contributions)").all();
    if (!contribCols.some(c => c.name === "providerVerified")) db.exec("ALTER TABLE money_store_ajo_contributions ADD COLUMN providerVerified INTEGER NOT NULL DEFAULT 0");
    if (!contribCols.some(c => c.name === "feeStatus")) db.exec("ALTER TABLE money_store_ajo_contributions ADD COLUMN feeStatus TEXT NOT NULL DEFAULT 'pending'");
    if (!contribCols.some(c => c.name === "feeChargeId")) db.exec("ALTER TABLE money_store_ajo_contributions ADD COLUMN feeChargeId TEXT");
    if (!contribCols.some(c => c.name === "feePreviewId")) db.exec("ALTER TABLE money_store_ajo_contributions ADD COLUMN feePreviewId TEXT");
  };
  ensureSchema();

  function register(app) {
    const { feePreview, assertFeePreview, chargeServiceFee } = require("./subscriptions");
    app.get("/api/money/ajo/store", A, (req, res) => {
      const rows = db.prepare(`SELECT a.*, p.imageEmoji, p.imageColor, p.imageUrl
        FROM money_store_ajo_accounts a JOIN mall_products p ON p.id=a.productId
        WHERE a.userId=? ORDER BY a.createdAt DESC`).all(req.user.id);
      res.json({ accounts: rows.map(a => ({ ...a, contributed: contributionTotal(a.id), remaining: Math.max(0, Number(a.targetAmount)-contributionTotal(a.id)), contributions: db.prepare("SELECT id,amount,currency,paymentRef,status,providerVerified,feeStatus,feeChargeId,createdAt,paidAt FROM money_store_ajo_contributions WHERE ajoId=? ORDER BY createdAt DESC").all(a.id) })) });
    });

    app.post("/api/money/ajo/store", A, (req, res) => {
      const productId = String(req.body?.productId || "").trim();
      const termMonths = Number(req.body?.termMonths);
      if (!productId) return res.status(400).json({ error: "A store item is required." });
      if (!Number.isInteger(termMonths) || termMonths < 2 || termMonths > 6) return res.status(400).json({ error: "Store Ajo term must be between 2 and 6 months." });
      try {
        const result = db.transaction(() => {
          const product = db.prepare(`SELECT p.*, v.shopName AS vendorName FROM mall_products p JOIN vendors v ON v.id=p.vendorId WHERE p.id=? AND p.active=1`).get(productId);
          const variantId = req.body?.variantId ? String(req.body.variantId).trim() : null;
          if (!product) throw Object.assign(new Error("That store item is no longer available."), { status: 404 });
          if (Number(product.stock) < 1) throw Object.assign(new Error("That item is out of stock."), { status: 409 });
          const price = Number(product.salePrice != null && product.salePrice < product.price ? product.salePrice : product.price);
          if (!Number.isFinite(price) || price <= 0) throw Object.assign(new Error("This item has an invalid price."), { status: 409 });
          const currency = cleanCurrency(product.currency);
          if (currency !== "NGN") throw Object.assign(new Error("Store Ajo currently supports NGN items only."), { status: 409 });
          // Reserve one unit immediately. The reservation is released only if the account is deleted before any contribution.
          const taken = productStock.reserve(db, { productId, variantId, qty: 1, now: now() });
          if (!taken.ok) throw Object.assign(new Error(taken.message || "That item option is no longer available."), { status: 409 });
          const id = genRowId("ajo");
          const t = now();
          db.prepare(`INSERT INTO money_store_ajo_accounts
            (id,userId,productId,productName,targetAmount,currency,status,interestRate,discountRate,termMonths,variantId,variantLabel,createdAt,updatedAt)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, req.user.id, product.id, product.name, price, currency, "saving", 0, 0, termMonths, taken.variantId, taken.variantLabel, t, t);
          return db.prepare("SELECT * FROM money_store_ajo_accounts WHERE id=?").get(id);
        })();
        res.status(201).json({ account: { ...result, contributed: 0, remaining: result.targetAmount, discountRate: 0 } });
      } catch (e) {
        return res.status(e.status || 500).json({ error: e.status ? e.message : "Could not create Store Ajo account." });
      }
    });

    app.post("/api/money/ajo/store/:id/contributions", A, async (req, res) => {
      const ajo = getAjo(req.params.id, req.user.id);
      if (!ajo) return res.status(404).json({ error: "Ajo account not found." });
      if (ajo.status !== "saving") return res.status(409).json({ error: "This Ajo account is not accepting contributions." });
      const amount = Number(req.body?.amount);
      const feePreviewId = String(req.body?.feePreviewId || "").trim();
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Contribution amount must be greater than zero." });
      const current = contributionTotal(ajo.id);
      const remaining = Number((Number(ajo.targetAmount) - current).toFixed(2));
      if (amount > remaining) return res.status(400).json({ error: `Contribution exceeds the remaining ${ajo.currency} ${remaining.toFixed(2)} needed.` });
      if (!payments.isEnabled()) return res.status(409).json({ error: "Online payment is not enabled yet." });
      if (String(req.body?.email || req.user?.email || "").trim() === "") return res.status(400).json({ error: "A customer email is required for online contribution." });
      const amountMinor = Math.round(amount * 100);
      const fee = assertFeePreview(db, req.user.id, feePreviewId, "ajo_contribution", { amountMinor, currency: ajo.currency });
      if (fee.fee.amount > 0 && require("./wallet").balanceMinor(db, req.user.id, ajo.currency) < Math.round(fee.fee.amount * 100)) {
        return res.status(409).json({ error: "Add enough funds to your NEXA Wallet to cover the Ajo service fee before starting this contribution.", fee: fee.fee, preview: fee });
      }
      const reference = `nexa-ajo-${ajo.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      try {
        const pay = await payments.initialize({
          email: String(req.body?.email || req.user.email),
          amountMinor, currency: ajo.currency, reference,
          metadata: { ajoId: ajo.id, userId: req.user.id, productId: ajo.productId }
        });
        const id = genRowId("ajoc");
        const t = now();
        db.prepare(`INSERT INTO money_store_ajo_contributions
          (id,ajoId,userId,amount,currency,paymentRef,status,providerVerified,feeStatus,feeChargeId,createdAt,paidAt,feePreviewId)
          VALUES(?,?,?,?,?,?, 'pending',0,?,?,?,NULL,?)`).run(id, ajo.id, req.user.id, amount, ajo.currency, pay.reference || reference, 'pending', null, t, feePreviewId);
        if (String(process.env.PAYMENT_MODE || "live").toLowerCase() === "mock") {
          db.transaction(() => {
            const feeResult = chargeServiceFee(db, req.user.id, "ajo_contribution", { idempotencyKey: `ajo-contribution:${id}`, withinTransaction: true, previewId: db.prepare("SELECT feePreviewId FROM money_store_ajo_contributions WHERE id=?").get(id)?.feePreviewId, actionAmountMinor: Math.round(Number(amount) * 100), currency: ajo.currency });
            db.prepare("UPDATE money_store_ajo_contributions SET status='paid',providerVerified=1,feeStatus=?,feeChargeId=?,paidAt=? WHERE id=? AND userId=? AND status='pending'").run(feeResult.charged ? 'paid' : 'bundled', feeResult.charge?.id || null, t, id, req.user.id);
            finalizeAjoIfComplete(ajo.id, req.user.id);
          })();
        }
        res.json({ contribution: db.prepare("SELECT * FROM money_store_ajo_contributions WHERE id=?").get(id), payment: pay });
      } catch (e) { res.status(502).json({ error: "Could not start the Ajo contribution payment." }); }
    });

    app.post("/api/money/ajo/store/contributions/verify", A, async (req, res) => {
      const reference = String(req.body?.reference || "").trim();
      if (!reference) return res.status(400).json({ error: "Payment reference is required." });
      const contribution = db.prepare("SELECT * FROM money_store_ajo_contributions WHERE paymentRef=? AND userId=?").get(reference, req.user.id);
      if (!contribution) return res.status(404).json({ error: "Ajo contribution not found." });
      const ajo = getAjo(contribution.ajoId, req.user.id);
      if (!ajo) return res.status(404).json({ error: "Ajo account not found." });
      if (contribution.status === "paid") return res.json({ verified: true, status: "success", account: getAjo(ajo.id, req.user.id) });
      try {
        let providerVerified = Boolean(contribution.providerVerified);
        if (!providerVerified) {
          const result = String(process.env.PAYMENT_MODE || "live").toLowerCase() === "mock"
            ? { status: "success", reference, currency: contribution.currency, amount: Math.round(Number(contribution.amount) * 100) }
            : await payments.verify(reference);
          const ok = result?.status === "success" && String(result.reference || result.transaction || "") === reference && String(result.currency || "").toUpperCase() === contribution.currency && Number(result.amount) === Math.round(Number(contribution.amount) * 100);
          if (!ok) return res.json({ verified: false, status: result?.status || "unknown" });
          providerVerified = true;
        }
        const t = now();
        const result = db.transaction(() => {
          const feeResult = chargeServiceFee(db, req.user.id, "ajo_contribution", { idempotencyKey: `ajo-contribution:${contribution.id}`, withinTransaction: true, previewId: contribution.feePreviewId, actionAmountMinor: Math.round(Number(contribution.amount) * 100), currency: contribution.currency });
          const changed = db.prepare("UPDATE money_store_ajo_contributions SET status='paid',providerVerified=1,feeStatus=?,feeChargeId=?,paidAt=? WHERE id=? AND userId=? AND status='pending'").run(feeResult.charged ? 'paid' : 'bundled', feeResult.charge?.id || null, t, contribution.id, req.user.id);
          if (changed.changes) finalizeAjoIfComplete(ajo.id, req.user.id);
          return feeResult;
        })();
        res.json({ verified: true, status: "success", fee: result.fee, account: getAjo(ajo.id, req.user.id) });
      } catch (e) {
        const status = /Insufficient|monthly cap/.test(e.message || "") ? 409 : 502;
        res.status(status).json({ error: status === 409 ? e.message : "Could not verify the Ajo contribution right now." });
      }
    });

    app.post("/api/money/ajo/store/:id/pickup", A, (req, res) => {
      const ajo = getAjo(req.params.id, req.user.id);
      if (!ajo) return res.status(404).json({ error: "Ajo account not found." });
      if (ajo.status !== "ready_for_pickup") return res.status(409).json({ error: "Pickup is locked until the Ajo target is fully contributed." });
      const t = now();
      const changed = db.prepare("UPDATE money_store_ajo_accounts SET status='picked_up',updatedAt=? WHERE id=? AND userId=? AND status='ready_for_pickup'").run(t, ajo.id, req.user.id);
      if (!changed.changes) return res.status(409).json({ error: "Pickup state changed; refresh and try again." });
      res.json({ account: getAjo(ajo.id, req.user.id) });
    });

    app.delete("/api/money/ajo/store/:id", A, (req, res) => {
      const ajo = getAjo(req.params.id, req.user.id);
      if (!ajo) return res.status(404).json({ error: "Ajo account not found." });
      const paid = contributionTotal(ajo.id);
      if (paid > 0) return res.status(409).json({ error: "An Ajo account with contributions cannot be deleted." });
      if (ajo.status !== "saving") return res.status(409).json({ error: "This Ajo account cannot be deleted." });
      const t = now();
      db.transaction(() => {
        productStock.release(db, { productId: ajo.productId, variantId: ajo.variantId || null, qty: 1, now: t });
        db.prepare("DELETE FROM money_store_ajo_accounts WHERE id=? AND userId=? AND status='saving'").run(ajo.id, req.user.id);
      })();
      res.json({ deleted: true });
    });
  }

  function finalizeAjoIfComplete(id, userId) {
    const ajo = getAjo(id, userId);
    if (!ajo || ajo.status !== "saving") return;
    const total = contributionTotal(id);
    if (total + 0.00001 < Number(ajo.targetAmount)) return;
    if (ajo.orderId) {
      db.prepare("UPDATE money_store_ajo_accounts SET status='ready_for_pickup',updatedAt=? WHERE id=? AND userId=? AND status='saving'").run(now(), id, userId);
      return;
    }
    const product = db.prepare(`SELECT p.*, v.shopName AS vendorName FROM mall_products p JOIN vendors v ON v.id=p.vendorId WHERE p.id=?`).get(ajo.productId);
    if (!product) return;
    const orderId = genRowId("o");
    const itemId = genRowId("oi");
    const t = now();
    db.transaction(() => {
      db.prepare(`INSERT INTO mall_orders (id,userId,total,currency,status,deliveryAddress,note,paymentMethod,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(orderId, userId, ajo.targetAmount, ajo.currency, "placed", "Store pickup", `Store Ajo: ${ajo.productName}`, "ajo", t);
      db.prepare(`INSERT INTO mall_order_items (id,orderId,productId,vendorId,vendorName,name,price,quantity,imageEmoji,imageColor,status,paid,paidAt,variantId,variantLabel) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(itemId, orderId, ajo.productId, product.vendorId, product.vendorName, ajo.productName, ajo.targetAmount, 1, product.imageEmoji, product.imageColor, "placed", 1, t, ajo.variantId || null, ajo.variantLabel || null);
      db.prepare("UPDATE money_store_ajo_accounts SET status='ready_for_pickup',orderId=?,updatedAt=? WHERE id=? AND userId=? AND status='saving'")
        .run(orderId, t, id, userId);
    })();
  }
  return { register };
}

module.exports = { createStoreAjoRouter };

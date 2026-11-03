"use strict";

// Dependency-free deterministic workflow simulator. It exercises application
// boundaries without requiring Expo, a network, provider credentials, or a
// physical device. It deliberately uses the same domain validators/query
// normalizers as production code where possible.
const { normalizeMallQuery } = require("./mallQuery");
const payments = require("./payments");
const extensions = require("./extensions");

function createScenarioState() {
  return {
    buyer: { id: "user_buyer", email: "buyer@nexa.test" },
    vendor: { id: "user_vendor", email: "vendor@nexa.test" },
    notifications: [],
    orders: [],
    extensions: [],
    audit: [],
  };
}

function notify(state, userId, category, event, metadata = {}) {
  const entry = { userId, category, event, metadata };
  state.notifications.push(entry);
  return entry;
}

function damiMallJourney(state, utterance = "Hello Dami, can I get the cheapest top from the mall?") {
  const query = normalizeMallQuery(utterance);
  if (query.sort !== "price_asc" || query.category !== "fashion") throw new Error("Dami Mall intent did not resolve to cheapest fashion products");

  const catalog = [
    { id: "p_tee_4500", name: "Preview Classic Tee", price: 4500, currency: "NGN", stock: 25, category: "fashion" },
    { id: "p_tee_8500", name: "Preview Premium Tee", price: 8500, currency: "NGN", stock: 25, category: "fashion" },
  ];
  const product = catalog.filter(p => p.stock > 0).sort((a, b) => a.price - b.price)[0];
  if (!product) throw new Error("No authorized in-stock Mall product");
  notify(state, state.buyer.id, "Marketplace", "mall.search", { query: query.query, category: query.category, sort: query.sort });
  return { query, product };
}

function commerceJourney(state, product) {
  const reference = "preview_txn_001";
  const order = { id: "order_preview_001", userId: state.buyer.id, total: product.price, currency: product.currency, paymentMethod: "online", paymentRef: reference, status: "placed" };
  const init = payments.initialize;
  state.orders.push(order);
  notify(state, state.buyer.id, "Marketplace", "checkout.created", { orderId: order.id });
  notify(state, state.vendor.id, "Marketplace", "checkout.payment_initialized", { orderId: order.id });
  return { order, reference, initialize: init };
}

function verifyAndRefundJourney(state, order, reference) {
  const boundary = payments.validatePaymentVerificationOrder(order, reference);
  if (!boundary.ok) throw new Error(boundary.error);
  const providerResult = { status: "success", reference, currency: order.currency, amount: Math.round(order.total * 100) };
  if (!payments.matchesExpectedPayment(providerResult, order, reference)) throw new Error("Deterministic provider verification failed");
  order.status = "paid";
  notify(state, state.buyer.id, "Sky Money", "payment.verified", { orderId: order.id });
  const refund = payments.validateRefundRequest(order, 1, null, "Product no longer needed");
  if (!refund.ok) throw new Error(refund.error);
  const refundProvider = { status: "processed", transaction: reference, amount: refund.amountMinor };
  const refundCheck = payments.validateRefundProviderResult(refundProvider, reference, refund.amountMinor);
  if (!refundCheck.ok || refundCheck.status !== "processed") throw new Error("Deterministic refund validation failed");
  notify(state, state.buyer.id, "Sky Money", "refund.processed", { orderId: order.id, amountMinor: refund.amountMinor });
  return { providerResult, refund };
}

function extensionJourney(state) {
  const registration = extensions.normalizeRegistration({
    name: "Preview Mall Reader",
    slug: "preview-mall-reader",
    version: "1.0.0",
    requestedScopes: ["profile.read", "mall.read"],
    publicConfig: { locale: "en-NG" },
    compatibility: { minNexaVersion: "3.58.0", maxNexaVersion: "4.2.0" },
  });
  const extension = { id: "ext_preview_001", userId: state.buyer.id, status: "registered", ...registration };
  state.extensions.push(extension);
  const consented = [...registration.requestedScopes];
  if (!extensions.canEnable(extension, consented)) throw new Error("Extension should be enableable after explicit consent");
  extension.status = "enabled";
  if (!extensions.hasGrantedScope(extension, "mall.read", consented)) throw new Error("Granted Mall scope was not recognized");
  if (extensions.hasGrantedScope(extension, "money.read", consented)) throw new Error("Unrequested Money scope leaked through capability gate");
  state.audit.push(extensions.auditAction({ extensionId: extension.id, userId: state.buyer.id, action: "enabled", metadata: { scopes: consented } }));
  extension.status = "revoked";
  if (extensions.hasGrantedScope(extension, "mall.read", consented)) throw new Error("Revoked extension retained capability");
  state.audit.push(extensions.auditAction({ extensionId: extension.id, userId: state.buyer.id, action: "revoked" }));
  return { extension, auditCount: state.audit.length };
}

function runAll() {
  const state = createScenarioState();
  const mall = damiMallJourney(state);
  const commerce = commerceJourney(state, mall.product);
  const payment = verifyAndRefundJourney(state, commerce.order, commerce.reference);
  const extension = extensionJourney(state);
  return { state, mall, commerce, payment, extension };
}

module.exports = { createScenarioState, damiMallJourney, commerceJourney, verifyAndRefundJourney, extensionJourney, runAll };

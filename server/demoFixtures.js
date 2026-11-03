"use strict";

/**
 * NEXA Preview Demo Data Layer.
 *
 * Purpose: populate realistic, interactive-looking records for launch testing without
 * pretending they are real customer activity. This module is NEVER active unless
 * NEXA_PREVIEW_MODE=1. Every record uses a demo_* identifier/email where practical so
 * the complete pack can be removed before production launch.
 */
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("./db");
const lifestyle = require("./lifestyle");
const aami = require("./aamiEconomy");
const subscriptions = require("./subscriptions");
const verification = require("./verification");
const vendorSubscriptions = require("./vendorSubscriptions");

const PREFIX = "demo_";
const now = () => new Date().toISOString();
const id = (kind, key) => `${PREFIX}${kind}_${key}`;

const REGISTRY = Object.freeze([
  { section: "Home", demo: "Preview notifications, activity and module highlights" },
  { section: "Yaayz", demo: "Social posts, likes/comments, advert and ticket examples" },
  { section: "Zeeza", demo: "Preview profiles, friendship and conversation examples" },
  { section: "Dream Marketplace", demo: "Blaca Essentials plus clearly marked demo vendors/products" },
  { section: "Sky Money", demo: "Wallet, Aami, goals, budgets, expenses and debts preview records" },
  { section: "Subscription Centre", demo: "Regular membership preview with non-production billing state" },
  { section: "Lifestyle", demo: "Preview posts and comments" },
  { section: "Kitchen", demo: "Sample menu items for ordering-flow inspection" },
  { section: "Fitness", demo: "Preview gym listing for discovery/admin inspection" },
  { section: "Ball House", demo: "Preview-safe fallback presentation; live provider remains separate" },
  { section: "Game House", demo: "Preview-safe UI state; no fabricated gameplay claims" },
  { section: "Dami", demo: "Preview plan, memory and learning-context examples" },
  { section: "Extensions", demo: "Sample registered extension metadata" },
  { section: "Verification", demo: "Preview verification request for Admin review" },
  { section: "Admin", demo: "Preview work queue, disputes, reports, user/vendor violations and verification" },
  { section: "Vendor Dashboard", demo: "Preview vendor profile, listings, subscription period and moderation review" },
]);

function ensureUsers() {
  const users = [
    ["buyer", "demo.buyer@nexa.local", "NEXA Demo Buyer"],
    ["friend", "demo.friend@nexa.local", "NEXA Demo Friend"],
    ["social", "demo.social@nexa.local", "NEXA Demo Creator"],
    ["staff", "demo.staff@nexa.local", "NEXA Demo Staff"],
  ];
  const password = "NexaDemo!2026";
  const hash = bcrypt.hashSync(password, 10);
  for (const [key, email, name] of users) {
    const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email);
    if (existing) continue;
    db.prepare("INSERT INTO users(id,email,passwordHash,name,createdAt) VALUES(?,?,?,?,?)")
      .run(id("user", key), email, hash, name, now());
  }
  return Object.fromEntries(users.map(([key, email]) => [key, db.prepare("SELECT id FROM users WHERE email=?").get(email).id]));
}

function insertOnce(table, keyColumn, keyValue, values) {
  if (!db.prepare(`SELECT 1 FROM ${table} WHERE ${keyColumn}=?`).get(keyValue)) {
    const keys = Object.keys(values);
    const placeholders = keys.map(() => "?").join(",");
    db.prepare(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${placeholders})`).run(...keys.map(k => values[k]));
    return true;
  }
  return false;
}

function seedMarketplaceAndModeration(users) {
  const at = now();
  vendorSubscriptions.ensureSchema(db);
  const vendorUserId = users.social;
  const vendorId = id("vendor", "demo");
  insertOnce("vendors", "id", vendorId, { id: vendorId, userId: vendorUserId, shopName: "NEXA Demo Atelier", bio: "Preview-only vendor for testing seller tools and moderation.", createdAt: at, status: "active", moderationStatus: "active", moderationReason: null, moderationUpdatedAt: at });
  const productId = id("product", "atelier");
  insertOnce("mall_products", "id", productId, { id: productId, vendorId, name: "Demo Heritage Tote", description: "Preview product for testing vendor upload, product detail, basket and moderation flows.", price: 18000, currency: "NGN", category: "fashion", stock: 12, imageUrl: null, imageEmoji: "👜", imageColor: "#3B3028", active: 1, createdAt: at, updatedAt: at });
  const orderId = id("order", "buyer");
  insertOnce("mall_orders", "id", orderId, { id: orderId, userId: users.buyer, total: 18000, currency: "NGN", status: "placed", deliveryAddress: "DEMO ADDRESS — not a real delivery destination", note: "DEMO ORDER — no payment or delivery is real.", createdAt: at });
  insertOnce("mall_order_items", "id", id("order-item", "tote"), { id: id("order-item", "tote"), orderId, productId, vendorId, vendorName: "NEXA Demo Atelier", name: "Demo Heritage Tote", price: 18000, quantity: 1, imageEmoji: "👜", imageColor: "#3B3028", status: "placed" });
  insertOnce("mall_checkout_disputes", "id", id("dispute", "buyer"), { id: id("dispute", "buyer"), orderId, buyerId: users.buyer, reason: "Demo seller dispute", details: "DEMO DISPUTE — use this record to test Buyer/Seller/Admin examination and resolution.", status: "open", resolution: null, createdAt: at, updatedAt: at });
  insertOnce("social_reports", "id", id("violation", "user"), { id: id("violation", "user"), reporterId: users.buyer, targetUserId: users.friend, reason: "demo_policy_review", details: "DEMO USER VIOLATION — safe fixture for Admin examination only.", context: "preview", status: "open", createdAt: at, reviewedAt: null, reviewerId: null });
  insertOnce("mall_interaction_reports", "id", id("violation", "vendor"), { id: id("violation", "vendor"), reporterId: users.buyer, targetType: "seller", targetId: vendorUserId, reason: "demo_vendor_review", details: "DEMO VENDOR VIOLATION — safe fixture for Admin examination only.", createdAt: at, status: "open" });
  lifestyle.ensureSchema(db);
  insertOnce("lifestyle_reports", "id", id("report", "lifestyle"), { id: id("report", "lifestyle"), postId: id("life", "1"), reporterId: users.buyer, reason: "demo_review", createdAt: at, status: "open" });
  const start = at; const end = new Date(Date.now() + 86400000 * 30).toISOString();
  insertOnce("vendor_subscription_periods", "id", id("vendor-period", "active"), { id: id("vendor-period", "active"), vendorId, userId: vendorUserId, type: "FREE_LAUNCH", status: "ACTIVE", startAt: start, endAt: end, paymentReference: null, amountMinor: 0, currency: "NGN", reminderAt: new Date(Date.now() + 86400000 * 25).toISOString(), reminderSentAt: null, createdAt: at, updatedAt: at });
  return { vendorId, productId, orderId };
}

function seedSocial(users) {
  lifestyle.ensureSchema(db);
  aami.ensureSchema(db);
  const photo = "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80";
  const posts = [
    [id("yaayz", "creator-1"), users.social, "Demo Yaayz post — test double-tap likes, comments and share flows here.", photo],
    [id("yaayz", "creator-2"), users.friend, "A second preview post so the feed has real density during testing.", "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80"],
  ];
  for (const [pid, authorId, caption, mediaUrl] of posts) {
    insertOnce("yaayz_social_posts", "id", pid, { id: pid, authorId, caption, mediaUrl, status: "published", createdAt: now(), updatedAt: now() });
    insertOnce("yaayz_social_likes", "postId", pid + ":" + users.buyer, { postId: pid, userId: users.buyer, createdAt: now() });
    insertOnce("yaayz_social_comments", "id", id("comment", pid.slice(-1)), { id: id("comment", pid.slice(-1)), postId: pid, userId: users.friend, comment: "Demo comment — this is preview data only.", createdAt: now() });
  }
  insertOnce("yaayz_ads", "id", id("ad", "market"), { id: id("ad", "market"), advertiserName: "NEXA Demo Partner", title: "Preview marketplace showcase", body: "Demo advert for checking Yaayz ad placement. No commercial campaign is active.", imageUrl: null, targetUrl: "/marketplace", active: 1, createdAt: now(), updatedAt: now() });
  insertOnce("yaayz_ticket_listings", "id", id("ticket", "concert"), { id: id("ticket", "concert"), sellerId: users.social, title: "Demo Lagos Night Experience", description: "Preview ticket for testing Yaayz ticket discovery and checkout screens.", type: "event", providerName: "NEXA Demo Events", venue: "Demo Arena, Lagos", origin: null, destination: null, startsAt: new Date(Date.now() + 86400000 * 5).toISOString(), endsAt: new Date(Date.now() + 86400000 * 5 + 7200000).toISOString(), price: 12000, currency: "NGN", quantity: 40, active: 1, createdAt: now(), updatedAt: now() });
  for (const [pid] of posts) insertOnce("lifestyle_posts", "id", id("life", pid.slice(-1)), { id: id("life", pid.slice(-1)), userId: users.social, kind: "photo", caption: "Demo Lifestyle post — safe preview content for launch testing.", photo, createdAt: now() });
}

function seedMoney(users) {
  const at = now();
  insertOnce("wallet_accounts", "id", id("wallet", "buyer"), { id: id("wallet", "buyer"), userId: users.buyer, currency: "NGN", status: "active", providerStatus: "sandbox", createdAt: at, updatedAt: at });
  insertOnce("wallet_transactions", "id", id("wtx", "credit"), { id: id("wtx", "credit"), userId: users.buyer, type: "deposit", direction: "credit", amountMinor: 25000000, currency: "NGN", status: "completed", source: "demo_fixture", counterpartyUserId: null, reference: "DEMO-WALLET-CREDIT", providerReference: null, idempotencyKey: id("idem", "wallet"), description: "Demo Sky Wallet balance — no real funds.", createdAt: at, completedAt: at, metadata: JSON.stringify({ demo: true }) });
  insertOnce("wallet_ledger_entries", "id", id("wle", "credit"), { id: id("wle", "credit"), transactionId: id("wtx", "credit"), userId: users.buyer, amountMinor: 25000000, currency: "NGN", createdAt: at });
  insertOnce("financial_goals", "id", id("goal", "phone"), { id: id("goal", "phone"), userId: users.buyer, name: "Demo Travel Fund", targetAmount: 500000, currentAmount: 185000, currency: "NGN", targetDate: new Date(Date.now() + 86400000 * 120).toISOString(), note: "Preview financial goal.", status: "active", createdAt: at, updatedAt: at });
  insertOnce("expenses", "id", id("expense", "food"), { id: id("expense", "food"), userId: users.buyer, amount: 8500, currency: "NGN", category: "food", date: at.slice(0, 10), note: "Demo expense", createdAt: at });
  insertOnce("debts", "id", id("debt", "friend"), { id: id("debt", "friend"), userId: users.buyer, direction: "owed_to_me", person: "Demo Friend", amount: 25000, currency: "NGN", note: "Demo debt record", dueDate: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10), settled: 0, createdAt: at });
  aami.ensureAccount(db, users.buyer);
  insertOnce("aami_ledger", "id", id("aami", "welcome"), { id: id("aami", "welcome"), userId: users.buyer, direction: "credit", amount: 850, source: "demo_preview", reference: id("aami-ref", "welcome"), idempotencyKey: id("aami-idem", "welcome"), metadata: JSON.stringify({ demo: true, note: "Preview Aami balance" }), createdAt: at });
  db.prepare("UPDATE aami_accounts SET balance=850,updatedAt=? WHERE userId=?").run(at, users.buyer);
}

function seedSubscription(users) {
  subscriptions.ensureSchema(db);
  const at = now();
  const end = new Date(Date.now() + 86400000 * 30).toISOString();
  insertOnce("nexa_subscriptions", "id", id("sub", "buyer"), { id: id("sub", "buyer"), userId: users.buyer, planId: "regular", status: "active", autoPay: 0, currentPeriodStart: at, currentPeriodEnd: end, nextBillingAt: end, monthlyCapMinor: 600000, nextPlanId: null, createdAt: at, updatedAt: at });
}

function seedSocialConnections(users) {
  insertOnce("friendships", "userId", users.buyer, { userId: users.buyer, friendId: users.friend });
  insertOnce("friendships", "userId", users.friend, { userId: users.friend, friendId: users.buyer });
  insertOnce("chat_rooms", "id", id("room", "lounge"), { id: id("room", "lounge"), name: "Demo Lounge", ownerId: users.friend, inviteCode: "DEMO-LOUNGE", inviteExpiresAt: new Date(Date.now() + 86400000 * 7).toISOString(), createdAt: now(), updatedAt: now() });
  insertOnce("chat_room_members", "id", id("member", "buyer"), { id: id("member", "buyer"), roomId: id("room", "lounge"), userId: users.buyer, role: "member", joinedAt: now() });
  insertOnce("chat_room_members", "id", id("member", "friend"), { id: id("member", "friend"), roomId: id("room", "lounge"), userId: users.friend, role: "owner", joinedAt: now() });
  insertOnce("room_messages", "id", id("message", "hello"), { id: id("message", "hello"), roomId: id("room", "lounge"), senderId: users.friend, body: "Welcome to the NEXA demo room — try the chat controls.", createdAt: now() });
  insertOnce("notification_events", "id", id("notification", "welcome"), { id: id("notification", "welcome"), userId: users.buyer, title: "NEXA Demo Activity", body: "Preview notification — open this to test notification navigation.", type: "system", data: JSON.stringify({ demo: true, navigation: "home" }), createdAt: now(), readAt: null, dedupeKey: id("notification-key", "welcome") });
}

function seedLifestyleAndServices(users) {
  insertOnce("kitchen_menu", "key", id("menu", "jollof"), { key: id("menu", "jollof"), name: "Demo Jollof Bowl", price: 6500, currency: "NGN", active: 1, updatedAt: now() });
  insertOnce("kitchen_menu", "key", id("menu", "wrap"), { key: id("menu", "wrap"), name: "Demo Chicken Wrap", price: 5500, currency: "NGN", active: 1, updatedAt: now() });
  insertOnce("fitness_gyms", "id", id("gym", "lagos"), { id: id("gym", "lagos"), ownerId: users.buyer, name: "NEXA Demo Fitness Club", address: "Victoria Island, Lagos", city: "Lagos", websiteOrSocial: null, status: "approved", createdAt: now(), updatedAt: now() });
  verification.ensureSchema(db);
  insertOnce("verification_requests", "id", id("verification", "buyer"), { id: id("verification", "buyer"), userId: users.buyer, kind: "identity", details: "DEMO: verification review fixture. No real identity document attached.", status: "pending", reason: null, reviewedBy: null, reviewedAt: null, createdAt: now() });
  insertOnce("extensions", "id", id("extension", "demo"), { id: id("extension", "demo"), userId: users.buyer, name: "NEXA Demo Assistant Extension", slug: "nexa-demo-assistant", version: "1.0.0", description: "Preview extension for checking the Extensions section.", requestedScopes: JSON.stringify(["profile.read"]), publicConfig: JSON.stringify({ demo: true }), status: "registered", createdAt: now(), updatedAt: now() });
  insertOnce("ai_plans", "id", id("ai-plan", "launch"), { id: id("ai-plan", "launch"), userId: users.buyer, title: "Demo Launch Checklist", goal: "Preview Dami planning and task display.", steps: JSON.stringify(["Open Marketplace", "Test Aami", "Review subscription", "Check notifications"]), status: "active", createdAt: now(), updatedAt: now() });
  insertOnce("ai_memories", "id", id("memory", "coffee"), { id: id("memory", "coffee"), userId: users.buyer, content: "Demo preference: likes evening planning prompts.", category: "preference", createdAt: now(), updatedAt: now(), expiresAt: null });
}

function seedAdmin(users) {
  const at = now();
  insertOnce("admin_staff", "id", id("staff", "demo"), { id: id("staff", "demo"), userId: users.staff, label: "Demo Moderator", active: 1, capabilities: JSON.stringify(["buyer_dispute_review", "seller_dispute_review", "user_violation_review", "vendor_violation_review", "report_investigation"]), createdBy: users.buyer, createdAt: at, updatedAt: at });
  insertOnce("admin_work", "id", id("work", "report"), { id: id("work", "report"), kind: "user_violation_review", resourceId: id("user", "buyer"), capability: "user_violation_review", assignedTo: null, assignedBy: users.buyer, status: "unassigned", priority: "high", notes: "DEMO work item — examine how Admin triage works.", createdAt: at, updatedAt: at });
}

function apply({ env = process.env } = {}) {
  if (env.NEXA_PREVIEW_MODE !== "1") throw new Error("Demo fixtures require NEXA_PREVIEW_MODE=1.");
  const users = db.transaction(() => {
    const u = ensureUsers();
    seedSocial(u); seedMoney(u); seedSubscription(u); seedSocialConnections(u); seedLifestyleAndServices(u); seedMarketplaceAndModeration(u); seedAdmin(u);
    return u;
  })();
  return { mode: "development-preview-only", users, registry: REGISTRY, note: "Blaca Essentials remains an existing Marketplace showcase and is tracked separately by seedFashionVendors.js." };
}

function remove() {
  const ids = db.prepare("SELECT id FROM users WHERE id LIKE 'demo_%'").all().map(r => r.id);
  const tables = [
    "aami_ledger","aami_accounts","ai_memories","ai_plans","verification_requests","extensions",
    "notification_events","room_messages","chat_room_members","chat_rooms","friendships",
    "expenses","debts","financial_goals","wallet_ledger_entries","wallet_transactions","wallet_accounts",
    "nexa_subscription_charges","nexa_subscriptions","lifestyle_comments","lifestyle_likes","lifestyle_posts",
    "yaayz_social_comments","yaayz_social_likes","yaayz_social_shares","yaayz_social_views","yaayz_social_posts",
    "yaayz_ads","yaayz_ticket_listings","kitchen_menu","fitness_gyms","admin_work","admin_staff",
    "mall_dispute_messages","mall_dispute_refunds","mall_dispute_threads","mall_checkout_disputes","mall_order_items","mall_orders",
    "mall_interaction_reports","social_reports","lifestyle_reports","lifestyle_comment_reports","vendor_subscription_periods","vendor_subscription_payments","vendor_subscription_reminders"
  ];
  const result = db.transaction(() => {
    let deleted = 0;
    for (const table of tables) {
      try { const r = db.prepare(`DELETE FROM ${table} WHERE id LIKE 'demo_%' OR userId LIKE 'demo_%' OR authorId LIKE 'demo_%' OR sellerId LIKE 'demo_%' OR buyerId LIKE 'demo_%' OR postId LIKE 'demo_%' OR roomId LIKE 'demo_%' OR vendorId LIKE 'demo_%'`).run(); deleted += r.changes; } catch (_) {}
    }
    try { deleted += db.prepare("DELETE FROM vendors WHERE userId LIKE 'demo_%'").run().changes; } catch (_) {}
    try { deleted += db.prepare("DELETE FROM mall_products WHERE vendorId LIKE 'demo_%'").run().changes; } catch (_) {}
    try { deleted += db.prepare("DELETE FROM kitchen_menu WHERE key LIKE 'demo_%'").run().changes; } catch (_) {}
    for (const uid of ids) { try { deleted += db.prepare("DELETE FROM users WHERE id=?").run(uid).changes; } catch (_) {} }
    return deleted;
  })();
  return { removed: result };
}

function status() {
  const counts = {};
  for (const table of ["users","vendors","mall_products","yaayz_social_posts","lifestyle_posts","wallet_transactions","financial_goals","kitchen_menu","fitness_gyms","nexa_subscriptions","extensions","verification_requests","admin_work"]) {
    try { counts[table] = db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE id LIKE 'demo_%' OR userId LIKE 'demo_%' OR authorId LIKE 'demo_%' OR sellerId LIKE 'demo_%'`).get().n; } catch (_) { counts[table] = 0; }
  }
  let blaca = 0; try { blaca = db.prepare("SELECT COUNT(*) AS n FROM vendors WHERE lower(shopName)='blaca essentials'").get().n; } catch (_) {}
  return { previewMode: process.env.NEXA_PREVIEW_MODE === "1", counts, blacaEssentialsPresent: blaca > 0, registry: REGISTRY };
}

module.exports = { PREFIX, REGISTRY, apply, remove, status };

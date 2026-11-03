const path = require("path");
const Database = require("better-sqlite3");
const schemaIntegrity = require("./v5_67_0_schema_integrity");

// On a hosted server, point DB_PATH at a persistent volume (e.g. /data/nexa.db).
// Without one, the database is wiped whenever the host redeploys or restarts.
const fs = require("fs");
const configuredDbPath = String(process.env.DB_PATH || "").trim();
if (process.env.NODE_ENV === "production" && !configuredDbPath) {
  throw new Error("DB_PATH must be configured in production so the database uses persistent storage.");
}
const DB_PATH = configuredDbPath || path.join(__dirname, "nexa.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

db.exec(`
CREATE TABLE IF NOT EXISTS legal_acceptances (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  privacyPolicyVersion TEXT NOT NULL,
  termsVersion TEXT NOT NULL,
  acceptedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_accepted ON legal_acceptances(userId,acceptedAt DESC);

CREATE TABLE IF NOT EXISTS wallet_accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','locked','closed')),
  providerStatus TEXT NOT NULL DEFAULT 'sandbox',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_accounts_user_currency ON wallet_accounts(userId,currency);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','transfer')),
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  amountMinor INTEGER NOT NULL CHECK (amountMinor > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL CHECK (status IN ('pending','completed','failed','reversed')),
  source TEXT NOT NULL,
  counterpartyUserId TEXT,
  reference TEXT NOT NULL,
  providerReference TEXT,
  idempotencyKey TEXT,
  description TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  completedAt TEXT,
  metadata TEXT NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_tx_idempotency ON wallet_transactions(userId,idempotencyKey) WHERE idempotencyKey IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON wallet_transactions(userId,currency,createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_reference ON wallet_transactions(reference);

CREATE TABLE IF NOT EXISTS wallet_ledger_entries (
  id TEXT PRIMARY KEY,
  transactionId TEXT NOT NULL,
  userId TEXT NOT NULL,
  amountMinor INTEGER NOT NULL CHECK (amountMinor != 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_currency ON wallet_ledger_entries(userId,currency,createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_transaction ON wallet_ledger_entries(transactionId);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  name TEXT,
  createdAt TEXT NOT NULL
);

-- User-selected display preference only. This never changes a wallet, order,
-- transaction, fee, settlement or ledger currency and never implies FX conversion.
CREATE TABLE IF NOT EXISTS user_currency_preferences (
  userId TEXT PRIMARY KEY,
  displayCurrency TEXT NOT NULL CHECK (length(displayCurrency) = 3),
  countryCode TEXT CHECK (countryCode IS NULL OR length(countryCode) = 2),
  updatedAt TEXT NOT NULL
);

-- User-owned regional preferences affect localized display only; never financial authority.
CREATE TABLE IF NOT EXISTS user_regional_preferences (
  userId TEXT PRIMARY KEY,
  countryCode TEXT CHECK (countryCode IS NULL OR length(countryCode) = 2),
  locale TEXT NOT NULL DEFAULT 'en',
  languageCode TEXT NOT NULL DEFAULT 'en',
  updatedAt TEXT NOT NULL
);

-- Stores only validated, timestamped FX quotes; it does not fetch rates or authorize conversion.
CREATE TABLE IF NOT EXISTS fx_rate_quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fromCurrency TEXT NOT NULL CHECK (length(fromCurrency) = 3),
  toCurrency TEXT NOT NULL CHECK (length(toCurrency) = 3),
  rate TEXT NOT NULL,
  source TEXT NOT NULL,
  asOf TEXT NOT NULL,
  storedAt TEXT NOT NULL,
  CHECK (fromCurrency <> toCurrency),
  UNIQUE (fromCurrency,toCurrency,source,asOf)
);
CREATE INDEX IF NOT EXISTS idx_fx_rate_quotes_pair_freshness ON fx_rate_quotes(fromCurrency,toCurrency,asOf DESC);

-- Account lifecycle: closed accounts are retained only as anonymized transaction anchors.
`);
try { db.exec("ALTER TABLE chat_rooms ADD COLUMN discoverable INTEGER NOT NULL DEFAULT 0"); } catch (_) {}
try { db.exec("ALTER TABLE chat_rooms ADD COLUMN inviteExpiresAt TEXT"); } catch (_) {}
try { db.exec("UPDATE chat_rooms SET inviteExpiresAt = datetime('now', '+7 days') WHERE inviteExpiresAt IS NULL"); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN accountStatus TEXT NOT NULL DEFAULT 'active'"); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN locationCell TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN locationStatus TEXT NOT NULL DEFAULT 'manual'"); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN locationUpdatedAt TEXT"); } catch (_) {}

try { db.exec("ALTER TABLE users ADD COLUMN adultConfirmedAt TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN closedAt TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN emailVerifiedAt TEXT"); } catch (_) {}
// Block 03 authentication lifecycle: only token hashes are stored; raw action tokens are never persisted.
db.exec(`
CREATE TABLE IF NOT EXISTS auth_action_tokens (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify_email','password_reset')),
  tokenHash TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  consumedAt TEXT,
  ipHash TEXT NOT NULL DEFAULT '',
  userAgentHash TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_auth_action_tokens_user_purpose ON auth_action_tokens(userId,purpose,consumedAt,expiresAt);
CREATE INDEX IF NOT EXISTS idx_auth_action_tokens_expiry ON auth_action_tokens(expiresAt,consumedAt);
CREATE TABLE IF NOT EXISTS auth_login_attempts (
  id TEXT PRIMARY KEY,
  emailHash TEXT NOT NULL,
  ipHash TEXT NOT NULL,
  userId TEXT,
  success INTEGER NOT NULL CHECK (success IN (0,1)),
  createdAt TEXT NOT NULL,
  userAgentHash TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_auth_login_email_time ON auth_login_attempts(emailHash,success,createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_auth_login_user_time ON auth_login_attempts(userId,success,createdAt DESC);
`);
db.exec(`

CREATE TABLE IF NOT EXISTS ai_profile_versions (id TEXT PRIMARY KEY,profileId TEXT NOT NULL,model TEXT NOT NULL,version TEXT NOT NULL,state TEXT NOT NULL,evaluation TEXT NOT NULL,rollbackId TEXT,createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ai_training_jobs (id TEXT PRIMARY KEY,profileId TEXT NOT NULL,datasetVersion TEXT NOT NULL,provider TEXT NOT NULL,baseModel TEXT NOT NULL,state TEXT NOT NULL,packageHash TEXT NOT NULL,exampleCount INTEGER NOT NULL,candidateModel TEXT,evaluation TEXT,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_ai_training_jobs_profile_created ON ai_training_jobs(profileId,createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_ai_profile_versions_profile_created ON ai_profile_versions(profileId,createdAt DESC);
CREATE TABLE IF NOT EXISTS ai_voice_preferences (
  userId TEXT PRIMARY KEY,
  voiceStyle TEXT NOT NULL DEFAULT 'female',
  languageMode TEXT NOT NULL DEFAULT 'auto',
  languageCode TEXT NOT NULL DEFAULT 'auto',
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_avatar (
  userId TEXT PRIMARY KEY,
  config TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_personalization (
  userId TEXT PRIMARY KEY,
  tone TEXT NOT NULL DEFAULT 'natural',
  responseLength TEXT NOT NULL DEFAULT 'balanced',
  proactive INTEGER NOT NULL DEFAULT 0,
  preferredCategories TEXT NOT NULL DEFAULT '[]',
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_memory_settings (
  userId TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  retentionDays INTEGER NOT NULL DEFAULT 180,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_memories (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'preference',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  expiresAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_memories_user_updated ON ai_memories(userId, updatedAt DESC);

CREATE TABLE IF NOT EXISTS ai_plans (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL DEFAULT '',
  steps TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_plans_user_updated ON ai_plans(userId, updatedAt DESC);

-- V4.17.0 — durable Dami consequential-action confirmations.
CREATE TABLE IF NOT EXISTS ai_action_confirmations (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}',
  title TEXT NOT NULL, summary TEXT NOT NULL, createdAt TEXT NOT NULL, expiresAt TEXT NOT NULL, consumedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_action_confirmations_user_expires ON ai_action_confirmations(userId, expiresAt);

-- V4.94.0 — durable user-scoped receipts for confirmed Dami consequential actions.
CREATE TABLE IF NOT EXISTS ai_action_receipts (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL, actionId TEXT NOT NULL, type TEXT NOT NULL,
  title TEXT NOT NULL, summary TEXT NOT NULL, status TEXT NOT NULL, result TEXT, error TEXT,
  createdAt TEXT NOT NULL, completedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_action_receipts_user_completed ON ai_action_receipts(userId, completedAt DESC);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  scope TEXT NOT NULL,
  keyHash TEXT NOT NULL,
  windowStart INTEGER NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0),
  expiresAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  PRIMARY KEY (scope, keyHash)
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_expiry ON rate_limit_buckets(scope, expiresAt);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  sessionId TEXT,
  idleExpiresAt TEXT,
  lastSeenAt TEXT,
  deviceIdHash TEXT,
  deviceLabel TEXT,
  deviceMetadata TEXT,
  ipHash TEXT,
  userAgentHash TEXT,
  revokedAt TEXT,
  revocationReason TEXT,
  rotatedFromHash TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  category TEXT NOT NULL DEFAULT 'other',
  date TEXT NOT NULL,
  note TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  direction TEXT NOT NULL,
  person TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  note TEXT,
  dueDate TEXT,
  settled INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

-- Favorites vary a lot in shape (price, watching, targetPrice, lastCheckedPrice...),
-- so each row stores the whole product as JSON rather than one column per field.
CREATE TABLE IF NOT EXISTS financial_budgets (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  category TEXT,
  periodStart TEXT NOT NULL,
  periodEnd TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_user_period ON financial_budgets(userId, periodStart, periodEnd);

CREATE TABLE IF NOT EXISTS financial_goals (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  targetAmount REAL NOT NULL,
  currentAmount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  targetDate TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_updated ON financial_goals(userId, updatedAt DESC);

CREATE TABLE IF NOT EXISTS financial_planning_settings (
  userId TEXT PRIMARY KEY,
  insightsEnabled INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS market_insight_preferences (
  userId TEXT PRIMARY KEY,
  insightsEnabled INTEGER NOT NULL DEFAULT 1,
  spendingContextEnabled INTEGER NOT NULL DEFAULT 1,
  showFx INTEGER NOT NULL DEFAULT 1,
  showGold INTEGER NOT NULL DEFAULT 1,
  showEquities INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
  id TEXT NOT NULL,
  userId TEXT NOT NULL,
  data TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (id, userId)
);

CREATE TABLE IF NOT EXISTS scam_checks (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  riskLevel TEXT NOT NULL,
  summary TEXT,
  sourceKind TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  userId TEXT UNIQUE NOT NULL,
  shopName TEXT NOT NULL,
  bio TEXT,
  createdAt TEXT NOT NULL
);

-- imageUrl holds a vendor-uploaded data URL (resized/compressed client-side
-- before upload) or NULL. When NULL, the app falls back to imageEmoji on an
-- imageColor background so a product is never shown with no visual at all.
CREATE TABLE IF NOT EXISTS mall_products (
  id TEXT PRIMARY KEY,
  vendorId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  weightKg REAL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  category TEXT NOT NULL DEFAULT 'other',
  stock INTEGER NOT NULL DEFAULT 0,
  imageUrl TEXT,
  imageEmoji TEXT NOT NULL DEFAULT '📦',
  imageColor TEXT NOT NULL DEFAULT '#1a2332',
  active INTEGER NOT NULL DEFAULT 1,
  imageRev INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- One row per checkout. Line items snapshot name/price at purchase time so an
-- order stays accurate even if the vendor later edits or deletes the product.
CREATE TABLE IF NOT EXISTS mall_orders (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  total REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'placed',
  deliveryAddress TEXT,
  note TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mall_order_items (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  productId TEXT NOT NULL,
  vendorId TEXT NOT NULL,
  vendorName TEXT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  imageEmoji TEXT,
  imageColor TEXT,
  status TEXT NOT NULL DEFAULT 'placed'
);

-- Expo push tokens, one row per device. A token belongs to whoever registered
-- it most recently (a shared phone re-registers on sign-in).
CREATE TABLE IF NOT EXISTS push_tokens (
  token TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  platform TEXT,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pushtokens_user ON push_tokens(userId);

-- V3.60.2: persistent, user-scoped notification center events. Push delivery is best-effort,
-- but the in-app event remains available even when a device is offline or push delivery fails.
CREATE TABLE IF NOT EXISTS notification_events (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'system',
  data TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL,
  readAt TEXT,
  dedupeKey TEXT
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notification_events(userId, createdAt DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe ON notification_events(userId, dedupeKey) WHERE dedupeKey IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notification_events(userId, readAt, createdAt DESC);

-- V4.18: user-controlled push preferences. In-app notification history remains the source of truth.
CREATE TABLE IF NOT EXISTS notification_preferences (
  userId TEXT PRIMARY KEY,
  pushEnabled INTEGER NOT NULL DEFAULT 1,
  money INTEGER NOT NULL DEFAULT 1,
  marketplace INTEGER NOT NULL DEFAULT 1,
  social INTEGER NOT NULL DEFAULT 1,
  chat INTEGER NOT NULL DEFAULT 1,
  system INTEGER NOT NULL DEFAULT 1,
  extension INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL
);

-- V4.37.0: notification digest/quiet-hour controls. In-app history remains authoritative.
`);
try {
  const cols = db.prepare("PRAGMA table_info(notification_preferences)").all().map((c) => c.name);
  if (!cols.includes("digestEnabled")) db.exec("ALTER TABLE notification_preferences ADD COLUMN digestEnabled INTEGER NOT NULL DEFAULT 0");
  if (!cols.includes("digestFrequency")) db.exec("ALTER TABLE notification_preferences ADD COLUMN digestFrequency TEXT NOT NULL DEFAULT 'off'");
  if (!cols.includes("quietStart")) db.exec("ALTER TABLE notification_preferences ADD COLUMN quietStart TEXT");
  if (!cols.includes("quietEnd")) db.exec("ALTER TABLE notification_preferences ADD COLUMN quietEnd TEXT");
} catch (_) {}
db.exec(`

-- V3.66.1: durable per-device push delivery state. Notification history remains the source of truth.
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  eventId TEXT NOT NULL,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  nextAttemptAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  lastError TEXT,
  providerTicketId TEXT,
  receiptStatus TEXT,
  receiptAt TEXT,
  receiptCheckAt TEXT,
  UNIQUE(eventId, token)
);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_due ON notification_deliveries(status, nextAttemptAt);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_event ON notification_deliveries(eventId);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_receipt ON notification_deliveries(status, nextAttemptAt, providerTicketId);

-- Extra income a vendor logs by hand (cash sales, sales made outside the app).
-- App orders are counted from mall_order_items, so nothing is entered twice.
CREATE TABLE IF NOT EXISTS vendor_incomes (
  id TEXT PRIMARY KEY,
  vendorId TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  note TEXT,
  date TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vendorincomes_vendor ON vendor_incomes(vendorId, date);

-- V3.8: reviews. One review per purchased line item (orderItemId is UNIQUE), and only
-- once that item is delivered. productId/vendorId are copied so a review survives the
-- product being deleted and still counts toward the seller's rating.
CREATE TABLE IF NOT EXISTS mall_reviews (
  id TEXT PRIMARY KEY,
  orderItemId TEXT UNIQUE NOT NULL,
  orderId TEXT NOT NULL,
  productId TEXT NOT NULL,
  vendorId TEXT NOT NULL,
  userId TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON mall_reviews(productId, createdAt);
CREATE INDEX IF NOT EXISTS idx_reviews_vendor ON mall_reviews(vendorId, createdAt);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON mall_reviews(orderId);

-- V3.8: "watching" a Mall product. One row per (user, product). The alert fires when the
-- server sees the price drop or the product come back in stock, so nothing polls.
CREATE TABLE IF NOT EXISTS mall_watches (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  productId TEXT NOT NULL,
  targetPrice REAL,
  priceAtWatch REAL NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE (userId, productId)
);
CREATE INDEX IF NOT EXISTS idx_watches_product ON mall_watches(productId);

-- V3.8: every alert is stored, so it shows in the app even when push is unavailable.
CREATE TABLE IF NOT EXISTS mall_alerts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  productId TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  price REAL,
  createdAt TEXT NOT NULL,
  readAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON mall_alerts(userId, createdAt);

CREATE TABLE IF NOT EXISTS mall_order_events (
  id TEXT PRIMARY KEY, orderId TEXT NOT NULL, actorId TEXT NOT NULL,
  fromStatus TEXT, toStatus TEXT NOT NULL, note TEXT, createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mall_order_events_order ON mall_order_events(orderId, createdAt);
CREATE TABLE IF NOT EXISTS mall_order_idempotency (
  buyerId TEXT NOT NULL, requestKey TEXT NOT NULL, orderId TEXT NOT NULL,
  createdAt TEXT NOT NULL, PRIMARY KEY (buyerId, requestKey)
);
CREATE TABLE IF NOT EXISTS mall_checkout_idempotency (
  buyerId TEXT NOT NULL, requestKey TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'processing',
  responseJson TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
  PRIMARY KEY (buyerId, requestKey)
);
CREATE INDEX IF NOT EXISTS idx_mall_checkout_idempotency_created ON mall_checkout_idempotency(createdAt);
CREATE TABLE IF NOT EXISTS mall_payment_events (
  eventKey TEXT PRIMARY KEY, reference TEXT NOT NULL, eventType TEXT NOT NULL,
  receivedAt TEXT NOT NULL, outcome TEXT NOT NULL DEFAULT 'received'
);
`);
try { db.exec("ALTER TABLE mall_payment_events ADD COLUMN bodyHash TEXT"); } catch (_) {}
db.exec(`
CREATE INDEX IF NOT EXISTS idx_mall_payment_events_reference ON mall_payment_events(reference, receivedAt);

-- V3.50.3: refund request/provider tracking and checkout dispute records.
CREATE TABLE IF NOT EXISTS mall_refunds (
  id TEXT PRIMARY KEY, orderId TEXT NOT NULL, buyerId TEXT NOT NULL, reference TEXT NOT NULL,
  amount REAL NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT NOT NULL, providerReference TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mall_refunds_buyer ON mall_refunds(buyerId, createdAt);
CREATE INDEX IF NOT EXISTS idx_mall_refunds_order ON mall_refunds(orderId);
CREATE TABLE IF NOT EXISTS mall_checkout_disputes (
  id TEXT PRIMARY KEY, orderId TEXT NOT NULL, buyerId TEXT NOT NULL, reason TEXT NOT NULL,
  details TEXT, status TEXT NOT NULL DEFAULT 'open', resolution TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mall_checkout_disputes_buyer ON mall_checkout_disputes(buyerId, createdAt);

CREATE INDEX IF NOT EXISTS idx_mallorders_user ON mall_orders(userId);
CREATE INDEX IF NOT EXISTS idx_mallorderitems_order ON mall_order_items(orderId);
CREATE INDEX IF NOT EXISTS idx_mallorderitems_product ON mall_order_items(productId);
`);
try { db.exec("ALTER TABLE mall_order_items ADD COLUMN inventoryReleasedAt TEXT"); } catch (_) {}
db.exec(`


-- V3.86.1: Yaayz unified adverts/tickets. Ticket inventory is server-owned and
-- purchases remain authenticated, quantity-bounded, and payment-gated.
CREATE TABLE IF NOT EXISTS yaayz_ticket_listings (
  id TEXT PRIMARY KEY,
  sellerId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'event',
  providerName TEXT,
  venue TEXT,
  origin TEXT,
  destination TEXT,
  startsAt TEXT,
  endsAt TEXT,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  quantity INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_yaayz_tickets_type ON yaayz_ticket_listings(type, active, startsAt);
CREATE INDEX IF NOT EXISTS idx_yaayz_tickets_seller ON yaayz_ticket_listings(sellerId, createdAt);

CREATE TABLE IF NOT EXISTS yaayz_ticket_orders (
  id TEXT PRIMARY KEY,
  ticketId TEXT NOT NULL,
  buyerId TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  total REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending_payment',
  paymentRef TEXT,
  ticketCode TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_yaayz_ticket_orders_payment ON yaayz_ticket_orders(paymentRef) WHERE paymentRef IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_yaayz_ticket_orders_buyer ON yaayz_ticket_orders(buyerId, createdAt);
CREATE INDEX IF NOT EXISTS idx_yaayz_ticket_orders_ticket ON yaayz_ticket_orders(ticketId, createdAt);

CREATE TABLE IF NOT EXISTS yaayz_ads (
  id TEXT PRIMARY KEY,
  advertiserName TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  imageUrl TEXT,
  targetUrl TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_yaayz_ads_active ON yaayz_ads(active, createdAt);

-- V3.87.1: Leisure Arena / Kitchen. Orders are authenticated and payment-gated;
-- receipts/referrals/cashback are server-owned records.
CREATE TABLE IF NOT EXISTS kitchen_menu (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  active INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kitchen_orders (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  items TEXT NOT NULL,
  total REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending_payment',
  paymentRef TEXT,
  receiptImage TEXT,
  referralCode TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kitchen_orders_payment ON kitchen_orders(paymentRef) WHERE paymentRef IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_user ON kitchen_orders(userId,createdAt);
`);
try {
  const kitchenOrderCols = db.prepare("PRAGMA table_info(kitchen_orders)").all().map((c) => c.name);
  if (!kitchenOrderCols.includes("providerVerified")) db.exec("ALTER TABLE kitchen_orders ADD COLUMN providerVerified INTEGER NOT NULL DEFAULT 0");
  if (!kitchenOrderCols.includes("feeStatus")) db.exec("ALTER TABLE kitchen_orders ADD COLUMN feeStatus TEXT NOT NULL DEFAULT 'pending'");
  if (!kitchenOrderCols.includes("feeChargeId")) db.exec("ALTER TABLE kitchen_orders ADD COLUMN feeChargeId TEXT");
  if (!kitchenOrderCols.includes("feePreviewId")) db.exec("ALTER TABLE kitchen_orders ADD COLUMN feePreviewId TEXT");
} catch (_) {}
db.exec(`
CREATE TABLE IF NOT EXISTS kitchen_referrals (
  id TEXT PRIMARY KEY,
  ownerId TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kitchen_cashback_ledger (
  id TEXT PRIMARY KEY,
  beneficiaryId TEXT NOT NULL,
  sourceOrderId TEXT UNIQUE NOT NULL,
  referredByUserId TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'available',
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kitchen_cashback_user ON kitchen_cashback_ledger(beneficiaryId,createdAt);


CREATE INDEX IF NOT EXISTS idx_mallproducts_vendor ON mall_products(vendorId);
CREATE INDEX IF NOT EXISTS idx_mallproducts_category ON mall_products(category);
CREATE INDEX IF NOT EXISTS idx_mallproducts_created ON mall_products(createdAt, id);

CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(userId);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(userId);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(userId);
CREATE INDEX IF NOT EXISTS idx_scamchecks_user ON scam_checks(userId);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);
`);

try { db.exec("ALTER TABLE ai_voice_preferences ADD COLUMN languageCode TEXT NOT NULL DEFAULT 'auto'"); } catch (_) {}
try { db.exec("UPDATE ai_voice_preferences SET languageCode = CASE languageMode WHEN 'nigerian' THEN 'en' WHEN 'pidgin' THEN 'pcm' ELSE 'auto' END WHERE languageCode = 'auto'"); } catch (_) {}

// V3.58 Extension Framework: user-owned extension metadata, explicit consent, and audit trail.
db.exec(`
CREATE TABLE IF NOT EXISTS extensions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  requestedScopes TEXT NOT NULL DEFAULT '[]',
  publicConfig TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'registered',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_extensions_user_slug ON extensions(userId, slug);
CREATE INDEX IF NOT EXISTS idx_extensions_user_status ON extensions(userId, status);

CREATE TABLE IF NOT EXISTS extension_consents (
  extensionId TEXT NOT NULL,
  userId TEXT NOT NULL,
  scope TEXT NOT NULL,
  grantedAt TEXT NOT NULL,
  revokedAt TEXT,
  PRIMARY KEY (extensionId, userId, scope)
);
CREATE INDEX IF NOT EXISTS idx_extension_consents_user ON extension_consents(userId, extensionId);

CREATE TABLE IF NOT EXISTS extension_audit_log (
  id TEXT PRIMARY KEY,
  extensionId TEXT NOT NULL,
  userId TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_extension_audit_extension ON extension_audit_log(extensionId, createdAt DESC);

CREATE TABLE IF NOT EXISTS extension_identities (
  id TEXT PRIMARY KEY, extensionId TEXT NOT NULL, userId TEXT NOT NULL, clientId TEXT NOT NULL UNIQUE,
  keyHash TEXT NOT NULL UNIQUE, keyPrefix TEXT NOT NULL, createdAt TEXT NOT NULL, lastUsedAt TEXT, revokedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_extension_identities_extension ON extension_identities(extensionId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_extension_identities_user ON extension_identities(userId, extensionId);

CREATE TABLE IF NOT EXISTS extension_review_submissions (
  id TEXT PRIMARY KEY,
  extensionId TEXT NOT NULL,
  userId TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  developerNotes TEXT NOT NULL DEFAULT '',
  reviewerId TEXT,
  reviewerNotes TEXT NOT NULL DEFAULT '',
  submittedAt TEXT NOT NULL,
  reviewedAt TEXT,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_extension_review_owner ON extension_review_submissions(userId, submittedAt DESC);
CREATE INDEX IF NOT EXISTS idx_extension_review_status ON extension_review_submissions(status, submittedAt ASC);
`);

// V3.62.2 unified platform event correlation. Request IDs link security, operations, and module events without storing secrets.
db.exec(`
CREATE TABLE IF NOT EXISTS platform_event_log (
  id TEXT PRIMARY KEY, requestId TEXT NOT NULL, userId TEXT, action TEXT NOT NULL,
  entityType TEXT, entityId TEXT, metadata TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_platform_event_request ON platform_event_log(requestId, createdAt ASC);
CREATE INDEX IF NOT EXISTS idx_platform_event_user ON platform_event_log(userId, createdAt DESC);
`);

// V5.8.0 B44: bounded severity for operational event triage.
try { db.exec("ALTER TABLE platform_event_log ADD COLUMN severity TEXT NOT NULL DEFAULT 'info'"); } catch (_) {}
db.exec("CREATE INDEX IF NOT EXISTS idx_platform_event_severity ON platform_event_log(severity, createdAt DESC)");

// V5.72.0 B113: additive session lifecycle integrity migration.
for (const sql of [
  "ALTER TABLE sessions ADD COLUMN sessionId TEXT",
  "ALTER TABLE sessions ADD COLUMN idleExpiresAt TEXT",
  "ALTER TABLE sessions ADD COLUMN lastSeenAt TEXT",
  "ALTER TABLE sessions ADD COLUMN deviceIdHash TEXT",
  "ALTER TABLE sessions ADD COLUMN deviceLabel TEXT",
  "ALTER TABLE sessions ADD COLUMN deviceMetadata TEXT",
  "ALTER TABLE sessions ADD COLUMN ipHash TEXT",
  "ALTER TABLE sessions ADD COLUMN userAgentHash TEXT",
  "ALTER TABLE sessions ADD COLUMN revokedAt TEXT",
  "ALTER TABLE sessions ADD COLUMN revocationReason TEXT",
  "ALTER TABLE sessions ADD COLUMN rotatedFromHash TEXT",
  // V6.1.93 B539: set only when a session passed the admin Zeeza sign-in code. NULL means no admin or staff privilege.
  "ALTER TABLE sessions ADD COLUMN adminVerifiedAt TEXT",
  // M7772: set only when a session passed direct 2FA. Separate from adminVerifiedAt on purpose: it grants no admin privilege and is never read by admin checks.
  "ALTER TABLE sessions ADD COLUMN twoFactorVerifiedAt TEXT"
]) { try { db.exec(sql); } catch (_) {} }
db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(sessionId) WHERE sessionId IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(userId, expiresAt, revokedAt);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON sessions(userId, deviceIdHash);
`);


// V3.59.1 compatibility metadata for extension/platform negotiation.
for (const stmt of [
  "ALTER TABLE extensions ADD COLUMN minNexaVersion TEXT NOT NULL DEFAULT '3.58.0'",
  "ALTER TABLE extensions ADD COLUMN maxNexaVersion TEXT NOT NULL DEFAULT ''",
]) { try { db.exec(stmt); } catch (_) {} }

// V3.40.2 AI hub: owner-scoped workflow, task, calendar, and knowledge data.
db.exec(`
CREATE TABLE IF NOT EXISTS ai_workflows (id TEXT PRIMARY KEY,userId TEXT NOT NULL,title TEXT NOT NULL,steps TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_ai_workflows_user ON ai_workflows(userId,updatedAt DESC);
CREATE TABLE IF NOT EXISTS ai_workflow_runs (id TEXT PRIMARY KEY,workflowId TEXT NOT NULL,userId TEXT NOT NULL,result TEXT NOT NULL,createdAt TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_runs_user ON ai_workflow_runs(userId,createdAt DESC);
CREATE TABLE IF NOT EXISTS ai_workflow_idempotency (workflowId TEXT NOT NULL,userId TEXT NOT NULL,idempotencyKey TEXT NOT NULL,result TEXT NOT NULL,createdAt TEXT NOT NULL,PRIMARY KEY(workflowId,userId,idempotencyKey));
CREATE INDEX IF NOT EXISTS idx_ai_workflow_idempotency_user ON ai_workflow_idempotency(userId,createdAt DESC);
CREATE TABLE IF NOT EXISTS ai_calendar_events (id TEXT PRIMARY KEY,userId TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',startAt TEXT NOT NULL,endAt TEXT,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_ai_calendar_user_start ON ai_calendar_events(userId,startAt);
CREATE TABLE IF NOT EXISTS ai_tasks (id TEXT PRIMARY KEY,userId TEXT NOT NULL,title TEXT NOT NULL,dueAt TEXT,completed INTEGER NOT NULL DEFAULT 0,createdAt TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_user_due ON ai_tasks(userId,completed,dueAt);
CREATE TABLE IF NOT EXISTS ai_notes (id TEXT PRIMARY KEY,userId TEXT NOT NULL,content TEXT NOT NULL,createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ai_knowledge (id TEXT PRIMARY KEY,userId TEXT NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL,type TEXT NOT NULL DEFAULT 'text/plain',createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ai_dami_audit_events (id TEXT PRIMARY KEY,userId TEXT NOT NULL,eventType TEXT NOT NULL,resourceType TEXT NOT NULL,resourceId TEXT,metadata TEXT NOT NULL DEFAULT '{}',createdAt TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_ai_dami_audit_user_created ON ai_dami_audit_events(userId,createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_user ON ai_knowledge(userId,updatedAt DESC);
`);
if (!db.prepare("PRAGMA table_info(ai_knowledge)").all().some((column) => column.name === "type")) {
  db.exec("ALTER TABLE ai_knowledge ADD COLUMN type TEXT NOT NULL DEFAULT 'text/plain'");
}

// Migration: order-item status was added after the first checkout release.
if (!db.prepare("PRAGMA table_info(mall_order_items)").all().some((c) => c.name === "status")) {
  db.exec("ALTER TABLE mall_order_items ADD COLUMN status TEXT NOT NULL DEFAULT 'placed'");
}

// Migration: imageRev versions a product's photo URL so it can be cached forever.
if (!db.prepare("PRAGMA table_info(mall_products)").all().some((c) => c.name === "imageRev")) {
  db.exec("ALTER TABLE mall_products ADD COLUMN imageRev INTEGER NOT NULL DEFAULT 0");
}
if (!db.prepare("PRAGMA table_info(mall_products)").all().some((c) => c.name === "aiModerationStatus")) db.exec("ALTER TABLE mall_products ADD COLUMN aiModerationStatus TEXT NOT NULL DEFAULT 'approved'");
if (!db.prepare("PRAGMA table_info(mall_products)").all().some((c) => c.name === "aiModerationReason")) db.exec("ALTER TABLE mall_products ADD COLUMN aiModerationReason TEXT");
if (!db.prepare("PRAGMA table_info(mall_products)").all().some((c) => c.name === "aiModeratedAt")) db.exec("ALTER TABLE mall_products ADD COLUMN aiModeratedAt TEXT");

// Migration (V3.7): payment tracking. Buyers currently pay the seller directly, so
// "paid" is recorded per item (each vendor confirms their own money).
{
  const itemCols = db.prepare("PRAGMA table_info(mall_order_items)").all().map((c) => c.name);
  if (!itemCols.includes("paid")) db.exec("ALTER TABLE mall_order_items ADD COLUMN paid INTEGER NOT NULL DEFAULT 0");
  if (!itemCols.includes("paidAt")) db.exec("ALTER TABLE mall_order_items ADD COLUMN paidAt TEXT");
  const orderCols = db.prepare("PRAGMA table_info(mall_orders)").all().map((c) => c.name);
  if (!orderCols.includes("paymentMethod")) db.exec("ALTER TABLE mall_orders ADD COLUMN paymentMethod TEXT NOT NULL DEFAULT 'pay_seller'");
  if (!orderCols.includes("paymentRef")) db.exec("ALTER TABLE mall_orders ADD COLUMN paymentRef TEXT");
  // V3.96: marketplace service-fee settlement state. Provider verification and
  // NEXA fee settlement are tracked separately so an externally paid order can
  // safely wait for Wallet funding without being falsely marked fully paid.
  if (!orderCols.includes("providerVerified")) db.exec("ALTER TABLE mall_orders ADD COLUMN providerVerified INTEGER NOT NULL DEFAULT 0");
  if (!orderCols.includes("feeStatus")) db.exec("ALTER TABLE mall_orders ADD COLUMN feeStatus TEXT NOT NULL DEFAULT 'pending'");
  if (!orderCols.includes("feeChargeId")) db.exec("ALTER TABLE mall_orders ADD COLUMN feeChargeId TEXT");
  if (!orderCols.includes("feePreviewId")) db.exec("ALTER TABLE mall_orders ADD COLUMN feePreviewId TEXT");
}

// V3.97: Yaayz ticket service-fee settlement state. Provider payment and NEXA
// Wallet fee settlement remain separate so verified tickets can safely wait for
// Wallet funding without being falsely represented as fully settled.
{
  const ticketOrderCols = db.prepare("PRAGMA table_info(yaayz_ticket_orders)").all().map((c) => c.name);
  if (!ticketOrderCols.includes("providerVerified")) db.exec("ALTER TABLE yaayz_ticket_orders ADD COLUMN providerVerified INTEGER NOT NULL DEFAULT 0");
  if (!ticketOrderCols.includes("feeStatus")) db.exec("ALTER TABLE yaayz_ticket_orders ADD COLUMN feeStatus TEXT NOT NULL DEFAULT 'pending'");
  if (!ticketOrderCols.includes("feeChargeId")) db.exec("ALTER TABLE yaayz_ticket_orders ADD COLUMN feeChargeId TEXT");
  if (!ticketOrderCols.includes("feePreviewId")) db.exec("ALTER TABLE yaayz_ticket_orders ADD COLUMN feePreviewId TEXT");
  if (!ticketOrderCols.includes("reservationExpiresAt")) db.exec("ALTER TABLE yaayz_ticket_orders ADD COLUMN reservationExpiresAt TEXT");
}


// Migration (V3.9): buyer-confirmed delivery. deliveredAt is when the seller marked the item delivered;
// receivedAt is when the buyer confirmed it arrived; disputedAt is set if the buyer says it did not.
// Items already delivered before this release start their own confirmation window from now, except
// items that already carry a review, which count as confirmed (they were reviewable under the old rules).
{
  const cols = db.prepare("PRAGMA table_info(mall_order_items)").all().map((c) => c.name);
  if (!cols.includes("deliveredAt")) {
    db.exec("ALTER TABLE mall_order_items ADD COLUMN deliveredAt TEXT");
    db.exec("ALTER TABLE mall_order_items ADD COLUMN receivedAt TEXT");
    db.exec("ALTER TABLE mall_order_items ADD COLUMN disputedAt TEXT");
    const now = new Date().toISOString();
    db.prepare("UPDATE mall_order_items SET deliveredAt = ? WHERE status = 'delivered'").run(now);
    db.prepare("UPDATE mall_order_items SET receivedAt = ? WHERE status = 'delivered' AND id IN (SELECT orderItemId FROM mall_reviews)").run(now);
  }
}

// Migration (V3.11): a seller can answer each review once, publicly. The reply lives on the review row,
// so it disappears with the review and never outlives it. sellerRepliedAt is the time of the last save.
if (!db.prepare("PRAGMA table_info(mall_reviews)").all().some((c) => c.name === "sellerReply")) {
  db.exec("ALTER TABLE mall_reviews ADD COLUMN sellerReply TEXT");
  db.exec("ALTER TABLE mall_reviews ADD COLUMN sellerRepliedAt TEXT");
}

// V5.98.48: review moderation visibility is explicit so removed/invalid reviews never count toward public ratings.
if (!db.prepare("PRAGMA table_info(mall_reviews)").all().some((c) => c.name === "moderationStatus")) {
  db.exec("ALTER TABLE mall_reviews ADD COLUMN moderationStatus TEXT NOT NULL DEFAULT 'published'");
}
db.exec("CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON mall_reviews(productId, moderationStatus, createdAt)");
db.exec("CREATE INDEX IF NOT EXISTS idx_reviews_vendor_status ON mall_reviews(vendorId, moderationStatus, createdAt)");
db.exec(`CREATE TABLE IF NOT EXISTS mall_review_moderation_events (
  id TEXT PRIMARY KEY,
  reviewId TEXT NOT NULL,
  actorId TEXT NOT NULL,
  fromStatus TEXT NOT NULL,
  toStatus TEXT NOT NULL,
  reason TEXT,
  createdAt TEXT NOT NULL
)`);
db.exec("CREATE INDEX IF NOT EXISTS idx_review_moderation_events_review ON mall_review_moderation_events(reviewId, createdAt, id)");

// Migration (V3.12): dispute follow-up. A thread opens on an item the buyer already marked
// "not received" (item.disputedAt) — this does not introduce a new place disputes start,
// it just gives the existing dead end somewhere to go.
//   open                       just filed, nobody has proposed a resolution
//   pending_buyer_confirmation seller says it's handled; waiting on the buyer to agree
//   resolved                   buyer confirmed
//   refunded                   seller logged a refund (terminal; no buyer confirmation needed
//                              since the amount itself is the record)
// One thread per order item (orderItemId is UNIQUE): reopening a dispute reuses the same thread
// rather than starting a new one, so the history isn't lost.
db.exec(`
CREATE TABLE IF NOT EXISTS mall_dispute_threads (
  id TEXT PRIMARY KEY,
  orderItemId TEXT UNIQUE NOT NULL,
  orderId TEXT NOT NULL,
  buyerId TEXT NOT NULL,
  vendorId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_disputethreads_buyer ON mall_dispute_threads(buyerId);
CREATE INDEX IF NOT EXISTS idx_disputethreads_vendor ON mall_dispute_threads(vendorId);

CREATE TABLE IF NOT EXISTS mall_dispute_messages (
  id TEXT PRIMARY KEY,
  threadId TEXT NOT NULL,
  senderRole TEXT NOT NULL, -- 'buyer' | 'seller'
  body TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_disputemsgs_thread ON mall_dispute_messages(threadId, createdAt);

-- Logs that the seller says they refunded the buyer directly; NEXA doesn't hold or move the
-- money (payment is still seller-direct, same as mall_orders.paymentMethod = 'pay_seller'),
-- so this is a record, not a transaction. One per thread.
CREATE TABLE IF NOT EXISTS mall_dispute_refunds (
  id TEXT PRIMARY KEY,
  threadId TEXT UNIQUE NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  note TEXT,
  loggedAt TEXT NOT NULL
);
`);

// Migration (V3.13): discounts. salePrice/saleEndsAt are nullable columns on the product itself —
// `price` stays the real/regular price, so nothing is destructive and a sale reverts itself the
// moment saleEndsAt passes, with no scheduler (same "nothing polls" approach mall_watches already
// uses): effectivePrice() in index.js checks the timestamp at read time, on every request.
{
  const cols = db.prepare("PRAGMA table_info(mall_products)").all().map((c) => c.name);
  if (!cols.includes("salePrice")) db.exec("ALTER TABLE mall_products ADD COLUMN salePrice REAL");
  if (!cols.includes("saleEndsAt")) db.exec("ALTER TABLE mall_products ADD COLUMN saleEndsAt TEXT");
  // M7245–M7248: nullable migration preserves existing listings; new vendor-created listings
  // require a valid weight at the API boundary. Legacy rows stay readable until vendors update them.
  if (!cols.includes("weightKg")) db.exec("ALTER TABLE mall_products ADD COLUMN weightKg REAL");
}

// Migration (B144 WIP8): extra product photos. The cover photo stays on mall_products.imageUrl
// (so every existing reader keeps working); additional photos live here, ordered by position.
db.exec(`
CREATE TABLE IF NOT EXISTS mall_product_images (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  position INTEGER NOT NULL,
  imageData TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mallproductimages_product ON mall_product_images(productId, position);

-- Server-owned AI beautifier previews. The token is single-use and expires so the client
-- cannot substitute an arbitrary image during approval or reuse an old preview indefinitely.
CREATE TABLE IF NOT EXISTS vendor_ai_image_previews (
  token TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  vendorId TEXT NOT NULL,
  sourceIndex INTEGER NOT NULL,
  sourceHash TEXT NOT NULL,
  previewHash TEXT NOT NULL,
  previewData TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  usedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_vendor_ai_previews_product ON vendor_ai_image_previews(productId, vendorId, expiresAt);
`);

// Migration (B144 WIP9): size/colour variants with per-variant stock, and the variant chosen on
// each order line. server/productStock.js owns the schema and every stock change.
require("./productStock").ensureSchema(db);

// Migration (V3.14): shared money ledgers. One ledger, three kinds of group:
//   split  friends/housemates sharing costs — "who owes whom", with suggested settle-up payments
//   pot    a shared pool — members contribute, the owner records spending and payouts
//   ajo    rotating savings (ajo/esusu) — fixed contribution each round, one member collected per round
// Amounts are stored as integer minor units (kobo/cents) so splits and balances never drift.
// Entries are append-only: a mistake is voided (voidedAt), never deleted, so the history stays honest.
// A member row with userId NULL is a placeholder for someone who isn't on NEXA; the owner records for them.
// (Tables are money_* because GROUPS is an SQL keyword.)
db.exec(`
CREATE TABLE IF NOT EXISTS money_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('split','pot','ajo')),
  currency TEXT NOT NULL DEFAULT 'NGN',
  ownerId TEXT NOT NULL,
  inviteCode TEXT UNIQUE NOT NULL,
  contributionMinor INTEGER,   -- ajo: what each member pays per round
  cycleDays INTEGER,           -- ajo: days per round (7, 14, 30...), used to show due dates
  startDate TEXT,              -- ajo: date round 1 is due
  closedAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_moneygroups_owner ON money_groups(ownerId);

CREATE TABLE IF NOT EXISTS money_group_members (
  id TEXT PRIMARY KEY,
  groupId TEXT NOT NULL,
  userId TEXT,                 -- NULL = placeholder for someone without the app
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'member'
  payoutPosition INTEGER,      -- ajo only: which round this member collects (1..N)
  claimCode TEXT,              -- placeholders only: a code the owner gives that one person to take over this spot
  createdAt TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_moneymembers_user ON money_group_members(groupId, userId);
CREATE INDEX IF NOT EXISTS idx_moneymembers_group ON money_group_members(groupId);
CREATE INDEX IF NOT EXISTS idx_moneymembers_userid ON money_group_members(userId);

-- type: expense | contribution | payout | settlement
--   memberId is who paid the expense (NULL = paid from the pot) / who contributed / who was paid out / who paid in a settlement
--   toMemberId is only used by settlements (who received the money)
CREATE TABLE IF NOT EXISTS money_group_entries (
  id TEXT PRIMARY KEY,
  groupId TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense','contribution','payout','settlement')),
  amountMinor INTEGER NOT NULL CHECK (amountMinor > 0),
  memberId TEXT,
  toMemberId TEXT,
  round INTEGER,               -- ajo contributions and payouts
  note TEXT,
  date TEXT NOT NULL,
  recordedBy TEXT NOT NULL,    -- userId
  createdAt TEXT NOT NULL,
  voidedAt TEXT,
  voidedBy TEXT,
  requestKey TEXT
);
CREATE INDEX IF NOT EXISTS idx_moneyentries_group ON money_group_entries(groupId, date, createdAt);
CREATE UNIQUE INDEX IF NOT EXISTS idx_moneyentries_request ON money_group_entries(groupId, recordedBy, requestKey) WHERE requestKey IS NOT NULL;

CREATE TABLE IF NOT EXISTS money_group_entry_shares (
  entryId TEXT NOT NULL,
  memberId TEXT NOT NULL,
  shareMinor INTEGER NOT NULL,
  PRIMARY KEY (entryId, memberId)
);
`);

// Migration (V3.14.1): placeholder linking. Groups created on the first V3.14 drop have no claimCode column.
// A placeholder can be claimed with its code (joining as that person) or merged into a real member by the owner.
if (!db.prepare("PRAGMA table_info(money_group_members)").all().some((c) => c.name === "claimCode")) {
  db.exec("ALTER TABLE money_group_members ADD COLUMN claimCode TEXT");
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_moneymembers_claim ON money_group_members(claimCode)");


db.exec(`
-- V3.89.0: item-specific Store Ajo / layaway. Price is locked at account creation;
-- contributions are real payment records, zero interest, and pickup unlocks only at 100%.
CREATE TABLE IF NOT EXISTS money_store_ajo_accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  productId TEXT NOT NULL,
  productName TEXT NOT NULL,
  targetAmount REAL NOT NULL CHECK (targetAmount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'saving' CHECK (status IN ('saving','ready_for_pickup','picked_up')),
  interestRate REAL NOT NULL DEFAULT 0 CHECK (interestRate = 0),
  discountRate REAL NOT NULL DEFAULT 0 CHECK (discountRate = 0),
  termMonths INTEGER NOT NULL DEFAULT 2 CHECK (termMonths BETWEEN 2 AND 6),
  variantId TEXT,
  variantLabel TEXT,
  orderId TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_storeajo_user ON money_store_ajo_accounts(userId, createdAt DESC);
CREATE TABLE IF NOT EXISTS money_store_ajo_contributions (
  id TEXT PRIMARY KEY,
  ajoId TEXT NOT NULL,
  userId TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  paymentRef TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  providerVerified INTEGER NOT NULL DEFAULT 0 CHECK (providerVerified IN (0,1)),
  feeStatus TEXT NOT NULL DEFAULT 'pending' CHECK (feeStatus IN ('pending','paid','bundled')),
  feeChargeId TEXT,
  createdAt TEXT NOT NULL,
  paidAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_storeajo_contrib_ajo ON money_store_ajo_contributions(ajoId, status, createdAt);


`);

// Migration (V3.15): vendor staff accounts. A vendor (the owner) invites someone already on NEXA
// with an 8-character code (same idiom as a group's claimCode); redeeming it adds them as staff on
// their own account — no shared logins, no separate credentials. userId is NULL between the invite
// being created and being claimed. Role is a string (like money_group_members.role) so a second tier
// can slot in later; today there's only 'staff', checked at the route level in server/staff.js
// (products & orders; not summary/incomes/profile/staff management, which stay owner-only).
db.exec(`
CREATE TABLE IF NOT EXISTS vendor_staff (
  id TEXT PRIMARY KEY,
  vendorId TEXT NOT NULL,
  userId TEXT,                 -- NULL until the invite is claimed
  name TEXT,                   -- set once claimed (short name, same convention as group members)
  role TEXT NOT NULL DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'invited',  -- 'invited' | 'active' | 'removed'
  inviteCode TEXT,             -- present only while status = 'invited'
  createdAt TEXT NOT NULL,
  joinedAt TEXT,
  removedAt TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendorstaff_code ON vendor_staff(inviteCode);
CREATE INDEX IF NOT EXISTS idx_vendorstaff_vendor ON vendor_staff(vendorId, status);
-- One active (or invited) seat per person per vendor — re-inviting someone who already has a live
-- row should update it, not create a duplicate. Removed rows are excluded so a former staffer can
-- be re-invited later without colliding with their own history.
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendorstaff_live ON vendor_staff(vendorId, userId) WHERE status != 'removed' AND userId IS NOT NULL;
`);

// M7767/M7768 — Staff Link registry: one shared table for all staff tiers, one live link per NEXA account.
db.exec(require("./staffLinks").SCHEMA_SQL);
db.exec(require("./staffLinks").UPLOAD_SCHEMA_SQL);
db.exec(require("./staffLinks").AUDIT_SCHEMA_SQL);
db.exec(require("./staffLinks").HOLD_SCHEMA_SQL);

// V3.15.2 — invite expiry. Existing invited rows (created before this column existed) get NULL,
// which staff.js treats as "never expires" so nothing already sent out is silently invalidated.
if (!db.prepare("PRAGMA table_info(vendor_staff)").all().some((c) => c.name === "expiresAt")) {
  db.exec("ALTER TABLE vendor_staff ADD COLUMN expiresAt TEXT");
}

// Migration (V3.17): social layer — usernames, friends and blocks. A username is how one person
// finds another on NEXA (email is never shown to anyone else); it's optional until someone wants
// to use it, so existing accounts get NULL here rather than a forced/auto-generated handle.
// Case-insensitive uniqueness is enforced with a COLLATE NOCASE unique index rather than lower-
// casing on write, so the row keeps the casing the person actually chose.
{
  const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!cols.includes("username")) db.exec("ALTER TABLE users ADD COLUMN username TEXT");
  if (!cols.includes("usernameSetAt")) db.exec("ALTER TABLE users ADD COLUMN usernameSetAt TEXT");
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE) WHERE username IS NOT NULL;");
// Accounts created before the signup name became the username get one taken from their name (never overwrites an existing username).
require("./signupUsername").backfillUsernames(db);
// V3.42.1 — editable social profile fields. Defaults preserve discoverability behavior for existing users.
{
  const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!cols.includes("profileBio")) db.exec("ALTER TABLE users ADD COLUMN profileBio TEXT NOT NULL DEFAULT ''");
  if (!cols.includes("avatarUrl")) db.exec("ALTER TABLE users ADD COLUMN avatarUrl TEXT");
  if (!cols.includes("profileVisibility")) db.exec("ALTER TABLE users ADD COLUMN profileVisibility TEXT NOT NULL DEFAULT 'friends'");
  if (!cols.includes("allowFriendRequests")) db.exec("ALTER TABLE users ADD COLUMN allowFriendRequests INTEGER NOT NULL DEFAULT 1");
  if (!cols.includes("allowInboxRequests")) db.exec("ALTER TABLE users ADD COLUMN allowInboxRequests INTEGER NOT NULL DEFAULT 1");
}
// V4.12.0 — shareable Zeeza profile links. Token is opaque, high-entropy, and scoped to the profile owner.
{
  const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!cols.includes("zeezaShareToken")) db.exec("ALTER TABLE users ADD COLUMN zeezaShareToken TEXT");
  if (!cols.includes("zeezaExploreOptIn")) db.exec("ALTER TABLE users ADD COLUMN zeezaExploreOptIn INTEGER NOT NULL DEFAULT 0");
  if (!cols.includes("zeezaExploreCountry")) db.exec("ALTER TABLE users ADD COLUMN zeezaExploreCountry TEXT");
  if (!cols.includes("zeezaExploreCity")) db.exec("ALTER TABLE users ADD COLUMN zeezaExploreCity TEXT");
  if (!cols.includes("zeezaExploreTermsVersion")) db.exec("ALTER TABLE users ADD COLUMN zeezaExploreTermsVersion TEXT");
  if (!cols.includes("zeezaExploreTermsAt")) db.exec("ALTER TABLE users ADD COLUMN zeezaExploreTermsAt TEXT");
  if (!cols.includes("zeezaExploreLocationChangedAt")) db.exec("ALTER TABLE users ADD COLUMN zeezaExploreLocationChangedAt TEXT");
  if (!cols.includes("zeezaChaseAge")) db.exec("ALTER TABLE users ADD COLUMN zeezaChaseAge INTEGER");
  if (!cols.includes("zeezaChaseNationality")) db.exec("ALTER TABLE users ADD COLUMN zeezaChaseNationality TEXT");
  if (!cols.includes("zeezaChaseHeightCm")) db.exec("ALTER TABLE users ADD COLUMN zeezaChaseHeightCm INTEGER");
  if (!cols.includes("zeezaChaseJobType")) db.exec("ALTER TABLE users ADD COLUMN zeezaChaseJobType TEXT");
}

db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_zeeza_share_token ON users(zeezaShareToken) WHERE zeezaShareToken IS NOT NULL;");


db.exec(`
-- One row per request. Rows are kept after they're resolved (status flips, nothing is deleted)
-- so "declined" isn't indistinguishable from "never asked" and a re-request after a decline
-- has history. A live friendship is derived from an 'accepted' row, not stored twice.
CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  fromUserId TEXT NOT NULL,
  toUserId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'direct', -- 'pending' | 'accepted' | 'declined' | 'cancelled'
  createdAt TEXT NOT NULL,
  respondedAt TEXT
);
-- Only one *live* ask between two people at a time, in either direction's row; a resolved
-- request doesn't block a fresh one (e.g. re-adding after an old decline).
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendreq_pending ON friend_requests(fromUserId, toUserId) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_friendreq_to ON friend_requests(toUserId, status);
CREATE INDEX IF NOT EXISTS idx_friendreq_from ON friend_requests(fromUserId, status);

-- V4.13.0 — existing databases need the request-source column too.
`);
{
  const cols = db.prepare("PRAGMA table_info(friend_requests)").all().map((c) => c.name);
  if (!cols.includes("source")) db.exec("ALTER TABLE friend_requests ADD COLUMN source TEXT NOT NULL DEFAULT 'direct'");
}
db.exec("CREATE INDEX IF NOT EXISTS idx_friend_requests_explore_source ON friend_requests(fromUserId, source, createdAt DESC)");
db.exec(`

-- A friendship is stored as two rows (one per direction) so "who are userId's friends" is a
-- single indexed lookup with no OR'd userA/userB columns. Both rows are written/removed together.
CREATE TABLE IF NOT EXISTS friendships (
  userId TEXT NOT NULL,
  friendId TEXT NOT NULL,
  sourceRequestId TEXT,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (userId, friendId)
);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(userId);

-- Blocking is one-directional and independent of friendship: blocking someone quietly removes
-- any friendship/pending request between the two, and stops the blocked person from finding the
-- blocker by username, sending a request, or messaging them. It is not shown to the blocked side.
CREATE TABLE IF NOT EXISTS blocks (
  blockerId TEXT NOT NULL,
  blockedId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (blockerId, blockedId)
);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blockedId);
`);

// Migration (V3.17): direct messages + rooms. A DM thread is keyed by the two participants
// (userAId always the lexicographically smaller id, so the pair has exactly one row no matter
// who started it). Rooms reuse the invite-code idiom money_groups/vendor_staff already use.
db.exec(`
CREATE TABLE IF NOT EXISTS dm_threads (
  id TEXT PRIMARY KEY,
  userAId TEXT NOT NULL,
  userBId TEXT NOT NULL,
  lastMessageAt TEXT,
  createdAt TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dmthreads_pair ON dm_threads(userAId, userBId);

CREATE TABLE IF NOT EXISTS dm_messages (
  id TEXT PRIMARY KEY,
  threadId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text',
  mediaUrl TEXT,
  createdAt TEXT NOT NULL,
  readAt TEXT -- set when the OTHER participant has seen this message
);
CREATE INDEX IF NOT EXISTS idx_dmmessages_thread ON dm_messages(threadId, createdAt);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  inviteCode TEXT UNIQUE NOT NULL,
  inviteExpiresAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS financial_savings_rules (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL, goalId TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN',
  cadence TEXT NOT NULL DEFAULT 'monthly', active INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_financial_savings_rules_user ON financial_savings_rules(userId, active);
CREATE TABLE IF NOT EXISTS financial_goal_contributions (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL, goalId TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN', recordedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_financial_goal_contributions_user_goal ON financial_goal_contributions(userId, goalId, recordedAt DESC);

CREATE TABLE IF NOT EXISTS chat_room_members (
  id TEXT PRIMARY KEY,
  roomId TEXT NOT NULL,
  userId TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'member'
  joinedAt TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_roommembers_pair ON chat_room_members(roomId, userId);
CREATE INDEX IF NOT EXISTS idx_roommembers_user ON chat_room_members(userId);

CREATE TABLE IF NOT EXISTS room_messages (
  id TEXT PRIMARY KEY,
  roomId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  body TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_roommessages_room ON room_messages(roomId, createdAt);

CREATE TABLE IF NOT EXISTS call_sessions (
  id TEXT PRIMARY KEY,
  callerId TEXT NOT NULL,
  calleeId TEXT NOT NULL,
  media TEXT NOT NULL DEFAULT 'audio',
  status TEXT NOT NULL DEFAULT 'ringing',
  createdAt TEXT NOT NULL,
  startedAt TEXT,
  endedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_call_sessions_participants ON call_sessions(callerId, calleeId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status, createdAt DESC);

CREATE TABLE IF NOT EXISTS call_participants (
  id TEXT PRIMARY KEY,
  callId TEXT NOT NULL,
  userId TEXT NOT NULL,
  role TEXT NOT NULL,
  joinedAt TEXT NOT NULL,
  UNIQUE(callId, userId)
);
CREATE INDEX IF NOT EXISTS idx_call_participants_user ON call_participants(userId, joinedAt DESC);

CREATE TABLE IF NOT EXISTS call_signals (
  id TEXT PRIMARY KEY,
  callId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_call_signals_call_created ON call_signals(callId, createdAt);

CREATE TABLE IF NOT EXISTS group_call_sessions (
  id TEXT PRIMARY KEY, roomId TEXT NOT NULL, hostId TEXT NOT NULL, media TEXT NOT NULL DEFAULT 'audio',
  status TEXT NOT NULL DEFAULT 'ringing', createdAt TEXT NOT NULL, startedAt TEXT, endedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_group_call_sessions_room_status ON group_call_sessions(roomId, status, createdAt DESC);
CREATE TABLE IF NOT EXISTS group_call_participants (
  id TEXT PRIMARY KEY, callId TEXT NOT NULL, userId TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'invited', joinedAt TEXT, leftAt TEXT, UNIQUE(callId,userId)
);
CREATE INDEX IF NOT EXISTS idx_group_call_participants_user ON group_call_participants(userId, joinedAt DESC);
CREATE TABLE IF NOT EXISTS group_call_signals (
  id TEXT PRIMARY KEY, callId TEXT NOT NULL, senderId TEXT NOT NULL, targetUserId TEXT, type TEXT NOT NULL, payload TEXT NOT NULL, createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_group_call_signals_call_created ON group_call_signals(callId, createdAt);
`);
try { db.exec("ALTER TABLE dm_messages ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'"); } catch (_) {}
try { db.exec("ALTER TABLE dm_messages ADD COLUMN mediaUrl TEXT"); } catch (_) {}


// V3.48 marketplace buyer/seller interaction records.
try { db.exec("ALTER TABLE group_call_participants ADD COLUMN reconnectCount INTEGER NOT NULL DEFAULT 0"); } catch (_) {}
try { db.exec("ALTER TABLE group_call_participants ADD COLUMN lastSeenAt TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE mall_exception_evidence ADD COLUMN reviewStatus TEXT NOT NULL DEFAULT 'pending'"); } catch (_) {}
try { db.exec("ALTER TABLE mall_exception_evidence ADD COLUMN reviewedAt TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE mall_exception_evidence ADD COLUMN escalation TEXT NOT NULL DEFAULT 'none'"); } catch (_) {}
try { db.exec("CREATE INDEX IF NOT EXISTS idx_mall_exception_evidence_review ON mall_exception_evidence(vendorId, reviewStatus, createdAt DESC)"); } catch (_) {}

db.exec(`
CREATE TABLE IF NOT EXISTS mall_favorites (
  userId TEXT NOT NULL, productId TEXT NOT NULL, createdAt TEXT NOT NULL,
  PRIMARY KEY(userId, productId)
);
CREATE INDEX IF NOT EXISTS idx_mall_favorites_user ON mall_favorites(userId, createdAt DESC);
CREATE TABLE IF NOT EXISTS mall_inquiries (
  id TEXT PRIMARY KEY, productId TEXT NOT NULL, buyerId TEXT NOT NULL, sellerId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
  UNIQUE(productId, buyerId)
);
CREATE INDEX IF NOT EXISTS idx_mall_inquiries_buyer ON mall_inquiries(buyerId, updatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_mall_inquiries_seller ON mall_inquiries(sellerId, updatedAt DESC);
CREATE TABLE IF NOT EXISTS mall_inquiry_requests (
  buyerId TEXT NOT NULL, requestKey TEXT NOT NULL, inquiryId TEXT NOT NULL, createdAt TEXT NOT NULL,
  PRIMARY KEY(buyerId, requestKey)
);
CREATE TABLE IF NOT EXISTS mall_inquiry_messages (
  id TEXT PRIMARY KEY, inquiryId TEXT NOT NULL, senderId TEXT NOT NULL, body TEXT NOT NULL, createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mall_inquiry_messages ON mall_inquiry_messages(inquiryId, createdAt);
CREATE TABLE IF NOT EXISTS mall_interaction_reports (
  id TEXT PRIMARY KEY, reporterId TEXT NOT NULL, targetType TEXT NOT NULL, targetId TEXT NOT NULL,
  reason TEXT NOT NULL, details TEXT, createdAt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open'
);
CREATE INDEX IF NOT EXISTS idx_mall_interaction_reports ON mall_interaction_reports(status, createdAt);
`);

db.exec(`
-- V3.66.1 search scalability indexes. LIKE queries remain authorization-scoped and bounded.
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_money_groups_member_user_group ON money_group_members(userId, groupId);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(userId, date DESC);
CREATE INDEX IF NOT EXISTS idx_debts_user_created ON debts(userId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_ai_notes_user_created ON ai_notes(userId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_user_updated ON ai_knowledge(userId, updatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_mall_products_active_updated ON mall_products(active, updatedAt DESC);
`);

// V4.18 group-entry idempotency migration.
if (!db.prepare("PRAGMA table_info(money_group_entries)").all().some((c) => c.name === "requestKey")) db.exec("ALTER TABLE money_group_entries ADD COLUMN requestKey TEXT");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_moneyentries_request ON money_group_entries(groupId, recordedBy, requestKey) WHERE requestKey IS NOT NULL");

// B123: durable Expo push-ticket/receipt lifecycle. Provider acceptance is not delivery confirmation.
try {
  const cols = db.prepare("PRAGMA table_info(notification_deliveries)").all().map((c) => c.name);
  if (!cols.includes("providerTicketId")) db.exec("ALTER TABLE notification_deliveries ADD COLUMN providerTicketId TEXT");
  if (!cols.includes("receiptStatus")) db.exec("ALTER TABLE notification_deliveries ADD COLUMN receiptStatus TEXT");
  if (!cols.includes("receiptAt")) db.exec("ALTER TABLE notification_deliveries ADD COLUMN receiptAt TEXT");
  if (!cols.includes("receiptCheckAt")) db.exec("ALTER TABLE notification_deliveries ADD COLUMN receiptCheckAt TEXT");
  db.exec("CREATE INDEX IF NOT EXISTS idx_notification_deliveries_receipt ON notification_deliveries(status, nextAttemptAt, providerTicketId)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_notification_deliveries_receipt_lease ON notification_deliveries(status, receiptCheckAt)");
} catch (_) {}

// V4.18 notification migration for databases created before dedupe support.
if (!db.prepare("PRAGMA table_info(notification_events)").all().some((c) => c.name === "dedupeKey")) db.exec("ALTER TABLE notification_events ADD COLUMN dedupeKey TEXT");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe ON notification_events(userId, dedupeKey) WHERE dedupeKey IS NOT NULL");

// V3.87.1 Kitchen menu seed. Existing prices remain operator-editable later.
{ const now=new Date().toISOString(); const items=[['yam_slices','Yam Slices',150],['fried_egg','Fried Egg',250],['potato_fries','Potato Fries',1200],['doughnuts','Doughnuts',800],['burger','Burger',2500],['shawarma','Shawarma',2200],['puff_puff','Puff Puff',700],['egg_roll','Egg Roll',500]]; const stmt=db.prepare("INSERT OR IGNORE INTO kitchen_menu(key,name,price,currency,active,updatedAt) VALUES(?,?,?,?,1,?)"); for(const x of items) stmt.run(x[0],x[1],x[2],'NGN',now); }

// V4.23.0 — trust & safety appeals are separate from the authoritative report record.
try { db.exec(`CREATE TABLE IF NOT EXISTS social_report_appeals (
  id TEXT PRIMARY KEY, reportId TEXT NOT NULL, appellantId TEXT NOT NULL, reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','dismissed')),
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, resolvedAt TEXT
); CREATE UNIQUE INDEX IF NOT EXISTS idx_social_report_appeal_open ON social_report_appeals(reportId, appellantId) WHERE status IN ('open','under_review'); CREATE INDEX IF NOT EXISTS idx_social_report_appeals_status ON social_report_appeals(status, createdAt DESC);`); } catch (_) {}

// V4.17.0 — social trust/reporting foundation. Age trust is deliberately explicit; current
// self-declared age remains the only available state until an approved verification provider exists.
try { db.exec("ALTER TABLE users ADD COLUMN zeezaAgeTrustStatus TEXT NOT NULL DEFAULT 'self_declared'"); } catch (_) {}
db.exec(`CREATE TABLE IF NOT EXISTS social_reports (
  id TEXT PRIMARY KEY, reporterId TEXT NOT NULL, targetUserId TEXT NOT NULL, reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '', context TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open',
  createdAt TEXT NOT NULL, reviewedAt TEXT, reviewerId TEXT
);
CREATE INDEX IF NOT EXISTS idx_social_reports_status_created ON social_reports(status, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_social_reports_target ON social_reports(targetUserId, createdAt DESC);`);

// V4.15.0 — moderated public directory for offline fitness businesses.
db.exec(`CREATE TABLE IF NOT EXISTS fitness_gyms (
  id TEXT PRIMARY KEY, ownerId TEXT NOT NULL, name TEXT NOT NULL, city TEXT NOT NULL, address TEXT NOT NULL,
  websiteOrSocial TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fitness_gyms_public ON fitness_gyms(status, city COLLATE NOCASE, name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_fitness_gyms_owner ON fitness_gyms(ownerId, createdAt DESC);`);


// V4.59.0 — B19 continuity/receipt/evidence projections. These records remain owner-scoped
// and do not replace canonical commerce, payment, social, or workflow authorities.
db.exec(`
CREATE TABLE IF NOT EXISTS mall_exception_evidence (
  id TEXT PRIMARY KEY, orderId TEXT NOT NULL, vendorId TEXT NOT NULL, kind TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '', reference TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mall_exception_evidence_order ON mall_exception_evidence(orderId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_mall_exception_evidence_vendor ON mall_exception_evidence(vendorId, createdAt DESC);
CREATE TABLE IF NOT EXISTS ai_workflow_run_receipts (
  id TEXT PRIMARY KEY, runId TEXT NOT NULL, workflowId TEXT NOT NULL, userId TEXT NOT NULL,
  idempotencyKey TEXT NOT NULL, status TEXT NOT NULL, confirmed INTEGER NOT NULL DEFAULT 0,
  confirmationRequired INTEGER NOT NULL DEFAULT 1, result TEXT NOT NULL DEFAULT '{}',
  dependencyState TEXT NOT NULL DEFAULT '[]', createdAt TEXT NOT NULL, completedAt TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_workflow_receipt_key ON ai_workflow_run_receipts(workflowId,userId,idempotencyKey);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_receipts_user ON ai_workflow_run_receipts(userId,createdAt DESC);
`);

// Block 19 Growth, Onboarding & Retention: consent-minimal, idempotent lifecycle events and one-way referral tokens.
db.exec(`
CREATE TABLE IF NOT EXISTS nexa_growth_events (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL, eventName TEXT NOT NULL,
  idempotencyKey TEXT NOT NULL, context TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL,
  UNIQUE(userId, idempotencyKey)
);
CREATE INDEX IF NOT EXISTS idx_nexa_growth_events_name_date ON nexa_growth_events(eventName, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_nexa_growth_events_user_date ON nexa_growth_events(userId, createdAt DESC);
CREATE TABLE IF NOT EXISTS nexa_referral_codes (
  id TEXT PRIMARY KEY, userId TEXT UNIQUE NOT NULL, codeHash TEXT UNIQUE NOT NULL,
  createdAt TEXT NOT NULL, disabledAt TEXT
);
CREATE TABLE IF NOT EXISTS nexa_referral_attributions (
  id TEXT PRIMARY KEY, referralId TEXT NOT NULL, referrerUserId TEXT NOT NULL,
  referredUserId TEXT UNIQUE NOT NULL, createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nexa_referral_attribution_referrer ON nexa_referral_attributions(referrerUserId, createdAt DESC);
CREATE TABLE IF NOT EXISTS nexa_zeeza_referral_campaigns (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL UNIQUE, accountType TEXT NOT NULL DEFAULT 'unknown',
  campaignStartAt TEXT NOT NULL, campaignEndAt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nexa_zeeza_campaign_status_end ON nexa_zeeza_referral_campaigns(status, campaignEndAt);
CREATE TABLE IF NOT EXISTS nexa_zeeza_referral_tokens (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL, codeHash TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL, disabledAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_nexa_zeeza_referral_tokens_owner ON nexa_zeeza_referral_tokens(userId, createdAt DESC);
-- Zeeza referral reward decisions. The ledger holds at most one subscription-month decision per
-- campaign; the audit table is append-only (triggers refuse UPDATE and DELETE). Neither table
-- applies a credit to any subscription, wallet or coin balance.
CREATE TABLE IF NOT EXISTS nexa_zeeza_referral_reward_ledger (
  id TEXT PRIMARY KEY, campaignId TEXT NOT NULL, userId TEXT NOT NULL,
  rewardType TEXT NOT NULL DEFAULT 'subscription_month',
  status TEXT NOT NULL CHECK (status IN ('approved','rejected','credited')),
  decidedBy TEXT NOT NULL, decidedAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
  UNIQUE(campaignId, rewardType)
);
CREATE TABLE IF NOT EXISTS nexa_zeeza_referral_reward_audit (
  id TEXT PRIMARY KEY, ledgerId TEXT NOT NULL, campaignId TEXT NOT NULL, userId TEXT NOT NULL,
  action TEXT NOT NULL, fromStatus TEXT, toStatus TEXT NOT NULL,
  actorId TEXT NOT NULL, reason TEXT NOT NULL, createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nexa_zeeza_reward_audit_campaign ON nexa_zeeza_referral_reward_audit(campaignId, createdAt);
CREATE TRIGGER IF NOT EXISTS trg_nexa_zeeza_reward_audit_no_update BEFORE UPDATE ON nexa_zeeza_referral_reward_audit
BEGIN SELECT RAISE(ABORT, 'reward audit records are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_nexa_zeeza_reward_audit_no_delete BEFORE DELETE ON nexa_zeeza_referral_reward_audit
BEGIN SELECT RAISE(ABORT, 'reward audit records are immutable'); END;


`);

// V5.67.0 / B108: schema integrity certification after the complete bootstrap has run.
// An explicitly supplied fingerprint is treated as a production contract; absent fingerprint
// keeps existing deployments compatible while still enforcing core SQLite integrity controls.
const schemaVersionContract = schemaIntegrity.schemaVersion(process.env.NEXA_SCHEMA_VERSION || "schema-v114");
const expectedSchemaFingerprint = String(process.env.NEXA_SCHEMA_FINGERPRINT || "").trim();
const actualSchemaFingerprint = schemaIntegrity.schemaFingerprint(db);
const fingerprintContract = schemaIntegrity.schemaDriftFailClosed(actualSchemaFingerprint, expectedSchemaFingerprint);
const requiredSchemaTables = schemaIntegrity.requiredTables(db, ["users", "sessions", "wallet_accounts", "wallet_transactions", "mall_orders", "mall_products", "platform_event_log", "rate_limit_buckets"]);
const schemaIntegrityContract = schemaIntegrity.startupSchemaCertification({
  versionOk: schemaVersionContract.ok,
  fingerprintOk: expectedSchemaFingerprint ? fingerprintContract.ok : true,
  integrityOk: schemaIntegrity.databaseIntegrity(db).ok,
  fkOk: schemaIntegrity.foreignKeysEnabled(db).ok && schemaIntegrity.foreignKeyOrphans(db).ok,
  requiredTablesOk: requiredSchemaTables.ok,
});
if (process.env.NODE_ENV === "production" && !schemaIntegrityContract.ok) {
  throw new Error("Production schema integrity certification failed; refusing startup.");
}

module.exports = db;


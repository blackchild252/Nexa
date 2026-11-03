"use strict";

// V3.58 capability adapters. These are deliberately read-only except for the
// notifications.send adapter. Every adapter is user-scoped and is only callable
// after the extension permission gate in index.js succeeds.

const { SCOPES } = require("./extensions");

const READ_SCOPES = new Set([
  "profile.read",
  "money.read",
  "market.read",
  "mall.read",
  "chat.read",
]);

function assertSupported(scope) {
  if (!SCOPES[scope]) throw new Error(`Unknown extension scope: ${scope}`);
}

function getProfile(db, userId) {
  const row = db.prepare("SELECT id,name,createdAt FROM users WHERE id=?").get(userId);
  if (!row) throw new Error("User not found.");
  return { id: row.id, name: row.name || "", createdAt: row.createdAt };
}

function getMoney(db, userId) {
  const expense = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE userId=?").get(userId);
  const owedToMe = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM debts WHERE userId=? AND direction='owed_to_me' AND settled=0").get(userId);
  const iOwe = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM debts WHERE userId=? AND direction='i_owe' AND settled=0").get(userId);
  const recent = db.prepare("SELECT amount,currency,category,date,note FROM expenses WHERE userId=? ORDER BY date DESC,createdAt DESC LIMIT 20").all(userId);
  return {
    currency: "NGN",
    expenseTotal: Number(expense.total || 0),
    outstandingOwedToMe: Number(owedToMe.total || 0),
    outstandingIOwe: Number(iOwe.total || 0),
    recentExpenses: recent,
  };
}

function getMarket(db) {
  return {
    products: db.prepare("SELECT id,name,description,price,currency,category,stock,active,createdAt,updatedAt FROM mall_products WHERE active=1 ORDER BY updatedAt DESC LIMIT 50").all(),
  };
}

function getMall(db, userId) {
  const orders = db.prepare("SELECT id,total,currency,status,deliveryAddress,note,createdAt FROM mall_orders WHERE userId=? ORDER BY createdAt DESC LIMIT 25").all(userId);
  const orderIds = orders.map((o) => o.id);
  let items = [];
  if (orderIds.length) {
    const placeholders = orderIds.map(() => "?").join(",");
    items = db.prepare(`SELECT orderId,name,price,quantity,vendorName,status FROM mall_order_items WHERE orderId IN (${placeholders}) ORDER BY rowid DESC`).all(...orderIds);
  }
  const grouped = new Map(orderIds.map((id) => [id, []]));
  for (const item of items) grouped.get(item.orderId)?.push(item);
  return { orders: orders.map((o) => ({ ...o, items: grouped.get(o.id) || [] })) };
}

function getChat(db, userId) {
  const threads = db.prepare(
    `SELECT t.id, t.lastMessageAt, t.createdAt,
            CASE WHEN t.userAId=? THEN t.userBId ELSE t.userAId END AS otherUserId
       FROM dm_threads t
      WHERE t.userAId=? OR t.userBId=?
      ORDER BY COALESCE(t.lastMessageAt,t.createdAt) DESC LIMIT 20`
  ).all(userId, userId, userId);
  const threadIds = threads.map((t) => t.id);
  let messages = [];
  if (threadIds.length) {
    const placeholders = threadIds.map(() => "?").join(",");
    messages = db.prepare(
      `SELECT id,threadId,senderId,body,createdAt FROM dm_messages
        WHERE threadId IN (${placeholders}) ORDER BY createdAt DESC LIMIT 50`
    ).all(...threadIds);
  }
  return {
    directMessages: messages.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      senderId: m.senderId === userId ? "me" : m.senderId,
      body: String(m.body || "").slice(0, 2000),
      createdAt: m.createdAt,
    })),
    threads: threads.map((t) => ({ id: t.id, otherUserId: t.otherUserId, lastMessageAt: t.lastMessageAt, createdAt: t.createdAt })),
  };
}

function read(db, userId, scope) {
  assertSupported(scope);
  if (!READ_SCOPES.has(scope)) throw new Error(`Scope ${scope} is action-only.`);
  switch (scope) {
    case "profile.read": return getProfile(db, userId);
    case "money.read": return getMoney(db, userId);
    case "market.read": return getMarket(db);
    case "mall.read": return getMall(db, userId);
    case "chat.read": return getChat(db, userId);
    default: throw new Error(`No adapter for scope ${scope}.`);
  }
}

/** A bad notification from the caller (safe to show). Anything else that fails is a server problem and is not shown to the client. */
function inputError(message) { const e = new Error(message); e.code = "invalid_input"; return e; }

function sendNotification(pushService, userId, input) {
  const title = String(input?.title || "").trim();
  const body = String(input?.body || "").trim();
  if (!title || title.length > 80) throw inputError("Notification title is required and must be at most 80 characters.");
  if (!body || body.length > 500) throw inputError("Notification body is required and must be at most 500 characters.");
  if (typeof pushService !== "function") throw new Error("Notification delivery is not configured.");
  return pushService(userId, { title, body });
}

module.exports = { READ_SCOPES, read, sendNotification };

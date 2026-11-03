"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const integrity = require("./v5_77_0_account_closure_integrity");
const lifecycle = read("server/accountLifecycle.js");
const readiness = read("server/accountLifecycleReadiness.js");
const index = read("server/index.js");
const pkg = JSON.parse(read("package.json"));
const report = read("V5_77_0_REPORT.md");

const tests = [
  [1275, "closure integrity module is wired into account lifecycle", () => assert.match(lifecycle, /v5_77_0_account_closure_integrity/)],
  [1276, "wallet history is explicitly retained for financial integrity", () => assert.ok(integrity.RETAINED_USER_TABLES.includes("wallet_transactions"))],
  [1277, "wallet ledger is explicitly retained", () => assert.ok(integrity.RETAINED_USER_TABLES.includes("wallet_ledger_entries"))],
  [1278, "wallet accounts are explicitly retained and closed rather than deleted", () => { assert.ok(integrity.RETAINED_USER_TABLES.includes("wallet_accounts")); assert.match(lifecycle, /closeWalletAccounts/); }],
  [1279, "wallet balance blocks account closure", () => assert.match(read("server/v5_77_0_account_closure_integrity.js"), /wallet_balance/)],
  [1280, "pending wallet transactions block account closure", () => assert.match(read("server/v5_77_0_account_closure_integrity.js"), /wallet_pending_transactions/)],
  [1281, "paid Store Ajo positions block closure instead of being deleted", () => { const s=read("server/v5_77_0_account_closure_integrity.js"); assert.match(s, /paid_store_ajo/); assert.match(s, /status='paid'/); }],
  [1282, "AI action confirmations are deleted", () => assert.ok(integrity.DELETE_USER_TABLES.includes("ai_action_confirmations"))],
  [1283, "AI action receipts are deleted", () => assert.ok(integrity.DELETE_USER_TABLES.includes("ai_action_receipts"))],
  [1284, "savings automation rules are deleted", () => assert.ok(integrity.DELETE_USER_TABLES.includes("financial_savings_rules"))],
  [1285, "direct messages are deleted before their threads", () => { const s=read("server/v5_77_0_account_closure_integrity.js"); assert.match(s, /DELETE FROM dm_messages WHERE threadId/); assert.match(s, /DELETE FROM dm_threads WHERE userAId/); assert.ok(s.indexOf("DELETE FROM dm_messages WHERE threadId") < s.indexOf("DELETE FROM dm_threads WHERE userAId")); }],
  [1286, "room messages authored by the closed user are removed", () => assert.match(read("server/v5_77_0_account_closure_integrity.js"), /DELETE FROM room_messages WHERE senderId/)],
  [1287, "owned chat rooms transfer to an active member when possible", () => assert.match(read("server/v5_77_0_account_closure_integrity.js"), /COALESCE\(u\.accountStatus,'active'\)='active'/)],
  [1288, "ownerless chat rooms are safely removed with their messages", () => { const s=read("server/v5_77_0_account_closure_integrity.js"); assert.match(s, /DELETE FROM room_messages WHERE roomId/); assert.match(s, /DELETE FROM chat_rooms WHERE id=.*ownerId/); }],
  [1289, "closed users are removed from chat membership", () => assert.match(read("server/v5_77_0_account_closure_integrity.js"), /DELETE FROM chat_room_members WHERE userId/)],
  [1290, "owned money groups transfer to an active member", () => assert.match(read("server/v5_77_0_account_closure_integrity.js"), /UPDATE money_groups SET ownerId/)],
  [1291, "money group ownership role is synchronized after transfer", () => { const s=read("server/v5_77_0_account_closure_integrity.js"); assert.match(s, /UPDATE money_group_members SET role='member'/); assert.match(s, /UPDATE money_group_members SET role='owner'/); }],
  [1292, "ownerless money groups close instead of destroying financial history", () => assert.match(read("server/v5_77_0_account_closure_integrity.js"), /UPDATE money_groups SET closedAt/)],
  [1293, "rate-limit state for the closed account is purged by the canonical hash", () => { const s=read("server/v5_77_0_account_closure_integrity.js"); assert.match(s, /sha256/); assert.match(s, /DELETE FROM rate_limit_buckets WHERE keyHash/); }],
  [1294, "closure schema readiness covers financial and communication support", () => { assert.match(readiness, /wallet_accounts/); assert.match(read("server/v5_77_0_account_closure_integrity.js"), /dm_messages/); assert.match(readiness, /money_group_entries/); }],
  [1295, "closure readiness reports financial blockers", () => assert.match(readiness, /blockers/)],
  [1296, "closure endpoint exposes a safe conflict for unresolved financial positions", () => { assert.match(index, /ACCOUNT_CLOSURE_BLOCKED/); assert.match(index, /status\(409\)/); }],
  [1297, "closure endpoint exposes infrastructure incompleteness as 503", () => { assert.match(index, /ACCOUNT_CLOSURE_SCHEMA_INCOMPLETE/); assert.match(index, /status\(503\)/); }],
  [1298, "retained transaction history is redacted without deleting the ledger", () => { const s=read("server/v5_77_0_account_closure_integrity.js"); assert.match(s, /Closed account transaction/); assert.match(s, /account_closed/); assert.ok(integrity.RETAINED_USER_TABLES.includes("wallet_ledger_entries")); }],
  [1299, "B118 release contract remains bound to its sealed 5.77.0 report", () => { assert.match(report, /V5\.77\.0/); assert.match(report, /B118/); }],
];

for (const [n, title, fn] of tests) test(`B118 M${n}: ${title}`, fn);

// Small behavioral probes that do not require native SQLite dependencies.
test("B118 closure blocker probe detects non-zero wallet balance", () => {
  const statements = new Map();
  statements.set("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", { get: () => ({ 1: 1 }) });
  let calls = 0;
  const db = { prepare(sql) { calls++; if (sql.includes("sqlite_master")) return { get: () => ({ ok: 1 }) }; if (sql.includes("FROM wallet_accounts")) return { all: () => [{ currency: "NGN", status: "active" }] }; if (sql.includes("SUM(amountMinor)")) return { get: () => ({ amountMinor: 500 }) }; if (sql.includes("status='pending'")) return { get: () => ({ count: 0 }) }; if (sql.includes("money_store_ajo_contributions")) return { get: () => ({ count: 0 }) }; throw new Error(`unexpected SQL: ${sql}`); } };
  const blockers = integrity.closureBlockers(db, "u1");
  assert.equal(blockers[0].code, "wallet_balance");
  assert.ok(calls > 0);
});

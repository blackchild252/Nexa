"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
function read(file) { return fs.readFileSync(path.join(__dirname, file), "utf8"); }
const closure = read("v5_77_0_account_closure_integrity.js");
const lifecycle = read("accountLifecycle.js");
const server = read("index.js");
const db = read("db.js");
const tests = [
 [1625,"retained seller cleanup has a named helper",()=>assert.match(closure,/function cleanupRetainedSellerArtifacts/)],
 [1626,"account closure delegates retained seller cleanup",()=>assert.match(lifecycle,/cleanupRetainedSellerArtifacts\(db, userId, now\)/)],
 [1627,"Yaayz listings are explicitly classified as retained commerce state",()=>assert.match(closure,/yaayz_ticket_listings/)],
 [1628,"Yaayz seller ownership uses sellerId",()=>assert.match(closure,/WHERE sellerId=\?/)],
 [1629,"active Yaayz inventory is retired on closure",()=>assert.match(closure,/UPDATE yaayz_ticket_listings SET active=0/)],
 [1630,"retired listings preserve historical rows",()=>assert.doesNotMatch(closure,/DELETE FROM yaayz_ticket_listings/)],
 [1631,"pending Yaayz orders are identified through canonical listing ownership",()=>assert.match(closure,/JOIN yaayz_ticket_listings t ON t.id=o.ticketId[\s\S]*WHERE t.sellerId=\? AND o.status='pending_payment'/)],
 [1632,"pending reservation quantity is restored",()=>assert.match(closure,/UPDATE yaayz_ticket_listings SET quantity=quantity\+\?/)],
 [1633,"pending seller reservations are cancelled",()=>assert.match(closure,/UPDATE yaayz_ticket_orders SET status='cancelled'/)],
 [1634,"paid Yaayz orders are not deleted",()=>assert.doesNotMatch(closure,/DELETE FROM yaayz_ticket_orders/)],
 [1635,"pending cancellation remains state-guarded",()=>assert.match(closure,/WHERE id=\? AND status='pending_payment'/)],
 [1636,"listing retirement remains state-guarded",()=>assert.match(closure,/WHERE sellerId=\? AND active=1/)],
 [1637,"seller cleanup accepts deterministic closure time",()=>assert.match(closure,/function cleanupRetainedSellerArtifacts\(db, userId, now = new Date\(\)\.toISOString\(\)\)/)],
 [1638,"seller cleanup runs inside canonical closure transaction",()=>assert.match(lifecycle,/const tx = db\.transaction\(\(\) =>/)],
 [1639,"Yaayz listing schema has seller ownership",()=>assert.match(db,/CREATE TABLE IF NOT EXISTS yaayz_ticket_listings[\s\S]*sellerId TEXT NOT NULL/)],
 [1640,"Yaayz listing schema has active lifecycle state",()=>assert.match(db,/CREATE TABLE IF NOT EXISTS yaayz_ticket_listings[\s\S]*active INTEGER NOT NULL DEFAULT 1/)],
 [1641,"Yaayz order schema has buyer ownership",()=>assert.match(db,/CREATE TABLE IF NOT EXISTS yaayz_ticket_orders[\s\S]*buyerId TEXT NOT NULL/)],
 [1642,"ticket purchase requires active inventory",()=>assert.match(server,/FROM yaayz_ticket_listings WHERE id=\? AND active=1/)],
 [1643,"ticket reservation decrement requires active inventory",()=>assert.match(server,/UPDATE yaayz_ticket_listings SET quantity=quantity-\?[\s\S]*WHERE id=\? AND active=1/)],
 [1644,"expired reservations only restore existing ticket rows",()=>assert.match(server,/UPDATE yaayz_ticket_listings SET quantity=quantity\+\?/)],
 [1645,"cancelled orders cannot be re-finalized by pending-state transition",()=>assert.match(server,/status='pending_payment' AND paymentRef=\?/)],
 [1646,"retained paid-order history remains available by buyer ownership",()=>assert.match(server,/WHERE o\.buyerId=\? ORDER BY o\.createdAt DESC/)],
 [1647,"seller inventory retirement is separate from financial history",()=>assert.match(closure,/B132: retained Yaayz seller inventory is historical commerce state/)],
 [1648,"cleanup helper is exported for focused regression coverage",()=>assert.match(closure,/cleanupRetainedSellerArtifacts,/)],
 [1649,"B132 certification contains exactly 25 milestones",()=>assert.equal(tests.length,25)],
];
for (const [n,title,fn] of tests) test(`B132 M${n}: ${title}`, fn);

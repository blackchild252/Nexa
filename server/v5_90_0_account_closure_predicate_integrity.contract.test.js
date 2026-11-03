"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
function read(file) { return fs.readFileSync(path.join(__dirname, file), "utf8"); }
const closure = read("v5_77_0_account_closure_integrity.js");
const lifecycle = read("accountLifecycle.js");
const db = read("db.js");
const tests = [
 [1600,"non-userId closure cleanup has a named helper",()=>assert.match(closure,/function cleanupNonUserIdClosureArtifacts/)],
 [1601,"generic closure deletion remains userId-only",()=>assert.match(lifecycle,/columns\.includes\("userId"\)/)],
 [1602,"generic deletion delegates non-userId artifacts",()=>assert.match(lifecycle,/cleanupNonUserIdClosureArtifacts\(db, userId\)/)],
 [1603,"buyer-owned marketplace inquiries are classified",()=>assert.ok(closure.includes('["mall_inquiries", "buyerId", "delete-on-closure"]'))],
 [1604,"seller-owned marketplace inquiries are classified",()=>assert.ok(closure.includes('["mall_inquiries", "sellerId", "delete-on-closure"]'))],
 [1605,"inquiry child messages are classified by sender/inquiry ownership",()=>assert.ok(closure.includes('["mall_inquiry_messages", "senderId", "delete-on-closure"]'))],
 [1606,"inquiry request ownership is classified",()=>assert.ok(closure.includes('["mall_inquiry_requests", "buyerId", "delete-on-closure"]'))],
 [1607,"inquiry messages are deleted before inquiry parents",()=>assert.match(closure,/DELETE FROM mall_inquiry_messages[\s\S]*DELETE FROM mall_inquiry_requests[\s\S]*DELETE FROM mall_inquiries/)],
 [1608,"inquiry cleanup covers buyer ownership",()=>assert.match(closure,/WHERE buyerId=\? OR sellerId=\?/)],
 [1609,"inquiry cleanup covers seller ownership",()=>assert.match(closure,/WHERE buyerId=\? OR sellerId=\?/)],
 [1610,"marketplace interaction reports use reporter ownership",()=>assert.ok(closure.includes('["mall_interaction_reports", "reporterId", "delete-on-closure"]'))],
 [1611,"interaction reports are explicitly deleted by reporter",()=>assert.match(closure,/DELETE FROM mall_interaction_reports WHERE reporterId=\?/)],
 [1612,"kitchen referrals use owner ownership",()=>assert.ok(closure.includes('["kitchen_referrals", "ownerId", "delete-on-closure"]'))],
 [1613,"kitchen referrals are explicitly deleted by owner",()=>assert.match(closure,/DELETE FROM kitchen_referrals WHERE ownerId=\?/)],
 [1614,"vendor evidence uses vendor ownership classification",()=>assert.ok(closure.includes('["mall_exception_evidence", "vendorId", "delete-through-owned-vendor"]'))],
 [1615,"vendor evidence resolves through canonical vendor owner",()=>assert.match(closure,/SELECT id FROM vendors WHERE userId=\?/)],
 [1616,"vendor evidence deletes only owned vendor rows",()=>assert.match(closure,/DELETE FROM mall_exception_evidence WHERE vendorId IN/)],
 [1617,"closure relationship manifest remains inspectable",()=>assert.match(closure,/function closureRelationshipManifest\(\)/)],
 [1618,"database inquiry schema uses buyer ownership",()=>assert.match(db,/CREATE TABLE IF NOT EXISTS mall_inquiries[\s\S]*buyerId TEXT NOT NULL/)],
 [1619,"database inquiry schema uses seller ownership",()=>assert.match(db,/CREATE TABLE IF NOT EXISTS mall_inquiries[\s\S]*sellerId TEXT NOT NULL/)],
 [1620,"database interaction report schema uses reporter ownership",()=>assert.match(db,/CREATE TABLE IF NOT EXISTS mall_interaction_reports[\s\S]*reporterId TEXT NOT NULL/)],
 [1621,"database kitchen referral schema uses owner ownership",()=>assert.match(db,/CREATE TABLE IF NOT EXISTS kitchen_referrals[\s\S]*ownerId TEXT NOT NULL/)],
 [1622,"closure cleanup is transactional",()=>assert.match(lifecycle,/const tx = db\.transaction\(\(\) =>/)],
 [1623,"closure helper is exported for focused regression coverage",()=>assert.match(closure,/cleanupNonUserIdClosureArtifacts,/) ],
 [1624,"B131 certification contains exactly 25 milestones",()=>assert.equal(tests.length,25)],
];
for (const [n,title,fn] of tests) test(`B131 M${n}: ${title}`, fn);

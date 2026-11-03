"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const history = require("./walletHistory");
const wallet = fs.readFileSync(path.join(__dirname,"wallet.js"),"utf8");
const index = fs.readFileSync(path.join(__dirname,"index.js"),"utf8");
const client = fs.readFileSync(path.join(__dirname,"..","src","Wallet.tsx"),"utf8");

test("B51 transaction statuses are canonical",()=>{
  assert.equal(history.normalizeWalletTxStatus(" COMPLETED "),"completed");
  assert.equal(history.normalizeWalletTxStatus("cancelled"),"failed");
  assert.equal(history.normalizeWalletTxStatus("unknown"),"pending");
  assert.match(wallet,/walletHistory\.normalizeWalletTxStatus/);
});

test("B51 wallet history limits are bounded",()=>{
  assert.equal(history.clampHistoryLimit(999),100);
  assert.equal(history.clampHistoryLimit(0),1);
  assert.match(wallet,/walletHistory\.clampHistoryLimit/);
});

test("B51 wallet history cursor is deterministic",()=>{
  const cursor=history.encodeCursor("2026-09-28T10:00:00.000Z","wtx_2");
  assert.deepEqual(history.decodeCursor(cursor),{createdAt:"2026-09-28T10:00:00.000Z",id:"wtx_2"});
  assert.equal(history.decodeCursor("bad"),null);
});

test("B51 history pagination uses createdAt and id continuation",()=>{
  const rows=[{id:"b",createdAt:"2026-09-28T10:00:00.000Z"},{id:"a",createdAt:"2026-09-28T10:00:00.000Z"},{id:"c",createdAt:"2026-09-27T10:00:00.000Z"}];
  const page=history.paginateRows(rows,2);
  assert.deepEqual(page.rows.map(x=>x.id),["a","b"]);
  assert.deepEqual(history.decodeCursor(page.nextCursor),{createdAt:"2026-09-28T10:00:00.000Z",id:"b"});
});

test("B51 date range validation rejects reversed ranges",()=>{
  assert.deepEqual(history.validateDateRange("2026-01-01","2026-02-01"),{from:"2026-01-01",to:"2026-02-01"});
  assert.throws(()=>history.validateDateRange("2026-03-01","2026-02-01"));
});

test("B51 reconciliation mismatches have explicit reasons",()=>{
  assert.equal(history.classifyReconciliationIssue({safeToApply:false,referenceMatches:false,amountMatches:true,currencyMatches:true}),"provider_reference_mismatch");
  assert.equal(history.classifyReconciliationIssue({safeToApply:false,referenceMatches:true,amountMatches:false,currencyMatches:true}),"amount_mismatch");
  assert.equal(history.classifyReconciliationIssue({safeToApply:true,mappedStatus:"pending"}),"pending_review");
});

test("B51 duplicate provider references are detectable before settlement",()=>{
  const rows=[{id:"1",providerReference:"P1"},{id:"2",providerReference:"P1"},{id:"3",providerReference:"P2"}];
  assert.deepEqual(history.findDuplicateProviderReferences(rows),["P1"]);
});

test("B51 balance integrity compares ledger and completed external transactions",()=>{
  assert.deepEqual(history.balanceIntegrity(1500,1500),{balanced:true,ledgerMinor:1500,completedTransactionMinor:1500,differenceMinor:0});
  assert.equal(history.balanceIntegrity(1500,1499).balanced,false);
});

test("B51 wallet transaction history endpoint is authenticated and bounded",()=>{
  assert.match(wallet,/app\.get\("\/api\/wallet\/transactions"/);
  assert.match(index,/auth\.authMiddleware/);
  assert.match(wallet,/walletHistory\.clampHistoryLimit/);
  assert.match(wallet,/nextCursor/);
});

test("B51 client history uses continuation and stale-request protection",()=>{
  assert.match(client,/wallet\/transactions\?limit=/);
  assert.match(client,/historyCursor/);
  assert.match(client,/historyRequest/);
  assert.match(client,/mergeTransactionsById/);
});

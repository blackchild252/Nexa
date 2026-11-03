"use strict";
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const db=fs.readFileSync(path.join(__dirname,'db.js'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'index.js'),'utf8');
const receipts=require('./damiActionReceipts');

test('B29 creates durable user-scoped Dami action receipt storage',()=>{
  assert.match(db,/CREATE TABLE IF NOT EXISTS ai_action_receipts/);
  assert.match(db,/idx_ai_action_receipts_user_completed/);
  assert.match(index,/\/api\/dami\/actions\/history/);
  assert.match(index,/damiActionReceipts\.list\(db, req\.user\.id/);
});

test('B29 confirmed consequential actions return a receipt after existing authorization',()=>{
  assert.match(index,/aiActions\.consume\(db, req\.user\.id, req\.body\?\.actionId\)/);
  assert.match(index,/const complete = \(action, result\)/);
  assert.match(index,/damiActionReceipts\.record\(db, action, "completed"/);
});

test('B29 receipt listing never requires or exposes action payloads',()=>{
  const src=fs.readFileSync(path.join(__dirname,'damiActionReceipts.js'),'utf8');
  assert.doesNotMatch(src,/payload/);
  assert.match(src,/WHERE userId=\?/);
  assert.match(src,/ORDER BY completedAt DESC/);
});

test('B29 receipt module has the expected record/list surface',()=>{
  assert.equal(typeof receipts.record,'function');
  assert.equal(typeof receipts.list,'function');
});

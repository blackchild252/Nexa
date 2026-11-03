const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

test('AI memory settings update and clearing are atomic', () => {
  const start = source.indexOf('app.put("/api/ai/memory/settings"');
  const end = source.indexOf('app.get("/api/ai/memory"', start);
  const block = source.slice(start, end);
  const tx = block.indexOf('db.transaction(() => {');
  const upsert = block.indexOf('INSERT INTO ai_memory_settings');
  const clear = block.indexOf('DELETE FROM ai_memories');
  assert.ok(tx >= 0 && upsert > tx && clear > upsert);
});

test('AI memory creation checks the enabled state and 100-item limit inside one transaction', () => {
  const start = source.indexOf('app.post("/api/ai/memory"');
  const end = source.indexOf('app.patch("/api/ai/memory/:id"', start);
  const block = source.slice(start, end);
  const tx = block.indexOf('db.transaction(() => {');
  const setting = block.indexOf('SELECT enabled, retentionDays');
  const count = block.indexOf('SELECT COUNT(*) AS n FROM ai_memories');
  const insert = block.indexOf('INSERT INTO ai_memories');
  assert.ok(tx >= 0 && setting > tx && count > setting && insert > count);
});

test('AI plan creation claims the 100-plan limit inside the write transaction', () => {
  const start = source.indexOf('app.post("/api/ai/plans"');
  const end = source.indexOf('app.patch("/api/ai/plans/:id"', start);
  const block = source.slice(start, end);
  const tx = block.indexOf('db.transaction(() => {');
  const count = block.indexOf('SELECT COUNT(*) AS n FROM ai_plans');
  const insert = block.indexOf('INSERT INTO ai_plans');
  assert.ok(tx >= 0 && count > tx && insert > count);
});

test('AI plan creation cannot bypass the explicit approval lifecycle', () => {
  const start = source.indexOf('app.post("/api/ai/plans"');
  const end = source.indexOf('app.patch("/api/ai/plans/:id"', start);
  const block = source.slice(start, end);
  assert.match(block, /status !== "draft"/);
  assert.match(block, /explicit approval lifecycle/);
});

test('AI plan updates use terminal-state policy and compare-and-set status guards', () => {
  const start = source.indexOf('app.patch("/api/ai/plans/:id"');
  const end = source.indexOf('app.delete("/api/ai/plans/:id"', start);
  const block = source.slice(start, end);
  assert.match(block, /damiPlanLifecycle\.planTransitionError/);
  assert.match(block, /WHERE id=\? AND userId=\? AND status=\?/);
  assert.match(block, /Plan changed concurrently/);
});

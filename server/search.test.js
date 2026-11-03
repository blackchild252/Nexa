const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeQuery, normalizeTypes, score, searchAll } = require('./search');

function mockDb() {
  const tables = {
    users: [{ id: 'u2', name: 'Ada Lovelace', username: 'ada_l' }],
    blocks: [],
    money_groups: [{ id: 'g1', name: 'Holiday Pot', kind: 'pot', currency: 'NGN', updatedAt: '2026-09-01' }],
    money_group_members: [{ groupId: 'g1', userId: 'u1' }],
    mall_products: [{ id: 'p1', name: 'Desk Lamp', description: 'Warm light', price: 5000, currency: 'NGN', category: 'home', updatedAt: '2026-09-01', vendorId: 'v1' }],
    vendors: [{ id: 'v1', shopName: 'Bright Shop' }],
    expenses: [{ id: 'e1', category: 'food', note: 'Lunch', amount: 1500, currency: 'NGN', date: '2026-09-20', userId: 'u1' }],
    debts: [], financial_budgets: [], financial_goals: [], ai_plans: [], ai_notes: [], ai_knowledge: []
  };
  return { prepare(sql) { return { all(...args) {
    if (sql.includes('FROM users')) return tables.users.filter(r => r.username.includes(String(args[1]).replace(/%/g,''))).map(r=>r);
    if (sql.includes('FROM money_groups')) return tables.money_groups;
    if (sql.includes('FROM mall_products')) return tables.mall_products.map(p => ({...p,vendorName:'Bright Shop'}));
    if (sql.includes('FROM expenses')) return tables.expenses;
    return [];
  }}; } };
}

test('normalizes and bounds search input', () => {
  assert.equal(normalizeQuery('  desk   lamp\n'), 'desk lamp');
  assert.equal(normalizeQuery('x'.repeat(100)).length, 80);
  assert.deepEqual(normalizeTypes('money,ai,unknown'), ['money','ai']);
});

test('ranking favors exact and prefix matches', () => {
  assert.ok(score('desk lamp', 'desk lamp') > score('desk lamp holder', 'desk lamp'));
  assert.ok(score('desk lamp', 'desk') > score('table lamp', 'desk'));
});

test('searchAll enforces minimum query and returns filtered authorized categories', () => {
  const db = mockDb();
  assert.deepEqual(searchAll(db, 'u1', 'x', 'money'), { query:'x', types:['money'], results:[] });
  const r = searchAll(db, 'u1', 'food', 'money', 10);
  assert.equal(r.results.length, 1);
  assert.equal(r.results[0].type, 'money');
});

test('searchAll exposes bounded cursor pagination', () => {
  const db = { prepare() { return { all() { return []; } }; } };
  const first = searchAll(db, 'u1', 'food', 'money', 1);
  assert.equal(first.nextCursor, null);
});

test('friend search is a separate accepted-friend-only category and does not leak private fields', () => {
  const statements = [];
  const db = { prepare(sql) { statements.push(sql); return { all() { return [{ id: 'u2', name: 'Ada Lovelace', username: 'ada_l' }]; } }; } };
  const result = searchAll(db, 'u1', 'ada', 'friends', 10);
  assert.equal(result.results[0].type, 'friends');
  assert.equal(result.results[0].id, 'u2');
  assert.equal('email' in result.results[0], false);
  assert.match(statements[0], /FROM friendships f JOIN users u/);
  assert.match(statements[0], /FROM blocks b/);
  assert.match(statements[0], /f\.userId = \?/);
});

test('help search returns bounded static topics and Dami alias searches private knowledge', () => {
  const emptyDb = { prepare() { return { all() { return []; } }; } };
  const help = searchAll(emptyDb, 'u1', 'password', 'help', 10);
  assert.ok(help.results.some((row) => row.id === 'account-access'));
  assert.ok(help.results.every((row) => row.type === 'help'));
  assert.deepEqual(normalizeTypes('friends,help,dami'), ['friends', 'help', 'dami']);
});

test('search normalization caps token count and cursor encoding is stable across equal titles', () => {
  const { normalizeQuery, encodeCursor, decodeCursor, MAX_QUERY_TOKENS } = require('./search');
  const q = normalizeQuery(Array.from({length: MAX_QUERY_TOKENS + 3}, (_, i) => `t${i}`).join(' '));
  assert.equal(q.split(' ').length, MAX_QUERY_TOKENS);
  const cursor = decodeCursor(encodeCursor({score:10,title:'Same',type:'ai',id:'z2'}));
  assert.deepEqual(cursor, {score:10,title:'Same',type:'ai',id:'z2'});
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeMallQuery } = require('./mallQuery');

test('Dami cheapest-top request becomes a deterministic fashion price search', () => {
  const r = normalizeMallQuery('cheapest top from the mall');
  assert.equal(r.category, 'fashion');
  assert.equal(r.sort, 'price_asc');
  assert.equal(r.query, 'top from the mall');
});

test('ordinary Mall requests keep relevance ordering', () => {
  const r = normalizeMallQuery('ankara top');
  assert.equal(r.category, 'fashion');
  assert.equal(r.sort, 'relevance');
  assert.equal(r.query, 'ankara top');
});

test('explicit category is preserved', () => {
  const r = normalizeMallQuery('cheapest phone', 'electronics');
  assert.equal(r.category, 'electronics');
  assert.equal(r.sort, 'price_asc');
  assert.equal(r.query, 'phone');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeMallQuery, buildDiscoveryRequest } = require('./mallQuery');

test('Mall normalizer supports compound price and category constraints without canned phrases',()=>{
  const r=normalizeMallQuery('I want a shirt under ₦50k, affordable and in fashion',null,{sort:'relevance'});
  assert.equal(r.sort,'price_asc'); assert.equal(r.maxPrice,50000); assert.equal(r.category,'fashion');
});
test('Mall normalizer supports descending price and similar-product language',()=>{
  const r=buildDiscoveryRequest({query:'show me the most expensive alternative to this'});
  assert.equal(r.sort,'price_desc'); assert.equal(r.similar,true);
});
test('Mall normalizer preserves explicit category and min/max range',()=>{
  const r=buildDiscoveryRequest({query:'phone between 100k and 300k',category:'electronics',constraints:{minPrice:100000,maxPrice:300000}});
  assert.equal(r.category,'electronics'); assert.equal(r.minPrice,100000); assert.equal(r.maxPrice,300000);
});

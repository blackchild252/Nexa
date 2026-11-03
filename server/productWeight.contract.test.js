'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MIN_WEIGHT_KG, MAX_WEIGHT_KG, parseWeightKg, shipmentWeightKg } = require('./productWeight');

test('new products require a positive bounded weight in kilograms', () => {
  for (const value of [undefined, null, '', 0, -1, 'heavy', Infinity, NaN, MAX_WEIGHT_KG + 1]) {
    assert.equal(parseWeightKg(value, { required: true }).ok, false, `reject ${String(value)}`);
  }
  assert.deepEqual(parseWeightKg(MIN_WEIGHT_KG, { required: true }), { ok: true, value: MIN_WEIGHT_KG });
  assert.deepEqual(parseWeightKg('2.3456', { required: true }), { ok: true, value: 2.346 });
  assert.equal(parseWeightKg(MAX_WEIGHT_KG, { required: true }).ok, true);
});

test('legacy/update path may omit weight but explicit invalid weight is rejected', () => {
  assert.deepEqual(parseWeightKg(undefined), { ok: true, value: null });
  assert.equal(parseWeightKg(0).ok, false);
});

test('shipment handoff derives aggregate weight from validated product weights and quantities', () => {
  assert.deepEqual(shipmentWeightKg([{ weightKg: 1.25, quantity: 2 }, { weightKg: 0.5, quantity: 3 }]), { ok: true, weightKg: 4 });
  assert.equal(shipmentWeightKg([]).ok, false);
  assert.equal(shipmentWeightKg([{ weightKg: null, quantity: 1 }]).ok, false);
  assert.equal(shipmentWeightKg([{ weightKg: 1, quantity: 0 }]).ok, false);
});

test('weight helper has no price input or external transport side effects', () => {
  const result = shipmentWeightKg([{ weightKg: 2, quantity: 3, clientPrice: 0.01 }]);
  assert.deepEqual(result, { ok: true, weightKg: 6 });
});

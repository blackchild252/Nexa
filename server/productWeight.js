'use strict';

const MIN_WEIGHT_KG = 0.001;
const MAX_WEIGHT_KG = 10000;

/** Validate physical product weight in kilograms. Missing is allowed only for legacy/update callers. */
function parseWeightKg(value, { required = false } = {}) {
  if (typeof value === 'boolean') return { ok: false, error: 'Weight must be a numeric value in kilograms.' };
  if (value === undefined || value === null || value === '') {
    if (required) return { ok: false, error: 'Product weight is required in kilograms.' };
    return { ok: true, value: null };
  }
  const weight = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(weight) || weight < MIN_WEIGHT_KG || weight > MAX_WEIGHT_KG) {
    return { ok: false, error: `Weight must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg.` };
  }
  return { ok: true, value: Math.round(weight * 1000) / 1000 };
}

function shipmentWeightKg(items) {
  if (!Array.isArray(items) || !items.length) return { ok: false, error: 'At least one shipment item is required.' };
  let total = 0;
  for (const item of items) {
    const weight = parseWeightKg(item?.weightKg, { required: true });
    const quantity = Number(item?.quantity);
    if (!weight.ok || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
      return { ok: false, error: !weight.ok ? weight.error : 'Shipment quantity must be a positive whole number.' };
    }
    total += weight.value * quantity;
  }
  if (!Number.isFinite(total) || total > MAX_WEIGHT_KG * 100000) return { ok: false, error: 'Shipment weight is outside the supported range.' };
  return { ok: true, weightKg: Math.round(total * 1000) / 1000 };
}

module.exports = { MIN_WEIGHT_KG, MAX_WEIGHT_KG, parseWeightKg, shipmentWeightKg };

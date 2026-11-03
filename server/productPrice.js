'use strict';

const currencyModel = require('./currencyModel');

/** Validate product prices at the currency's minor-unit precision without silently rounding. */
function validateProductPrice(value, currency, { allowZero = true } = {}) {
  if (typeof value === 'boolean' || value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { ok: false, error: 'Enter a valid product price.' };
  }
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount <= 0)) {
    return { ok: false, error: allowZero ? 'Product price must be a non-negative amount.' : 'Sale price must be greater than zero.' };
  }
  try {
    const minor = currencyModel.majorToMinorUnits(amount, currency);
    return { ok: true, amount: currencyModel.minorToMajorUnits(minor, currency), minor, currency: currencyModel.normalizeCurrency(currency) };
  } catch (_) {
    return { ok: false, error: 'Price must use the supported currency precision; extra fractional digits are not rounded automatically.' };
  }
}

module.exports = { validateProductPrice };

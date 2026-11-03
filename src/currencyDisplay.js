'use strict';

// Display-only currency contract. Financial authority and currency support remain Main-owned.
const SUPPORTED_CURRENCIES = new Set([
  'NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'UGX', 'TZS', 'RWF', 'XOF', 'XAF',
  'CAD', 'AUD', 'NZD', 'INR', 'JPY', 'CNY', 'AED', 'SAR', 'CHF', 'SEK', 'NOK', 'DKK',
  'BRL', 'MXN', 'SGD', 'HKD', 'BHD', 'KWD',
]);

function formatMajorCurrency(amountMajor, currency, locale = 'en') {
  const code = String(currency || '').trim().toUpperCase();
  const amount = Number(amountMajor);
  if (!SUPPORTED_CURRENCIES.has(code) || !Number.isFinite(amount)) return 'Amount unavailable';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(amount);
  } catch {
    return 'Amount unavailable';
  }
}

module.exports = { SUPPORTED_CURRENCIES, formatMajorCurrency };

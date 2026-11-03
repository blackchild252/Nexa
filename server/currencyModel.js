const CURRENCIES = {
  NGN: { code: 'NGN', minorUnits: 2, name: 'Nigerian naira' },
  USD: { code: 'USD', minorUnits: 2, name: 'US dollar' },
  GBP: { code: 'GBP', minorUnits: 2, name: 'Pound sterling' },
  EUR: { code: 'EUR', minorUnits: 2, name: 'Euro' },
  GHS: { code: 'GHS', minorUnits: 2, name: 'Ghanaian cedi' },
  KES: { code: 'KES', minorUnits: 2, name: 'Kenyan shilling' },
  ZAR: { code: 'ZAR', minorUnits: 2, name: 'South African rand' },
  UGX: { code: 'UGX', minorUnits: 0, name: 'Ugandan shilling' },
  TZS: { code: 'TZS', minorUnits: 2, name: 'Tanzanian shilling' },
  RWF: { code: 'RWF', minorUnits: 0, name: 'Rwandan franc' },
  XOF: { code: 'XOF', minorUnits: 0, name: 'West African CFA franc' },
  XAF: { code: 'XAF', minorUnits: 0, name: 'Central African CFA franc' },
  CAD: { code: 'CAD', minorUnits: 2, name: 'Canadian dollar' },
  AUD: { code: 'AUD', minorUnits: 2, name: 'Australian dollar' },
  NZD: { code: 'NZD', minorUnits: 2, name: 'New Zealand dollar' },
  INR: { code: 'INR', minorUnits: 2, name: 'Indian rupee' },
  JPY: { code: 'JPY', minorUnits: 0, name: 'Japanese yen' },
  CNY: { code: 'CNY', minorUnits: 2, name: 'Chinese yuan' },
  AED: { code: 'AED', minorUnits: 2, name: 'UAE dirham' },
  SAR: { code: 'SAR', minorUnits: 2, name: 'Saudi riyal' },
  CHF: { code: 'CHF', minorUnits: 2, name: 'Swiss franc' },
  SEK: { code: 'SEK', minorUnits: 2, name: 'Swedish krona' },
  NOK: { code: 'NOK', minorUnits: 2, name: 'Norwegian krone' },
  DKK: { code: 'DKK', minorUnits: 2, name: 'Danish krone' },
  BRL: { code: 'BRL', minorUnits: 2, name: 'Brazilian real' },
  MXN: { code: 'MXN', minorUnits: 2, name: 'Mexican peso' },
  SGD: { code: 'SGD', minorUnits: 2, name: 'Singapore dollar' },
  HKD: { code: 'HKD', minorUnits: 2, name: 'Hong Kong dollar' },
  BHD: { code: 'BHD', minorUnits: 3, name: 'Bahraini dinar' },
  KWD: { code: 'KWD', minorUnits: 3, name: 'Kuwaiti dinar' },
};

const COUNTRY_CURRENCY = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', UG: 'UGX', TZ: 'TZS', RW: 'RWF',
  SN: 'XOF', CI: 'XOF', BF: 'XOF', ML: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF', GW: 'XOF',
  CM: 'XAF', GA: 'XAF', CG: 'XAF', TD: 'XAF', CF: 'XAF', GQ: 'XAF',
  US: 'USD', GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
  PT: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', CY: 'EUR', EE: 'EUR', LV: 'EUR',
  LT: 'EUR', LU: 'EUR', MT: 'EUR', SK: 'EUR', SI: 'EUR', HR: 'EUR', CA: 'CAD', AU: 'AUD',
  NZ: 'NZD', IN: 'INR', JP: 'JPY', CN: 'CNY', AE: 'AED', SA: 'SAR', CH: 'CHF', SE: 'SEK',
  NO: 'NOK', DK: 'DKK', BR: 'BRL', MX: 'MXN', SG: 'SGD', HK: 'HKD', BH: 'BHD', KW: 'KWD',
};

const supportedCurrencies = () => Object.values(CURRENCIES).map((item) => ({ ...item }));
const getCurrency = (value) => CURRENCIES[String(value || '').trim().toUpperCase()] || null;
function normalizeCurrency(value, fallback = null) {
  const code = String(value || '').trim().toUpperCase();
  if (CURRENCIES[code]) return code;
  const fallbackCode = String(fallback || '').trim().toUpperCase();
  if (fallbackCode && CURRENCIES[fallbackCode]) return fallbackCode;
  throw new TypeError('A supported ISO currency code is required.');
}
function currencyForCountry(countryCode) {
  const country = String(countryCode || '').trim().toUpperCase();
  return COUNTRY_CURRENCY[country] || null;
}
function minorUnitDigits(currency) {
  const item = getCurrency(normalizeCurrency(currency));
  return item.minorUnits;
}
function majorToMinorUnits(amountMajor, currency) {
  const code = normalizeCurrency(currency);
  if (typeof amountMajor === 'boolean' || amountMajor === null || amountMajor === undefined || (typeof amountMajor === 'string' && amountMajor.trim() === '')) throw new TypeError('Amount must be a finite major-unit number.');
  const amount = Number(amountMajor);
  if (!Number.isFinite(amount)) throw new TypeError('Amount must be a finite major-unit number.');
  const scale = 10 ** CURRENCIES[code].minorUnits;
  const scaled = amount * scale;
  const rounded = Math.round(scaled);
  if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 1e-7) {
    throw new TypeError(`Amount exceeds ${CURRENCIES[code].minorUnits} minor-unit precision for ${code}.`);
  }
  return rounded;
}
function minorToMajorUnits(amountMinor, currency) {
  const code = normalizeCurrency(currency);
  if (!Number.isSafeInteger(amountMinor)) throw new TypeError('Amount must be a safe integer in minor units.');
  return amountMinor / (10 ** CURRENCIES[code].minorUnits);
}
function formatMinorCurrency(amountMinor, currency, locale = 'en') {
  const code = normalizeCurrency(currency);
  const amount = Number(amountMinor);
  if (!Number.isSafeInteger(amount)) throw new TypeError('Amount must be a safe integer in minor units.');
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code, minimumFractionDigits: CURRENCIES[code].minorUnits, maximumFractionDigits: CURRENCIES[code].minorUnits }).format(amount / (10 ** CURRENCIES[code].minorUnits));
}
function quoteIsFresh(quote, { now = Date.now(), maxAgeMs = 5 * 60 * 1000 } = {}) {
  if (!quote || !Number.isFinite(Number(quote.rate)) || Number(quote.rate) <= 0) return false;
  const at = Date.parse(quote.asOf || '');
  return Number.isFinite(at) && at <= now && now - at <= maxAgeMs;
}
function validateFxQuote(quote, { fromCurrency, toCurrency, now = Date.now(), maxAgeMs = 5 * 60 * 1000 } = {}) {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (from === to) throw new TypeError('FX quote is not required for the same currency.');
  if (!quote || normalizeCurrency(quote.fromCurrency) !== from || normalizeCurrency(quote.toCurrency) !== to || !quoteIsFresh(quote, { now, maxAgeMs })) {
    throw new Error('A matching, fresh FX quote is required; conversion is unavailable.');
  }
  return { fromCurrency: from, toCurrency: to, rate: String(quote.rate), asOf: new Date(Date.parse(quote.asOf)).toISOString(), source: String(quote.source || 'unidentified').slice(0, 80) };
}
function convertMinorUnits(amountMinor, quote) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new TypeError('Amount must be a non-negative safe integer in minor units.');
  const rateText = String(quote?.rate || '');
  if (!/^\d+(?:\.\d{1,8})?$/.test(rateText)) throw new TypeError('FX rate must be a positive decimal with at most 8 fractional digits.');
  const [whole, fraction = ''] = rateText.split('.');
  const scale = 100000000n;
  const rateScaled = BigInt(whole) * scale + BigInt((fraction + '00000000').slice(0, 8));
  if (rateScaled <= 0n) throw new TypeError('FX rate must be positive.');
  const numerator = BigInt(amountMinor) * rateScaled;
  const rounded = (numerator + scale / 2n) / scale;
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Converted amount exceeds the safe integer range.');
  return Number(rounded);
}
function assertSameCurrency(fromCurrency, toCurrency) {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (from !== to) throw new Error('Cross-currency movement is blocked until an approved fresh FX quote and ledger policy are available.');
  return from;
}
function createFxProvider(adapter = null) {
  return Object.freeze({
    configured: Boolean(adapter && typeof adapter.quote === 'function'),
    async quote(fromCurrency, toCurrency) {
      const from = normalizeCurrency(fromCurrency);
      const to = normalizeCurrency(toCurrency);
      if (from === to) return { fromCurrency: from, toCurrency: to, rate: '1', asOf: new Date().toISOString(), source: 'identity' };
      if (!adapter || typeof adapter.quote !== 'function') throw new Error('FX provider is not connected; conversion is unavailable.');
      const raw = await adapter.quote(from, to);
      return validateFxQuote(raw, { fromCurrency: from, toCurrency: to });
    },
  });
}

module.exports = { supportedCurrencies, getCurrency, normalizeCurrency, currencyForCountry, minorUnitDigits, majorToMinorUnits, minorToMajorUnits, formatMinorCurrency, quoteIsFresh, validateFxQuote, convertMinorUnits, assertSameCurrency, createFxProvider };

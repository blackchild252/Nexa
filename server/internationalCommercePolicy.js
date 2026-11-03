"use strict";

const countryRows = require("./countries.json");
const COUNTRY_CODES = new Set(countryRows.map((row) => String(row.code || "").toUpperCase()).filter((code) => /^[A-Z]{2}$/.test(code)));
const CURRENCY_CODE = /^[A-Z]{3}$/;
const COUNTRY_CODE = /^[A-Z]{2}$/;
const MAX_TEXT = 180;

function text(value, max = MAX_TEXT) {
  const result = String(value ?? "").trim();
  return result && result.length <= max ? result : "";
}
function countryCode(value) {
  const code = String(value ?? "").trim().toUpperCase();
  return COUNTRY_CODE.test(code) && COUNTRY_CODES.has(code) ? code : null;
}
function amount(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1000000000 ? Math.round(number * 100) / 100 : null;
}
function normalizeCountryList(values) {
  if (!Array.isArray(values)) return { configured: false, valid: true, values: [] };
  const normalized = values.map((value) => countryCode(value));
  return { configured: values.length > 0, valid: normalized.every(Boolean), values: [...new Set(normalized.filter(Boolean))] };
}
function listOfCountryCodes(values) { return normalizeCountryList(values).values; }

function evaluateShippingEligibility(input = {}) {
  const sellerCountry = countryCode(input.sellerCountry);
  const buyerCountry = countryCode(input.buyerCountry);
  if (!sellerCountry || !buyerCountry) {
    return { status: "invalid_country", eligible: false, international: null, reasons: ["Valid seller and buyer ISO country codes are required."], providerRequired: false };
  }
  const countryLists = [input.prohibitedCountries, input.sellerAllowedCountries, input.buyerAllowedCountries, ...(Array.isArray(input.shippingZones) ? input.shippingZones.flatMap((zone) => [zone?.sellerCountries, zone?.buyerCountries]) : [])].filter(Array.isArray).map(normalizeCountryList);
  if (countryLists.some((list) => !list.valid)) {
    return { status: "invalid_policy", eligible: false, international: sellerCountry !== buyerCountry, sellerCountry, buyerCountry, reasons: ["A configured shipping-country policy contains an unsupported country code; review the policy before quoting."], providerRequired: false };
  }
  const international = sellerCountry !== buyerCountry;
  const reasons = [];
  const prohibitedCountries = listOfCountryCodes(input.prohibitedCountries);
  if (prohibitedCountries.includes(buyerCountry)) reasons.push("Destination is explicitly prohibited by configured policy.");
  const sellerCountries = listOfCountryCodes(input.sellerAllowedCountries);
  if (sellerCountries.length && !sellerCountries.includes(buyerCountry)) reasons.push("Destination is outside the seller's configured shipping-country list.");
  const buyerCountries = listOfCountryCodes(input.buyerAllowedCountries);
  if (buyerCountries.length && !buyerCountries.includes(sellerCountry)) reasons.push("Seller origin is outside the buyer's configured delivery-country list.");
  const restrictedGoods = Array.isArray(input.restrictedGoodsCategories) ? input.restrictedGoodsCategories.map((v) => text(v, 80).toLowerCase()).filter(Boolean) : [];
  const goodsCategory = text(input.goodsCategory, 80).toLowerCase();
  if (goodsCategory && restrictedGoods.includes(goodsCategory)) reasons.push("Goods category is explicitly restricted by configured policy.");
  if (reasons.length) return { status: "prohibited_by_configured_policy", eligible: false, international, sellerCountry, buyerCountry, reasons, providerRequired: false };
  const zones = Array.isArray(input.shippingZones) ? input.shippingZones : [];
  const matchingZone = zones.find((zone) => {
    const origins = listOfCountryCodes(zone?.sellerCountries);
    const destinations = listOfCountryCodes(zone?.buyerCountries);
    return origins.includes(sellerCountry) && destinations.includes(buyerCountry) && zone?.enabled === true;
  });
  if (!matchingZone) {
    return { status: "shipping_policy_not_configured", eligible: null, international, sellerCountry, buyerCountry, reasons: ["No enabled seller-to-buyer shipping zone is configured. Do not infer service availability from country listing."], providerRequired: international };
  }
  return { status: "eligible_for_quote", eligible: true, international, sellerCountry, buyerCountry, shippingZoneId: text(matchingZone.id, 80) || null, reasons: [], providerRequired: international };
}

function validateInternationalAddress(input = {}) {
  const code = countryCode(input.countryCode);
  const errors = [];
  if (!code) errors.push("Choose a valid country or territory.");
  if (!text(input.addressLine1, 180)) errors.push("Address line 1 is required.");
  if (!text(input.city, 100)) errors.push("City or locality is required.");
  if (input.addressLine2 != null && String(input.addressLine2).trim().length > 180) errors.push("Address line 2 is too long.");
  if (input.postalCode != null && String(input.postalCode).trim().length > 24) errors.push("Postal code is too long.");
  if (input.phone != null && String(input.phone).trim() && !/^\+[1-9]\d{7,14}$/.test(String(input.phone).trim())) errors.push("Phone number must use international E.164 format.");
  return { valid: errors.length === 0, countryCode: code, errors, providerValidation: "not_performed" };
}

function validateCustomsMetadata(input = {}) {
  const originCountry = countryCode(input.originCountry);
  const description = text(input.description, 240);
  const hsCode = String(input.hsCode ?? "").trim();
  const errors = [];
  if (!originCountry) errors.push("A valid country of origin is required.");
  if (!description) errors.push("A customs goods description is required.");
  if (hsCode && !/^[0-9]{4,10}$/.test(hsCode)) errors.push("HS code must contain 4–10 digits when supplied.");
  return { valid: errors.length === 0, originCountry, description, hsCode: hsCode || null, errors, classificationStatus: hsCode ? "seller_supplied_unverified" : "not_classified" };
}

function buildLandedCost(input = {}) {
  const currency = String(input.currency ?? "").trim().toUpperCase();
  const providerValidated = input.providerValidated === true;
  const items = amount(input.itemsAmount);
  const shipping = amount(input.shippingAmount);
  const duties = amount(input.dutiesAmount);
  const taxes = amount(input.taxesAmount);
  const fees = amount(input.otherFeesAmount ?? 0);
  const validCurrency = CURRENCY_CODE.test(currency);
  if (!providerValidated || !validCurrency || [items, shipping, duties, taxes, fees].some((value) => value === null)) {
    return { status: "not_calculated", total: null, currency: validCurrency ? currency : null, providerValidated: false, reasons: ["Landed cost requires validated provider/policy evidence and complete same-currency amounts; no tax or duty is inferred."] };
  }
  return { status: "provider_validated_estimate", total: Math.round((items + shipping + duties + taxes + fees) * 100) / 100, currency, providerValidated: true, reasons: ["Estimate only; final charges require the responsible carrier/customs/tax authority." ] };
}

function buildInternationalCommerceReadiness() {
  return {
    status: "PARTIAL_LOCAL_FOUNDATION",
    enabled: false,
    countryDirectoryAvailable: COUNTRY_CODES.size > 0,
    configuredShippingZones: false,
    carrierProviderValidated: false,
    customsProviderValidated: false,
    dutiesTaxProviderValidated: false,
    internationalCheckoutEnabled: false,
    missingRequirements: [
      "Seller-to-destination shipping zones and service eligibility policies",
      "Approved carrier adapter and live serviceability validation",
      "Country-specific address/postal validation rules and independent acceptance",
      "Customs classification and documentation workflow",
      "Validated duties/tax provider or authoritative calculation evidence",
      "Currency-consistent landed-cost evidence and cross-border refund/dispute acceptance",
    ],
    note: "Country/locale support does not establish shipping eligibility, legal compliance, carrier coverage, tax or customs values. International checkout remains disabled until explicit policy and provider evidence are validated.",
  };
}

module.exports = { COUNTRY_CODES, countryCode, evaluateShippingEligibility, validateInternationalAddress, validateCustomsMetadata, buildLandedCost, buildInternationalCommerceReadiness };

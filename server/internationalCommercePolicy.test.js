"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const policy = require("./internationalCommercePolicy");

test("international commerce policy has a real ISO country directory and rejects unknown country codes", () => {
  assert.ok(policy.COUNTRY_CODES.size > 200);
  assert.equal(policy.countryCode("ng"), "NG");
  assert.equal(policy.countryCode("ZZ"), null);
  assert.equal(policy.countryCode("NGA"), null);
});
test("shipping eligibility does not infer service from country listing", () => {
  const result = policy.evaluateShippingEligibility({ sellerCountry: "NG", buyerCountry: "GB" });
  assert.equal(result.status, "shipping_policy_not_configured");
  assert.equal(result.eligible, null);
  assert.equal(result.providerRequired, true);
});
test("enabled explicit shipping zone can authorize a quote without claiming carrier validation", () => {
  const result = policy.evaluateShippingEligibility({ sellerCountry: "NG", buyerCountry: "GB", shippingZones: [{ id: "ng-uk", enabled: true, sellerCountries: ["NG"], buyerCountries: ["GB"] }] });
  assert.equal(result.status, "eligible_for_quote");
  assert.equal(result.eligible, true);
  assert.equal(result.providerRequired, true);
});
test("explicit prohibited country fails closed", () => {
  const result = policy.evaluateShippingEligibility({ sellerCountry: "NG", buyerCountry: "GB", prohibitedCountries: ["GB"], shippingZones: [{ enabled: true, sellerCountries: ["NG"], buyerCountries: ["GB"] }] });
  assert.equal(result.eligible, false);
  assert.equal(result.status, "prohibited_by_configured_policy");
});
test("explicit seller destination allowlist is enforced", () => {
  const result = policy.evaluateShippingEligibility({ sellerCountry: "NG", buyerCountry: "GB", sellerAllowedCountries: ["NG"] });
  assert.equal(result.eligible, false);
});
test("invalid configured country policy fails closed instead of dropping the invalid entry", () => {
  const result = policy.evaluateShippingEligibility({ sellerCountry: "NG", buyerCountry: "GB", sellerAllowedCountries: ["ZZ"] });
  assert.equal(result.status, "invalid_policy");
  assert.equal(result.eligible, false);
});
test("invalid country code in a shipping zone fails closed", () => {
  const result = policy.evaluateShippingEligibility({ sellerCountry: "NG", buyerCountry: "GB", shippingZones: [{ enabled: true, sellerCountries: ["NG"], buyerCountries: ["ZZ"] }] });
  assert.equal(result.status, "invalid_policy");
  assert.equal(result.eligible, false);
});
test("configured restricted goods are rejected without inventing a default restricted list", () => {
  assert.equal(policy.evaluateShippingEligibility({ sellerCountry: "NG", buyerCountry: "GB", goodsCategory: "batteries", restrictedGoodsCategories: ["batteries"] }).eligible, false);
  assert.equal(policy.evaluateShippingEligibility({ sellerCountry: "NG", buyerCountry: "GB", goodsCategory: "batteries" }).eligible, null);
});
test("domestic and international paths are distinguished", () => {
  assert.equal(policy.evaluateShippingEligibility({ sellerCountry: "NG", buyerCountry: "NG" }).international, false);
  assert.equal(policy.evaluateShippingEligibility({ sellerCountry: "NG", buyerCountry: "GB" }).international, true);
});
test("address validation requires valid country, address line and city", () => {
  assert.equal(policy.validateInternationalAddress({ countryCode: "NG", addressLine1: "1 Main Road", city: "Ibadan" }).valid, true);
  assert.equal(policy.validateInternationalAddress({ countryCode: "ZZ", addressLine1: "1 Main Road", city: "Ibadan" }).valid, false);
  assert.equal(policy.validateInternationalAddress({ countryCode: "NG", addressLine1: "", city: "Ibadan" }).valid, false);
});
test("address validation enforces E.164 only when phone is supplied", () => {
  assert.equal(policy.validateInternationalAddress({ countryCode: "NG", addressLine1: "1 Main Road", city: "Ibadan", phone: "+2348012345678" }).valid, true);
  assert.equal(policy.validateInternationalAddress({ countryCode: "NG", addressLine1: "1 Main Road", city: "Ibadan", phone: "08012345678" }).valid, false);
  assert.equal(policy.validateInternationalAddress({ countryCode: "NG", addressLine1: "1 Main Road", city: "Ibadan" }).valid, true);
});
test("postal validation avoids imposing a universal country-specific format", () => {
  assert.equal(policy.validateInternationalAddress({ countryCode: "NG", addressLine1: "1 Main Road", city: "Ibadan", postalCode: "200001" }).valid, true);
  assert.equal(policy.validateInternationalAddress({ countryCode: "GB", addressLine1: "1 Main Road", city: "London", postalCode: "SW1A 1AA" }).valid, true);
  assert.equal(policy.validateInternationalAddress({ countryCode: "GB", addressLine1: "1 Main Road", city: "London", postalCode: "x".repeat(25) }).valid, false);
});
test("customs metadata requires origin and goods description", () => {
  assert.equal(policy.validateCustomsMetadata({ originCountry: "NG", description: "Cotton shirt" }).valid, true);
  assert.equal(policy.validateCustomsMetadata({ originCountry: "NG" }).valid, false);
  assert.equal(policy.validateCustomsMetadata({ originCountry: "ZZ", description: "Cotton shirt" }).valid, false);
});
test("customs HS code is syntax checked but never represented as authority-verified", () => {
  const result = policy.validateCustomsMetadata({ originCountry: "NG", description: "Cotton shirt", hsCode: "610910" });
  assert.equal(result.valid, true);
  assert.equal(result.classificationStatus, "seller_supplied_unverified");
  assert.equal(policy.validateCustomsMetadata({ originCountry: "NG", description: "Cotton shirt", hsCode: "bad" }).valid, false);
});
test("landed cost fails closed without validated provider evidence", () => {
  const result = policy.buildLandedCost({ currency: "GBP", itemsAmount: 10, shippingAmount: 2, dutiesAmount: 1, taxesAmount: 1, providerValidated: false });
  assert.equal(result.status, "not_calculated");
  assert.equal(result.total, null);
});
test("landed cost rejects mixed or invalid amount shapes and invalid currency", () => {
  assert.equal(policy.buildLandedCost({ currency: "US", itemsAmount: 10, shippingAmount: 2, dutiesAmount: 1, taxesAmount: 1, providerValidated: true }).status, "not_calculated");
  assert.equal(policy.buildLandedCost({ currency: "GBP", itemsAmount: -1, shippingAmount: 2, dutiesAmount: 1, taxesAmount: 1, providerValidated: true }).status, "not_calculated");
});
test("landed cost totals only explicit same-currency values when evidence is validated", () => {
  const result = policy.buildLandedCost({ currency: "GBP", itemsAmount: 10, shippingAmount: 2, dutiesAmount: 1.25, taxesAmount: 2.5, otherFeesAmount: 0.5, providerValidated: true });
  assert.equal(result.status, "provider_validated_estimate");
  assert.equal(result.total, 16.25);
  assert.equal(result.currency, "GBP");
});
test("readiness keeps international checkout disabled until evidence exists", () => {
  const result = policy.buildInternationalCommerceReadiness();
  assert.equal(result.enabled, false);
  assert.equal(result.internationalCheckoutEnabled, false);
  assert.equal(result.carrierProviderValidated, false);
  assert.ok(result.missingRequirements.length >= 5);
});

"use strict";

const { developerManifest, capabilityCatalog } = require("./extensionDeveloper");
const { frameworkManifest } = require("./extensions");
const { buildIntegrationEvidence } = require("./platformIntegrationPolicy");
const { buildInternationalCommerceReadiness } = require("./internationalCommercePolicy");
const { buildCustomerCareTraceability } = require("./customerCareTraceability");
const { buildTrustSafetyTraceability } = require("./trustSafetyTraceability");
const { buildRoadmapV2CarryForward } = require("./roadmapV2CarryForward");

const DEFINITIONS = Object.freeze([
  ["unifiedSearch", "Unified NEXA Search", "implemented", "Authenticated /api/search combines bounded results across authorized modules."],
  ["peopleSearch", "People search", "implemented", "Active usernames only; excludes self and either-side blocks; does not return email."],
  ["friendsSearch", "Friends search", "implemented", "Searches accepted friendship edges only and applies active-account and block checks."],
  ["groupsSearch", "Groups search", "implemented", "Money groups are limited to groups the signed-in user belongs to."],
  ["marketplaceSearch", "Marketplace search", "implemented", "Only active marketplace products are discoverable."],
  ["yaayzSearch", "Yaayz search", "implemented", "Active available listings and active adverts are searchable; order data remains user-scoped."],
  ["moneySearch", "Money search", "implemented", "Expenses, debts, budgets and goals are scoped to the signed-in user."],
  ["damiSearch", "Dami knowledge search", "implemented", "Plans, notes and knowledge are scoped to the signed-in user; lexical search only."],
  ["helpSearch", "Help search", "implemented", "Static help topics and Customer Care discovery terms are searchable; no live support case is created."],
  ["permissionRanking", "Permission-aware ranking and visibility", "implemented", "Results are sorted deterministically; private categories are filtered by user ownership, friendship and block policy."],
  ["semanticSearch", "Semantic search backend", "deferred", "No approved embedding/vector provider or semantic index is configured; bounded lexical ranking remains active."],
  ["extensionsArchitecture", "Extensions architecture", "implemented", "Manifest, allowlisted scopes, compatibility rules, explicit consent, lifecycle and audit metadata are present; arbitrary code is not executed."],
  ["developerRegistration", "Developer application registration", "implemented", "Authenticated extension registration and manifest validation are implemented."],
  ["oauth", "OAuth authorization server", "deferred", "A complete OAuth authorization/token exchange service is not established by the current extension framework."],
  ["apiScopes", "API scopes", "implemented", "Allowlisted extension scopes and per-user explicit consent are enforced by capability routes."],
  ["webhooks", "Extension webhooks", "deferred", "Extension event subscription, signing, retry and replay controls are not established; payment webhooks are a separate integration."],
  ["sandbox", "Extension sandbox", "deferred", "Third-party executable isolation is not available; extension code is metadata-only and not executed."],
  ["developerAnalytics", "Developer analytics", "implemented", "Owner-scoped developer analytics aggregates extension audit actions over a bounded 7–90 day window without exposing user content or credentials."],
  ["appReview", "Extension app review workflow", "implemented", "Developers can submit versioned review requests; configured owners can triage and decide them, with terminal decisions protected and audit logged."],
  ["extensionPermissions", "Extension permissions and consent", "implemented", "Requested scopes require user consent before enablement; unknown scopes are rejected."],
  ["appRevocation", "Extension revocation", "implemented", "Revocation changes lifecycle state, revokes active consents, blocks re-enable and is audit logged."],
  ["securityEvidence", "Local security-control evidence", "implemented", "Local controls include authenticated routes, owner gating for this report, bounded search, consent/scope checks and audit lineage; this is not an external penetration test."],
  ["internationalReadiness", "International readiness evidence", "implemented", "Country/locale/currency foundations exist; eligibility, provider availability and legal compliance are not inferred from locale support."],
  ["internationalCommerce", "International commerce", "deferred", "Country directory and local validation foundations exist; shipping-zone eligibility, carriers, customs, duties/tax and landed cost remain fail-closed until explicitly configured and validated."],
  ["strategicTraceability", "Strategic roadmap traceability", "deferred", "V2 has 500 unique strategy references. The 75 Block 11–13 candidate targets are validated at item/domain level, while historical V1 execution misfits and feature obligations remain open; the other 425 candidate targets remain provisional and need individual source evidence audits. No implementation status transfers automatically."],
  ["productionCertification", "Production readiness certification", "deferred", "Live deployed API, production database, external providers, device/browser acceptance and independent security review have not been certified by this local report."],
]);

const REQUIREMENTS = Object.freeze({
  semanticSearch: ["Owner-approved embedding provider and credential", "Configured vector index with access controls", "Retention/deletion policy and provider data-processing review", "Latency, cost and outage limits with lexical fallback tested"],
  oauth: ["Registered client IDs and exact redirect-URI allowlists", "Authorization Code flow with PKCE S256; no implicit/password grants", "Short-lived single-use authorization codes bound to client, redirect URI and PKCE", "Hashed, revocable refresh-token rotation and replay detection", "Issuer/audience validation, rate limits, audit events and security review"],
  webhooks: ["Allowlisted event catalog and verified subscriber ownership", "HTTPS destination validation with private/link-local IP and redirect protections", "Raw-body HMAC-SHA256 signatures, timestamp freshness and key rotation", "Durable idempotent delivery queue with bounded exponential retry", "Replay protection, delivery audit trail and operator recovery controls"],
  sandbox: ["Dedicated isolated runtime; never execute extension code inside the API process", "OS/container isolation with non-root identity and read-only filesystem", "CPU, memory, process, network and wall-clock limits", "No ambient secrets; explicit outbound network allowlist", "Independent adversarial sandbox testing before enablement"],
  productionCertification: ["Live deployed API and production database acceptance", "External provider and credential validation in the target environment", "Browser and physical-device acceptance", "Independent security review/penetration test", "Owner-approved rollback, monitoring and incident response evidence"],
  internationalCommerce: ["Explicit seller-to-destination shipping zones", "Approved carrier adapter and live serviceability validation", "Country-specific address/postal validation rules", "Customs classification and documentation workflow", "Validated duties/tax evidence and currency-consistent landed-cost calculation", "Cross-border delivery, return and dispute acceptance"],
  strategicTraceability: ["Individually audit source evidence for the 425 historical items still carried as evidence-audit-required", "Resolve the 75 historical mapping misfits without rewriting V1 execution history", "Record evidence-backed V2 status transitions per item", "Keep Main/Admin authority boundaries and external acceptance gates explicit"],
});

function buildPlatformReadiness({ packageVersion = "unknown", generatedAt = new Date().toISOString() } = {}) {
  const developer = developerManifest();
  const extension = frameworkManifest();
  const capabilities = capabilityCatalog();
  const internationalCommerce = buildInternationalCommerceReadiness();
  const customerCareTraceability = buildCustomerCareTraceability();
  const trustSafetyTraceability = buildTrustSafetyTraceability();
  const carryForward = buildRoadmapV2CarryForward();
  const strategicTraceability = { status: "REMEDIATION_IN_PROGRESS", strategicBlocks: 20, strategicMilestones: 500, themeAlignedBlocks: 17, misfitBlocks: [11, 12, 13], misfitMilestones: carryForward.historicalMisfitItems, itemLevelEvidenceAuditComplete: false, currentRemediation: "Block 28 — Global Roadmap V2 Block 01 Priority Evidence Audit — Queue Slice 001–025", carryForwardTargetsAssigned: carryForward.carryForwardTargetsAssigned, carryForwardTargetsValidated: carryForward.carryForwardTargetsValidated, carryForwardHistoricalItems: carryForward.historicalItems, carryForwardUniqueItems: carryForward.uniqueHistoricalItems, carryForwardMisfitItems: carryForward.historicalMisfitItems, misfitTargetsValidated: carryForward.misfitTargetsValidated, misfitTargetValidationComplete: carryForward.misfitTargetValidationComplete, carryForwardEvidenceAuditRequired: carryForward.evidenceAuditRequired, v2StrategyItems: carryForward.v2StrategicItems, automaticStatusTransfers: carryForward.automaticStatusTransfers, carryForwardNote: carryForward.note, customerCareItemsAudited: customerCareTraceability.auditedItems, customerCareFeatureComplete: customerCareTraceability.featureComplete, trustSafetyItemsAudited: trustSafetyTraceability.auditedItems, trustSafetyFeatureComplete: trustSafetyTraceability.featureComplete, note: "V1 remains immutable historical evidence. All 500 legacy rows have candidate V2 targets. The 75 Block 11–13 target references are validated at item/domain level, while their historical execution misfits and feature obligations remain open; the other 425 target assignments are provisional and need individual source-feature audits. No status transferred to V2. Supplemental Marketplace work is preserved and never counted as unrelated strategic completion." };
  const items = DEFINITIONS.map(([key, label, status, details]) => ({
    key, label, status, available: status === "implemented", details, requirements: REQUIREMENTS[key] || [],
  }));
  const implemented = items.filter((item) => item.status === "implemented").length;
  const deferred = items.filter((item) => item.status === "deferred").length;
  return {
    generatedAt,
    platformVersion: String(packageVersion || "unknown"),
    readOnlyForAdmin: true,
    status: deferred ? "PARTIAL_LOCAL_READINESS" : "LOCAL_READINESS_REVIEWED",
    summary: { total: items.length, implemented, deferred },
    search: { endpoint: "/api/search", mode: "bounded-keyword", maxQueryLength: 80, maxQueryTokens: 8, maxResults: 50 },
    extensions: {
      execution: extension.execution,
      lifecycle: extension.lifecycle,
      scopeCount: Object.keys(developer.scopes || {}).length,
      capabilityCount: capabilities.length,
      registration: developer.registration,
      validation: developer.validation,
      identity: developer.identity,
    },
    items,
    integrationEvidence: buildIntegrationEvidence(),
    internationalCommerce,
    customerCareTraceability,
    trustSafetyTraceability,
    strategicTraceability,
    roadmapV2CarryForward: carryForward,
  };
}

module.exports = { buildPlatformReadiness, DEFINITIONS, REQUIREMENTS };

"use strict";

const CAPABILITIES = Object.freeze({
  semanticSearch: Object.freeze(["ownerApprovedProvider", "accessControlledIndex", "dataProcessingReview", "fallbackValidated"]),
  oauth: Object.freeze(["redirectAllowlist", "pkceS256", "singleUseAuthorizationCodes", "rotatingRefreshTokens", "issuerAudienceValidation", "securityReview"]),
  webhooks: Object.freeze(["eventAllowlist", "signatureFreshness", "durableBoundedRetry", "replayProtection", "httpsSsrFProtection", "deliveryAudit"]),
  sandbox: Object.freeze(["isolatedRuntime", "nonRootReadOnlyRuntime", "resourceLimits", "networkAllowlist", "noAmbientSecrets", "adversarialReview"]),
  productionCertification: Object.freeze(["liveApiDatabaseAcceptance", "providerValidation", "browserDeviceAcceptance", "independentSecurityReview", "rollbackMonitoringEvidence"]),
});

function strictTrue(value) { return value === true; }

function buildIntegrationEvidence(input = {}) {
  const configured = input.configured && typeof input.configured === "object" ? input.configured : {};
  const validated = input.validated && typeof input.validated === "object" ? input.validated : {};
  const independentReview = input.independentReview && typeof input.independentReview === "object" ? input.independentReview : {};
  const liveAcceptance = input.liveAcceptance && typeof input.liveAcceptance === "object" ? input.liveAcceptance : {};
  const items = Object.entries(CAPABILITIES).map(([key, gates]) => {
    const configConfirmed = strictTrue(configured[key]);
    const validationConfirmed = strictTrue(validated[key]);
    const reviewConfirmed = strictTrue(independentReview[key]);
    const liveConfirmed = strictTrue(liveAcceptance[key]);
    const missing = gates.filter((gate) => !strictTrue(input.gates && input.gates[key] && input.gates[key][gate]));
    if (!configConfirmed) missing.unshift("explicitConfigurationEvidence");
    if (!validationConfirmed) missing.push("providerOrProtocolValidation");
    if (!reviewConfirmed) missing.push("independentSecurityReview");
    if (!liveConfirmed) missing.push("liveAcceptance");
    const evidenceComplete = missing.length === 0;
    return Object.freeze({
      key,
      status: evidenceComplete ? "evidence_complete" : configConfirmed ? "configured_unverified" : "deferred",
      configured: configConfirmed,
      validated: validationConfirmed,
      independentReview: reviewConfirmed,
      liveAcceptance: liveConfirmed,
      enabled: false,
      missingRequirements: [...new Set(missing)],
      secretsExposed: false,
    });
  });
  return Object.freeze({
    status: items.every((item) => item.status === "evidence_complete") ? "evidence_complete" : "evidence_incomplete",
    activationAllowed: false,
    secretsExposed: false,
    items,
  });
}

module.exports = { CAPABILITIES, buildIntegrationEvidence, strictTrue };

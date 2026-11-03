"use strict";

// Item-level source inventory for the original strategic Block 13.
// This is evidence classification only: it does not certify the feature set or
// rewrite the frozen V1 execution mapping. External provider/live acceptance is separate.
const ITEMS = Object.freeze([
  ["01", "Unify reporting model", "partial", "server/trustSafety.js; server/social.js; server/sourceIntake.contract.test.js", "Moderation content reports and other report sources exist, but a single canonical cross-domain report intake contract is not established."],
  ["02", "Unify violation model", "partial", "server/trustSafety.js; server/adminStaffWork.js; server/index.js", "Moderation feedback, violation APIs and Staff-work intake coexist; a single canonical violation record/identity across all source types is not proven."],
  ["03", "Unify moderation states", "partial", "server/trustSafetyMaturity.js; server/moderationResolution.js; server/vendorSubscriptions.js", "Several report, appeal, review and vendor states exist; a single transition graph and cross-domain terminal-state contract are not established."],
  ["04", "Add automated risk scoring", "missing", "No canonical risk-score engine, versioned model or score provenance contract found.", "No automated risk score is claimed. Missing signals must not be converted to a guessed score."],
  ["05", "Add content screening abstraction", "partial", "server/contentSafety.js", "A deterministic text boundary exists; it is not a general content screening provider interface and does not cover all policy classes."],
  ["06", "Add image-screening abstraction", "missing", "No verified image-screening provider adapter/acceptance contract found.", "Image moderation remains unavailable until an approved provider and validated response contract are configured."],
  ["07", "Add video-screening readiness", "deferred", "No verified video-screening provider adapter or live acceptance evidence found.", "Provider credentials, supported media, retention and live moderation acceptance are external dependencies."],
  ["08", "Add profile-risk signals", "partial", "server/identityVerification.js; server/trustSafety.js", "Identity and account signals exist, but no canonical profile-risk aggregation with source freshness and provenance is established."],
  ["09", "Add seller-risk signals", "partial", "server/vendorSubscriptions.js; server/marketplaceOperations.js; server/ownerAnalytics.js", "Seller/vendor state and reputation evidence exist in separate domains; a single versioned seller-risk record is not established."],
  ["10", "Add vendor-risk signals", "partial", "server/vendorSubscriptions.js; server/v5_99_85_b331_moderation.contract.test.js", "Vendor suspension and entitlement gating are evidenced; a unified vendor-risk score and full lifecycle policy are not."],
  ["11", "Add message-risk signals", "missing", "No canonical message-risk signal schema and provenance pipeline found.", "Message-risk classification remains unavailable; human reports are not described as automated detection."],
  ["12", "Add product-risk signals", "partial", "server/productAiModeration.js; server/marketplaceOperations.js; server/v5_99_85_b331_moderation.contract.test.js", "Product moderation/takedown and AI moderation-related code exist, but a single risk-signal contract and provider acceptance are not established."],
  ["13", "Add moderation queue", "partial", "server/moderationOperations.js; server/trustSafety.js", "A bounded report queue with normal/elevated/urgent grouping exists; cross-domain deduplication, policy-based prioritization and full queue lineage are not proven."],
  ["14", "Add Staff moderation", "partial", "server/adminStaffWork.js; server/index.js", "Staff capabilities include violation/report investigation; complete moderation-specific least-privilege and assignment lifecycle evidence remains incomplete."],
  ["15", "Add Admin escalation", "partial", "server/adminAccess.js; server/v5_99_85_b331_moderation.contract.test.js", "Owner-only vendor/product/ticket moderation controls are evidenced; a unified case escalation protocol across every moderation source is not."],
  ["16", "Add strikes", "partial", "server/trustSafety.js", "Feedback records strike numbers and current code closes accounts at three confirmed violations; the cross-domain policy approval, appeals interaction and exception handling are not established."],
  ["17", "Add enforcement levels", "partial", "server/trustSafety.js; server/vendorSubscriptions.js; server/marketplaceOperations.js", "Several enforcement actions exist, but a unified documented enforcement ladder and policy-driven thresholds are not established."],
  ["18", "Add temporary restrictions", "missing", "No general temporary restriction record with expiry, expiry worker and renewal audit contract found.", "Do not infer temporary restriction lifecycle from vendor suspension or product takedown."],
  ["19", "Add permanent restrictions", "partial", "server/trustSafety.js; server/vendorSubscriptions.js; server/v5_99_85_b331_moderation.contract.test.js", "Account closure and some owner-authorized permanent removal/takedown controls exist; a common permanent restriction model and appeal-safe restoration contract are not established."],
  ["20", "Add appeals", "partial", "server/trustSafetyMaturity.js; server/moderationResolution.js; server/index.js", "Appeal eligibility/window helpers and appeal history exist; full persisted intake and end-to-end appeal workflow are not certified by this inventory."],
  ["21", "Add appeal review", "partial", "server/trustSafetyMaturity.js; server/moderationGovernance.js; server/moderationResolution.js", "Appeal states, aging and summaries exist; reviewer independence, conflict checks and separation from original decision makers are not established."],
  ["22", "Add moderation audit", "partial", "server/trustSafety.js; server/index.js; server/v5_99_85_b331_moderation.contract.test.js", "Some moderation actions are audited; durable, complete, append-only lineage across all enforcement and appeal actions is not proven."],
  ["23", "Add safety analytics", "partial", "server/ownerAnalytics.js; server/moderationGovernance.js", "Report counts, appeal aging and moderation metrics exist; common definitions, coverage, missing-source disclosure and validated safety outcomes are incomplete."],
  ["24", "Complete Lifestyle video moderation readiness", "deferred", "No verified end-to-end Lifestyle video screening provider/queue/appeal acceptance evidence found.", "Video moderation is not certified; external provider, policy, retention and live acceptance remain deferred."],
  ["25", "Verify unified trust-and-safety architecture", "partial", "server/trustSafety.js; server/trustSafetyMaturity.js; server/moderationOperations.js; server/moderationResolution.js; server/moderationCaseHistory.js", "A source-level architecture exists across several modules, but cross-domain canonical identity, transitions, provider adapters and end-to-end evidence remain open."],
]);

function buildTrustSafetyTraceability() {
  const items = ITEMS.map(([item, requirement, status, evidence, note]) => ({ item, requirement, status, evidence, note }));
  const counts = { implemented: 0, partial: 0, missing: 0, unverified: 0, deferred: 0 };
  for (const item of items) counts[item.status] = (counts[item.status] || 0) + 1;
  return {
    status: "ITEM_LEVEL_AUDIT_COMPLETE_FEATURE_GAPS_OPEN",
    strategicBlock: 13,
    v2StrategicBlock: 5,
    strategicItems: 25,
    auditedItems: items.length,
    featureComplete: false,
    counts,
    note: "Block 25 completed the local source-evidence crosswalk only. Historical V1 Block 13 execution mapping remains frozen and misfit; V2 Block 05 implementation remains open. Main retains policy and moderation authority. External provider and live acceptance are not certified.",
    items,
  };
}
module.exports = { ITEMS, buildTrustSafetyTraceability };

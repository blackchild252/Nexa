# NEXA Main — Company and Product Scope Contract

## Stable identity model
- Company identity answers which legal/product company owns an operation.
- Product identity answers which application owns the workflow.
- Industry coin identity is a separate label and must not imply a wallet, payment rail, live ledger, or transferable asset.
- User-facing job titles are presentation labels only. They never grant permissions.

## Main-owned boundary
- NEXA Main owns its customer, account, marketplace, order, vendor and Zeeza records.
- Main administrative authority is resolved by Main's server-side `adminAccess` role/permission gate and existing configured-admin policy. Client visibility is not an authorization boundary.
- Main report submission accepts only `companyId=nexa` and `productId=nexa-main` if callers supply identity fields. Unknown, mismatched, and cross-company labels are rejected.
- The `server/companyScope.js` helper defines an explicit allowlist and fails closed for company membership checks. It is a policy helper, not a claim that every legacy route has been migrated to multi-company tenancy.

## Other product boundaries
- LORDGISTICS remains a separate company/product. A NEXA role does not imply LORDGISTICS membership; company membership must match explicitly.
- Admin AAMI is an umbrella product; NEXA Main Administrative Director tools remain Main-specific.
- AAMI Central Web App owns central governance records and review decisions. Main stores only opaque idempotency metadata and approved source references for the reporting boundary; live provider delivery is not configured in this checkpoint.
- AAMI coin is the industry-coin identifier only. No live coin ledger or wallet capability is asserted by this identity contract.

## External integration and navigation follow-up
- Authenticated Main-to-Central provider calls and Central-originated notification/status events are parked until the authoritative Central API/event/credential contract is supplied.
- Admin AAMI company-selector routing into NEXA and LORDGISTICS homes requires the companion Admin AAMI source/runtime to verify. It is not inferred from NEXA Main alone.

## Evidence
- `server/companyScope.contract.test.js` tests approved title labels, title-not-authority, cross-company denial, company/product compatibility, industry coin separation and bounded correlation IDs.
- `server/centralReporting.contract.test.js` tests report-scope denial for non-NEXA and mismatched product identities, owner-only report projection and fail-closed Central-unavailable behavior.
- `server/companyScope.ui.contract.test.js` tests revised user-facing terminology on reviewed screens and confirms legacy API paths remain unchanged.

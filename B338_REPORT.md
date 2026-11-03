# B338 — V5.99.92 — NEXA/Admin governance integration

## Scope
Make the Admin web app the operational governance bus stop for the shared NEXA system, while preserving each domain's canonical server authority.

## 25 milestones
M4791–M4815 completed.

- Shared NEXA server/database authority verified for phone app and Admin web.
- Admin web links back to the NEXA app on the same server.
- Existing phone-side Marketplace Admin dispute boundary preserved; no unsafe external-link shortcut introduced.
- Owner permissions extended for centralized violation examination and platform removal.
- Admin user removal uses the existing account-closure integrity path and retains required financial evidence.
- Admin vendor removal expires vendor entitlement and cancels pending vendor subscription payments.
- User/vendor removal decisions are audited.
- Central Admin Violations queue added for user and vendor/Marketplace reports.
- Admin can examine, action/review or dismiss violations with a required note.
- Marketplace buyer/seller disputes remain on the canonical dispute authority and are resolved by Admin.
- Seller responses are shown separately from the Admin outcome.
- Buyer and seller receive an Admin-resolution notification.
- Vendor product creation does not enter the Admin approval queue.
- New product content is AI-moderated before publication.
- New gallery images are AI-moderated before acceptance.
- AI moderation rejects unsafe content and fails closed when the moderation service is unavailable.
- Admin retains post-publication Marketplace product takedown authority.
- Route guide, permissions, Admin page inventory and cross-app linkage are synchronized.

## Validation
- B338 governance contract: **8/8 PASS**
- B337 approval regression: **8/8 PASS**
- B331 moderation regression: **25/25 PASS**
- Account/vendor lifecycle regression set: **45/45 PASS** across selected governance/account/moderation suites
- Admin web: **61/61 PASS**
- Devil's Walk: **CLEAN** — JS 699/699, TS syntax 204, relative imports 646/646, route targets 43/43, 0 blockers
- Full server aggregate: **5063 PASS / 41 FAIL / 46 SKIP**. The failing set is not a B338 regression: it is dominated by parked payment-provider/runtime tests and historical contracts such as B250/B251/current-state assertions. These remain NOT PASSED and are not represented as green.
- God Hand planner: generated the 25-item B338 queue but the full planner run timed out before completion. No God Hand verify pass is claimed.
- Typecheck: **NOT RUN** — node_modules unavailable.
- Real database, real browser, phone/device, Playwright, EAS, stores and external providers: **NOT TESTED**.

## Product-upload policy
Marketplace vendor product upload and gallery image upload require AI moderation only. They do not require manual Admin approval. Admin can still remove a published listing through the existing moderation authority.

## Platform-removal policy
Admin removal is an audited platform-level closure/deactivation action. Financial and transaction records required for integrity are retained/redacted by the existing closure rules; removal does not mean deleting evidence required for settlement, accounting or disputes.

# NEXA V5.99.91 B337

## Theme
Admin Approval Center / NEXA governance bus stop.

## 25 milestones
M4766–M4790 complete.

## What changed
- Added owner-only `approvals` Admin permission.
- Added central `/api/admin/approvals` queue.
- Added durable `nexa_subscription_requests` approval workflow.
- Paid subscription activation now waits for Admin approval.
- Paid subscription plan changes now wait for Admin approval.
- Subscription rejection requires an Admin reason.
- Added Admin payment-review records and review routes.
- Payment review never changes provider settlement truth.
- Central queue surfaces verification, Yaayz advert, Fitness gym and Kitchen Hub approvals.
- Added Admin-web Approval Center and Home links/counters.
- Added API/route-guide coverage and regression tests.
- Fixed a latent `adminOps` YaayzAdvert module dependency exposed during full registration testing.

## Validation
- Focused B337 approval contract: **8/8 PASS**.
- Admin-web suite: **59/59 PASS**.
- B331 moderation regression after dependency fix: **25/25 PASS**.
- `npm run test:server`: **NOT PASSED** as a complete environment-backed suite; many HTTP/runtime tests require packages unavailable in this environment (for example `dotenv`). The failure is recorded rather than hidden.
- Real typecheck: **NOT TESTED** because dependencies are unavailable.
- Browser/device/phone/Playwright: **NOT TESTED**.
- EAS/stores/external providers: **NOT TESTED**.
- God Hand: **NOT RUN**.

## Governance boundary
Admin approval is now the business approval authority. Payment-provider verification remains the technical payment truth; the Admin cannot fabricate provider settlement.

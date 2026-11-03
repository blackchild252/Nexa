# V3.50.1 Implementation and Test Report

## Changes in this patch
- Reject online checkouts with mixed currencies or non-NGN currency before stock reservation and order creation.
- Centralize Paystack verification checks for successful status, exact currency, and exact amount in minor units.
- Make payment confirmation idempotent: only newly-paid items trigger a confirmation push.
- Add tests for payment matching and webhook HMAC validation.

## Automated tests
Run with `npm --prefix server test`. Results from the build environment are recorded in the delivery note.

## Remaining work / limitations
- External calendar providers and other unrelated AI Hub integrations are outside this patch.
- Real Paystack end-to-end payment, refunds, production database migration, Android/iOS runtime, and full application UI flows require configured credentials and integration/device testing.
- Existing social, DM, listing, and order code still needs a full authenticated integration test suite and production review.

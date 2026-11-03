# NEXA V6.0.43 B389

**Version:** V6.0.43  
**Batch:** B389  
**Build:** 6208  
**Roadmap:** M5841–M5865

## Completed

- Central Aami financial authority fixed at **1 Aami = ₦1** for eligible internal NEXA payments.
- Marketplace Aami checkout now uses the shared server conversion helper.
- Subscription Centre Aami redemption now uses the shared server conversion helper.
- Consumer Aami/Sky Money responses no longer expose the NGN conversion rate.
- Admin Payments now exposes the internal Aami accounting policy and aggregate active-account liability to authorized administrators only.
- Important notifications can surface as the global animated in-app popup, including Yaayz and vendor-staff updates; calls, missed calls and chat remain excluded.
- Every global popup is visible for **2.5 seconds** unless the user closes it first with **X** or opens it.
- Focused financialisation/popup contracts: **21/21 PASS**.
- Ordered Block Walk: **70/70 traversal complete**.

## Validation

- JavaScript syntax: PASS.
- TypeScript syntax: PASS.
- Relative imports: PASS.
- Route targets: PASS.
- Focused Aami/payment/popup/Admin suites: PASS.
- External dependency-backed runtime checks: **NOT TESTED / excluded**.
- Browser/device: **NOT TESTED / excluded**.
- Live API/provider credentials: **NOT TESTED / excluded**.
- EAS, stores and deployment: **NOT TESTED / excluded**.

## Financial privacy boundary

The NGN equivalent is an internal accounting authority only. Consumer endpoints intentionally expose the Aami balance and Aami payment outcome, but do not expose the NGN conversion rate or aggregate Aami liability. Admin Payments is the authorized administrative view.

## External / parked

Unavailable local runtime dependencies, live providers/API credentials, browser/device execution, EAS, stores and deployment remain parked and are not counted as internal blockers.

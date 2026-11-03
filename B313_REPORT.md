# B313 — V5.99.67 (Kitchen Hub)

## What I did
- Label: "Nearby country" is now "Neighbouring country" (Chase form, accessibility label). That was the only place it showed. Two older guards were updated to the new wording.
- Kitchen screen has two tabs: Home Kitchen (unchanged) and Hub.
- Hub: Iceland is a normal approved shop (seeded). Any shop can join.
- Join the hub form: shop, contact, business and ID, food licence, country requirements and disclaimer (Nigeria, Ghana, Iceland, UK, US, general), currency, how buyers pay, weight billing (kg, g, lb, oz, flat rate, per item), shipping countries, courier rules, handling time, items not shipped, customs note, returns, house rules, two required acceptances.
- Every new shop is PENDING. The applicant cannot choose a status. Pending shops are hidden from buyers, cannot add items and cannot take orders.
- Only the configured admin can approve, reject or suspend (server: /api/leisure/kitchen/hub/admin/...).
- Buyer pays the seller: an order shows the shop's own payment details. No NEXA payment, no NEXA fee, until a third party is added.
- Public shop data never includes ID, tax or contact fields.

## TESTED / PASSED
- New test file: 9 of 9 (pending, hidden, owner-only approval, direct-pay order, validation, country requirements, no data leak, label).
- 76 related test files: 1172 passed, 7 failed. The 7 fail with "Cannot find module 'dotenv'" (no node_modules here); not caused by this change.
- Devil's Walk: clean (syntax, imports, routes).

## BLOCKED / NOT TESTED
- Full server tests and typecheck: no node_modules or network in this session.
- The Hub screens on a phone; the live admin approval through the real server.
- No approval screen in the app yet: for now the owner approves through the admin API.
- Hub items have no photos yet. Seller order inbox not built.
- Country requirement text is a starter list; check it against real rules before launch.
- Weight billing is collected and shown but not yet added to order totals.

## Next
- Owner approval screen, seller order inbox, hub item photos, weight charge in order total.

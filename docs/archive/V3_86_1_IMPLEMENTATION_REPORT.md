# NEXA V3.86.1 — AI Chat + Yaayz

## Release identity
- Current release: **3.86.1**
- Baseline: **NEXA V3.85.1 cumulative checkpoint**
- Scope: remove redundant standalone Chat shell, preserve Zeeza messaging, and add permanent Yaayz Ads + Tickets destination.

## Issue 55 — AI Chat shell consolidation
- Removed the standalone Chat destination from the primary tab shell.
- Removed the standalone Chat card from Home.
- Renamed the Dami entry to **AI Chat** and clarified Dami as NEXA's conversational AI surface.
- Preserved Zeeza direct messages and rooms; those remain friend/community communication rather than a second generic NEXA chat product.

## Issue 56 — Yaayz permanent destination
- Added Yaayz as a primary NEXA destination.
- Yaayz presents exactly two product surfaces: **Adverts** and **Tickets**.
- Added Yaayz to Home, global search taxonomy and backend indexing, notification routing, and versioned architecture documentation.
- Yaayz is integrated into the existing NEXA shell rather than implemented as a detached mini-app.

## Issue 57 — Ticketing foundation
- Added server-owned ticket listings supporting bus, airplane, event, stadium, concert, train, ferry, and other ticket types.
- Added authenticated seller listing creation with server-side validation.
- Added quantity-bounded ticket reservation and rollback when payment initialization fails.
- Reused the existing server-side payment provider boundary.
- Added payment verification and Paystack webhook fulfillment.
- Ticket codes are issued only after payment confirmation.
- Ticket orders/listings are retained for account/transaction continuity.

## Preserved
- Existing NEXA UI system and navigation architecture except the explicitly requested shell change.
- Dami AI functionality.
- Zeeza friends, direct messages, and rooms.
- Dream Marketplace, Money, notifications, search, extensions, developer console, authentication, authorization, and Sentry wiring.
- Existing payment provider implementation; no parallel payment service was introduced.

## Testing
- TESTED / PASSED: Yaayz/UI contract tests.
- TESTED / PASSED: standalone Chat removal / AI Chat / Zeeza messaging contract tests.
- TESTED / PASSED: Yaayz server-layer validation contracts.
- TESTED / PASSED: account lifecycle retention contract.
- TESTED / PASSED: full server regression suite — **269/269**.
- TESTED / PASSED: release audit and release gate.
- BLOCKED: Playwright browser execution — `@playwright/test` and browser binaries are not installed in the sealed environment.
- BLOCKED: live Sentry delivery without a real DSN.
- BLOCKED: TypeScript validation — the sealed environment lacks Expo/React/React Native dependency resolution (`expo/tsconfig.base`, React, React Native).
- NOT TESTED: live ticket payment/provider, device/emulator, production deployment.

## Security / access control
- Ticket listing creation requires authentication and is seller-owned.
- Ticket purchase requires authentication.
- Ticket quantity is bounded server-side.
- Ticket currency and price are validated server-side.
- Inventory is reserved transactionally before payment initialization.
- Failed payment initialization releases reserved inventory.
- Ticket codes are not generated until verified payment.
- Provider webhook fulfillment re-checks the payment reference, currency, amount, and current order state.

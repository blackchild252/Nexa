# NEXA MAIN APP — B471 Release Report

Release identity: V6.1.25 B471 (build code 6290)
Release purpose: repair the remaining stale contract tests found by a full Main server run and an Admin re-check.

## Corrections delivered

- `server/b144_wip9_variants.contract.test.js`: the Store Ajo test asserted an old refusal message that B146 removed on purpose. It now asserts the current behaviour (the explicit variant choice is passed to `productStock.reserve`).
- `server/v5_99_0_marketplace_storefront.contract.test.js` and `server/v5_98_45_marketplace_storefront_completion.contract.test.js`: both compile `src/marketplaceStoreUtils.ts` with `tsc`. TypeScript 6 rejects file arguments next to `tsconfig.json` (TS5112), so they now add `--ignoreConfig` only when `tsc` major version is 6 or higher. TypeScript 5.9 (the pinned version) is unchanged.
- No product, server or app source code was changed.

## Admin

- Admin V1.0.97 B98 was re-checked: `npm test` 727/727, Devil's Walk clean (112/112 syntax, 144 routes), roadmap check pass, identity pass. It needed no change and was not re-released.

## TESTED/PASSED

- Repaired tests plus guard tests (b144 variants, b146 Store Ajo variants, both storefront contracts, b274 block guards): 69/69.
- Main Devil's Walk: clean, no blockers (22 harmless border-colour advisories).
- Full Main server run before the fixes: 5,836 tests, 5,762 passed, 28 failed. 24 of 28 were caused only by missing `dotenv` or `better-sqlite3`; `M1130` only checks that `node_modules` exists; the other 3 were the stale tests fixed here.

## NOT TESTED / excluded

- The tests blocked by missing `dotenv` and `better-sqlite3` (wallet, payments, webhooks, order ownership) could not run here: no registry access and no offline cache. They need `npm install` and a full `npm test` on a machine with network.
- `npm run typecheck` is blocked: Expo/React Native packages are not installed.
- `npm run launch:preflight` reports 3 blockers that only the owner can supply: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_TERMS_URL` (HTTPS). Real domains were not invented.
- Production deployment, live Main–Admin HTTP, payment/identity/email provider acceptance, browser/device acceptance, EAS/store submission, legal review and independent security review.

## Launch status

**NOT LAUNCH READY** until the items above are done. All code-level failures that could be reproduced here are repaired.

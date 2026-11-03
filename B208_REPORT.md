# NEXA V5.98.60 B208

## Roadmap
M3075–M3099 — Aami Coin Economy, Yaayz Social Engagement & Subscription Centre Foundation.

## Baseline
Implemented cumulatively from sealed V5.98.59 B207. No rebuild. Existing authentication, NEXA Membership, Sky Wallet, Dream Marketplace, Yaayz tickets/adverts/discovery, payments, reviews, moderation, communication and privacy authorities were preserved.

## Implementation
- Audited existing subscription, wallet, Marketplace and Yaayz authorities before introducing the new economy.
- Added Aami Shopping Coin as a separate internal non-cash ledger; it is not a Sky Wallet balance and cannot be withdrawn as cash.
- Added server-authoritative Aami accounts, append-only ledger entries, balance updates, idempotency keys and transaction history.
- Added a central Subscription Centre authority exposing membership, vendor-scope separation, Aami balance and PPV allocation state.
- Preserved the existing Regular, Premium and VIP subscription plans and their existing wallet-based billing path.
- Added bounded PPV allocation rules: Regular 15%, Premium 25%, VIP 35% of the corresponding monthly subscription price, allocated over the active 30-day subscription period rather than creating unlimited per-view liability.
- Added a dedicated Yaayz social-post layer without replacing the existing Yaayz discovery/ticket/advert feed.
- Added persistent per-user/post likes, server-derived like counts, double-tap interaction, like animation and accessibility feedback.
- Added qualified-view recording with a 3-second minimum watch boundary, authenticated adult-account requirement, self-view exclusion and one reward opportunity per viewer/post/subscription window.
- Connected qualified-view rewards to the active subscription-tier PPV allocation and Aami ledger.
- Added Aami reward history and transparent earning/PPV information.
- Added controlled Aami payment to eligible NGN Dream Marketplace checkout, with server-authoritative debit, idempotency and Aami refund on eligible buyer cancellation.
- Added Aami redemption for one paid NEXA subscription month through the Subscription Centre.
- Preserved Google AdMob production placement boundaries; the new Subscription Centre does not add ads.
- Extended account-closure cleanup to Aami and Yaayz social data so new user-owned records do not bypass lifecycle deletion rules.
- Preserved the NEXA 18+ boundary through the existing adult-confirmation authority; children remain excluded.
- Corrected stale nested release metadata in app.json and synchronized release metadata to V5.98.60/build 6028.
- Reconciled historical B207 release validation to frozen B207 evidence instead of requiring the successor VERSION file to remain on V5.98.59.
- Preserved the historical B187 Marketplace checkout contract while extending checkout with the new Aami payment option.
- Registered B208 in the cumulative release gate and synchronized PROJECT_MEMORY, MASTER_ROADMAP, PRIORITY_ROADMAP and TEMPORARY_ROADMAP.

## Certification
- B208 focused contract: **25/25 PASS**.
- Maintained cumulative static release suite: **1156/1156 PASS**.
- Complete JavaScript/MJS/CJS syntax sweep: **568/568 PASS**.
- Store submission preflight: **10/10 PASS**.
- Dependency preflight: **PASS**; blockers: 0; reproducible: true; workspace dependencies are not installed in this authoring environment.
- Release audit: **PASS**.

## Economic controls
- Aami is an internal utility/reward currency, separate from cash and Sky Wallet.
- 1 Aami is currently redeemable as 1 unit of eligible internal NEXA purchase value; this does not create a cash-withdrawal right.
- Regular PPV allocation: 225 Aami per active monthly allocation, distributed at 15 Aami per qualified view across a maximum of 15 rewarding views.
- Premium PPV allocation: 625 Aami per active monthly allocation, distributed at 25 Aami per qualified view across a maximum of 25 rewarding views.
- VIP PPV allocation: 1,400 Aami per active monthly allocation, distributed at 40 Aami per qualified view across a maximum of 35 rewarding views.
- Likes are social signals and have a small bounded activity reward of 1 Aami per first like, subject to a 25-Aami daily reward cap; likes do not themselves create PPV earnings.
- Free-tier qualified views do not create PPV Aami rewards because there is no paid PPV allocation pool.

## Runtime limitation
Dependency-backed HTTP runtime, device/EAS and live-provider checks remain environment-dependent because project dependencies are not installed in this authoring workspace. They are not represented as product passes.

## Environment scope
Production launch environment variables remain outside B208 certification under the standing instruction to leave environment work aside.

## Release identity
Version: V5.98.60
Batch: B208
Milestones: M3075–M3099
Android/iOS build: 6028

## Completion
CHECK → FIX → TEST → RECHECK → SEAL.

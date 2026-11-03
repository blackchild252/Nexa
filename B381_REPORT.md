# B381 — V6.0.35 — M5691–M5715

Combined Consumer + Admin YouTube Creator / Business Hub hardening without requiring live API credentials.

## Completed
- Hardened Narrativia activation so its special unlimited/120-day privileges are administrator-controlled.
- Preserved YouTube uploads-playlist discovery as the Data API path.
- Added credential-readiness reporting without exposing `YOUTUBE_API_KEY`.
- Improved Business Hub status messaging for API-ready vs RSS-fallback operation.
- Fixed creator payment eligibility when an account carries multiple Business Hub capabilities.
- Made creator qualified-view awarding transaction-safe against concurrent duplicate awards.
- Made the qualified-view threshold explicit at 3 seconds.
- Made Dami-approved placement lifetime begin at approval time rather than import time.
- Made Admin manual video approval restart the correct 90/120-day placement lifetime.
- Preserved 25 free Shorts/month, paid 25/50/100 long-form packages and 100-video ceiling.
- Preserved 90-day ordinary creator and 120-day Narrativia lifecycle rules.
- Preserved persisted Yaayz autoplay preference, default ON.
- Preserved server-owned YouTube embed URL contract and private-video filtering.
- Added 25 focused YouTube/Business Hub regression contracts.
- Added Admin Web YouTube integration readiness panel.

## Verification
- Focused YouTube contracts: 25/25 PASS.
- JS syntax: 754/754 PASS.
- TS syntax: 208/208 PASS.
- Relative imports: 669/669 PASS.
- Route targets: 43/43 PASS.
- Angels Duty: CLEAN; 0 removable junk; 5 protected exact-duplicate groups reported.
- Devil's Walk: CLEAN; 0 blockers.
- Typecheck: NOT RUN — node_modules unavailable.
- Full God Hand/dependency-backed server sweep: NOT RUN for this release because the repository-wide sweep previously exceeded the execution window.
- Live YouTube API import: NOT TESTED — intentionally excluded pending credentials.
- Native embedded YouTube player/device/browser/EAS/store/deployment: NOT TESTED.

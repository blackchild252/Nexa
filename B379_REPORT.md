# B379 — V6.0.33

## Combined Consumer + Admin roadmap M5641–M5665

1. M5641 — Rename the user-facing Vendor Center authority to Business Hub.
2. M5642 — Add business-type metadata without breaking existing marketplace vendors.
3. M5643 — Add YouTube channel registration and ownership-state records.
4. M5644 — Register Narrativia as the founding YouTube content profile using its canonical handle URL.
5. M5645 — Add channel approval/suspension/rejection controls for Admin.
6. M5646 — Add YouTube channel-ID resolution from a supplied channel URL.
7. M5647 — Add YouTube Data API pagination for large channel inventories when a server API key is configured.
8. M5648 — Add RSS fallback for new-video discovery when Data API credentials are unavailable.
9. M5649 — Add authoritative ISO-8601 video-duration parsing and Shorts/long-form classification.
10. M5650 — Add Dami content/length screening before Yaayz placement.
11. M5651 — Enforce 25 free Shorts per creator per month for non-Narrativia channels.
12. M5652 — Add 25-video long-form package at ₦5,000/month.
13. M5653 — Add 50-video long-form package at ₦13,000/month.
14. M5654 — Add 100-video long-form package at ₦25,000/month and a 100-video monthly ceiling.
15. M5655 — Add monthly creator allocation/payment state and idempotent package verification.
16. M5656 — Enforce the 90-day Yaayz placement lifecycle for ordinary creator videos.
17. M5657 — Give Narrativia a 120-day lifecycle and no monthly content-count ceiling.
18. M5658 — Add automatic Narrativia refresh throttling so new videos are discovered from Yaayz traffic without per-request sync storms.
19. M5659 — Add approved creator videos to the existing Yaayz home feed through a server-owned content boundary.
20. M5660 — Add qualified-view recording with duplicate/day protection.
21. M5661 — Credit creator accounts at 20 Aami per 1,000 qualified views.
22. M5662 — Preserve source videos on YouTube while expiring only their Yaayz placement records.
23. M5663 — Add Business Hub creator UI for channel connection, sync, package purchase and payment verification.
24. M5664 — Add Admin Web creator-content moderation and channel/video controls.
25. M5665 — Add focused regression coverage and reconcile release/roadmap/handoff authorities.

## Validation

- YouTube creator contract: **7/7 PASS**.
- Changed server JavaScript syntax: **PASS**.
- Full dependency-backed TypeScript/server suite: **NOT TESTED** because `node_modules` is unavailable.
- Live YouTube import: **NOT TESTED**; production import requires network access and, for full historical channel inventory, a configured `YOUTUBE_API_KEY`. RSS fallback supports new-video discovery but does not guarantee the full historical catalogue.
- Browser/device, Playwright, live AI providers, EAS, stores and deployment: **NOT TESTED / excluded**.

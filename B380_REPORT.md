# B380 — V6.0.34

## Combined Consumer + Admin YouTube sync and Yaayz playback hardening — M5666–M5690

1. M5666 — Replace YouTube search-based inventory discovery with the channel uploads-playlist authority when the Data API is configured.
2. M5667 — Resolve YouTube handles through `channels.list` and retain the returned channel metadata.
3. M5668 — Retrieve the channel uploads playlist ID from `contentDetails.relatedPlaylists.uploads`.
4. M5669 — Paginate uploads in 50-item pages for large creator inventories.
5. M5670 — Retrieve authoritative video duration and metadata through `videos.list`.
6. M5671 — Exclude private videos from the NEXA creator inventory.
7. M5672 — Preserve RSS fallback only for discovery when the Data API is not configured.
8. M5673 — Keep RSS-only items pending until verified duration is available to Dami screening.
9. M5674 — Persist resolved YouTube channel title alongside channel ID and sync state.
10. M5675 — Preserve sync error state without exposing provider credentials.
11. M5676 — Start a server-owned Narrativia refresh loop with the existing 15-minute throttle.
12. M5677 — Keep feed-triggered Narrativia refresh as a second recovery path for newly published videos.
13. M5678 — Preserve Narrativia's uncapped monthly inventory and 120-day Yaayz placement rule.
14. M5679 — Preserve ordinary creator 90-day Yaayz placement and monthly allocation boundaries.
15. M5680 — Preserve 25 free Shorts/month and paid 25/50/100 long-form package limits.
16. M5681 — Persist Yaayz autoplay preference per authenticated user with a default of ON.
17. M5682 — Add authenticated GET/PATCH endpoints for the Yaayz autoplay preference.
18. M5683 — Return the current autoplay preference with the Yaayz creator feed.
19. M5684 — Generate policy-compatible YouTube embed URLs with autoplay and inline playback parameters for the future embedded-player surface.
20. M5685 — Expose Yaayz autoplay controls in Profile & Settings.
21. M5686 — Keep Business Hub creator status explicit about Data API versus RSS fallback mode.
22. M5687 — Include Yaayz playback preferences in account portability.
23. M5688 — Add focused regression coverage for playlist sync, automatic Narrativia refresh and autoplay persistence.
24. M5689 — Re-run Angels Duty and Devil's Walk after the integration changes.
25. M5690 — Reconcile release documentation and prepare the B380 sealed delivery boundary.

## Validation

- YouTube creator focused contract: **11/11 PASS**.
- Changed server JavaScript syntax: **PASS**.
- Angels Duty: **CLEAN** — 0 safe-junk candidates, 5 exact-duplicate groups preserved for review, 0 blockers.
- Devil's Walk: **CLEAN** — JS 754/754, TS syntax 208/208, relative imports 669/669, route targets 43/43, 0 blockers.
- Dependency-backed TypeScript typecheck: **NOT TESTED** — node_modules unavailable.
- Full dependency-backed server suite/God Hand per-file sweep: **NOT TESTED / blocked by the existing dependency-backed sweep cost**.
- Live YouTube import: **NOT TESTED** — requires the owner's configured `YOUTUBE_API_KEY` and provider/network access.
- Browser/device/Playwright/live AI providers/EAS/stores/deployment: **NOT TESTED / excluded**.

## Important boundary

The code now has the permanent sync architecture and autoplay preference/embed contract. The actual YouTube historical import and native embedded autoplay player still require the owner's provider credentials and the native YouTube player dependency/integration to be available; no secret was added to source.

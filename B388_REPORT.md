# NEXA B388 REPORT — V6.0.42 B388

**Version:** V6.0.42
**Batch:** B388
**Build:** 6207

## Combined roadmap — M5816–M5840

1. **M5816 — Aami unlock authority:** Added a server-owned 20-friend eligibility boundary for Free and Regular memberships.
2. **M5817 — Friend-count authority:** Eligibility uses accepted friendship rows, not client-supplied counts.
3. **M5818 — Free-tier gate:** Free members cannot earn new Aami rewards before reaching 20 friends.
4. **M5819 — Regular-tier gate:** Regular members cannot earn new Aami rewards before reaching 20 friends.
5. **M5820 — Premium continuity:** Premium remains eligible without the 20-friend gate.
6. **M5821 — VIP continuity:** VIP remains eligible without the 20-friend gate.
7. **M5822 — Central activity enforcement:** Aami activity awards pass through the eligibility boundary before ledger credit.
8. **M5823 — Yaayz social rewards:** Like/comment/share/post rewards respect the new unlock boundary.
9. **M5824 — Yaayz qualified-view rewards:** Subscription PPV Aami rewards respect the unlock boundary.
10. **M5825 — Yaayz Short viewer rewards:** Free/Regular qualified Short viewer Aami rewards respect the unlock boundary.
11. **M5826 — Creator reward boundary:** Qualified creator-view Aami rewards respect the owner's membership eligibility.
12. **M5827 — Chase milestone boundary:** Chase Aami milestones respect the same Free/Regular unlock rule.
13. **M5828 — Historical reward migration:** Legacy Kitchen cashback migration remains a historical ledger migration and is not incorrectly blocked.
14. **M5829 — Aami eligibility API:** Added authenticated `/api/aami/eligibility` server authority.
15. **M5830 — Aami Centre exposure:** Sky Money/Aami Centre now exposes live eligibility and friend progress.
16. **M5831 — Sky Money lock presentation:** Free/Regular users see the 20-friend requirement directly in the Earn Aami section.
17. **M5832 — Friend progress UI:** The Aami panel displays current friends, required friends, remaining friends and progress.
18. **M5833 — Zeeza handoff:** The Aami lock panel links directly to Zeeza Friends.
19. **M5834 — Unlock notification:** Reaching 20 friends creates a server-owned Aami unlock notification with idempotent dedupe.
20. **M5835 — Unlock animation intent:** Aami unlock notifications are marked for the global in-app animated popup surface.
21. **M5836 — Important notification popups:** Important social, money, marketplace, verification and moderation notifications can surface as in-app popups.
22. **M5837 — Notification exclusions:** Call/chat realtime notifications remain outside the generic popup surface.
23. **M5838 — Popup navigation:** Popup Open actions use the canonical notification navigation authority and server-owned notification action resolution.
24. **M5839 — Block-by-block traversal integration:** Added dedicated Global Notification Popup and Sky Money Aami Unlock blocks to the ordered 70-block traversal and completed them PASS.
25. **M5840 — Combined certification:** Focused Aami/friend/notification suites PASS; ordered traversal 70/70 PASS; external dependency/runtime checks remain parked.

## Validation

- Focused feature suite: **19/19 PASS**
- Aami historical contract suite: **all selected PASS**
- Friends concurrency suite: **PASS**
- Notification suite: **PASS**
- Ordered Block Walk: **70/70 PASS**
- Devil's Walk full test sweep: **0 internal blockers; 25 external runtime failures parked; 530 test files loaded; 5,348/5,419 passing; 46 skipped**
- External/parked blocks: Home Marketplace, Money, Wallet, Marketplace runtime dependency checks requiring unavailable local packages.
- TypeScript dependency-backed typecheck: **NOT TESTED** because the sealed environment has no installed Expo/React dependency tree.
- Browser/device, live providers, EAS, stores and deployment: **NOT TESTED / excluded**.

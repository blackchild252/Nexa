# NEXA V6.0.3 B349 — Consumer API Transport & Dami Learning Reconciliation

## Roadmap
M4941–M4965 — 25/25 implemented and validated internally.

## Implemented
1. Audited the consumer `src/api.ts` against actual consumer imports.
2. Confirmed the file had drifted into an Admin-only API client shape.
3. Restored the consumer transport from the last known-good sealed project source.
4. Preserved the consumer API base configuration.
5. Preserved authenticated bearer transport.
6. Preserved public unauthenticated transport.
7. Preserved auth-failure handling.
8. Preserved Google authentication helpers.
9. Preserved Dami request transport.
10. Preserved ScamCheck image transport.
11. Preserved transcription transport.
12. Preserved speech transport.
13. Preserved Dami action confirmation/history helpers.
14. Preserved Dami workflow helpers.
15. Preserved realtime client-secret transport.
16. Preserved account/privacy/lifecycle helpers.
17. Preserved Dami voice preference helpers.
18. Preserved Dami personalization helpers.
19. Added consumer Dami adaptive-learning state helper.
20. Added consumer adaptive-learning export helper.
21. Added consumer explicit-teaching helper.
22. Added consumer follow-up schedule/completion helpers.
23. Added consumer confirm/correct/forget and reset learning helpers.
24. Added a regression contract proving the consumer transport and learning routes exist; focused/Admin suite passed 70/70.
25. Recorded the architecture boundary and reconciled release/roadmap identity.

## Validation
- Focused consumer/API + adaptive-learning + Admin-web suite: **70/70 PASS**
- Release identity: **PASS**
- Devil's Walk: **PASS/CLEAN**
- Typecheck: NOT RUN — dependency-backed TypeScript environment unavailable.
- Browser/device/Playwright/live provider/EAS/store/deployment: NOT TESTED.

## Version
V6.0.3 B349 — build 6168

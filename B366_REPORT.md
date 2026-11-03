# B366 — V6.0.20 — M5366–M5390

**Combined Consumer + Admin accessibility focus and interaction consistency — 25/25 implemented.**

1. Restored the exact sealed B365 project from `NEXA-V6.0.19.zip` before edits.
2. Verified B365 release identity before mutation.
3. Advanced identity through locked release tooling to V6.0.20 B366 build 6185.
4. Audited direct Consumer `TouchableOpacity`/`Pressable` controls that bypassed the shared interaction primitive.
5. Preserved the canonical 44px minimum touch-target contract.
6. Preserved the 48px preferred touch-target contract.
7. Extended `NexaFocusPressable` semantic roles for checkbox/switch/radio/menu/image-button use.
8. Kept programmatic focusability tied to the disabled state.
9. Preserved the shared touch-target styling inside the focus primitive.
10. Preserved visible web focus rings for the shared focus primitive.
11. Migrated Consumer authentication controls to `NexaFocusPressable`.
12. Migrated the 18+ confirmation control to the shared focus primitive.
13. Migrated sign-in/create-account action controls to the shared focus primitive.
14. Migrated authentication navigation links to the shared focus primitive.
15. Migrated the offline retry control to the shared focus primitive.
16. Migrated the password show/hide control to the shared focus primitive.
17. Preserved password-control 44px visual/hit dimensions.
18. Preserved existing accessibility labels and states during migration.
19. Preserved 100% readability baseline and 115%/130%/145% scaling.
20. Preserved Admin Web 44px inputs, buttons and tab targets.
21. Preserved Admin Web `:focus-visible` keyboard indicator.
22. Added B366 regression contracts for Consumer focus, authentication controls and Admin focus/target floors.
23. Updated architecture documentation with the shared focus/interaction decision.
24. Updated release roadmap and launch handoff records.
25. Re-ran release identity and Devil’s Walk after the complete change set.

Focused B365+B366 accessibility contracts: **7/7 PASS**.
Devil's Walk: **CLEAN** — JS 740/740, TS syntax 205, relative imports 653/653, route targets 43/43, 0 blockers.
Full server suite: **NOT CERTIFIED** — legacy contracts contain cwd-sensitive path assumptions and stale source-shape assertions unrelated to this B366 change; dependency-backed TypeScript typecheck is also NOT RUN because root `node_modules` is absent.
Browser/device/live AI provider/EAS/store/deployment checks remain excluded.

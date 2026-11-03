# B367 — V6.0.21 — M5391–M5415

**Combined Consumer + Admin accessibility consistency — 25/25 implemented.**

1. Verified the sealed B366 workspace before mutation.
2. Advanced release identity through the locked release tool to V6.0.21 B367 build 6186.
3. Audited remaining direct Consumer actionable controls after B366.
4. Identified the crash/error recovery controls as the remaining raw Pressable exception.
5. Identified the Google-auth callback recovery control as the remaining raw TouchableOpacity exception.
6. Migrated Consumer crash Retry to `NexaFocusPressable`.
7. Migrated Consumer crash Home recovery to `NexaFocusPressable`.
8. Preserved 48px recovery-control dimensions.
9. Preserved existing accessibility labels and actions.
10. Migrated Google-auth Back to sign-in to `NexaFocusPressable`.
11. Preserved Google callback routing and existing 18+ confirmation gate.
12. Preserved the shared disabled/focus behavior supplied by the focus primitive.
13. Audited Admin Web keyboard-entry surfaces.
14. Found the page-search control at 40px.
15. Raised Admin page-search to 44px.
16. Found the keyboard skip-link without a 44px interaction floor.
17. Raised the Admin skip-link to 44px while preserving its off-screen keyboard behavior.
18. Preserved Admin button, form and tab 44px contracts.
19. Preserved visible `:focus-visible` treatment.
20. Audited Royal Dark body-text token contrast.
21. Audited Earth Light body-text token contrast.
22. Added regression coverage for WCAG-AA-safe canonical text pairs.
23. Added regression coverage for Earth Light legacy-literal text mappings.
24. Updated architecture, roadmap and launch-handoff records.
25. Re-ran release identity, focused contracts and Devil’s Walk before shipment.

## Verification

- Focused B365+B366+B367 accessibility contracts: **10/10 PASS**.
- Devil’s Walk: **CLEAN** after release-identity reconciliation.
- JS syntax: **741/741**.
- TypeScript syntax: **205/205**.
- Relative imports: **655/655**.
- Route targets: **43/43**.
- Full server suite: **5,109/5,266 PASS; 46 skipped; 111 failed**. Failures are legacy/cwd-sensitive contracts, including stale `server/accountPortability.js` path assumptions, and are not B367 accessibility failures.
- Dependency-backed TypeScript typecheck: **NOT RUN** — root `node_modules` is absent.
- Browser/device/Playwright/live AI providers/EAS/stores/deployment: **NOT TESTED / excluded**.
- God Hand: **TIMED OUT**; verification was not claimed.

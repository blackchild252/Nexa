# B251 — V5.99.5

## Repairs (from phone screenshots)
1. Home rails (Market Watch, NEXA Updates, Search NEXA): content was a seamless loop of copies, so text appeared in the middle of the bar. Now one copy enters at the right edge, crosses right-to-left, leaves at the left edge, and re-enters from the right.
2. Fonts: 90 of 91 screen files never set a fontFamily, so those screens (e.g. Zeeza profile) showed the Android system font while others showed Inter. A global default now gives every Text/TextInput the NEXA font, or the font chosen in Reading comfort.

## Build identity
V5.99.5 / B251 / build code 6070 in every app.json field. Package com.aami.nexa unchanged.

## Verification
- Focused B251 contract: 14/14 PASS (includes resolver behaviour checks)
- Related regression (Home rails, text scale, interaction scale, visual harmonization, scene fidelity, release consistency): PASS, 0 failures
- Release audit PASS; release gate PASS; store preflight all PASS
- NOT TESTED: on-phone rendering of the rails and fonts, EAS build, install-over-old, full typecheck (no node_modules/network here)
- Assumption: the Zeeza profile font problem is the mixed system-font/Inter look; if you meant something else (size, weight, spacing), tell me.

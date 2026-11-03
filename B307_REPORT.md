# B307 — V5.99.61 (God Hand run 3, part 2, M4526 to M4527)

## What I did
The real typecheck cannot run here (no node_modules, no network). I ran a strict tsc over src/ with the same options and no React types, on the V5.99.57 baseline and the current tree. Of 1,144 error lines, 18 were not explained by the missing packages. I read each against the code.

## Real faults fixed (M4526)
- GroupScreen: the Ajo "Record contribution" button label read r.name, which the server never sends, so a screen reader heard a raw member id. It now uses the member name already in scope.
- ZeezaInbox: the row label read t.name and t.username, which DmThread does not have, so it always said the thread id. It now reads t.with.
- NexaNavKeys: the Add panel had an accessibilityLabel that the modalA11y spread after it always overwrote. The dead one is removed; the label users hear is unchanged.
- formAccessibility: typed the helpers; fieldA11y no longer demands a second argument that no caller passes.

## Not fixed (M4527)
14 of the 18 look like effects of missing React, React Native and Expo types: Marketplace cart variant, Yaayz ad boundary, social feed timers, group kind lookup, motion level lookup, Ionicons names, tab icons. I could not prove that without node_modules.

## Older guards that followed the code
- B77 form semantics: its type-stripper now also strips unknown.
- B180 M2378: expects label(m), not the field that never existed.
- B191 M2658: expects the modalA11y label of the Add panel.

## TESTED / PASSED
- god_hand_run3_types.contract.test.js (4 of 4), registered in the release gate.
- The three older guards and the new one together: 62 of 62.
- The stand-in check shows no new error location against the V5.99.57 baseline (1,144 lines down to 1,133).

## NOT tested
- The real typecheck (npm run typecheck).
- Any phone: the new labels are only checked in source, not with a screen reader.
- Playwright, and the 25 environment failures.

## Next
Run npm install and npm run typecheck on a machine with network access and send the output.

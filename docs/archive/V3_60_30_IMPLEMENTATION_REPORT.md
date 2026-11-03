# NEXA V3.60.30 — Dami AI identity lock

## Status
IMPLEMENTED — cumulative build.

## Product identity
- **Platform:** NEXA
- **AI assistant:** Dami
- Dami is the stable name users address when interacting with the NEXA AI assistant by text or voice.
- Existing NEXA platform branding remains unchanged.

## User experience
Examples now supported by the product identity:
- “Hello, Dami…”
- “Hey Dami, can you help me?”
- “Dami, can I get the cheapest top from the mall?”

The existing shopping/mall intent and server-side catalog search remain the execution path; this milestone changes the assistant identity, not the authorization or marketplace rules.

## Surfaces updated
- AI assistant greeting, header, voice labels, and input placeholder.
- AI workspace screen.
- Home workspace AI entry.
- AI tab label.
- Server-side AI core and specialist identity prompts, including realtime voice instructions.
- Stable frontend identity constants in `src/aiBrand.ts`.

## Identity protection
`server/aiBranding.test.js` is a regression guard. It verifies that Dami remains the assistant identity, NEXA remains the platform identity, and key UI entry points continue to expose Dami. An accidental future replacement of the sealed identity will fail the regression suite rather than silently changing the product name.

## Validation
- Server syntax check: PASS.
- Full server regression suite: PASS after branding changes.
- Package/version consistency: PASS.
- ZIP integrity: PASS.

## Carry-forward
Frontend TypeScript, live/sandbox payment/refund, payment/dispute E2E, and device/emulator validation remain pending because they require external/runtime environments. Production provider credentials and licensed market-data provider remain deferred.

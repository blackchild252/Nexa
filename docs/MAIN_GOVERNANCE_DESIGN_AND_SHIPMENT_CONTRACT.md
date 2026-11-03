# NEXA Main — Company Governance, Design and Shipment Contract (M7241–M7265)

## Company-scoped identity and authorization

- Company and product identity are server-validated using the existing `server/companyScope.js` allowlist and the Central-report contract. User-facing titles are presentation only and never grant permissions.
- Administrative routes must continue to use server authentication, capability/role checks, resource ownership and company/product scope. A UI label or client flag is never authority.
- Cross-company requests fail closed. NEXA Main's product identity is `nexa-main`; external company selectors and companion-app navigation are outside this source tree and are parked.

## Customer Care escalation model

Local thread states remain `waiting`, `assigned`, `in_progress`, and terminal `closed`. Escalation tiers are a governance/audit classification, not a client-controlled privilege: `customer` → `customer_care` → `administrative_director` → `ceo` → `founder`. Each transition must record actor identity, prior/new tier, timestamp, reason code, thread ID, and request correlation ID; private notes must not be returned in customer-facing thread projections. Escalation to executive tiers requires a server-side capability and resource ownership check. The existing Administrative Director escalation route now advances one tier at a time, requires a bounded reason, persists tier/actor/time, and records the transition in the platform event log. Customer-facing thread projections expose the current tier and timestamp, but never the private escalation reason. The route is guarded by the existing owner-only server-side `staff_work` permission. CEO-versus-Founder actor identity and a distinct executive-only capability remain a follow-up, but cannot be bypassed by client-side titles.

## Product weight and shipping

- API field: `weightKg`, decimal kilograms; supported range 0.001–10,000 kg per product, rounded to three decimal places.
- New vendor-created listings require weight. Explicit invalid values are rejected. Existing listings remain readable with nullable weight so the migration is non-destructive; they need weight supplied on a later edit before a shipping handoff can use them.
- NEXA's marketplace database remains authoritative for product, vendor, buyer and order data. Shipping weight is computed from NEXA product weights × validated quantities; client-supplied prices are ignored by the local weight calculator.
- LORDGISTICS shipment creation and live price/label/status exchange are external and remain parked. No shipment is claimed to have been created by this contract.

## AAMI Central reporting

Main keeps its authenticated, minimized, owner-scoped and idempotent report request contract. Central provider credentials, event callbacks and live delivery are external and parked. Local acceptance does not mean Central received a report.

## Design and accessibility contract

- Existing `src/theme.ts` remains the source for semantic colors, typography, spacing, radii, touch targets and layout tokens; do not introduce per-screen palette forks for this block.
- Loading, empty, failure, success and disabled UI must retain visible text/state labels; status must not rely on color alone.
- Inputs require explicit accessibility labels, actionable controls use roles/states, touch targets aim for at least 44 points, and `src/motion.tsx` owns reduced-motion adaptation.
- Product weight is exposed as text in vendor listings, product detail and checkout cart when known; legacy unknown weight is omitted rather than guessed.

## External items parked

- AAMI Central live API, credentials, notifications and end-to-end correlation propagation.
- LORDGISTICS live shipment booking, external shipping prices, labels and tracking.
- Admin AAMI companion-app company selector/runtime.
- Device/browser visual acceptance, native Android/iOS builds and store acceptance.

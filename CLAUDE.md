# Read this first (any AI or coding agent)

1. Run `npm run session:start` BEFORE touching any file. If it fails, stop and fix the drift first.
2. The only naming/versioning rule is the locked section "Naming and versioning" in `AGENTS.md`. Do not restate, reword or extend it anywhere.
3. Never hand-edit a version, Batch, build code or archive name. A new release starts with `npm run release:bump`. A release ends with `npm run release:ship`.
4. Never write a test that hard-codes a release version. Use `scripts/release-identity.mjs`.
5. Say plainly what was NOT tested. Do not claim untested work is done.

6. Devil's Walk = full sweep (find only): `npm run walk`. God Hand = full sweep fix, 25 milestones per run: `npm run godhand`, then `npm run godhand -- verify`. Angels Duty = permanent cleanup layer: `npm run angels-duty` audits safe junk and exact duplicates; `npm run angels-duty -- --apply` removes only unambiguous temporary/generated junk. All three are defined in `AGENTS.md` and `docs/architecture/DEVILS_WALK_AND_GOD_HAND.md`.

Everything else: see `AGENTS.md`.

7. `MASTER_ROADMAP.md` is the sole permanent internal roadmap authority for NEXA Main. START and NEXT reconcile it with source, tests, release identity, and checkpoint evidence. Keep exactly 25 milestones per block and at least ten future blocks; do not create competing active priority/temporary roadmaps. Historical external PDFs are reference-only.

## Industry and company model (current)
- **A. A. M. I.** = Abdul Ahad Mubarrak Industry; AAMI is shorthand for the industry.
- **AAMI coin** = industry coin concept intended across member companies; do not claim a live coin/payment system unless separately implemented and tested.
- **NEXA Central Company** operates **AAMI CENTRAL WEB APP**, the central governance product.
- **Admin AAMI** is the umbrella administrative portal, not a company. Its company selector initially has NEXA and LORDGISTICS only.
- **Administrative Director** is the user-facing title for administrative roles. Internal role IDs/API tokens stay stable until a separately tested migration is authorized.
- NEXA and LORDGISTICS have separate company-scoped accounts, sessions, APIs, records, approvals, disputes and staff permissions. A company tile is navigation, never authorization.
- A new company is added through a deliberate owner-authorized future app update and roadmap block.


## A. A. M. I. governance and account workflow (current product contract)
- Industry/workspace: Abdul Ahad Mubarrak Industry (A. A. M. I.); AAMI coin is the intended industry coin, not a company or app.
- Central company: NEXA Central Company. Central product: AAMI CENTRAL WEB APP. Umbrella admin portal: Admin AAMI.
- Founder temporary display: SHOFOWORA DAHUNSI JOSEPH — President / Founder & Industry Owner; this is editable later and must not silently alter legal identity records.
- Only Founder and approved CEOs may access Central. Founder creates CEO accounts. CEOs receive email alerts for new Administrative Director applications and may approve/reject them with audit reasons.
- Approved Administrative Director activation code is single-use, applicant-bound, securely hashed, rate-limited and expires one hour after issuance. Never embed permanent credentials or log raw codes.
- Administrative Directors manage only their company/product scope and create vendor accounts. Vendors create staff accounts.
- Escalation: customer/user → Customer Care staff → Administrative Director → CEO → Founder.
- Admin AAMI homepage has two large company squares: NEXA opens the existing 36-tile Administrative Director homepage; LORDGISTICS opens a separate company-scoped workspace.
- Require positive product weight in kilograms (`weightKg`) for vendor product creation across relevant product flows. Server-side validation and persistence are mandatory; do not trust client-supplied shipment prices.
- Target shared backend is not the same as unrestricted shared data. Production shared-server wiring remains NOT VERIFIED until integration tests prove authenticated tenant/product boundaries.
- Keep individual roadmap IDs, statuses, versions, batches, checkpoints and releases separate.

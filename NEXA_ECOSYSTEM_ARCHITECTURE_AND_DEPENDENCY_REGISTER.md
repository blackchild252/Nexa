# A. A. M. I. Industry — Global Roadmap and Dependency Register

**As of 10 October 2026.** This synchronizes dependencies and governance decisions; it does not merge product roadmaps. Every product retains its own milestones, status, version, Batch, build identity, checkpoint, and release process.

## Industry and company identities
- **Industry/workspace:** Abdul Ahad Mubarrak Industry (**A. A. M. I.**; “AAMI” is shorthand).
- **Industry coin:** AAMI coin, intended across member companies. Live wallet, mint, transfer, balance, or payment rails are NOT IMPLEMENTED unless separately verified.
- **Central company:** NEXA Central Company. **Central governance product:** AAMI CENTRAL WEB APP.
- **Administrative portal:** Admin AAMI (formerly Admin NEXA); this is a product, not a separate company.
- **Member companies recorded:** NEXA and LORDGISTICS, pending verification of legal registration records.
- **Founder’s temporary display/position record:** **SHOFOWORA DAHUNSI JOSEPH — President / Founder & Industry Owner**. Temporary profile input only, not a legal identity assertion; owner may change it later.
- **User-facing admin title:** Administrative Director. Existing internal role IDs/API tokens must not be bulk-renamed without a separately tested migration.

## Four independent products
| Product | Type | Canonical roadmap | Source-of-truth responsibilities |
|---|---|---|---|
| NEXA MAIN APP | Consumer app 1 | `main/MASTER_ROADMAP.md` | Consumer accounts, customer care intake, Zeeza identity/chat, marketplace products/orders and user-facing experiences |
| LORDGISTICS | Consumer/operations app 2 | `lordgistics/MASTER_ROADMAP.md` | Logistics customer journey, shipments, transit, delivery, logistics vendor/staff operational records |
| Admin AAMI | Internal app 1 | `admin-aami/MASTER_ROADMAP.md` | Company selector and Administrative Director workspaces; NEXA’s existing 36-tile homepage; company-scoped admin UI |
| AAMI CENTRAL WEB APP | Internal app 2 | `AAMI-CENTRAL-WEB-APP/MASTER_ROADMAP.md` | Founder/CEO-only governance console, CEO account creation, company-level decisions, Administrative Director application approval/code issuance, role grants/revocation and escalation oversight |

## Central access policy and hierarchy
- **Central access:** only the Founder/Industry Owner and approved CEOs. Administrative Directors, staff, vendors, and customers do not log in to Central.
- Founder creates CEO accounts through a protected Central account-creation flow. Never hardcode founder credentials or permanent secrets in source, ZIPs, client bundles, or documentation.
- CEOs receive an email alert when an Administrative Director application arrives. An authorized CEO reviews it and, if approved, issues a single-use activation code. The code is bound to the verified applicant, email, requested company/role, and expires **one hour after issuance**. Store/compare only a secure hash; rate-limit, prevent replay, support revocation and audit the decision.
- Applicant enters the code in the relevant Admin AAMI company workspace, completes identity/email verification, sets a password and enrolls an approved second factor. Approval/code does not bypass server-side authorization.
- Founder provisions CEOs; Administrative Directors manage approved company scope; Administrative Directors create vendor accounts; vendors create staff accounts within their vendor scope.
- **Reporting chain:** customer/user → Customer Care staff → Administrative Director → CEO → Founder/Industry Owner. Each level resolves issues within authority; matters escalated to CEO/Founder are resolved there. Preserve privacy, evidence permissions, timestamps, ownership and audit trails.
- Role hierarchy: Founder/President → CEO → Administrative Director → Customer Care/other staff → vendor → vendor staff, with each role restricted to explicit company/product/action scope. Job title alone grants no access.

## Admin AAMI homepage and company separation
- Two large, accessible company squares initially: **NEXA** and **LORDGISTICS**.
- NEXA opens the existing **36-tile NEXA Administrative Director homepage**.
- LORDGISTICS opens a distinct Logistics Administrative Director workspace for approvals/verification, orders in transit, disputes, staff and operational reporting. Until the dedicated Logistics identity/API is implemented and tested, the page must visibly say NOT CONFIGURED and must not expose NEXA data.
- Future companies are added only by an owner-authorized versioned update and company-specific roadmap block. A tile is navigation, never an authorization boundary.

## Products, weights and logistics pricing
- Product creation in consumer/company vendor flows must require a positive product weight in kilograms (`weightKg`). Validate in client and authoritative server, persist it, return it through APIs, display it on product details/order lines and use it for shipment estimates where applicable.
- LORDGISTICS shipment pricing is weight-based in kilograms. Existing quote logic uses `weightKg`; vendor product weight must eventually flow to shipping quote calculations only after buyer/order confirmation and product API contract tests.
- Weight rules, rounding, dimensional weight, minimum charge and per-kg tariff table must be explicit. Do not silently change tariffs or claim a “standard rate” without configured tariff policy.
- Initial market remains Nigeria/NGN. FedEx/UPS remain disabled until credentials, authorization and integration tests exist.

## Shared server decision
- **Target architecture:** one shared industry backend/API platform is recommended, with separate product clients and company/tenant scopes, identity/access grants, service boundaries, data ownership, audit logs and least-privilege service credentials.
- **Current reality:** a shared production server is NOT VERIFIED. Projects have separate local runtimes/storage and incomplete cross-product wiring. Do not represent them as already sharing one server.
- A shared backend must not mean a shared unrestricted database. Central stores governance records and minimized report references; Main owns customer/commerce/Zeeza records; LORDGISTICS owns shipments/transit/disputes/logistics records; Admin AAMI owns UI state. Use authenticated versioned APIs/events, stable IDs, idempotency, correlation IDs, bounded retries, replay prevention and fail-closed privileged operations.

## Design system and UI governance
All four products need an individually branded, accessible interface specification and responsive component inventory. Shared tokens may align the ecosystem but each app retains its own identity.
- Define semantic color tokens, contrast, typography scale, font stack, line heights, spacing scale, grid/breakpoints, radius, elevation, focus states, icon rules, empty/loading/error states and motion preferences.
- Use consistent page anatomy: app shell, navigation, page title/action area, summary cards, content sections, forms, data tables/lists, confirmations, status badges and help/error messaging.
- All controls need keyboard/focus behavior, accessible names, visible state, reduced-motion support and mobile layouts. Color is never the sole signal.
- Roadmap each product’s own design system, section hierarchy and typography/spacing implementation; no shared roadmap IDs across products.

## Roadmap blocks registered by this update
| Product | Next registered design/governance block | Milestones | Status |
|---|---|---:|---|
| NEXA MAIN APP | Company-scoped governance, Administrative Director language, vendor product kg field and product detail weight contract | M7241–M7265 | REGISTERED — NOT STARTED |
| Admin AAMI | Founder/CEO/Administrative Director/staff role interfaces; dual-company workspace styling, responsive two-square home and 36-tile preservation | M8901–M8925 | REGISTERED — NOT STARTED |
| LORDGISTICS | Administrative Director console theme, logistics operational sections and vendor/product weight-to-shipping contract | M126–M150 | REGISTERED — NOT STARTED |
| AAMI CENTRAL WEB APP | Central founder/CEO login shell, CEO account creation, application notifications, approvals, audit and governance dashboard interface | M101–M125 | REGISTERED — NOT STARTED; prototype shell may exist, authentication/API not production-verified |

## Current block execution order (do not skip existing queues)
- NEXA Main: active carry-forward evidence queue M7116–M7165; M7120 is TESTED/PASSED, next is M7121.
- Admin AAMI: active evidence queue M8776–M8825; M8780 is TESTED/PASSED, next is M8781.
- LORDGISTICS: active secure dispatch block M026–M050; M030 is TESTED/PASSED, next is M031.
- AAMI Central: active governance block M001–M025; M008 is TESTED/PASSED, next is M009.
- Cross-product synchronization is by contracts and checkpoints, not by collapsing milestone numbering.

## Milestone accounting
- **New blocks registered in this update:** 4 × 25 = **100 planned milestone slots**.
- **Forward roadmap inventory:** 23 blocks / **575 planned slots** (not 575 completed features).
- **Current milestone ceilings after registration:** Main M7265; Admin AAMI M8925; LORDGISTICS M150; Central M125. These ceilings are local numbering ranges and not counts of completed work.
- Statuses must remain TESTED/PASSED, NOT TESTED, BLOCKED or DEFERRED. No production Central authentication, email, shared server, CEO provisioning, Logistics admin API or live AAMI coin is claimed implemented by this document.

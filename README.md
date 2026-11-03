# NEXA — Current status (V6.2.54 B600)

Start here: `AGENTS.md`, `VERSION.md`, `LAUNCH_HANDOFF.md`, `B600_REPORT.md`, and `MASTER_ROADMAP.md`. Current checkpoint: **V6.2.54 B600 / build 6419**, internal unsealed checkpoint. Dami avatar pose locks are enforced on the server (standing = Free, moving = Regular, computer = Premium, sitting and couch = VIP), and the studio now shows the plan the server confirmed, so a locked pose no longer looks open after a plan ends. No roadmap milestone was closed and no feature completion is claimed. Active roadmap block M7516–M7540 remains open; M7527 runtime HTTP/SQLite failure injection is still blocked by unavailable server dependencies. No browser/device/native or live integration acceptance is claimed.

---

# NEXA — Current Product Baseline

## V4.8.0 — Dami-only Home

NEXA is a Royal Dark unified platform. **Home belongs to Dami**: text, recorded voice, live voice, screenshot upload and Quick ScamCheck are embedded in the Home experience. Primary product destinations live in the bottom navigation: **Sky Money, Zeeza, Dream Marketplace, Yaayz, L.A. and Profile**.

### Public names
- Sky Money
- Sky Wallet
- Sky Savings
- Sky Group Savings
- Sky Store Savings
- Sky Market Watch
- Sky Insights
- Dream Marketplace
- Zeeza
- Yaayz
- L.A.

Legacy API/database identifiers are intentionally retained internally for backward compatibility; do not treat them as duplicate product systems.

### Current validation
- Ordered Block Walk: **70/70 PASS**
- B388 Aami/friend/notification focused suite: **19/19 PASS**
- Aami historical contracts and Friends/Notifications regression suites: **PASS**
- Release identity: **V6.0.42 B388 (build 6207)**
- Expo/React dependency-backed typecheck: **NOT TESTED** in the sealed environment because node_modules is unavailable
- Browser/device, live providers, EAS, stores and deployment: **NOT TESTED / excluded**

---

# NEXA V3.34.0 — Performance Optimization Master Project

This project advances the V3.32.0 master baseline to the V3.34.0 performance-optimization milestone while preserving the existing application modules.

## Current build
- Version metadata updated to 3.34.0.
- Roadmap documents updated for performance-baseline and bottleneck analysis.
- No unmeasured performance improvement is represented as completed.

## Validation status
Performance benchmarks, typecheck, full regression, mobile device testing, security review, and production checks remain **NOT RUN**. Do not treat this package as production-approved.

See `MASTER_ROADMAP.md` for current execution scope and `VERSION.md` for the current build identity.


## Current build
NEXA V3.35.0 — User-Controlled AI Memory (partial API foundation; UI and AI-context integration pending). See `MASTER_ROADMAP.md` for active execution scope and `NEXA_V3_35_MASTER_FEATURE_SPECIFICATION.md` for historical feature specification.


## Current version
V3.36.0 — AI Planning. See `NEXA_V3_36_MASTER_FEATURE_SPECIFICATION.md` for scope and safety boundaries.


## Current version
V3.37.0 — AI Workflow Automation (specification build). The workflow engine, full regression, and security validation are not yet implemented/verified. See `NEXA_V3_37_MASTER_FEATURE_SPECIFICATION.md`.


## Current version
V3.39.0 - AI Knowledge Hub (specification build). Retrieval, indexing, connectors, UI, and validation are not verified. See `NEXA_V3_39_MASTER_FEATURE_SPECIFICATION.md`.


## V3.40.0 status
V3.40.0 defines the Unified AI Experience. This is a specification build; the unified interface and integrations have not been implemented or validated. See `NEXA_V3_40_MASTER_FEATURE_SPECIFICATION.md`.


## V3.40.1 Unified AI update
A dedicated NEXA AI tab now provides entry to the existing assistant and marks unconfigured AI features clearly. See `NEXA_V3_40_IMPLEMENTATION_NOTES.md` for scope and validation status.

## V3.57 Developer Platform & Internal Contracts

See `DEVELOPER_PLATFORM_CONTRACTS_V3_57.md` for the stable internal API/error/authentication/webhook contract conventions. The machine-readable contract registry is `server/contracts.js` and its focused tests are `server/contracts.test.js`.


## Ecosystem architecture reference
See `NEXA_ECOSYSTEM_ARCHITECTURE_AND_DEPENDENCY_REGISTER.md` for product boundaries and cross-product dependencies. This is a shared architecture register, not a combined roadmap.


## V6.1.65 B511 — Recovery Manifest Validation and Telemetry Privacy

Backup manifest verification now validates metadata shape and binding before accepting the artifact; operational exception telemetry omits raw exception messages and original stacks. Local contract suite: 1081/1081 PASS; isolated Node SQLite recovery contracts: 25/25 PASS. Dependency-backed typecheck, production restore, live telemetry, browser/device and native acceptance remain untested. Checkpoint is unsealed. See `MASTER_ROADMAP.md` and `B511_REPORT.md`.

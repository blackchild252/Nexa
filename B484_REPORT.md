# B484 Report — NEXA Main V6.1.38

**What changed:** Updated the user-facing Marketplace dispute button, its accessibility label, and the dispute-route access message to say **Administrative Director**. Related contract assertions were updated. Internal `isAdmin`, `adminStatus()` and `/api/mall/admin/...` identifiers remain unchanged for compatibility; the wider role-label migration remains registered in M7216–M7240.

**Scope:** NEXA MAIN APP only. No change to the independent Admin AAMI or LORDGISTICS release identity.

**NOT TESTED until final gate:** contract suite, full server suite, dependency-backed typecheck, browser/device and cross-company live integration. Final ship output is authoritative.

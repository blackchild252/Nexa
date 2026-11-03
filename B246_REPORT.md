# NEXA V5.99.0 B246 — Release Report

## Roadmap
M4025–M4049 / B246

## Change
B246 makes the global Add Money action intent-preserving. The existing Sky Wallet surface now accepts a route `view` parameter and the canonical Add Money resolver opens `/wallet?view=deposit` directly. No new wallet implementation was introduced.

## Preserved boundaries
- Add Friend remains Zeeza friends.
- New Sky Group remains Sky Money groups.
- Add Product remains Vendor Center.
- Existing Wallet transaction/security flow remains unchanged.
- Subscription Centre, Vendor AI and Yaayz boundaries remain unchanged.
- Environment/deployment work is excluded from this certification.

## Validation
- B246 focused contract: 25/25 PASS
- Active cumulative contracts: 206/206 PASS
- Subscription unit tests: 10/10 PASS
- Vendor AI unit tests: 3/3 PASS
- Release audit: PASS
- Store submission preflight: 10/10 PASS
- Permanent release seal: pending at report creation

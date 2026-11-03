# B391 — V6.0.45

## Delivered
- Separated Main/Consumer from the embedded Admin web UI at the executable boundary.
- Removed the Main `/admin-app` static UI mount and its same-origin CORS exception.
- Removed Admin UI from the Main Docker image and environment contract.
- Removed Admin UI destinations from the Main ordered block traversal.
- Preserved historical embedded-Admin contracts/code under `docs/legacy/` rather than deleting evidence.
- Standalone Admin independently advanced to V1.0.1 B2 and gained an explicit release identity test.

## Verification
- Main release identity: PASS — V6.0.45 B391, build 6210.
- Main JavaScript syntax: 743/743 PASS.
- Main TypeScript syntax: 209/209 PASS.
- Main relative imports: 679/679 PASS.
- Main route targets: 44/44 PASS.
- Main ordered block walk: 43/43 blocks traversed with no blockers.
- Main Devil’s Walk: CLEAN, 0 blockers.
- Admin standalone suite: 64/64 PASS.

## Not tested / excluded
- Main dependency-backed TypeScript typecheck because `node_modules` is absent in the package.
- Browser/device, live API providers, EAS, app stores and deployment.

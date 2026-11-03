# NEXA Dependency Reproducibility

## V4.18.0 foundation

NEXA declares `npm@10.9.2` and Node `>=20.19.0`. The preflight script checks the Node/npm contract, root/server dependency parity, the npm lockfile, and installed modules.

A build is **not reproducible** until `package-lock.json` exists at the repository root and dependencies are installed from that lockfile. The current checkpoint intentionally does not claim this gate as passed because the execution environment has no installed root `node_modules`; `package-lock.json` is present.

### Required release flow

1. Use the declared Node and npm versions.
2. Run `npm install` once in a network-enabled build environment to create/update `package-lock.json`.
3. Review the lockfile diff and commit it with the matching `package.json` version.
4. On clean builders, run `npm ci` rather than resolving dependencies ad hoc.
5. Run `npm run deps:preflight`; every check must pass before calling the client build reproducible.
6. Run the server regression, frontend typecheck, and runtime/browser/device gates separately.

The preflight output includes a `blockers` array so an operator can distinguish a dependency-environment failure from a product test failure.

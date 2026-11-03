# Release Seal Contract

A release may be sealed only after:

1. affected tests pass;
2. cumulative regression tests pass;
3. release audit passes;
4. static/application release contracts pass;
5. code review checks pass;
6. version/roadmap/report metadata is synchronized;
7. the complete project archive is created;
8. archive integrity and SHA-256 are verified.

The seal is **source/archive based and environment-independent**. Device, emulator, installed dependency tree, network, Playwright availability, Sentry connectivity, and other workstation/environment conditions are not release-seal criteria.

The seal report must list PASS and FAIL separately.

## Permanent Source Seal

A sealed release is represented by a versioned `RELEASE_SEAL_V<version>.json` manifest and the matching release archive. The manifest records a deterministic SHA-256 fingerprint for every source file in the sealed snapshot, excluding the manifest itself, `.git`, dependency caches, and generated release archives.

`node scripts/release-seal.mjs verify` must pass before a sealed release is treated as unchanged. Future milestone work may change the working tree, but it must never mutate the sealed archive or its versioned seal manifest. `release-seal.mjs create` is one-way: if the versioned seal already exists, creation fails and the existing seal cannot be overwritten or refreshed. A new release receives a new versioned seal manifest and a new release version.

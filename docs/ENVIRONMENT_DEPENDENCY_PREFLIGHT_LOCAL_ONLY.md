# Environment and dependency preflight — local-only contract

The dependency preflight (`scripts/dependency-preflight.mjs`) is a read-only diagnostic. It reads the root and server package manifests, the lockfile, the local runtime version, npm configuration metadata, and installed package-manifest paths. It does not install packages, modify manifests or lockfiles, contact the registry, or print proxy/registry credentials.

Diagnostic package-name previews are bounded to 40 entries, with each displayed name limited to 160 characters. Exact missing-item totals and a `truncated` flag remain available so large or malformed dependency declarations cannot create unbounded reports.

The preflight can establish local manifest/lockfile consistency and whether dependency manifests are installed. It cannot establish registry reachability, successful package downloads, runtime server behavior, production deployment readiness, or device acceptance. Those remain separate tests and must not be inferred from a successful local preflight.

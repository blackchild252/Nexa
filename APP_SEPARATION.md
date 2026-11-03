# NEXA Main / Consumer Project

This package is the NEXA consumer/mobile project plus the shared NEXA server authority.

The Admin web application is a separate project. The Main package intentionally does not contain or serve the Admin UI, does not mount `/admin-app`, and does not grant CORS access merely because a request claims to be the server's own host.

The server remains the shared authority used by both applications. The standalone Admin project connects to this server over the documented Admin routes.

Historical embedded-Admin contracts are preserved under `docs/legacy/` as evidence only and are excluded from the executable Main test/block surface.


## Runtime connection

The standalone Admin app connects to this Main server through its documented `/api` routes. In production, the Admin web origin must be explicitly included in the server `CORS_ORIGINS` allowlist; Main does not grant access based on hostname claims.

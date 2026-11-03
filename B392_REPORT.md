# NEXA V6.0.46 B392

- Continued the separated Main/Admin architecture as two independent applications.
- Main runtime documentation now treats Admin as a standalone web application and no longer documents `/admin-app` serving or `ADMIN_APP_ENABLED`.
- Main `.env.example` now explicitly requires the standalone Admin origin to be included in production `CORS_ORIGINS`.
- Main `APP_SEPARATION.md` now documents the shared server/API authority and explicit Admin CORS requirement.
- Main release identity advanced through the locked release workflow to V6.0.46 B392, build 6211.
- External dependency-backed runtime, browser/device, live provider/API credentials, EAS, stores and deployment remain NOT TESTED / excluded.

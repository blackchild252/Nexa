# NEXA Main — web launch steps (V6.0.59 B405)

Main web is a static single-page build. It talks to the NEXA server over HTTPS. Admin is a separate site (see the Admin repo's `docs/HOSTING.md`).

## 1. Server (do this first)
Run the server image on a host with a **persistent disk** mounted at `/data` (the image keeps the database at `/data/nexa.db`; a free instance without a disk loses all data on restart). Set, never commit:
- `NODE_ENV=production`, `PUBLIC_URL=https://<server domain>`
- `CORS_ORIGINS=https://<main web domain>,https://<admin domain>` (never `*`; empty allows any origin)
- `PAYMENT_MODE`, `PAYMENTS_ENABLED`, `PAYSTACK_SECRET_KEY` (+ webhook secret), `NEXA_WALLET_MODE`, `MARKET_DATA_MODE`, `SENTRY_DSN`
- `NEXA_ADMIN_EMAILS` (owner accounts), `XAI_API_KEY` (Grok) / Gemini keys as used
- `NEXA_PREVIEW_MODE` must stay unset.
Then check `GET /health/ready` and, signed in as an admin, `GET /api/admin/launch-readiness`.

## 2. Build the web app
Set these at build time (they are baked into the bundle; none are secrets):
- `EXPO_PUBLIC_API_URL=https://<server domain>`
- `EXPO_PUBLIC_PRIVACY_POLICY_URL=https://...` and `EXPO_PUBLIC_TERMS_URL=https://...` (public pages; source text is in `docs/legal/`)
- `EXPO_PUBLIC_SENTRY_DSN` (optional)

```
npm ci
npm run launch:preflight     # must report 0 blockers
npm run build:web            # writes dist/
```

## 3. Host `dist/`
Any static host. `public/_redirects` (single-page fallback) and `public/_headers` (security + cache headers) are copied into `dist/` and are read by Netlify and Cloudflare Pages. On another host, recreate the same rules.
No Content-Security-Policy is set for Main web yet: React Native Web uses inline styles, so a policy must be tried against the real build first.

## 4. Check on the live site
Sign up, sign in, refresh on a deep link, open Marketplace, Dami, Profile (Advertising privacy shows its "not required" message on web), and watch the browser console for errors.

## Not available on web
Native-only features degrade by design: push notifications, Google ads, and voice/video calls (the calling build is required).

# NEXA launch security checklist (V5.22.0 / B58)

## Already in the code
- Passwords hashed with bcrypt; session tokens stored as SHA-256 hashes (a leaked DB cannot be replayed).
- Login: 30 tries / 15 min per IP **and** 10 tries / 15 min per email. Signup: per-IP cap. AI, wallet, search, subscription routes are rate-limited.
- Paystack webhook signature checked (HMAC-SHA512, constant-time compare).
- Security headers: nosniff, frame deny, no-referrer, permissions-policy, CSP `default-src 'none'`, HSTS in production.
- Body size cap (3 MB), CORS allow-list support, unhandled-rejection guard.
- API keys stay on the server (Grok/xAI, market data, Paystack). Nothing secret is in the app bundle.

## You must set on the host (never commit these)
1. `NODE_ENV=production`
2. `XAI_API_KEY`, `PAYSTACK_SECRET_KEY` (+ webhook secret)
3. `PUBLIC_URL=https://your-domain`  and  `CORS_ORIGINS=https://your-domain` (empty = any origin allowed)
4. `MARKET_DATA_MODE=live`
5. Keep `NEXA_WALLET_MODE=sandbox` until money features are tested end to end; never set `NEXA_PREVIEW_MODE`.
6. Serve only over HTTPS (Render / Railway / Fly do this for you). Put the SQLite DB on a persistent, backed-up disk.

## Habits
- Run `npm audit` before each release; update dependencies monthly.
- Rotate any key that ever appeared in a chat, screenshot, or GitHub commit.
- Turn on 2-factor login for GitHub, Expo, your host, and your Paystack/xAI accounts.
- Rate limits are in-memory (fine for one server instance). If you scale to several instances, move them to Redis.

## Known limits
- Existing logged-in sessions are signed out once after this update (token hashing). Users just sign in again.
- Not penetration-tested. Consider an independent review before handling real money.

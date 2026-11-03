# NEXA V3.90.0 — Money Intelligence / Market Insights

## Scope
- Extended existing Money Market Insights with authenticated Research Matches.
- Uses the user's own recent NEXA expense categories as a transparent research-theme context.
- Keeps Market Watch and Market Insights separate from trading, brokerage, custody, and transfers.
- Preserved Store Ajo rules from V3.89.0: 2–6 months, 0% interest, 0% discount, full-contribution pickup gate.

## Implementation
- `server/market.js`: added `buildResearchSignals()` and authenticated `/api/market/insights` spending context.
- `server/index.js`: passes the existing auth/database boundaries into the market router.
- `src/MarketInsights.tsx`: added Research Matches presentation and safety/source context.
- `server/marketInsights.test.js`: added research-context and broker-free regression contracts.
- No broker account, order, custody, transfer, or portfolio integration was added.

## Data architecture
- NGX adapter remains server-side and requires `MARKET_DATA_TOKEN`.
- Development mode remains explicitly preview/non-live.
- User spending context comes only from authenticated NEXA `expenses` records.
- Future licensed CBN FX/gold data adapters can plug into the existing server market layer without changing the mobile contract.

## Validation
- Market Insights targeted suite: **4/4 PASS**.
- Full server regression: **285/285 PASS**.
- `node --check server/market.js`: PASS.
- `node --check server/index.js`: PASS.
- Release consistency: included in full regression and passing.
- Playwright: BLOCKED by installed browser/dependency environment.
- Typecheck: BLOCKED by absent installed Expo dependency tree.
- Sentry: BLOCKED because no real DSN is configured.
- Licensed live market-data feed: NOT CONFIGURED.

## Security / boundary
- `/api/market/insights` is authenticated.
- Spending rows are queried by authenticated `userId`.
- Market-data credentials remain server-side.
- No investment holdings, broker credentials, or trade instructions are accepted or stored.

# NEXA V3.89.0 — Store Ajo Terms + Money Market Insights

## Scope
- Store Ajo now requires a 2–6 month term.
- Store Ajo remains zero-interest and explicitly 0% discount; the locked item price is the target.
- Money Market Insights adds information-only research signals alongside Market Watch.
- No broker account, trading execution, custody, transfer, or investment account is added to NEXA.
- Live NGX market data can be configured server-side with `MARKET_DATA_MODE=ngx` and `MARKET_DATA_TOKEN`; the token is never exposed to the client.

## Regulatory/product boundary
The feature is deliberately framed as market information and research signals, not personalized investment advice or trade execution. Users are directed to conduct their own research and use their existing broker/adviser.

## Tests
- Store Ajo contract tests
- Market Insights contract tests
- Full server regression
- Release audit/gate where environment permits

## Final regression
283/283 server tests passed. Release audit and builder gate passed; Playwright, real Sentry, live payment and licensed market-data validation remain environment/provider dependent.

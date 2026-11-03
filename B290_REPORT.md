# B290 — V5.99.44 (checkpoint 3, M4471 to M4474)

## Changed
- src/MoneyDashboard.tsx: the Sky Money tab row (Overview, Activity, Planning, Sky Store Savings, Sky Group Savings, Sky Market Watch, Sky Insights) is now a sideways ScrollView, so the last tabs are no longer cut off (M4471). Tab labels stay on one line.
- src/Subscription.tsx: on each plan card the name and description now take the left space and shrink, and the price (for example 4,000/mo) keeps its own space and stays inside the card border. The Target / Current row does the same (M4473, M4474).
- M4472: every Sky Money screen (Overview, Planning, Sky Store Savings, Sky Group Savings, Market Watch, Insights, Subscription) was checked in code and already has a vertical ScrollView. No change needed.
- New guard v5_99_44_b290_sky_money_layout (3 checks), registered in the release gate.
- server/v5_21_0_money_block.contract.test.js: pinned count of ds()-wrapped inline styles moved 112 to 113. All styles are still wrapped.

## Checked
- New guard 3 of 3. 30 older test files that read the touched files pass.

## NOT tested
Phone, a new build, full typecheck (node_modules not installed here), Playwright. Large / Extra large / Maximum text sizes are covered by layout rules in code only, not seen on a screen.

## Next
Checkpoint 4: sign-in show-password eye and dark loading screen, Home rails text start, menu row chevron (M4475 onward).

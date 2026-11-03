# B293 — V5.99.47 (M4472 reopened, M4484 closed)

## Cause found
The scroll content of several screens used the shared wrap style, which has flex:1. A ScrollView whose content is forced to the screen height has nothing extra to scroll, so the page could not move. My earlier check (B290) only confirmed that a ScrollView existed, which was not enough.

## Changed
- src/styles.ts: new scrollWrap style (flexGrow:1, same padding and transparent background). wrap is unchanged.
- Switched every ScrollView content container from wrap to scrollWrap (11 places): MoneyDashboard (Overview, Activity, Market Watch, Insights), StoreAjo (Sky Store Savings), GroupsTab (Sky Group Savings, 3 places), GroupScreen (2), FriendsScreen, StaffScreen, ZeezaInbox.
- Planning and Subscription already scrolled correctly (their own wrappers) and are unchanged.
- M4484: owner confirmed the Marketplace 502 happened while the codespace restarted. Closed, no code change.
- New guard v5_99_47_b293_scroll_content (3 checks): scrollWrap never uses flex:1, and no ScrollView content container uses the wrap style anywhere in src.

## Checked
New guard 3 of 3. 59 older test files that read the touched files pass.

## NOT tested
Phone, new build, full typecheck, Playwright.

## Next
Menu row chevron on its own line (M4482), Ball House loading (M4483), menu-row guard (M4467).

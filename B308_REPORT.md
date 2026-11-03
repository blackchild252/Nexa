# B308 — V5.99.62 (sidebar, search, Yaayz hero)

## What I did
- Sidebar: removed Kitchen, Ball House, Game House and Fitness rows (they are inside L.A.). Their routes stay: `navigationForLeisureActivity` keeps the kitchen push tap, and search can open them.
- Search: the server only searched user data, so words like "fitness" or "kitchen" found nothing for most accounts. It now also returns app sections (always allowed, no user data). The filter row was stretching into tall empty pills; it now has `flexGrow: 0`. New result group label: APP SECTIONS.
- Yaayz hero: the title and description used theme text colours (dark/brown in Earth Light) on an always-dark banner. They now use fixed light colours (#FFF8E7, #E8E0CF) with a soft shadow. The blue eyebrow line is unchanged.
- Updated 15 older guards that hard-coded the old sidebar order; added `sidebar_search_hero_repair.contract.test.js` (5 tests) to the release gate.

## TESTED / PASSED
- Source guards: 2,518 of 2,519 in the affected set pass (sidebar, navigation, search, Yaayz, leisure). The one failure, B254-E2 (ship/seal flow), also failed before my change.
- Section search run against a stub database: "fitness", "kitchen", "game", "ball house", "wallet" each return the right section; nonsense returns nothing.

## NOT tested
- The real typecheck and any browser or phone view (no node_modules, no network here): the tall-pill fix and the hero colours are checked in source only.
- Search against a real database with real products.
- The right half of the Yaayz hero (blank grey in your screenshot) is not changed; I did not find its cause.
- Marketplace "Failed to fetch" on the NEXA service fee (image 3) is not changed.
- "Checkpoints download system": I found no feature by that name in the code or reports, so nothing was continued.

## Next
Tell me what the checkpoints download system should do, and whether to look at the Yaayz hero image and the fee "Failed to fetch".

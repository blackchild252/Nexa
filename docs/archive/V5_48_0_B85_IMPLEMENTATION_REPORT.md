# NEXA V5.48.0 — B85 Navigation Shell Stabilization & Quick Search Rail

## Scope
Stabilized the primary navigation shell after the B84 dead-action audit. The bottom world dock now contains only user-facing worlds, while Profile/settings remains a valid contextual/deep-link surface. Home gains a dedicated third Quick Search Rail for fast access to the existing unified search route.

## B85 milestones
565. Five-world user dock boundary: remove Profile/Settings from the global bottom dock
566. Preserve Profile/Settings as a real deep-link route outside the world dock
567. Strict user/vendor world separation for Money, Zeeza, Marketplace, Yaayz and Leisure
568. Preserve Zeeza Inbox/Friends/Chase as an internal Zeeza navigation surface
569. Preserve Marketplace vendor/admin entry inside the Marketplace world boundary
570. Home cinematic Quick Search Rail for universal NEXA search access
571. Preserve global inner-screen Search key and dedicated Search route
572. Preserve directory, notification, Add and search-result deep-link routing
573. Navigation shell accessibility, motion and enlarged-text regression protection
574. B85 cumulative navigation regression, metadata, audit and package certification

## Navigation model
- Home: cinematic command center; no global bottom dock; sidebar remains the utility/access directory.
- World dock: Sky Money, Zeeza, Dream Marketplace, Yaayz, Leisure.
- Profile/settings: remains a real route but is not a world-dock destination.
- Search: Home has a third Quick Search Rail; inner screens retain the existing global Search key; specialized worlds retain their local search controls.
- Vendor/admin: remains inside Marketplace.
- Zeeza Inbox/Friends/Chase: remains inside Zeeza.

## Certification
- B85 focused navigation contracts: 10/10 PASS
- Full cumulative server suite: 1,265/1,265 PASS
- Release audit: PASS — 5.48.0
- Frontend TypeScript: NOT RUN — dependencies absent
- Native/device runtime: NOT TESTED — launch validation remains deferred

## Roadmap governance synchronization — post-B85
- Effective from B86 onward, each new roadmap execution block contains exactly 25 milestones.
- Historical 5- and 10-milestone batches remain unchanged historical records.
- `MASTER_ROADMAP.md`, `PRIORITY_ROADMAP.md`, and `TEMPORARY_ROADMAP.md` now explicitly encode this rule and the AI roadmap-check protocol.
- B86 M575–M599 is mirrored across the canonical roadmap documents.
- This is documentation/governance synchronization only; no product runtime authority was changed.

# Kitchen and Blaca Essentials staff doors — evidence (V6.2.45 B591)

Block M7766–M7790 (M7773, M7774, M7780). All stay PARTIAL.

## Owner decisions (2026-10-27)
- A unit can have more than one Manager.
- Kitchen and Blaca Essentials staff sign in under a Manager. They are Manager staff, not vendor staff.

## What changed
- `server/staffLinks.js`: the door rules are a fixed list. Business Hub: vendor staff only (unchanged). Kitchen and Blaca Essentials: Manager staff only, and only staff whose link is for that same unit. Door names are matched as own properties only, so `__proto__`, `constructor` and similar are refused. Manager staff get section `manager-section` in the answer.
- `server/staffLinkRoutes.js`: two new routes, `/api/staff-links/door/kitchen/sign-in` and `/api/staff-links/door/blaca-essentials/sign-in`. Same login check, same 2FA check, same single refusal. The client cannot choose where it lands.
- `src/staffLanding.ts`: fixed list keyed by section and unit. Kitchen goes to `/leisure/kitchen`. Blaca Essentials has no screen yet and gets the refusal. A path, url or route sent by anyone is ignored.
- `server/authorizationBoundaries.contract.test.js`: the staff-link route count is raised from 6 to 8 on purpose. The check that every one of them sits behind the login check still runs.

## Tests
- `server/staffManagerDoors.contract.test.js` (9), two new tests in `server/staffLinkRoutes.contract.test.js`, landing tests rewritten (6). Real SQLite engine.
- 8 deliberate breakages (no unit check, vendor staff let into a Manager door, no own-property guard, wrong section, Business Hub door open to Manager staff, Kitchen route calling the Blaca door, 2FA skipped on the Kitchen route, 2FA skipped on the Blaca route) were all caught. The last one was first missed and a Blaca HTTP test was added.
- One test bug found and fixed on the way: a default argument hid an `undefined` section in my own test, so the case was not really tested until fixed.

## NOT BUILT / NOT TESTED
- Blaca Essentials staff screen. No sign-in screen calls the landing list. Manager staff cannot yet request staff over HTTP (no Manager actor is resolved by the routes).
- `better-sqlite3` runtime, devices, Admin/Central: NOT TESTED.

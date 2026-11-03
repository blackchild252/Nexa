# Manager appointments — evidence (V6.2.44 B590)

Block M7766–M7790, M7780. Status PARTIAL. Nothing here is wired into a route, a screen or Admin/Central.

## Owner decisions (2026-10-27)
- The Administrative Director approves a Manager's appointment. The CEO is not in this step.
- The Director names the unit (Business Hub, Kitchen or Blaca Essentials) when appointing. It is chosen from a fixed list and the Manager cannot change it.

## What `server/staffManagers.js` does
- `appoint`: Director only, one act (appoint and approve). Not for yourself. A short reason is required. One live appointment per account (database index). Refused if the account already works as staff.
- `managerFor` / `bridgeCaller`: the Manager's unit is read only from the appointment. A Manager on hold counts as nobody.
- `requestStaff`: a Manager asks for their own staff. Boss, tier and unit come from the appointment; a request that names another boss, tier or unit is refused. Permissions are capped to the unit's list. The Director still approves the staff link.
- `suspend`, `restore`, `remove`: Director only. They reuse the boss hold and boss removal in `server/staffLinks.js`, so the Manager's staff stop at once. Removal never touches any NEXA account.
- Audit in `staff_manager_audit` (who, what, unit, reason). No credential, code or 2FA columns.

## Tests
`server/staffManagers.contract.test.js`: 16 tests on a real SQLite engine (`node:sqlite`). 10 deliberate breakages: 9 caught. The tenth (skipping the unit permission cap) is not a gap: the unit permission rule already refuses the same requests, so the cap is a second layer.

## Assumptions to confirm
- A Director appoints and approves in one act. Nobody else has to confirm.
- A unit can have more than one Manager. Not limited today.
- An account cannot be a Manager and staff at the same time.

## NOT BUILT / NOT TESTED
- HTTP routes, screens, the sign-in door for Manager staff, and events to Admin or Central for appointments.
- The general staff-request path does not know about Managers. Only `requestStaff` checks.
- `better-sqlite3` runtime, concurrency across processes, devices: NOT TESTED.

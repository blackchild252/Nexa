# Vendor staff accounts (V3.15, manager tier in V3.16)

Files in this drop:
- `server/db.js` — 1 new table: `vendor_staff`.
- `server/staff.js` — NEW. Invite/join/list/remove routes, plus `requireVendorAccess` (the
  staff-aware sibling of `requireVendor`) and `requireVendorManage` (owner-or-manager, gates the
  staff-management routes themselves).
- `server/index.js` — `createStaff(...)`, `staff.register(app)`, and `requireVendor` swapped for
  `requireVendorAccess` on the routes staff should reach.

## What staff can and can't do
No shared logins. The owner (or a manager) generates an 8-character invite code
(`POST /vendor/staff/invite`); the invited person redeems it on their **own** NEXA account
(`POST /vendor/staff/join`), same idiom as a money group's `claimCode`. One vendor, up to 20
staff seats total (active + invited, staff + managers combined).

| area | staff | manager | owner only |
|---|---|---|---|
| products: list / add / edit | ✅ | ✅ | — |
| products: **delete** | — | — | ✅ |
| orders: list / change status / confirm payment | ✅ | ✅ | — |
| business summary, manual income | — | — | ✅ |
| shop profile (name/bio) | — | — | ✅ |
| list / invite / remove **staff** | — | ✅ | ✅ |
| invite / remove a **manager** | — | — | ✅ |

`req.vendorRole` (`"owner"` | `"manager"` | `"staff"`) is set by `requireVendorAccess` on every
request it passes, so a route can branch on it if it ever needs to — the table above is
currently implemented entirely as which middleware (and, for the manage routes, which role
check inside `staff.js`) each route uses, not per-route role checks in `index.js`.

## Client (new)
- `src/staff.ts` — types (`StaffRole = "staff" | "manager"`) + `apiStaff*` functions (same shape
  as `groups.ts`). `apiStaffInvite(name?, role?)` now takes an optional role.
- `src/useStaff.ts` — all staff state: list/invite/remove (now reachable by owner OR manager via
  `canManageStaff`), and "am I staff somewhere" (`myShop`, whose `.role` tells you which tier).
  Call it once next to wherever you call `useGroups`/`useMall`:
  ```tsx
  const staff = useStaff({ isVendorOwner: !!vendor, active: tab === "mall" });
  ```
- `src/StaffScreen.tsx` — two pieces:
  - `<StaffScreen staff={staff} isVendorOwner={!!vendor} shopName={vendor?.shopName} />` — the
    management panel (invite, share code, remove). Renders nothing unless
    `staff.canManageStaff` is true (owner, or a manager viewing their own — i.e. `!isVendorOwner`
    — staff dashboard). Only the owner sees the Staff/Manager toggle when inviting, and only the
    owner can remove a manager row; a manager viewing the list just doesn't get a Remove button
    on those rows. `isVendorOwner` is still just "do I own this shop" — pass the same value as
    before, no new prop needed.
  - `<JoinStaffBox staff={staff} />` — a redeem-code box for anyone; once `staff.myShop` is set it
    shows "You're on staff at ⟨shop⟩" instead. Put this wherever someone would go looking for a
    shop (e.g. next to the vendor sign-up screen, or in account settings).

## Still blocking full wiring
Same two files as always — the vendor dashboard screen and the push-tap listener haven't been
uploaded, so `<StaffScreen>`/`<JoinStaffBox>` aren't dropped into an actual screen yet, and
`routeForPush()` isn't called from anywhere. Nothing about the manager tier changes that.
- Styling reuses `gs` from `groupStyles.ts` as-is (cards/badges/buttons) rather than adding a
  parallel stylesheet — nothing in it is groups-specific.

## Wiring the reduced dashboard in (not built — I don't have your vendor screen)
I don't have the file that renders the vendor dashboard (Products/Orders/Summary tabs), so this
part is a description, not a diff. Wherever that screen decides what to show:
- Add a "Staff" entry that renders `<StaffScreen .../>` — owner-only, same gate as "Summary".
- Gate the **Summary** tab, the **manual income** UI, the shop **profile edit** form (name/bio),
  and the product **delete** button on `isVendorOwner` (i.e. `!!vendor` from your existing hook,
  the same flag `<StaffScreen>` takes) — those stay owner-only per the table above.
- Products (list/add/edit) and Orders (list/status/payment) need **no change** — the server
  already accepts both an owner and active staff on those endpoints.
- Someone who is staff but doesn't own a shop should land in the vendor area via `staff.myShop`
  (set by `useStaff`) rather than the "register your shop" flow — check it before falling back to
  `apiVendorMe`/register.

## Not built
- `vendor_staff.role` is a string with only `"staff"` today — a second tier (e.g. "manager" who
  *can* see the summary) can slot in later without a migration, same reasoning as
  `money_group_members.role`.
- `src/pushRouting.ts` (new) turns a push payload's `screen` into a navigation target for both
  `vendor_staff` and every other screen value the server currently sends — see that file for the
  wire-in snippet. It's not actually wired into your push-tap listener; I don't have that file.
- Not run on a device — type-checked only (see caveat below), same as the V3.14 groups screens.
- **Still not built, and now the main thing blocking "done":** the actual vendor dashboard screen
  (to gate Summary/Incomes/profile-edit/delete and drop in `<StaffScreen>`/`<JoinStaffBox>`) and
  the push-tap listener (to wire in `pushRouting.ts`). Both need those files uploaded — I can't
  patch code I can't see.

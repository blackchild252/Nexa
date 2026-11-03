# Wiring in the shared ledger (V3.14)

Files in this drop:
- `server/db.js` — 4 new tables (`money_groups`, `money_group_members`, `money_group_entries`,
  `money_group_entry_shares`) plus a `claimCode` column on members. Safe to re-copy over the first V3.14
  drop: the column is added by a migration if it's missing.
- `server/groups.js` — NEW. All the ledger logic and routes (`/api/groups/...`).
- `server/index.js` — two additions next to the disputes wiring: `createGroups(...)` and `groups.register(app)`.
- `src/groups.ts` — NEW. Types + `apiGroup*` functions.
- `src/useGroups.ts` — NEW. All group state and actions (same shape as `useMall`: call it once, pass the result down).
- `src/GroupsTab.tsx` — NEW. The tab: group list, create, join-by-code, and routing to the detail screen.
- `src/GroupScreen.tsx` — NEW. One group: balances/settle-up (split), pot balance, ajo round roster, add-entry form,
  people (invite / merge / remove / reorder), activity with void, and group settings.
- `src/groupStyles.ts` — NEW. Styles for the above (imports nothing from `styles.ts`; the screens use `s` for the shared look).
  Nothing in `styles.ts` or any existing screen was changed.

## One ledger, three kinds
| kind  | who records | entry types | what you see |
|-------|-------------|-------------|--------------|
| split | any member | expense, settlement | each person's net, suggested settle-up payments |
| pot   | owner only | contribution, expense (from the pot), payout | pot balance, who put in what |
| ajo   | owner only | contribution, payout | current round, who's paid up, who collects, due date |

## Rules worth knowing
- Amounts are stored as integer kobo, so a ₦100 split three ways is 33.34 / 33.33 / 33.33, never a float mess.
- Entries are append-only. A mistake is **voided** (stays visible, out of the balances), never deleted.
  Recorder or owner can void. Voids that would overdraw a pot, or undo an earlier ajo payout while a
  later one stands, are refused with a plain message.
- A pot/ajo can't pay out or spend more than is in it.
- Ajo: members + payout order lock once the first entry is recorded. A payout must go to that round's
  member. The round advances when a payout is recorded (no cron, same idea as sale expiry).
- Members can be **placeholders** (no NEXA account), for people the owner records on behalf of.
  Joining is by an 8-character invite code (owner sees it), rate-limited to 20 tries / 15 min.

## Linking a placeholder to a real account
Two ways, both owner-controlled:
1. **Per-person code (prevents duplicates).** `POST /members/:mid/invite` gives the owner a code for that one
   placeholder. When that person enters it in the normal join box, they *become* that member: same id, same
   balances, no second "Tunde". The code dies on use; `{ regenerate: true }` replaces an unused one. Works even
   after an ajo has started or a group is closed, since nothing about the money or the payout order changes.
2. **Merge (cleans up duplicates).** If someone already joined with the group code and now shows twice,
   `POST /members/:mid/merge { intoMemberId }` folds the placeholder into them. All entries and shares carry
   over, and if both were in the same expense their shares combine into one. Refused once an ajo has started
   (the member count would change) and in closed groups. In an ajo the merged person keeps the placeholder's
   payout slot.
A person who is already in the group can't redeem a placeholder's code (they get told to ask the owner to
merge instead), so a code sent to the wrong person can't silently rewrite someone's balance.
The merged person's name becomes their account name (first name + last initial).
- Members only see first name + last initial of each other, never emails.
- Push: joins, your share of a split expense, payments to you, contributions and payouts recorded for you
  (`data.screen = "money_group"`, `data.groupId`) — `src/pushRouting.ts` (added in the V3.15 drop) turns
  this into a navigation target; wire that into your push-tap handler.
- Closed groups reject changes; a group with any history can be closed but not deleted.

## Wiring the tab in (about 5 lines, in your app shell)
```tsx
import { useGroups } from "./useGroups";
import { GroupsTab } from "./GroupsTab";

const groups = useGroups({ userId: user?.id, active: tab === "groups" });   // once, next to useMall
...
{tab === "groups" && <GroupsTab groups={groups} />}                        // wherever tab content renders
```
`active` just tells it when to (re)load the list. `GroupsTab` handles list -> detail itself, so no router changes.
Add a "Groups" entry to your tab bar / menu however you do the others.

Push taps: notifications carry `data.screen = "money_group"` and `data.groupId`. In your push-tap handler, switch to
the groups tab and call `groups.openGroup(data.groupId)`.

## What the screens do, by kind
- **Split:** your balance, the suggested settle-up payments (tap "Paid" to record one), an expense form with
  paid-by, split-between and an "uneven" mode that shows how much is left to assign.
- **Pot:** the balance with contributed/spent/paid-out; the owner adds contributions, spending and payouts.
- **Ajo:** current round, who collects, due date, a progress bar, and who has paid; the owner taps "Record" next to
  each person who owes, then "Pay out" to the collector. Members can be reordered until the first payment.
- Non-owners of a pot or ajo see everything read-only, with a line saying who records.

## Not verified / not built
- The screens are type-checked (strict) but **haven't been run on a device or simulator**. Expect to nudge
  spacing and keyboard behaviour on a real phone, especially the entry form on small screens.
- The tab bar entry and push-tap routing above are yours to add; I haven't seen `App.tsx`.
- The activity list shows the latest 100 entries (no "load more" yet).
- Staff accounts (next). `money_group_members.role` is already a string so a future role can slot in.

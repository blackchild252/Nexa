# NEXA Frontend Architecture V3.61.3

## Active ownership

- Runtime entry: `expo-router/entry` from `package.json`.
- Root navigation: `src/app/_layout.tsx`.
- Primary tabs: `src/app/(tabs)/_layout.tsx`.
- Feature implementation: reusable screens/hooks under `src/`, mounted by route files under `src/app/`.
- Secondary authenticated routes: `src/app/extensions.tsx`, `developer.tsx`, `staff.tsx`, and `dami.tsx`, `zeeza/inbox.tsx`.

## Route ownership

| Route | Owner | Responsibility |
|---|---|---|
| `/(tabs)` | `src/app/(tabs)/index.tsx` | Home/workspace entry |
| `/(tabs)/money` | `src/app/(tabs)/money.tsx` | Money dashboard |
| `/(tabs)/zeeza` | `src/app/(tabs)/zeeza.tsx` | Zeeza people, friends, Inbox, rooms and calls workspace |
| `/(tabs)/marketplace` | `src/app/(tabs)/marketplace.tsx` | Dream Marketplace |
| `/dami` | `src/app/dami.tsx` | Dami AI workspace |
| `/(tabs)/extensions` | `src/app/extensions.tsx` | Extension management |
| `/developer` | `src/app/developer.tsx` | Developer Console |
| `/extensions` | `src/app/extensions.tsx` | Extension management |
| `/staff` | `src/app/staff.tsx` | Staff/vendor surface |
| `/profile` | `src/app/(tabs)/profile.tsx` | Account/session controls |
| `/zeeza/inbox` | `src/app/zeeza/inbox.tsx` | Zeeza Inbox detail |

## Legacy quarantine

The root `app/` shell is not an active route surface. It remains recoverable legacy code only. Active routes must never import from `app/`; new routes and navigation ownership belong under `src/app/`.

The legacy shell will only be retired after an explicit dependency/route audit proves that its recovery value is no longer needed.

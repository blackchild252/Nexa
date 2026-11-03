# NEXA V3.19 — Master App Assembly

V3.19 introduces the first master application shell around the existing NEXA modules.

## Navigation
- Home
- Money
- Zeeza
- Dream Marketplace
- Profile

## Module integration
- Money tab mounts `GroupsTab` and `useGroups`.
- Zeeza mounts `FriendsScreen`, `ZeezaInbox`, `useFriends`, and `useZeeza`.
- Dream Marketplace provides the marketplace entry shell while preserving `/api/mall/*` backend compatibility.
- Vendor Staff is exposed as a master route and uses the existing `StaffScreen`/`useStaff` module.

## Technical note
Expo Router is used for the master shell because it provides file-based navigation and a root/tab layout suitable for Android, iOS and web. See official Expo documentation for navigation architecture.

## Known integration work
The supplied V3.18 archive did not include the historical auth/payment modules and marketplace UI. V3.19 therefore adds the missing master shell/shared client infrastructure without inventing those absent implementations. Existing backend route namespaces are preserved.

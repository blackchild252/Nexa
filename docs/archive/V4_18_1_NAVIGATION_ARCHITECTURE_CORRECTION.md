# NEXA V4.18.1 — Navigation Architecture Correction

## Change
The Royal Dark style reference's five-destination example is no longer treated as NEXA product architecture. The existing seven-section shell is restored and preserved.

### Primary sections
- Home
- Sky Money
- Zeeza
- Dream Marketplace
- Yaayz
- L.A.
- Profile

### Product blocks
- Dami / Home / AI
- Sky Money / Wallet / Savings / Groups / Market Watch
- Zeeza / Chase / Friends / Inbox / Rooms
- Dream Marketplace / Vendors / Disputes
- Yaayz / Tickets / Adverts
- L.A. / Kitchen / Ball House / Game House / Fitness
- Auth / Profile / Account Lifecycle
- Notifications / Search
- Extensions / Developer Platform
- Staff / Admin / Operations
- Security / Database / Payments / Reliability / Scalability

## Dami
Dami remains NEXA's AI companion and front-door AI experience. No Dami functionality was removed or renamed to Chat.

## Inbox
"Inbox" is the user-facing label for direct/community messaging. Existing internal `ZeezaInbox`, `useZeeza`, `chat` route identifiers and notification payload identifiers remain unchanged to avoid unnecessary migration risk.

## Validation
- Royal Dark navigation contract: PASS
- Full server regression: 417/417 PASS
- Release audit: PASS — 4.18.1
- Android/Expo runtime: not tested in this environment
- Playwright runtime: remains environment-blocked

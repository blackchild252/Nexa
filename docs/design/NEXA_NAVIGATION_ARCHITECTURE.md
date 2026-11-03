# NEXA Navigation Architecture — Permanent Product Structure

## Decision
The Royal Dark style guide controls **visual design**, not NEXA product information architecture. Its five-tab mockup is not the canonical NEXA navigation contract.

The established NEXA primary shell remains seven sections:
1. Home
2. Sky Money
3. Zeeza
4. Dream Marketplace
5. Yaayz
6. L.A.
7. Profile

## Module map
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

## Dami terminology
Dami is NEXA's AI companion and remains the AI/Home experience. The product must not describe Dami as a generic "Chat" feature.

"Inbox" is the user-facing name for direct/community messaging. Existing internal route/API identifiers containing `chat` remain for backward compatibility unless a future migration explicitly changes them.

## Change-control rule
Do not change the number or identity of primary navigation sections because of a visual design reference. Any product-navigation change requires an explicit product decision and regression testing.

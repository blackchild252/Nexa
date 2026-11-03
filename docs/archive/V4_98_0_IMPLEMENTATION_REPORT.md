# NEXA V4.98.0 — B33 Reliability Continuity

Implemented 10 broad reliability improvements across Notifications, Search, Zeeza group calling, account portability, and notification operations.

- Filtered notification actions now update only the affected category locally.
- People search excludes closed accounts.
- Group-call signaling is capped to the active retention window and refreshes participant presence.
- Group-call join, leave, and reconnect transitions now execute atomically.
- Portable imports reject missing primary keys before database writes.
- Notification digest/recovery output removes duplicate IDs.

Compatibility and existing authority boundaries were preserved.

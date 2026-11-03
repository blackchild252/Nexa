# ADR-013 — Cross-Module Navigation Continuity

## Decision
NEXA uses `src/nexaNavigation.ts` as the canonical client-side resolver for navigation originating from Dami, Notifications, Unified Search and future cross-module surfaces.

## Boundaries
The resolver only produces destinations. It does not grant permissions, execute financial/social/commerce actions, or replace server-owned authorization.

Notification actions continue to resolve through `/api/notifications/:id/action` before navigation when a durable notification id is available.

## Consequences
- Cross-module destinations have one client-side vocabulary.
- Existing module authorities remain unchanged.
- New surfaces should reuse the resolver rather than create private route maps.
- Destination-specific state may be passed as route parameters without creating a second authorization layer.

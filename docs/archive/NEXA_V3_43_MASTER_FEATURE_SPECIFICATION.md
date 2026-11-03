# NEXA V3.43 — Social Profiles and Connections

## Status
Planning/specification build. The features below are not represented as implemented or tested.

## Goals
- User-controlled public or private profiles.
- Privacy-respecting user discovery.
- Connection request, acceptance, rejection, cancellation, and removal.
- Blocking and reporting pathways.

## Profile data
- Required: stable user ID and display name.
- Optional: avatar, short bio, and user-selected profile fields.
- Visibility: public, connections-only, or private for supported fields.
- Never expose email, phone, authentication secrets, or internal identifiers in public responses.

## Connection lifecycle
1. A user sends a request to another eligible account.
2. Recipient may accept, decline, or block the requester.
3. Sender may cancel a pending request.
4. Either connected user may remove the connection.
5. Enforce one canonical relationship per unordered user pair and prevent self-requests.
6. Repeated requests must be idempotent and return a clear state.

## Authorization and privacy
- Require authentication for profile edits and connection actions.
- Users may edit only their own profile and settings.
- Enforce visibility server-side, not only in the UI.
- Blocked users cannot send requests or access restricted profile content.
- Avoid revealing private-account existence outside configured discovery policy.
- Validate and limit profile text; safely handle avatar uploads if introduced.

## API/UI targets
- Profile read/update and privacy-setting endpoints.
- User discovery/search with pagination and rate limits.
- Connection request/list/respond/cancel/remove endpoints.
- Profile, edit profile, search, requests, and connections screens.
- Accessible loading, empty, error, and success states.

## Acceptance criteria
- Unauthorized requests are rejected; cross-user edits are impossible.
- Privacy settings are honored in every API response.
- Connection transitions and duplicate requests are tested.
- Blocking prevents new contact and hides restricted content.
- Pagination, input validation, rate limiting, and two-account isolation are tested.

## Out of scope
Direct-message delivery, group chat, external identity providers, and production moderation operations.

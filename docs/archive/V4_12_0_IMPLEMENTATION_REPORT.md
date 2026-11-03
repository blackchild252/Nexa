# NEXA V4.12.0 — Zeeza Shareable Profile Links

## Scope
Continue from V4.11.0 without replacing the Zeeza social architecture. Add a native profile-sharing flow so users can send a personal NEXA app link to friends/family, who can open the shared profile and send a friend request.

## Implementation
- Added `users.zeezaShareToken` migration and unique index.
- Added authenticated share-token creation endpoint.
- Added unauthenticated token-based shared-profile preview endpoint.
- Added authenticated token-based friend-request endpoint.
- Preserved block checks, friendship/request conflict handling, short-name privacy, and avatar visibility behavior.
- Added native React Native Share action to `ZeezaProfile`.
- Added Expo Router route `src/app/zeeza/share/[token].tsx`.
- Added public API helper for token preview and authenticated helper for link-based requests.
- Shared link format is `nexa://zeeza/share/<opaque-token>`.
- No email addresses are included in the shared profile.

## Security
- Token is 24 random bytes encoded as base64url (32-character opaque token).
- Token lookup is exact and indexed.
- Link holders can view only the profile associated with that opaque token.
- Friend-request action still requires an authenticated NEXA session.
- Existing block rules prevent requests between blocked users.
- Existing request/friend concurrency behavior is retained.

## Testing
Targeted tests cover route presence, token length/format, client share action, deep-link route, auth boundary, and block/request handling. Full historical regression is not claimed unless rerun in an environment with the complete dependency tree.

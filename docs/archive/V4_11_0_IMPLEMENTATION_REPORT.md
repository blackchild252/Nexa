# NEXA V4.11.0 — Zeeza Identity Continuity

## Objective
Carry the V4.10 Zeeza profile-photo capability into existing social surfaces without creating a second social system.

## Changes
- Extended `PublicUser` with nullable `avatarUrl`.
- Server public-user shaping now applies profile visibility to avatar delivery.
- Username search and pending friend requests expose avatars only for profiles marked public.
- Existing friend and blocked-user lists may display avatars because the authenticated relationship is already known.
- Friend/search/request/blocked rows render the supplied photo and retain initials as the fallback.
- Public profile responses now include the profile visibility field consistently.
- Existing profile upload, bio, visibility, blocking and friendship architecture preserved.

## Security boundary
Avatar visibility is decided server-side. The client cannot opt a private/friends-only profile into public avatar exposure through the list APIs.

## Validation
- Server syntax checks: PASS.
- Release consistency: PASS.
- Profile validation: PASS.
- V4.10 regression tests: PASS.
- V4.11 targeted tests: PASS.
- Full historical server regression from V4.10: 366/366 PASS; not rerun for V4.11 because the sealed checkpoint has no installed dependency tree.

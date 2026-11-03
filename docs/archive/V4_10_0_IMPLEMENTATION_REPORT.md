# NEXA V4.10.0 — Zeeza Social Polish & Profile Media

Built directly from V4.9.0.

## Changes
- Added authenticated Zeeza profile-photo upload using Expo ImagePicker.
- Added server-side image type, magic-byte and 800 KB size validation.
- Profile photo is stored as a bounded data URI in the existing user profile field so profile visibility continues to govern avatar delivery; this is a preview-safe storage boundary that can later be swapped for object storage without changing the client profile contract.
- Removed stale undefined `ProfileEditor` render from FriendsScreen.
- Added unread chat and incoming friend-request badges to Zeeza navigation.
- Preserved existing Chats, Friends, DMs, rooms, blocking, visibility and 200-word bio architecture.

## Intentionally deferred
- Production object-storage adapter for profile media.
- Live/device/browser environment testing.

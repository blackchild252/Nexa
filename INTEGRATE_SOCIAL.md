# Friends + chat (V3.17)

Files in this drop:
- `server/db.js` — migration: `users.username`, `friend_requests`, `friendships`, `blocks`,
  `dm_threads`, `dm_messages`, `chat_rooms`, `chat_room_members`, `room_messages`.
- `server/friends.js` — NEW. Username set/check, search, friend requests, friend list, blocking.
- `server/zeezaMessaging.js` — NEW. DMs (friends-only, thread-based) and rooms (invite-code join).
- `server/index.js` — both `require`d, instantiated with rate limiters, `register(app)` called
  alongside `groups`/`staff`.
- `src/friends.ts` / `src/chat.ts` — typed API wrappers (same shape as `staff.ts`/`groups.ts`).
- `src/useFriends.ts` / `src/useZeeza.ts` — state hooks (same load/error/loading + `active` gate
  idiom as `useStaff.ts`/`useGroups.ts`).
- `src/pushRouting.ts` — updated for this layer's `screen` values (`friend_requests`, `friends`,
  `dm_thread`, `chat_room`).
- `src/socialStyles.ts` — screen-specific tokens (bubbles, sub-tab strip, username box). Reused
  alongside `gs` from `groupStyles.ts` for the generic bits (badges, `smallBtn`, `composer`,
  `inviteBox`/`code`) rather than duplicating them.
- `src/FriendsScreen.tsx` — username claim, search-and-add, requests, friend list.
- `src/ZeezaInbox.tsx` — top-level tab: Messages/Rooms sub-tabs, new room, join with code. Owns its
  own list → thread/room navigation, same idiom as `GroupsTab.tsx`.
- `src/ZeezaThreadScreen.tsx` / `src/RoomScreen.tsx` — one conversation / one room. Rendered by
  `ZeezaInbox` automatically once `chat.activeThreadId` / `chat.activeRoomId` is set; you don't
  mount these directly except via `ZeezaInbox`.

## Wiring it in (not built — needs your app shell, which isn't in this thread)

1. Call both hooks once, next to wherever you call `useGroups`/`useStaff`:
   ```tsx
   const friends = useFriends({ active: tab === "chat" });
   const chat = useZeeza({ active: tab === "chat" });
   ```
2. Add a "Chat" entry to your tab bar/navigator (next to Mall/Groups), and a "Friends" entry —
   or nest Friends as a sub-tab inside the same Chat section, whichever fits your nav shape.
3. Render:
   ```tsx
   <FriendsScreen friends={friends} onMessage={(friend) => chat.openDm(friend)} />
   <ZeezaInbox chat={chat} />
   ```
   `onMessage` is optional on `FriendsScreen` — pass it so the "Message" button on a friend row
   opens a DM (via `chat.openDm`), which flips `chat.activeThreadId` and — as long as both
   `friends`/`chat` state and the tab that renders `<ZeezaInbox>` are reachable from wherever
   `FriendsScreen` lives — `ZeezaInbox` will render `ZeezaThreadScreen` next. If Friends and Chat are
   fully separate screens/routes in your nav rather than sub-tabs of one section, have
   `onMessage` navigate to the Chat screen after calling `chat.openDm(friend)`.
4. Both hooks assume the same `authedFetch`/`./api` and `./styles` (`s`) imports every other
   screen in this codebase already uses (see `friends.ts`/`chat.ts` and every screen file's
   `import { s } from "./styles"`).

## Known gaps (need a file that hasn't been uploaded to this thread)

Same disclosure `README.md`/`MASTER_ROADMAP.md` already give:
- **Username onboarding UI**: nothing here prompts a brand-new user to set a username during
  signup — that's your signup screen. `FriendsScreen.tsx`'s `UsernameBox` lets them set one from
  the Friends screen itself, which covers everyone eventually, just not on day one.
- **Realtime delivery**: `useZeeza.ts` polls the open thread/room every 4s (`POLL_MS`) — no
  socket layer exists anywhere in this codebase. Wiring one in is a bigger, separate change;
  flag if you want that scoped next. (Swapping polling for a socket wouldn't change any of the
  four screen files above — they only read `chat.messages`/`chat.roomMessages`.)
- **Push-tap listener**: `pushRouting.ts` only turns a payload into a navigation target; the
  `Notifications.addNotificationResponseReceivedListener` that calls `routeForPush()` lives in
  your app shell, which isn't in this thread.
- **Tab bar wiring**: adding "Chat"/"Friends" entries to whatever renders your tab bar is step 2
  above — one line in a file that hasn't been uploaded.

Upload any of these four and they can be patched directly instead of just documented.

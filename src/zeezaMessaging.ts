import { authedFetch, authedMultipart } from "./api";
import type { PublicUser } from "./friends";

// Social layer, part 2 (V3.17): direct messages (friends-only) and rooms (invite-code, same
// idiom as vendor staff / money groups). Matches server/zeezaMessaging.js route-for-route. Plain REST —
// no socket layer exists yet, so useZeeza.ts polls (see that file's note and MASTER_ROADMAP.md / PRIORITY_ROADMAP.md).

export type DmMessage = { id: string; mine: boolean; body: string; kind?: "text" | "voice"; mediaUrl?: string | null; createdAt: string };
export type MessagePage<T> = { messages: T[]; hasMore: boolean; nextBefore: string | null };
export type DmThread = {
  id: string;
  with: PublicUser;
  lastMessage: { body: string; mine: boolean; createdAt: string } | null;
  unread: number;
};

export type RoomRole = "owner" | "member";
export type ChatRoom = {
  id: string;
  name: string;
  myRole: RoomRole;
  memberCount: number;
  inviteCode?: string;          // present only when myRole === "owner"
  inviteExpiresAt?: string;    // present only when myRole === "owner"
  createdAt: string;
};
export type RoomMember = PublicUser & { role: RoomRole; joinedAt: string };
export type RoomMessage = { id: string; mine: boolean; sender?: PublicUser; body: string; createdAt: string };

async function send<T>(path: string, method: string, body: unknown, fallback: string): Promise<T> {
  try {
    return await authedFetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }) as T;
  } catch (error: any) {
    throw new Error(error?.message || fallback);
  }
}

// ---------- DMs ----------

export const apiDmThreads = async (): Promise<DmThread[]> =>
  (await send<{ threads: DmThread[] }>("/api/social/dm/threads", "GET", undefined, "Could not load your messages.")).threads;

// Opens (or silently creates) a thread with a friend. Call before navigating to ZeezaThreadScreen.
export const apiDmOpen = (userId: string) =>
  send<{ threadId: string; with: PublicUser }>("/api/social/dm/open", "POST", { userId }, "Could not open that conversation.");

export const apiDmMessages = (threadId: string, before?: string) =>
  send<{ with: PublicUser; messages: DmMessage[]; hasMore: boolean; nextBefore: string | null }>(
    `/api/social/dm/threads/${threadId}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`,
    "GET", undefined, "Could not load that conversation."
  );

export const apiDmSend = (threadId: string, body: string) =>
  send<{ message: DmMessage }>(`/api/social/dm/threads/${threadId}/messages`, "POST", { body }, "Could not send that message.");

export const apiDmSendVoice = async (threadId: string, uri: string, mimeType = "audio/m4a") => {
  const form = new FormData(); form.append("audio", { uri, name: `nexa-voice.${mimeType.split("/")[1] || "m4a"}`, type: mimeType } as any);
  return await authedMultipart(`/api/social/dm/threads/${threadId}/voice`, form) as { message: DmMessage };
};

// ---------- Rooms ----------

export const apiRoomsList = async (): Promise<ChatRoom[]> =>
  (await send<{ rooms: ChatRoom[] }>("/api/social/rooms", "GET", undefined, "Could not load your rooms.")).rooms;

export const apiRoomCreate = (name: string) =>
  send<{ room: ChatRoom }>("/api/social/rooms", "POST", { name }, "Could not create that room.");

export const apiRoomJoin = (code: string) =>
  send<{ room: ChatRoom }>("/api/social/rooms/join", "POST", { code }, "Could not join that room.");

export const apiRoomRotateInvite = (roomId: string) =>
  send<{ ok: true; inviteCode: string; inviteExpiresAt: string }>(`/api/social/rooms/${roomId}/invite/rotate`, "POST", undefined, "Could not rotate the room invite.");

export const apiRoomRevokeInvite = (roomId: string) =>
  send<{ ok: true; revoked: true }>(`/api/social/rooms/${roomId}/invite/revoke`, "POST", undefined, "Could not revoke the room invite.");

export const apiRoomMembers = async (roomId: string): Promise<RoomMember[]> =>
  (await send<{ members: RoomMember[] }>(`/api/social/rooms/${roomId}/members`, "GET", undefined, "Could not load room members.")).members;

export const apiRoomMessages = (roomId: string, before?: string) =>
  send<{ room: ChatRoom; messages: RoomMessage[]; hasMore: boolean; nextBefore: string | null }>(
    `/api/social/rooms/${roomId}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`,
    "GET", undefined, "Could not load that room."
  );

export const apiRoomSend = (roomId: string, body: string) =>
  send<{ message: RoomMessage }>(`/api/social/rooms/${roomId}/messages`, "POST", { body }, "Could not send that message.");

export const apiRoomLeave = (roomId: string) =>
  send<{ ok: true }>(`/api/social/rooms/${roomId}/leave`, "POST", undefined, "Could not leave that room.");

export const apiRoomRemoveMember = (roomId: string, memberId: string) =>
  send<{ ok: true }>(`/api/social/rooms/${roomId}/members/${memberId}`, "DELETE", undefined, "Could not remove that member.");

export const apiRoomDelete = (roomId: string) =>
  send<{ ok: true }>(`/api/social/rooms/${roomId}`, "DELETE", undefined, "Could not delete that room.");

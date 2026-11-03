import { authedFetch, publicFetch } from "./api";

// Social layer, part 1 (V3.17): usernames, friend requests and blocking. Mirrors staff.ts's
// shape — plain typed functions, no state here (see useFriends.ts for that). Matches
// server/friends.js route-for-route.

export type PublicUser = {
  id: string;
  username: string | null;
  name: string;                 // already short-formed server-side ("Amaka O.") — never a full name/email
  avatarUrl: string | null;
};

export type FriendRequest = {
  id: string;
  createdAt: string;
  user: PublicUser;
};

async function send<T>(path: string, method: string, body: unknown, fallback: string): Promise<T> {
  try {
    return await authedFetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }) as T;
  } catch (e: any) {
    throw new Error(e?.message || fallback);
  }
}

// -- username --
export const apiUsernameCheck = (u: string) =>
  send<{ available: boolean; reason?: string }>(`/api/social/username/check?u=${encodeURIComponent(u)}`, "GET", undefined, "Could not check that username.");
export const apiUsernameSet = (username: string) =>
  send<{ username: string }>("/api/social/username", "POST", { username }, "Could not set that username.");
export const apiMyUsername = async (): Promise<string | null> =>
  (await send<{ username: string | null }>("/api/social/me", "GET", undefined, "Could not load your username.")).username;

// -- search --
export const apiUserSearch = async (q: string): Promise<PublicUser[]> =>
  (await send<{ users: PublicUser[] }>(`/api/social/users/search?q=${encodeURIComponent(q)}`, "GET", undefined, "Could not search right now.")).users;

// -- friend requests --
export const apiFriendRequest = (username: string) =>
  send<{ status: "accepted"; friend: PublicUser } | { status: "pending"; request: { id: string; to: PublicUser } }>(
    "/api/social/friends/request", "POST", { username }, "Could not send that request."
  );
export const apiFriendRequests = () =>
  send<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>("/api/social/friends/requests", "GET", undefined, "Could not load your requests.");
export const apiFriendRequestAccept = (id: string) =>
  send<{ friend: PublicUser }>(`/api/social/friends/requests/${id}/accept`, "POST", undefined, "Could not accept that request.");
export const apiFriendRequestDecline = (id: string) =>
  send<{ ok: true }>(`/api/social/friends/requests/${id}/decline`, "POST", undefined, "Could not decline that request.");
export const apiFriendRequestCancel = (id: string) =>
  send<{ ok: true }>(`/api/social/friends/requests/${id}`, "DELETE", undefined, "Could not cancel that request.");

// -- friend list --
export const apiFriendsList = async (): Promise<PublicUser[]> =>
  (await send<{ friends: PublicUser[] }>("/api/social/friends", "GET", undefined, "Could not load your friends.")).friends;
export const apiUnfriend = (userId: string) =>
  send<{ ok: true }>(`/api/social/friends/${userId}`, "DELETE", undefined, "Could not remove that friend.");

// -- blocking --
export const apiBlock = (userId: string) =>
  send<{ ok: true }>(`/api/social/block/${userId}`, "POST", undefined, "Could not block that person.");
export const apiUnblock = (userId: string) =>
  send<{ ok: true }>(`/api/social/block/${userId}`, "DELETE", undefined, "Could not unblock that person.");
export const apiBlockedList = async (): Promise<PublicUser[]> =>
  (await send<{ blocked: PublicUser[] }>("/api/social/blocked", "GET", undefined, "Could not load your blocked list.")).blocked;


export type ZeezaProfile = { id: string; name: string; username: string | null; bio: string; avatarUrl: string | null; visibility?: "public" | "friends" | "private"; chaseOptIn?: boolean; chaseCountry?: string; chaseCity?: string; chaseTermsVersion?: string | null; exploreOptIn?: boolean; exploreCountry?: string; exploreCity?: string; exploreTermsVersion?: string | null; chaseAge?: number | null; chaseNationality?: string; chaseHeightCm?: number | null; chaseJobType?: string };
export type SocialProfile = ZeezaProfile;
export type ChaseUser = { id: string; username: string | null; name: string; avatarUrl: string | null; bio: string; country: string | null; city: string | null; proximity: "local" | "country" | "international"; age?: number | null; nationality?: string | null; heightCm?: number | null; jobType?: string | null; likeCount: number; commentCount: number; likedByMe: boolean; demo?: boolean };
export const apiChaseUsers = async (): Promise<ChaseUser[]> =>
  (await send<{ users: ChaseUser[] }>("/api/social/chase", "GET", undefined, "Could not load Zeeza Chase.")).users;
export const apiFriendRequestByChase = (userId: string) =>
  send<{ status: "pending"; proximity: ChaseUser["proximity"]; request: { id: string; to: PublicUser } }>(
    `/api/social/friends/request/chase/${encodeURIComponent(userId)}`, "POST", {}, "Could not send that Chase friend request."
  );
// Backward-compatible aliases for older callers/deep links during the Explore → Chase migration.
export type ExploreUser = ChaseUser;
export const apiExploreUsers = apiChaseUsers;
export const apiFriendRequestByExplore = apiFriendRequestByChase;

export const apiMyProfile = async () => (await send<{ profile: ZeezaProfile }>("/api/social/profile/me", "GET", undefined, "Could not load your profile.")).profile;
export const apiUpdateMyProfile = async (profile: { bio: string; avatarUrl: string | null; visibility: "public" | "friends" | "private"; chaseOptIn?: boolean; chaseCountry?: string; chaseCity?: string; chaseTermsVersion?: string | null; exploreOptIn?: boolean; exploreCountry?: string; exploreCity?: string; chaseAge?: number | null; chaseNationality?: string; chaseHeightCm?: number | null; chaseJobType?: string }) => (await send<{ profile: ZeezaProfile }>("/api/social/profile/me", "PATCH", profile, "Could not update your profile.")).profile;
export const apiUploadProfileAvatar = async (imageBase64: string, mimeType: "image/jpeg" | "image/png" | "image/webp") => (await send<{ profile: ZeezaProfile }>("/api/social/profile/avatar", "POST", { imageBase64, mimeType }, "Could not update your profile picture.")).profile;
export const apiPublicProfile = async (userId: string) => (await send<{ profile: ZeezaProfile }>(`/api/social/profile/${encodeURIComponent(userId)}`, "GET", undefined, "Could not load that profile.")).profile;


export const apiCreateZeezaShareLink = async () =>
  (await send<{ token: string }>("/api/social/profile/share", "POST", {}, "Could not create your Zeeza profile link.")).token;

export const apiSharedZeezaProfile = async (token: string): Promise<ZeezaProfile> =>
  (await publicFetch(`/api/social/profile/share/${encodeURIComponent(token)}`)).profile as SocialProfile;

export const apiFriendRequestByZeezaShare = (token: string) =>
  send<{ status: "pending"; request: { id: string; to: PublicUser } }>(
    `/api/social/friends/request/share/${encodeURIComponent(token)}`, "POST", {}, "Could not send that friend request."
  );

export const apiChaseLike = (userId: string) => send<{liked:boolean;likeCount:number;reward?:{amount:number;threshold:number}|null}>(`/api/social/chase/${encodeURIComponent(userId)}/like`,"POST",{},"Could not like this Chase profile.");
export const apiChaseUnlike = (userId: string) => send<{liked:boolean;likeCount:number}>(`/api/social/chase/${encodeURIComponent(userId)}/like`,"DELETE",undefined,"Could not remove that like.");
export const apiChaseComments = async (userId: string) => (await send<{comments:Array<{id:string;comment:string;createdAt:string;user:PublicUser}>}>(`/api/social/chase/${encodeURIComponent(userId)}/comments`,"GET",undefined,"Could not load comments.")).comments;
export const apiChaseReport = (userId: string, reason: string) => send<{report:any}>(`/api/social/chase/${encodeURIComponent(userId)}/report`,"POST",{reason},"Could not report this Chase account.");
export const apiChaseComment = (userId: string, comment: string) => send<{comment:{id:string;comment:string;createdAt:string;user:PublicUser};commentCount:number}>(`/api/social/chase/${encodeURIComponent(userId)}/comments`,"POST",{comment},"Could not add comment.");

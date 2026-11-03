import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import {
  PublicUser, FriendRequest,
  apiUsernameCheck, apiUsernameSet, apiMyUsername,
  apiUserSearch,
  apiFriendRequest, apiFriendRequests, apiFriendRequestAccept, apiFriendRequestDecline, apiFriendRequestCancel,
  apiFriendsList, apiUnfriend,
  apiBlock, apiUnblock, apiBlockedList,
} from "./friends";
import { subscribeNexaAutoRefresh } from "./nexaAutoRefresh";

// All state for the friends layer (V3.17): my username, username search, friend requests
// (incoming/outgoing), the friend list, and blocking. Same load/error/loading + `active` gate
// idiom as useStaff.ts/useGroups.ts — pass `active` as whatever "this tab is on screen" bool
// your app already threads through (e.g. `tab === "zeeza"`).

export function useFriends({ active }: { active: boolean }) {
  // -- my username --
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [myUsernameLoading, setMyUsernameLoading] = useState(false);
  const myUsernameRequest = useRef(0);
  const [usernameSaving, setUsernameSaving] = useState(false);

  const loadMyUsername = useCallback(async () => {
    const requestId = ++myUsernameRequest.current;
    setMyUsernameLoading(true);
    try { const next = await apiMyUsername(); if (requestId === myUsernameRequest.current) setMyUsername(next); }
    catch { /* silent — background check, not a user-facing load */ }
    finally { if (requestId === myUsernameRequest.current) setMyUsernameLoading(false); }
  }, []);

  useEffect(() => { loadMyUsername(); }, [loadMyUsername]);

  // Caller debounces the keystroke; this just wraps the request so it doesn't need try/catch
  // at every call site.
  const checkUsername = useCallback(async (u: string) => {
    try { return await apiUsernameCheck(u); }
    catch { return { available: false, reason: "Could not check that right now." }; }
  }, []);

  const claimUsername = useCallback(async (u: string): Promise<boolean> => {
    setUsernameSaving(true);
    try {
      const { username } = await apiUsernameSet(u);
      setMyUsername(username);
      return true;
    } catch (e: any) {
      Alert.alert("Could not set that username", e?.message || "Please try again.");
      return false;
    } finally {
      setUsernameSaving(false);
    }
  }, []);

  // -- search --
  const [searchResults, setSearchResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRequest = useRef(0);

  const search = useCallback(async (q: string) => {
    const requestId = ++searchRequest.current;
    if (q.trim().length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    try {
      const results = await apiUserSearch(q);
      if (requestId === searchRequest.current) setSearchResults(results);
    } catch {
      if (requestId === searchRequest.current) setSearchResults([]);
    } finally {
      if (requestId === searchRequest.current) setSearching(false);
    }
  }, []);

  // -- friend requests --
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const requestsRequest = useRef(0);
  const [sendingRequest, setSendingRequest] = useState(false);

  const loadRequests = useCallback(async () => {
    const requestId = ++requestsRequest.current;
    setRequestsLoading(true); setRequestsError("");
    try {
      const { incoming: inc, outgoing: out } = await apiFriendRequests();
      if (requestId === requestsRequest.current) { setIncoming(inc); setOutgoing(out); }
    } catch (e: any) {
      if (requestId === requestsRequest.current) setRequestsError(e?.message || "Could not load your requests.");
    } finally {
      if (requestId === requestsRequest.current) setRequestsLoading(false);
    }
  }, []);

  // -- friend list --
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const friendsRequest = useRef(0);

  const loadFriends = useCallback(async () => {
    const requestId = ++friendsRequest.current;
    setFriendsLoading(true); setFriendsError("");
    try { const next = await apiFriendsList(); if (requestId === friendsRequest.current) setFriends(next); }
    catch (e: any) { if (requestId === friendsRequest.current) setFriendsError(e?.message || "Could not load your friends."); }
    finally { if (requestId === friendsRequest.current) setFriendsLoading(false); }
  }, []);

  useEffect(() => { if (active) { loadRequests(); loadFriends(); } }, [active, loadRequests, loadFriends]);

  const sendFriendRequest = useCallback(async (username: string): Promise<boolean> => {
    setSendingRequest(true);
    try {
      const result = await apiFriendRequest(username);
      if (result.status === "accepted") {
        Alert.alert("You're friends", `You and ${result.friend.name} are now friends.`);
        await loadFriends();
      } else {
        await loadRequests();
      }
      return true;
    } catch (e: any) {
      Alert.alert("Could not send that request", e?.message || "Please try again.");
      return false;
    } finally {
      setSendingRequest(false);
    }
  }, [loadFriends, loadRequests]);

  const acceptRequest = useCallback(async (req: FriendRequest) => {
    try {
      await apiFriendRequestAccept(req.id);
      await Promise.all([loadRequests(), loadFriends()]);
    } catch (e: any) {
      Alert.alert("Could not accept that request", e?.message || "Please try again.");
    }
  }, [loadRequests, loadFriends]);

  const declineRequest = useCallback(async (req: FriendRequest) => {
    try { await apiFriendRequestDecline(req.id); await loadRequests(); }
    catch (e: any) { Alert.alert("Could not decline that request", e?.message || "Please try again."); }
  }, [loadRequests]);

  const cancelRequest = useCallback(async (req: FriendRequest) => {
    try { await apiFriendRequestCancel(req.id); await loadRequests(); }
    catch (e: any) { Alert.alert("Could not cancel that request", e?.message || "Please try again."); }
  }, [loadRequests]);

  const unfriend = useCallback((friend: PublicUser) => {
    Alert.alert(`Remove ${friend.name}?`, "You'll need to send a new friend request to reconnect.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try { await apiUnfriend(friend.id); await loadFriends(); }
          catch (e: any) { Alert.alert("Could not remove that friend", e?.message || "Please try again."); }
        },
      },
    ]);
  }, [loadFriends]);

  // -- blocking --
  const [blocked, setBlocked] = useState<PublicUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const blockedRequest = useRef(0);

  const loadBlocked = useCallback(async () => {
    const requestId = ++blockedRequest.current;
    setBlockedLoading(true);
    try { const next = await apiBlockedList(); if (requestId === blockedRequest.current) setBlocked(next); }
    catch { /* silent — surfaced only on the settings screen that calls this explicitly */ }
    finally { if (requestId === blockedRequest.current) setBlockedLoading(false); }
  }, []);

  const block = useCallback((user: PublicUser) => {
    Alert.alert(`Block ${user.name}?`, "They won't be able to find you, message you, or send a friend request. This also ends any friendship between you.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block", style: "destructive",
        onPress: async () => {
          try {
            await apiBlock(user.id);
            await Promise.all([loadFriends(), loadRequests(), loadBlocked()]);
          } catch (e: any) {
            Alert.alert("Could not block that person", e?.message || "Please try again.");
          }
        },
      },
    ]);
  }, [loadFriends, loadRequests, loadBlocked]);

  const unblock = useCallback(async (userId: string) => {
    try { await apiUnblock(userId); await loadBlocked(); }
    catch (e: any) { Alert.alert("Could not unblock that person", e?.message || "Please try again."); }
  }, [loadBlocked]);

  useEffect(() => { if (active) loadBlocked(); }, [active, loadBlocked]);
  useEffect(() => { if (!active) return; return subscribeNexaAutoRefresh(() => { void loadRequests(); void loadFriends(); void loadBlocked(); }); }, [active, loadRequests, loadFriends, loadBlocked]);

  return {
    myUsername, myUsernameLoading, usernameSaving, checkUsername, claimUsername,
    searchResults, searching, search,
    incoming, outgoing, requestsLoading, requestsError, loadRequests, sendingRequest, sendFriendRequest, acceptRequest, declineRequest, cancelRequest,
    friends, friendsLoading, friendsError, loadFriends, unfriend,
    blocked, blockedLoading, loadBlocked, block, unblock,
  };
}

export type Friends = ReturnType<typeof useFriends>;

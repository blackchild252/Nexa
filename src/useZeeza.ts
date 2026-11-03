import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, AppState } from "react-native";
import {
  DmThread, DmMessage, ChatRoom, RoomMember, RoomMessage,
  apiDmThreads, apiDmOpen, apiDmMessages, apiDmSend, apiDmSendVoice,
  apiRoomsList, apiRoomCreate, apiRoomJoin, apiRoomMembers, apiRoomMessages, apiRoomSend, apiRoomLeave, apiRoomRemoveMember, apiRoomDelete,
} from "./zeezaMessaging";
import { subscribeNexaAutoRefresh } from "./nexaAutoRefresh";
import type { PublicUser } from "./friends";
import { isForeground, shouldPoll, pollBudgetAllowed } from "./nexaRealtimePolicy";

// All state for DMs + rooms (V3.17). Same load/error/loading + `active` gate idiom as
// useStaff.ts/useFriends.ts.
//
// No socket layer exists in this codebase yet (see MASTER_MASTER_ROADMAP.md / PRIORITY_ROADMAP.md / PRIORITY_MASTER_ROADMAP.md / PRIORITY_ROADMAP.md — "Realtime delivery"), so the
// open thread/room polls on an interval instead of pushing instantly. POLL_MS is deliberately
// modest; tighten it once/if a socket layer replaces this.
const POLL_MS = 4000;

export function useZeeza({ active }: { active: boolean }) {
  const [appState, setAppState] = useState(AppState.currentState === "active" ? "active" : "background");
  useEffect(() => { const sub = AppState.addEventListener("change", state => setAppState(state === "active" ? "active" : "background")); return () => sub.remove(); }, []);
  // ---------- DMs ----------
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState("");
  const threadsRequest = useRef(0);

  const loadThreads = useCallback(async () => {
    const requestId = ++threadsRequest.current;
    setThreadsLoading(true); setThreadsError("");
    try { const next = await apiDmThreads(); if (requestId === threadsRequest.current) setThreads(next); }
    catch (e: any) { if (requestId === threadsRequest.current) setThreadsError(e?.message || "Could not load your messages."); }
    finally { if (requestId === threadsRequest.current) setThreadsLoading(false); }
  }, []);

  useEffect(() => { if (active) loadThreads(); }, [active, loadThreads]);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThreadWith, setActiveThreadWith] = useState<PublicUser | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesRequest = useRef(0);
  const openThreadRequest = useRef(0);

  // Call from the friends list ("Message") — resolves/creates the thread, then opens it.
  const openDm = useCallback(async (friend: PublicUser): Promise<string | null> => {
    try {
      const { threadId, with: withUser } = await apiDmOpen(friend.id);
      setActiveThreadId(threadId);
      setActiveThreadWith(withUser);
      return threadId;
    } catch (e: any) {
      Alert.alert("Could not open that conversation", e?.message || "Please try again.");
      return null;
    }
  }, []);

  // Call from the DM inbox, where a threadId is already known.
  const openThread = useCallback((thread: DmThread) => {
    setActiveThreadId(thread.id);
    setActiveThreadWith(thread.with);
  }, []);

  const closeThread = useCallback(() => {
    setActiveThreadId(null); setActiveThreadWith(null); setMessages([]);
  }, []);

  // Notification deep-link: load a known thread ID and open it without requiring the user to tap the inbox row.
  const openThreadById = useCallback(async (threadId: string) => {
    const requestId = ++openThreadRequest.current;
    setActiveThreadId(threadId);
    try {
      const { with: withUser } = await apiDmMessages(threadId);
      if (requestId !== openThreadRequest.current) return false;
      setActiveThreadWith(withUser);
      return true;
    } catch (e: any) {
      if (requestId !== openThreadRequest.current) return false;
      setActiveThreadId(null);
      setActiveThreadWith(null);
      Alert.alert("Could not open that conversation", e?.message || "Please try again.");
      return false;
    }
  }, []);

  const loadMessages = useCallback(async (threadId: string, silent = false) => {
    const requestId = ++messagesRequest.current;
    if (!silent) setMessagesLoading(true);
    if (!silent) setMessagesError("");
    try {
      const { with: withUser, messages: msgs } = await apiDmMessages(threadId);
      if (requestId !== messagesRequest.current) return;
      setActiveThreadWith(withUser);
      setMessages(msgs);
    } catch (e: any) {
      if (requestId === messagesRequest.current && !silent) setMessagesError(e?.message || "Could not load that conversation.");
    } finally {
      if (requestId === messagesRequest.current && !silent) setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeThreadId || !isForeground(appState)) return;
    loadMessages(activeThreadId);
    let used = 0; let lastPollAt = Date.now();
    const id = setInterval(() => {
      if (!isForeground(appState) || !pollBudgetAllowed(used, 120)) return;
      if (!shouldPoll({ lifecycle: appState, lastPollAt, now: Date.now(), minIntervalMs: POLL_MS })) return;
      used += 1; lastPollAt = Date.now(); loadMessages(activeThreadId, true);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [activeThreadId, loadMessages, appState]);

  const loadOlderMessages = useCallback(async (threadId: string, before: string) => {
    const page = await apiDmMessages(threadId, before);
    setMessages((prev) => [...page.messages, ...prev.filter((m) => !page.messages.some((x) => x.id === m.id))]);
    return page;
  }, []);

  const sendDm = useCallback(async (body: string) => {
    if (!activeThreadId || !body.trim()) return;
    setSendingMessage(true);
    try {
      const { message } = await apiDmSend(activeThreadId, body.trim());
      setMessages((prev) => [...prev, message]);
      loadThreads(); // refresh inbox preview/order in the background
    } catch (e: any) {
      Alert.alert("Could not send that message", e?.message || "Please try again.");
    } finally {
      setSendingMessage(false);
    }
  }, [activeThreadId, loadThreads]);

  const sendDmVoice = useCallback(async (uri: string, mimeType = "audio/m4a") => {
    if (!activeThreadId) return;
    setSendingMessage(true);
    try { const { message } = await apiDmSendVoice(activeThreadId, uri, mimeType); setMessages((prev) => [...prev, message]); loadThreads(); }
    catch (e:any) { Alert.alert("Could not send voice note", e?.message || "Please try again."); }
    finally { setSendingMessage(false); }
  }, [activeThreadId, loadThreads]);

  // ---------- Rooms ----------
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const roomsRequest = useRef(0);

  const loadRooms = useCallback(async () => {
    const requestId = ++roomsRequest.current;
    setRoomsLoading(true); setRoomsError("");
    try { const next = await apiRoomsList(); if (requestId === roomsRequest.current) setRooms(next); }
    catch (e: any) { if (requestId === roomsRequest.current) setRoomsError(e?.message || "Could not load your rooms."); }
    finally { if (requestId === roomsRequest.current) setRoomsLoading(false); }
  }, []);

  useEffect(() => { if (active) loadRooms(); }, [active, loadRooms]);
  useEffect(() => { if (!active) return; return subscribeNexaAutoRefresh(() => { void loadThreads(); void loadRooms(); }); }, [active, loadThreads, loadRooms]);

  const createRoom = useCallback(async (name: string): Promise<ChatRoom | null> => {
    setCreatingRoom(true);
    try {
      const { room } = await apiRoomCreate(name);
      await loadRooms();
      return room;
    } catch (e: any) {
      Alert.alert("Could not create that room", e?.message || "Please try again.");
      return null;
    } finally {
      setCreatingRoom(false);
    }
  }, [loadRooms]);

  const joinRoom = useCallback(async (code: string): Promise<ChatRoom | null> => {
    setJoiningRoom(true);
    try {
      const { room } = await apiRoomJoin(code);
      await loadRooms();
      return room;
    } catch (e: any) {
      Alert.alert("Could not join that room", e?.message || "Check the code and try again.");
      return null;
    } finally {
      setJoiningRoom(false);
    }
  }, [loadRooms]);

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [roomMessagesLoading, setRoomMessagesLoading] = useState(false);
  const [roomMessagesError, setRoomMessagesError] = useState("");
  const [sendingRoomMessage, setSendingRoomMessage] = useState(false);
  const roomMessagesRequest = useRef(0);
  const roomMembersRequest = useRef(0);
  const openRoomRequest = useRef(0);

  const openRoom = useCallback((room: ChatRoom) => {
    setActiveRoomId(room.id); setActiveRoom(room);
  }, []);

  const closeRoom = useCallback(() => {
    setActiveRoomId(null); setActiveRoom(null); setRoomMessages([]); setRoomMembers([]);
  }, []);

  // Notification deep-link: load a known room ID and open it directly.
  const openRoomById = useCallback(async (roomId: string) => {
    const requestId = ++openRoomRequest.current;
    setActiveRoomId(roomId);
    try {
      const { room } = await apiRoomMessages(roomId);
      if (requestId !== openRoomRequest.current) return false;
      setActiveRoom(room);
      return true;
    } catch (e: any) {
      if (requestId !== openRoomRequest.current) return false;
      setActiveRoomId(null);
      setActiveRoom(null);
      Alert.alert("Could not open that room", e?.message || "Please try again.");
      return false;
    }
  }, []);

  const loadRoomMessages = useCallback(async (roomId: string, silent = false) => {
    const requestId = ++roomMessagesRequest.current;
    if (!silent) setRoomMessagesLoading(true);
    if (!silent) setRoomMessagesError("");
    try {
      const { room, messages: msgs } = await apiRoomMessages(roomId);
      if (requestId !== roomMessagesRequest.current) return;
      setActiveRoom(room);
      setRoomMessages(msgs);
    } catch (e: any) {
      if (requestId === roomMessagesRequest.current && !silent) setRoomMessagesError(e?.message || "Could not load that room.");
    } finally {
      if (requestId === roomMessagesRequest.current && !silent) setRoomMessagesLoading(false);
    }
  }, []);

  const loadRoomMembers = useCallback(async (roomId: string) => {
    const requestId = ++roomMembersRequest.current;
    try { const next = await apiRoomMembers(roomId); if (requestId === roomMembersRequest.current && activeRoomId === roomId) setRoomMembers(next); }
    catch { /* silent — member list is secondary to the message view */ }
  }, [activeRoomId]);

  useEffect(() => {
    if (!activeRoomId || !isForeground(appState)) return;
    loadRoomMessages(activeRoomId);
    loadRoomMembers(activeRoomId);
    let used = 0; let lastPollAt = Date.now();
    const id = setInterval(() => {
      if (!isForeground(appState) || !pollBudgetAllowed(used, 120)) return;
      if (!shouldPoll({ lifecycle: appState, lastPollAt, now: Date.now(), minIntervalMs: POLL_MS })) return;
      used += 1; lastPollAt = Date.now(); loadRoomMessages(activeRoomId, true);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [activeRoomId, loadRoomMessages, loadRoomMembers, appState]);

  const loadOlderRoomMessages = useCallback(async (roomId: string, before: string) => {
    const page = await apiRoomMessages(roomId, before);
    setRoomMessages((prev) => [...page.messages, ...prev.filter((m) => !page.messages.some((x) => x.id === m.id))]);
    return page;
  }, []);

  const sendRoomMessage = useCallback(async (body: string) => {
    if (!activeRoomId || !body.trim()) return;
    setSendingRoomMessage(true);
    try {
      const { message } = await apiRoomSend(activeRoomId, body.trim());
      setRoomMessages((prev) => [...prev, message]);
    } catch (e: any) {
      Alert.alert("Could not send that message", e?.message || "Please try again.");
    } finally {
      setSendingRoomMessage(false);
    }
  }, [activeRoomId]);

  const leaveRoom = useCallback((room: ChatRoom) => {
    Alert.alert(`Leave ${room.name}?`, "You can rejoin later with an invite code.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave", style: "destructive",
        onPress: async () => {
          try {
            await apiRoomLeave(room.id);
            if (activeRoomId === room.id) closeRoom();
            await loadRooms();
          } catch (e: any) {
            Alert.alert("Could not leave that room", e?.message || "Please try again.");
          }
        },
      },
    ]);
  }, [activeRoomId, closeRoom, loadRooms]);

  const removeMember = useCallback((roomId: string, member: RoomMember) => {
    Alert.alert(`Remove ${member.name}?`, "They'll need a new invite code to rejoin.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try { await apiRoomRemoveMember(roomId, member.id); await loadRoomMembers(roomId); }
          catch (e: any) { Alert.alert("Could not remove that member", e?.message || "Please try again."); }
        },
      },
    ]);
  }, [loadRoomMembers]);

  const deleteRoom = useCallback((room: ChatRoom) => {
    Alert.alert(`Delete ${room.name}?`, "This removes the room and every message in it, for everyone. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await apiRoomDelete(room.id);
            if (activeRoomId === room.id) closeRoom();
            await loadRooms();
          } catch (e: any) {
            Alert.alert("Could not delete that room", e?.message || "Please try again.");
          }
        },
      },
    ]);
  }, [activeRoomId, closeRoom, loadRooms]);

  return {
    threads, threadsLoading, threadsError, loadThreads,
    activeThreadId, activeThreadWith, messages, messagesLoading, messagesError, sendingMessage,
    openDm, openThread, openThreadById, closeThread, sendDm, sendDmVoice, loadOlderMessages,
    rooms, roomsLoading, roomsError, loadRooms, createRoom, creatingRoom, joinRoom, joiningRoom,
    activeRoomId, activeRoom, roomMessages, roomMembers, roomMessagesLoading, roomMessagesError, sendingRoomMessage,
    openRoom, openRoomById, closeRoom, sendRoomMessage, loadOlderRoomMessages, loadRoomMessages, leaveRoom, removeMember, deleteRoom,
  };
}

export type ZeezaState = ReturnType<typeof useZeeza>;

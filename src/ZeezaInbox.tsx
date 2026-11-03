import { NexaPressable } from './motion';
import React, { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { authedFetch } from "./api";
import { View, Text, TextInput,  ScrollView, ActivityIndicator, RefreshControl } from "react-native";

import { s } from "./styles";
import { theme, tc, ds } from './theme';
import { gs } from "./groupStyles";
import { ss } from "./socialStyles";
import type { DmThread, ChatRoom } from "./zeezaMessaging";
import type { ZeezaState } from "./useZeeza";
import { ZeezaThreadScreen } from "./ZeezaThreadScreen";
import { RoomScreen } from "./RoomScreen";

// Top-level Zeeza Inbox surface (V3.17): DM inbox + my rooms, with "New room" / "Join with code". Drop in
// wherever Zeeza renders its Inbox section (see INTEGRATE_SOCIAL.md):
//
//   const zeeza = useZeeza({ active: true });
//   <ZeezaInbox zeeza={zeeza} />
//
// Manages its own list -> thread/room navigation internally (same idiom as GroupsTab.tsx), so no
// router changes are needed. FriendsScreen's "Message" button should call `zeeza.openDm(friend)`
// directly — that's what opens ZeezaThreadScreen from outside this file.

type LocalInboxMessage = { id: string; category: "local"; preview: string; message: string; expiresAt: string; createdAt: string };

function fmtDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Inbox({ zeeza }: { zeeza: ZeezaState }) {
  return (
    <>
      {zeeza.threadsLoading && zeeza.threads.length === 0 && <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading Zeeza conversations" color={theme.colors.royalGold} style={ds({ marginTop: 20 })} />}
      {zeeza.threadsError ? <Text style={[s.muted, gs.danger]}>{zeeza.threadsError}</Text> : null}
      {!zeeza.threadsLoading && !zeeza.threadsError && zeeza.threads.length === 0 && (
        <Text style={ss.emptyState}>No conversations yet. Message a friend from the Friends section to start one.</Text>
      )}
      {zeeza.threads.map((t: DmThread) => (
        <NexaPressable accessibilityRole="button" accessibilityLabel={`Open Zeeza conversation ${t.with?.name || t.with?.username || t.id}`} key={t.id} style={ss.inboxRow} onPress={() => zeeza.openThread(t)}>
          <View style={ds({ flex: 1 })}>
            <Text style={ss.inboxName}>{t.with.name}</Text>
            {t.lastMessage && (
              <Text style={[ss.inboxPreview, t.unread > 0 && ss.inboxPreviewUnread]} numberOfLines={1}>
                {t.lastMessage.mine ? "You: " : ""}{t.lastMessage.body}
              </Text>
            )}
          </View>
          {t.lastMessage && <Text style={ss.inboxMeta}>{fmtDay(t.lastMessage.createdAt)}</Text>}
          {t.unread > 0 && (
            <View style={ss.unreadDot}><Text style={ss.unreadDotText}>{t.unread > 9 ? "9+" : t.unread}</Text></View>
          )}
        </NexaPressable>
      ))}
    </>
  );
}

function Rooms({ zeeza }: { zeeza: ZeezaState }) {
  const [mode, setMode] = useState<"list" | "new" | "join">("list");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  if (mode === "new") {
    return (
      <View style={gs.composer}>
        <Text style={gs.label}>Room name</Text>
        <TextInput style={s.authInput} value={name} onChangeText={setName} accessibilityLabel="Zeeza room name" placeholder="e.g. Flatmates" placeholderTextColor={tc("#666")} maxLength={40} />
        <View style={ds({ flexDirection: "row", marginTop: 10 })}>
          <NexaPressable
            style={[gs.topBtn, gs.topBtnPrimary, { flex: 0, paddingHorizontal: 18 }]}
            accessibilityRole="button" accessibilityLabel="Create Zeeza room"
            disabled={zeeza.creatingRoom || !name.trim()} accessibilityState={{disabled:zeeza.creatingRoom || !name.trim()}}
            onPress={async () => { const r = await zeeza.createRoom(name.trim()); if (r) { setName(""); setMode("list"); } }}
          >
            {zeeza.creatingRoom ? <ActivityIndicator color={theme.colors.deepBlack} /> : <Text style={[gs.topBtnText, gs.topBtnTextPrimary]}>Create</Text>}
          </NexaPressable>
          <NexaPressable style={[gs.smallBtn, { marginLeft: 10 }]} accessibilityRole="button" accessibilityLabel="Cancel new Zeeza room" onPress={() => { setName(""); setMode("list"); }}>
            <Text style={gs.smallBtnText}>Cancel</Text>
          </NexaPressable>
        </View>
      </View>
    );
  }

  if (mode === "join") {
    return (
      <View style={gs.composer}>
        <Text style={gs.label}>Invite code</Text>
        <TextInput
          style={[s.authInput, { fontSize: 22, letterSpacing: 3, textAlign: "center", fontWeight: "800" }]} accessibilityLabel="Zeeza room invite code"
          value={code} onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="ABCD2345" placeholderTextColor={tc("#444")} autoCapitalize="characters" autoCorrect={false} maxLength={8}
        />
        <View style={ds({ flexDirection: "row", marginTop: 10 })}>
          <NexaPressable
            style={[gs.topBtn, gs.topBtnPrimary, { flex: 0, paddingHorizontal: 18 }]}
            accessibilityRole="button" accessibilityLabel="Join Zeeza room"
            disabled={zeeza.joiningRoom || code.length !== 8} accessibilityState={{disabled:zeeza.joiningRoom || code.length !== 8}}
            onPress={async () => { const r = await zeeza.joinRoom(code); if (r) { setCode(""); setMode("list"); } }}
          >
            {zeeza.joiningRoom ? <ActivityIndicator color={theme.colors.deepBlack} /> : <Text style={[gs.topBtnText, gs.topBtnTextPrimary]}>Join</Text>}
          </NexaPressable>
          <NexaPressable style={[gs.smallBtn, { marginLeft: 10 }]} accessibilityRole="button" accessibilityLabel="Cancel joining Zeeza room" onPress={() => { setCode(""); setMode("list"); }}>
            <Text style={gs.smallBtnText}>Cancel</Text>
          </NexaPressable>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={gs.topRow}>
        <NexaPressable accessibilityRole="button" accessibilityLabel="Create new Zeeza room" style={[gs.topBtn, gs.topBtnPrimary]} onPress={() => setMode("new")}>
          <Text style={[gs.topBtnText, gs.topBtnTextPrimary]}>+ New room</Text>
        </NexaPressable>
        <NexaPressable accessibilityRole="button" accessibilityLabel="Join Zeeza room with code" style={gs.topBtn} onPress={() => setMode("join")}>
          <Text style={gs.topBtnText}>Join with code</Text>
        </NexaPressable>
      </View>
      {zeeza.roomsLoading && zeeza.rooms.length === 0 && <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading Zeeza rooms" color={theme.colors.royalGold} style={ds({ marginTop: 10 })} />}
      {zeeza.roomsError ? <Text style={[s.muted, gs.danger]}>{zeeza.roomsError}</Text> : null}
      {!zeeza.roomsLoading && !zeeza.roomsError && zeeza.rooms.length === 0 && (
        <Text style={ss.emptyState}>No rooms yet — start one or join with a code.</Text>
      )}
      {zeeza.rooms.map((r: ChatRoom) => (
        <NexaPressable accessibilityRole="button" accessibilityLabel={`Open Zeeza room ${r.name || r.id}`} key={r.id} style={gs.groupCard} onPress={() => zeeza.openRoom(r)}>
          <Text style={gs.groupName}>{r.name}</Text>
          <Text style={gs.groupMeta}>{r.memberCount} {r.memberCount === 1 ? "member" : "members"}{r.myRole === "owner" ? " · You own this" : ""}</Text>
        </NexaPressable>
      ))}
    </>
  );
}

export function ZeezaInbox({ zeeza }: { zeeza: ZeezaState }) {
  const [category, setCategory] = useState<"local" | "zeeza" | "notifications">("zeeza");
  const [sub, setSub] = useState<"messages" | "rooms">("messages");
  const [refreshing, setRefreshing] = useState(false);
  const [localMessages, setLocalMessages] = useState<LocalInboxMessage[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const loadLocalMessages = useCallback(async () => { setLocalLoading(true); setLocalError(""); try { const r = await authedFetch("/api/zeeza/local-inbox"); setLocalMessages(Array.isArray(r.messages) ? r.messages : []); } catch (e: any) { setLocalError(e?.message || "Local inbox is unavailable right now."); } finally { setLocalLoading(false); } }, []);
  useEffect(() => { if (category === "local") void loadLocalMessages(); }, [category, loadLocalMessages]);

  if (zeeza.activeThreadId) return <ZeezaThreadScreen zeeza={zeeza} />;
  if (zeeza.activeRoomId) return <RoomScreen zeeza={zeeza} />;

  const categoryButton = (id: "local" | "zeeza" | "notifications", label: string, backgroundColor: string) => (
    <NexaPressable key={id} accessibilityRole="tab" accessibilityState={{ selected: category === id }} accessibilityLabel={label} onPress={() => { if (id === "notifications") { router.push("/(tabs)?panel=notifications" as any); return; } setCategory(id); }} style={ds({ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, paddingHorizontal: 6, backgroundColor: category === id ? backgroundColor : theme.colors.surface, borderWidth: category === id ? 2 : 1, borderColor: backgroundColor })}>
      <Text style={ds({ color: category === id ? tc("#111111") : theme.colors.text, fontWeight: "800", textAlign: "center" })}>{label}</Text>
    </NexaPressable>
  );

  return (
    <ScrollView
      contentContainerStyle={s.scrollWrap}
      refreshControl={
        <RefreshControl
          refreshing={refreshing} tintColor={theme.colors.royalGold}
          onRefresh={async () => { setRefreshing(true); if (category === "local") await loadLocalMessages(); else await (sub === "messages" ? zeeza.loadThreads() : zeeza.loadRooms()); setRefreshing(false); }}
        />
      }
    >
      <Text style={s.heading}>Inbox</Text>
      <View accessibilityRole="tablist" style={ds({ flexDirection: "row", gap: 8, marginBottom: 14 })}>
        {categoryButton("local", "Local inbox", tc("#8BD6A2"))}
        {categoryButton("zeeza", "Zeeza chat", tc("#80B8FF"))}
        {categoryButton("notifications", "Notifications", tc("#FFE082"))}
      </View>
      {category === "local" ? (
        <View accessibilityRole="summary" style={ds({ padding: 16, borderRadius: 12, backgroundColor: theme.colors.surface })}>
          <Text style={s.heading}>Local secure inbox</Text>
          <Text style={s.muted}>Private messages sent by verified NEXA services, including short-lived sign-in codes. Only messages addressed to your account are shown.</Text>
          {localLoading && <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading local secure inbox" color={theme.colors.royalGold} style={ds({ marginTop: 12 })} />}
          {localError ? <Text accessibilityRole="alert" style={[s.muted, gs.danger]}>{localError}</Text> : null}
          {!localLoading && !localError && localMessages.length === 0 && <Text style={ss.emptyState}>No active secure messages.</Text>}
          {localMessages.map(m => <View key={m.id} style={ds({ paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border })}>
            <Text style={ss.inboxName}>{m.preview || "Secure message"}</Text>
            <Text selectable style={ds({ color: theme.colors.text, marginTop: 6, lineHeight: 21 })}>{m.message}</Text>
            <Text style={ss.inboxMeta}>Received {fmtDay(m.createdAt)} · expires {new Date(m.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
          </View>)}
          <NexaPressable accessibilityRole="button" accessibilityLabel="Refresh local secure inbox" style={[gs.smallBtn, ds({ alignSelf: "flex-start", marginTop: 12 })]} onPress={() => void loadLocalMessages()} disabled={localLoading} accessibilityState={{ disabled: localLoading }}><Text style={gs.smallBtnText}>Refresh messages</Text></NexaPressable>
        </View>
      ) : category === "notifications" ? (
        <View accessibilityRole="summary" style={ds({ padding: 16, borderRadius: 12, backgroundColor: theme.colors.surface })}>
          <Text style={s.heading}>Notifications</Text>
          <Text style={s.muted}>Notifications open the dedicated NEXA Notifications page. Central report delivery notices will appear only after a verified Central notification feed is connected.</Text>
        </View>
      ) : (<>
      <Text style={s.muted}>{zeeza.threads.reduce((n:any,t:any)=>n+Number(t.unread||0),0)} unread in Zeeza chat · {zeeza.threads.length} conversations · {zeeza.rooms.length} rooms</Text>
      <View style={ss.subTabRow}>
        <NexaPressable accessibilityRole="tab" accessibilityState={{selected:sub === "messages"}} accessibilityLabel="Zeeza inbox" style={[ss.subTab, sub === "messages" && ss.subTabOn]} onPress={() => setSub("messages")}>
          <Text style={[ss.subTabText, sub === "messages" && ss.subTabTextOn]}>Inbox</Text>
        </NexaPressable>
        <NexaPressable accessibilityRole="tab" accessibilityState={{selected:sub === "rooms"}} accessibilityLabel="Zeeza rooms" style={[ss.subTab, sub === "rooms" && ss.subTabOn]} onPress={() => setSub("rooms")}>
          <Text style={[ss.subTabText, sub === "rooms" && ss.subTabTextOn]}>Rooms</Text>
        </NexaPressable>
      </View>
      {sub === "messages" ? <Inbox zeeza={zeeza} /> : <Rooms zeeza={zeeza} />}
      </>)}
    </ScrollView>
  );
}

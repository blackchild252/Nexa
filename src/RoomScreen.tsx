import React, { useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Share, AppState } from "react-native";

import { s } from "./styles";
import { theme, tc, ds } from './theme';
import {NexaPressable} from './motion';
import { router } from "expo-router";
import { createGroupCall, getActiveGroupCall } from "./groupCallService";
import { gs } from "./groupStyles";
import { ss } from "./socialStyles";
import type { RoomMember } from "./zeezaMessaging";
import type { ZeezaState } from "./useZeeza";
import { isForeground, shouldPoll, pollBudgetAllowed } from "./nexaRealtimePolicy";
import { apiRoomRevokeInvite, apiRoomRotateInvite } from "./zeezaMessaging";

// One open room (V3.17). `zeeza.activeRoomId`/`activeRoom` drive this — call `zeeza.openRoom(room)`
// before showing this screen, and `zeeza.closeRoom()` on back. Same invite-code idiom as
// vendor_staff/money_groups: the owner shares `zeeza.activeRoom.inviteCode` (present only for the
// owner — see zeeza.ts), anyone else redeems it from ZeezaInbox's "Join with code" box.

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function MemberList({ zeeza, room }: { zeeza: ZeezaState; room: NonNullable<ZeezaState["activeRoom"]> }) {
  const isOwner = room.myRole === "owner";
  return (
    <View style={s.dashCard}>
      <Text style={gs.sectionTitle}>Members ({room.memberCount})</Text>
      {zeeza.roomMembers.map((m: RoomMember) => (
        <View key={m.id} style={gs.personRow}>
          <View style={ds({ flex: 1 })}>
            <Text style={gs.personName}>{m.name}{m.role === "owner" ? " (owner)" : ""}</Text>
            {m.username && <Text style={ss.userHandle}>@{m.username}</Text>}
          </View>
          {isOwner && m.role !== "owner" && (
            <NexaPressable accessibilityRole="button" accessibilityLabel={`Remove ${m.name || m.username || "member"} from room`} style={[gs.smallBtn, gs.smallBtnDanger]} onPress={() => zeeza.removeMember(room.id, m)}>
              <Text style={[gs.smallBtnText, gs.smallBtnDangerText]}>Remove</Text>
            </NexaPressable>
          )}
        </View>
      ))}
    </View>
  );
}

export function RoomScreen({ zeeza }: { zeeza: ZeezaState }) {
  const [input, setInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);
  const callRequest = useRef(0);
  const [appState,setAppState]=useState(AppState.currentState === "active" ? "active" : "background");
  React.useEffect(()=>{const sub=AppState.addEventListener("change",s=>setAppState(s === "active" ? "active" : "background"));return()=>sub.remove()},[]);
  const [callBusy, setCallBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const room = zeeza.activeRoom;

  React.useEffect(() => {
    let live = true;
    if (!room?.id) { setActiveCall(null); return () => { live = false; }; }
    const load = async () => { const requestId = ++callRequest.current; try { const r = await getActiveGroupCall(room.id); if (live && requestId === callRequest.current) setActiveCall(r.active ? r.call : null); } catch {} };
    if (!isForeground(appState)) return () => { live = false; };
    load(); let used=0; let lastPollAt=Date.now(); const timer = setInterval(()=>{ if(!isForeground(appState)||!pollBudgetAllowed(used,120)||!shouldPoll({lifecycle:appState,lastPollAt,now:Date.now(),minIntervalMs:2500}))return; used+=1; lastPollAt=Date.now(); load(); }, 2500);
    return () => { live = false; callRequest.current++; clearInterval(timer); };
  }, [room?.id, appState]);

  const startCall = async (media: "audio"|"video") => {
    if (!room?.id) return;
    setCallBusy(true);
    try { const r = await createGroupCall(room.id, media); router.push({ pathname: "/zeeza/group-call", params: { callId: r.call.id } } as any); }
    catch (e:any) { /* server explains membership/active-call errors */ }
    finally { setCallBusy(false); }
  };
  const joinCall = () => { if (activeCall?.id) router.push({ pathname: "/zeeza/group-call", params: { callId: activeCall.id } } as any); };

  if (!zeeza.activeRoomId || !room) return null;
  const isOwner = room.myRole === "owner";

  const send = () => {
    const body = input.trim();
    if (!body) return;
    setInput("");
    zeeza.sendRoomMessage(body);
  };

  return (
    <KeyboardAvoidingView style={ds({ flex: 1 })} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.wrap, { flex: 1, paddingBottom: 10 }]}>
        <View style={ss.threadHeader}>
          <Text style={s.back} accessibilityRole="button" accessibilityLabel="Back from Zeeza room" onPress={zeeza.closeRoom}>‹ </Text>
          <View style={ds({ flex: 1 })}>
            <Text style={ss.threadTitle}>{room.name}</Text>
            <Text style={ss.threadSub}>{room.memberCount} {room.memberCount === 1 ? "member" : "members"}</Text>
          </View>
          <NexaPressable style={gs.smallBtn} accessibilityRole="button" accessibilityLabel={showMembers ? "Show room messages" : "Show room members"} accessibilityState={{expanded:showMembers}} onPress={() => setShowMembers((v) => !v)}>
            <Text style={gs.smallBtnText}>{showMembers ? "Messages" : "Members"}</Text>
          </NexaPressable>
          {activeCall ? <NexaPressable disabled={callBusy} accessibilityState={{disabled:callBusy}} style={[gs.smallBtn,{marginLeft:6,backgroundColor:theme.colors.goldWash,opacity:callBusy?0.55:1}]} accessibilityRole="button" accessibilityLabel={`Join active ${activeCall.media === "video" ? "video" : "voice"} call`} onPress={joinCall}><Text style={gs.smallBtnText}>Join {activeCall.media === "video" ? "video" : "voice"}</Text></NexaPressable> : <><NexaPressable disabled={callBusy} accessibilityState={{disabled:callBusy}} style={[gs.smallBtn,{marginLeft:6}]} accessibilityRole="button" accessibilityLabel="Start room voice call" onPress={()=>startCall("audio")}><Text style={gs.smallBtnText}>Voice</Text></NexaPressable><NexaPressable disabled={callBusy} accessibilityState={{disabled:callBusy}} style={[gs.smallBtn,{marginLeft:6}]} accessibilityRole="button" accessibilityLabel="Start room video call" onPress={()=>startCall("video")}><Text style={gs.smallBtnText}>Video</Text></NexaPressable></>}
        </View>

        {showMembers ? (
          <ScrollView style={ds({ flex: 1 })}>
            {isOwner && room.inviteCode && (
              <View style={gs.inviteBox}>
                <Text style={s.muted}>Share this code so people can join {room.name}.</Text>
                <Text style={[gs.code, { marginTop: 6 }]}>{room.inviteCode}</Text>
                <Text style={s.muted}>Expires {room.inviteExpiresAt ? new Date(room.inviteExpiresAt).toLocaleString() : "soon"}.</Text>
                <View style={ds({ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 })}>
                  <NexaPressable disabled={inviteBusy} accessibilityState={{disabled:inviteBusy}} style={[gs.smallBtn, { marginLeft: 0 }]} accessibilityRole="button" accessibilityLabel="Share Zeeza room invite" onPress={() => Share.share({ message: `Join ${room.name} on NEXA — invite code: ${room.inviteCode}` })}>
                    <Text style={gs.smallBtnText}>Share</Text>
                  </NexaPressable>
                  <NexaPressable disabled={inviteBusy} accessibilityState={{disabled:inviteBusy}} style={[gs.smallBtn, { marginLeft: 0 }]} accessibilityRole="button" accessibilityLabel="Rotate Zeeza room invite code" onPress={async () => { setInviteBusy(true); try { const r = await apiRoomRotateInvite(room.id); await zeeza.loadRoomMessages(room.id); await Share.share({ message: `Join ${room.name} on NEXA — invite code: ${r.inviteCode}` }); } finally { setInviteBusy(false); } }}>
                    <Text style={gs.smallBtnText}>Rotate</Text>
                  </NexaPressable>
                  <NexaPressable disabled={inviteBusy} accessibilityState={{disabled:inviteBusy}} style={[gs.smallBtn, gs.smallBtnDanger, { marginLeft: 0 }]} accessibilityRole="button" accessibilityLabel="Revoke Zeeza room invite code" onPress={async () => { setInviteBusy(true); try { await apiRoomRevokeInvite(room.id); await zeeza.loadRoomMessages(room.id); } finally { setInviteBusy(false); } }}>
                    <Text style={[gs.smallBtnText, gs.smallBtnDangerText]}>Revoke</Text>
                  </NexaPressable>
                </View>
              </View>
            )}
            <MemberList zeeza={zeeza} room={room} />
            <NexaPressable
              style={[gs.topBtn, gs.smallBtnDanger, { marginTop: 16 }]}
              accessibilityRole="button" accessibilityLabel={isOwner ? "Delete Zeeza room" : "Leave Zeeza room"}
              accessibilityState={{disabled:callBusy || inviteBusy}} disabled={callBusy || inviteBusy}
              onPress={() => isOwner ? zeeza.deleteRoom(room) : zeeza.leaveRoom(room)}
            >
              <Text style={[gs.topBtnText, gs.smallBtnDangerText]}>{isOwner ? "Delete room" : "Leave room"}</Text>
            </NexaPressable>
          </ScrollView>
        ) : (
          <>
            <ScrollView style={ds({ flex: 1 })} contentContainerStyle={ds({ flexGrow: 1, justifyContent: "flex-end" })}>
              {zeeza.roomMessagesLoading && zeeza.roomMessages.length === 0 && <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading room messages" color={tc("#D4AF37")} style={ds({ marginTop: 20 })} />}
              {zeeza.roomMessagesError ? <Text style={ss.emptyState}>{zeeza.roomMessagesError}</Text> : null}
              {!zeeza.roomMessagesLoading && zeeza.roomMessages.length === 0 && !zeeza.roomMessagesError && (
                <Text style={ss.emptyState}>No messages yet — start the conversation.</Text>
              )}
              {zeeza.roomMessages.map((m) => (
                <View key={m.id} style={[ss.msgRow, m.mine ? ss.msgRowMine : ss.msgRowTheirs]}>
                  {!m.mine && m.sender && <Text style={ss.bubbleSender}>{m.sender.name}</Text>}
                  <View style={[ss.bubble, m.mine ? ss.bubbleMine : ss.bubbleTheirs]}>
                    <Text style={m.mine ? ss.bubbleTextMine : ss.bubbleTextTheirs}>{m.body}</Text>
                  </View>
                  <Text style={[ss.bubbleTime, m.mine && ss.bubbleTimeMine]}>{fmtTime(m.createdAt)}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={ss.sendBar}>
              <TextInput
                style={ss.sendInput} value={input} onChangeText={setInput}
                placeholder="Message" placeholderTextColor={tc("#9B907A")} multiline accessibilityLabel="Zeeza room message"
              />
              <NexaPressable
                style={[ss.sendBtn, (!input.trim() || zeeza.sendingRoomMessage) && ss.sendBtnDisabled]}
                disabled={!input.trim() || zeeza.sendingRoomMessage} accessibilityState={{disabled:!input.trim() || zeeza.sendingRoomMessage}} accessibilityRole="button" accessibilityLabel="Send Zeeza room message" onPress={send}
              >
                {zeeza.sendingRoomMessage ? <ActivityIndicator color={tc("#050403")} size="small" /> : <Text style={ss.sendBtnText}>↑</Text>}
              </NexaPressable>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

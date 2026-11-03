import React, { useState } from "react";
import { View, Text, TextInput,  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Audio } from "expo-av";
import { NexaPressable } from './motion';

import { s } from "./styles";
import { theme, ds } from "./theme";
import { ss } from "./socialStyles";
import type { ZeezaState } from "./useZeeza";
import { router } from "expo-router";
import { createCall } from "./callService";

// One open DM thread (V3.17). `zeeza.activeThreadId`/`activeThreadWith` drive this — call
// `zeeza.openThread(thread)` (from the inbox list) or `zeeza.openDm(friend)` (from FriendsScreen's
// "Message" button) before showing this screen, and `zeeza.closeThread()` on back.
// Polls every `POLL_MS` (see useZeeza.ts) since there's no socket layer yet.

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ZeezaThreadScreen({ zeeza }: { zeeza: ZeezaState }) {
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  if (!zeeza.activeThreadId) return null;
  const withUser = zeeza.activeThreadWith;

  const send = () => {
    const body = input.trim();
    if (!body) return;
    setInput("");
    zeeza.sendDm(body);
  };

  const startVoice = async () => {
    try { const perm=await Audio.requestPermissionsAsync(); if(!perm.granted){Alert.alert("Voice note","Microphone permission is required.");return;} await Audio.setAudioModeAsync({allowsRecordingIOS:true,playsInSilentModeIOS:true}); const r=await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY); setRecording(r.recording); } catch(e:any){Alert.alert("Voice note",e?.message||"Could not start recording.");}
  };
  const stopVoice = async () => { if(!recording)return; const r=recording; setRecording(null); try { await r.stopAndUnloadAsync(); const uri=r.getURI(); if(!uri)throw new Error("No voice note was created."); await zeeza.sendDmVoice(uri,"audio/m4a"); } catch(e:any){Alert.alert("Voice note",e?.message||"Could not send that voice note.");} };
  const playVoice = async (m:any) => { if(!m.mediaUrl)return; try { setPlayingId(m.id); const {sound}=await Audio.Sound.createAsync({uri:m.mediaUrl},{shouldPlay:true}); sound.setOnPlaybackStatusUpdate((st:any)=>{if(st.didJustFinish){setPlayingId(null);sound.unloadAsync();}}); } catch(e:any){setPlayingId(null);Alert.alert("Voice note","Could not play this voice note.");} };

  return (
    <KeyboardAvoidingView style={ds({ flex: 1 })} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.wrap, { flex: 1, paddingBottom: 10 }]}>
        <View style={ss.threadHeader}>
          <NexaPressable accessibilityRole="button" accessibilityLabel="Close Zeeza conversation" onPress={zeeza.closeThread}><Text style={s.back}>‹ </Text></NexaPressable>
          <View style={ds({ flex: 1 })}>
            <Text style={ss.threadTitle}>{withUser?.name || "Conversation"}</Text>
            {withUser?.username && <Text style={ss.threadSub}>@{withUser.username}</Text>}
          </View>
          <NexaPressable accessibilityRole="button" accessibilityLabel="Start Zeeza voice call" style={ss.sendBtn} onPress={async()=>{ if(!withUser?.id)return; try{const r=await createCall(String(withUser.id),'audio'); router.push({pathname:'/zeeza/call',params:{callId:r.call.id,media:'audio'}} as any);}catch(e:any){}}}>
            <Text style={ss.sendBtnText}>☎</Text>
          </NexaPressable>
          <NexaPressable accessibilityRole="button" accessibilityLabel="Start Zeeza video call" style={[ss.sendBtn,{marginLeft:6}]} onPress={async()=>{ if(!withUser?.id)return; try{const r=await createCall(String(withUser.id),'video'); router.push({pathname:'/zeeza/call',params:{callId:r.call.id,media:'video'}} as any);}catch(e:any){}}}>
            <Text style={ss.sendBtnText}>▣</Text>
          </NexaPressable>
        </View>

        <ScrollView style={ds({ flex: 1 })} contentContainerStyle={ds({ flexGrow: 1, justifyContent: "flex-end" })}>
          {zeeza.messagesLoading && zeeza.messages.length === 0 && <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading conversation messages" color={theme.colors.royalGold} style={ds({ marginTop: 20 })} />}
          {zeeza.messagesError ? <Text style={ss.emptyState}>{zeeza.messagesError}</Text> : null}
          {!zeeza.messagesLoading && zeeza.messages.length === 0 && !zeeza.messagesError && (
            <Text style={ss.emptyState}>No messages yet — say hi.</Text>
          )}
          {zeeza.messages.map((m) => (
            <View key={m.id} style={[ss.msgRow, m.mine ? ss.msgRowMine : ss.msgRowTheirs]}>
              <View style={[ss.bubble, m.mine ? ss.bubbleMine : ss.bubbleTheirs]}>
                {m.kind === "voice" ? <NexaPressable accessibilityRole="button" accessibilityLabel={playingId===m.id?"Playing voice note":"Play voice note"} onPress={()=>playVoice(m)}><Text style={m.mine ? ss.bubbleTextMine : ss.bubbleTextTheirs}>{playingId===m.id?"▶ Playing voice note":"▶ Voice note"}</Text></NexaPressable> : <Text style={m.mine ? ss.bubbleTextMine : ss.bubbleTextTheirs}>{m.body}</Text>}
              </View>
              <Text style={[ss.bubbleTime, m.mine && ss.bubbleTimeMine]}>{fmtTime(m.createdAt)}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={ss.sendBar}>
          <TextInput
            accessibilityLabel="Zeeza message"
            style={ss.sendInput} value={input} onChangeText={setInput}
            placeholder="Message" placeholderTextColor={theme.colors.muted} multiline
          />
          <NexaPressable accessibilityRole="button" accessibilityLabel={recording?"Stop and send Zeeza voice note":"Record Zeeza voice note"} onPress={recording?stopVoice:startVoice} disabled={zeeza.sendingMessage} accessibilityState={{disabled:zeeza.sendingMessage}} style={[ss.sendBtn,{marginRight:6},recording&&{backgroundColor:theme.colors.goldBright}]}><Text style={ss.sendBtnText}>{recording?"■":"🎙"}</Text></NexaPressable>
          <NexaPressable
            accessibilityRole="button" accessibilityLabel={zeeza.sendingMessage ? "Sending Zeeza message" : "Send Zeeza message"} accessibilityState={{disabled:zeeza.sendingMessage}}
            style={[ss.sendBtn, (!input.trim() || zeeza.sendingMessage) && ss.sendBtnDisabled]}
            disabled={!input.trim() || zeeza.sendingMessage} onPress={send}
          >
            {zeeza.sendingMessage ? <ActivityIndicator color={theme.colors.deepBlack} size="small" /> : <Text style={ss.sendBtnText}>↑</Text>}
          </NexaPressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

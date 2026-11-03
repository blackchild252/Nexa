import React from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
let __w: any = {};
try { __w = require("react-native-webrtc"); } catch (e) {}
const { RTCView } = new Proxy(__w, { get: (t: any, k: string) => t[k] ?? (() => null) });
import { Audio } from 'expo-av';
import { theme, tc, themedStyles } from './theme';
import { currentThemeMode } from './themeMode';
import { acceptCall, declineCall, endCall, getCall, getSignals, sendSignal, type CallInfo, type CallMedia } from './callService';
import { nexaGoBack } from './NexaNavKeys';
import { isForeground, shouldPoll, pollBudgetAllowed } from './nexaRealtimePolicy';

export function CallScreen({ callId: initialCallId, media: initialMedia }: { callId:string; media?:CallMedia }) {
  const [call,setCall]=React.useState<CallInfo|null>(null);
  const [status,setStatus]=React.useState('connecting');
  const [error,setError]=React.useState('');
  const [local,setLocal]=React.useState<any>(null);
  const [remote,setRemote]=React.useState<any>(null);
  const [muted,setMuted]=React.useState(false);
  const [cameraOff,setCameraOff]=React.useState(false);
  const pcRef=React.useRef<any>(null);
  const lastSignal=React.useRef('');
  const queuedCandidates=React.useRef<any[]>([]);
  const mounted=React.useRef(true);
  const pollRequest=React.useRef(0);
  const [appState,setAppState]=React.useState(AppState.currentState==='active'?'active':'background');
  React.useEffect(()=>{const sub=AppState.addEventListener('change',s=>setAppState(s==='active'?'active':'background'));return()=>sub.remove()},[]);

  const close=React.useCallback(async()=>{ try{await endCall(initialCallId);}catch{} try{pcRef.current?.close();}catch{} try{local?.getTracks?.().forEach((t:any)=>t.stop());}catch{} if(mounted.current) nexaGoBack(); },[initialCallId,local]);

  const postCandidate=React.useCallback((candidate:any)=>sendSignal(initialCallId,'candidate',candidate).catch(()=>{}),[initialCallId]);

  const setupPeer=React.useCallback(async(info:CallInfo,iceServers:any[])=>{
    const mod:any=require('react-native-webrtc');
    const PC=mod.RTCPeerConnection; const devices=mod.mediaDevices;
    if(!PC||!devices) throw new Error('Secure calling requires the NEXA native calling build.');
    const pc=new PC({iceServers}); pcRef.current=pc;
    const stream=await devices.getUserMedia({audio:true,video:info.media==='video'});
    stream.getTracks().forEach((track:any)=>pc.addTrack(track,stream));
    setLocal(stream);
    pc.ontrack=(event:any)=>{ if(event.streams?.[0]) setRemote(event.streams[0]); };
    pc.onicecandidate=(event:any)=>{ if(event.candidate) postCandidate(event.candidate.toJSON ? event.candidate.toJSON() : event.candidate); };
    pc.onconnectionstatechange=()=>{ const s=pc.connectionState; if(s==='connected') setStatus('connected'); else if(['failed','disconnected','closed'].includes(s)) setStatus('ended'); };
    return pc;
  },[postCandidate]);

  // B145: the callee hears a ringtone while the call is incoming; the caller hears a ringback while it rings.
  React.useEffect(()=>{
    if(status!=='incoming' && status!=='ringing') return; let sound:any=null; let cancelled=false;
    (async()=>{ try{
      await Audio.setAudioModeAsync({playsInSilentModeIOS:true,staysActiveInBackground:false,shouldDuckAndroid:false});
      const src=status==='incoming'?require('../assets/sounds/ringtone.wav'):require('../assets/sounds/ringback.wav');
      const created=await Audio.Sound.createAsync(src,{isLooping:true,shouldPlay:true,volume:status==='incoming'?1:0.6});
      if(cancelled){await created.sound.unloadAsync();return;} sound=created.sound;
    }catch{} })();
    return()=>{cancelled=true; try{sound?.stopAsync?.().then(()=>sound?.unloadAsync?.()).catch(()=>{});}catch{}};
  },[status]);

  React.useEffect(()=>{mounted.current=true; (async()=>{
    try{
      const initial=await getCall(initialCallId); if(!mounted.current)return;
      setCall(initial.call);
      if(['ended','declined','expired','missed'].includes(initial.call.status)){setStatus(initial.call.status);return;}
      if(initial.call.role==='callee' && initial.call.status==='ringing'){setStatus('incoming');return;}
      const pc=await setupPeer(initial.call,initial.iceServers||[]);
      if(initial.call.role==='caller'){
        const offer=await pc.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:initial.call.media==='video'});
        await pc.setLocalDescription(offer); await sendSignal(initialCallId,'offer',offer);
        setStatus('ringing');
      }
    }catch(e:any){if(mounted.current){setError(e?.message||'Could not start the call.');setStatus('error');}}
  })(); return()=>{mounted.current=false;try{pcRef.current?.close();}catch{}try{local?.getTracks?.().forEach((t:any)=>t.stop());}catch{};};},[initialCallId,setupPeer]);

  React.useEffect(()=>{ if(!call || !['ringing','active'].includes(call.status) || !isForeground(appState)) return; let used=0; let lastPollAt=Date.now(); const timer=setInterval(async()=>{
    if(!isForeground(appState) || !pollBudgetAllowed(used,120) || !shouldPoll({lifecycle:appState,lastPollAt,now:Date.now(),minIntervalMs:1000})) return; used+=1; lastPollAt=Date.now();
    try{
      const requestId=++pollRequest.current; const state=await getCall(initialCallId); if(!mounted.current || requestId!==pollRequest.current)return; setCall(state.call);
      if(['ended','declined','expired','missed'].includes(state.call.status)){setStatus(state.call.status);clearInterval(timer);return;}
      const data=await getSignals(initialCallId,lastSignal.current||undefined);
      for(const sig of data.signals){ lastSignal.current=sig.createdAt; if(sig.senderId===call.callerId && call.role==='caller') continue; const pc=pcRef.current; if(!pc) continue;
        if(sig.type==='offer' && call.role==='callee'){
          await pc.setRemoteDescription(sig.payload); for(const c of queuedCandidates.current){try{await pc.addIceCandidate(c);}catch{}} queuedCandidates.current=[];
          const answer=await pc.createAnswer(); await pc.setLocalDescription(answer); await sendSignal(initialCallId,'answer',answer); setStatus('connecting');
        } else if(sig.type==='answer' && call.role==='caller') { await pc.setRemoteDescription(sig.payload); setStatus('connecting'); for(const c of queuedCandidates.current){try{await pc.addIceCandidate(c);}catch{}} queuedCandidates.current=[];
        } else if(sig.type==='candidate') { if(pc.remoteDescription) {try{await pc.addIceCandidate(sig.payload);}catch{}} else queuedCandidates.current.push(sig.payload); }
      }
    }catch{}
  },700); return()=>clearInterval(timer);},[call,initialCallId]);

  const accept=async()=>{try{setStatus('connecting');const accepted=await acceptCall(initialCallId);setCall(accepted.call);await setupPeer(accepted.call,accepted.iceServers||[]);}catch(e:any){setError(e?.message||'Could not accept the call.');setStatus('error');}};
  const decline=async()=>{try{await declineCall(initialCallId);}catch{}nexaGoBack();};
  const toggleMute=()=>{const next=!muted;local?.getAudioTracks?.().forEach((t:any)=>{t.enabled=!next});setMuted(next);};
  const toggleCamera=()=>{const next=!cameraOff;local?.getVideoTracks?.().forEach((t:any)=>{t.enabled=!next});setCameraOff(next);};
  const flipCamera=()=>{const track=local?.getVideoTracks?.()?.[0];try{track?._switchCamera?.();}catch{}};

  const title=call?.with?.name||'NEXA Call';
  return <View style={styles.root}>
    {remote && call?.media==='video' ? <RTCView streamURL={remote.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" /> : <View style={styles.videoFallback}><Text style={styles.avatar}>{title.slice(0,1).toUpperCase()}</Text><Text style={styles.name}>{title}</Text><Text style={styles.status}>{status==='connected'?'Encrypted call':status==='ringing'?'Calling…':status==='incoming'?'Incoming call':status==='missed'?(call?.role==='caller'?'No answer':'Missed call'):status}</Text></View>}
    {local && call?.media==='video' ? <RTCView streamURL={local.toURL()} style={styles.self} objectFit="cover" zOrder={2} /> : null}
    <View style={styles.top}><Text style={styles.secure}>🔒 End-to-end encrypted media</Text><Text style={styles.media}>{call?.media==='video'?'Video call':'Voice call'}</Text></View>
    {error?<View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>:null}
    {status==='incoming'?<View style={styles.incoming}><NexaPressable accessibilityRole="button" accessibilityLabel="Decline call" style={styles.decline} onPress={decline}><Text style={styles.onSolid}>Decline</Text></NexaPressable><NexaPressable accessibilityRole="button" accessibilityLabel="Accept call" style={styles.accept} onPress={accept}><Text style={styles.onSolid}>Accept</Text></NexaPressable></View>:<><View style={styles.controls}><NexaPressable accessibilityRole="button" accessibilityLabel={muted?"Unmute microphone":"Mute microphone"} style={styles.control} onPress={toggleMute}><Text style={styles.dark}>{muted?'Unmute':'Mute'}</Text></NexaPressable>{call?.media==='video'?<><NexaPressable accessibilityRole="button" accessibilityLabel={cameraOff?"Turn camera on":"Turn camera off"} style={styles.control} onPress={toggleCamera}><Text style={styles.dark}>{cameraOff?'Camera on':'Camera off'}</Text></NexaPressable><NexaPressable accessibilityRole="button" accessibilityLabel="Flip camera" style={styles.control} onPress={flipCamera}><Text style={styles.dark}>Flip</Text></NexaPressable></>:null}</View><NexaPressable accessibilityRole="button" accessibilityLabel="End call" style={styles.end} onPress={close}><Text style={styles.endText}>End</Text></NexaPressable></>}
  </View>;
}

const styles=themedStyles(() => StyleSheet.create({root:{flex:1,backgroundColor:theme.colors.deepBlack},videoFallback:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:theme.colors.graphite},avatar:{width:92,height:92,borderRadius:46,backgroundColor:theme.colors.goldBright,color:theme.colors.deepBlack,textAlign:'center',textAlignVertical:'center',fontSize:44,fontWeight:'800'},name:{marginTop:18,color:theme.colors.ivoryText,fontSize:26,fontWeight:'800'},status:{marginTop:8,color:theme.colors.muted},top:{position:'absolute',top:56,left:18,right:18,alignItems:'center'},secure:{color:theme.colors.ivoryText,backgroundColor:tc('rgba(0,0,0,.65)'),paddingHorizontal:14,paddingVertical:8,borderRadius:20},media:{color:theme.colors.goldBright,marginTop:8,fontWeight:'800'},self:{position:'absolute',right:16,top:110,width:110,height:160,borderRadius:16},end:{position:'absolute',bottom:48,alignSelf:'center',width:76,height:76,borderRadius:38,backgroundColor:theme.colors.error,alignItems:'center',justifyContent:'center'},endText:{color:'#fff',fontWeight:'800'},controls:{position:'absolute',bottom:140,left:18,right:18,flexDirection:'row',justifyContent:'center',gap:8},control:{backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:theme.colors.borderGold,paddingHorizontal:16,paddingVertical:12,minHeight:44,borderRadius:24,alignItems:'center',justifyContent:'center'},incoming:{position:'absolute',bottom:48,left:24,right:24,flexDirection:'row',justifyContent:'space-between'},decline:{backgroundColor:theme.colors.error,paddingHorizontal:28,paddingVertical:16,minHeight:44,borderRadius:30,alignItems:'center',justifyContent:'center'},accept:{backgroundColor:currentThemeMode()==='light'?'#237A48':theme.colors.success,paddingHorizontal:28,paddingVertical:16,minHeight:44,borderRadius:30,alignItems:'center',justifyContent:'center'},dark:{color:tc('#000'),fontWeight:'900'},onSolid:{color:theme.colors.black,fontWeight:'900'},error:{position:'absolute',left:20,right:20,bottom:140,padding:12,borderRadius:12,backgroundColor:theme.colors.error},errorText:{color:'#fff',textAlign:'center'}}));

import { NexaPressable } from './motion';

import React, {useState} from 'react';
import {Text, View} from 'react-native';
import {router} from 'expo-router';
import {s} from '../../styles';
import {theme, ds} from '../../theme';
import {NexaFocusPressable} from '../../motion';
import {requestCentralActivationCode} from '../../api';
import {readActivationCodeReply, describeActivationCodeError} from '../../centralActivationCode';

/** V6.1.97 B543: the signed-in person asks for their AAMI Central activation code. It arrives in their own Zeeza inbox; this screen never shows it. */
export default function ActivationCode(){
  const [busy,setBusy]=useState(false);
  const [note,setNote]=useState('');
  const [sent,setSent]=useState(false);
  const send=async()=>{
    if(busy) return;
    setBusy(true); setNote('');
    try { const r=readActivationCodeReply(await requestCentralActivationCode()); setNote(r.message); setSent(r.ok); }
    catch(e:any){ const r=describeActivationCodeError(e); setNote(r.message); setSent(false); }
    finally { setBusy(false); }
  };
  return <View style={ds({flex:1,backgroundColor:theme.colors.background,padding:16})}>
    <Text style={s.section}>AAMI activation code</Text>
    <Text style={[s.muted,{marginTop:6}]}>Use this when your Administrative Director invitation is approved. We put a 6-digit code in your own Zeeza inbox. Nobody from NEXA will ever ask you for it.</Text>
    <NexaFocusPressable accessibilityRole="button" accessibilityLabel={busy?'Sending code':'Send my activation code'} disabled={busy} style={[s.button,{marginTop:16,opacity:busy?.65:1}]} onPress={send}><Text style={s.buttonText}>{busy?'Sending…':'Send my activation code'}</Text></NexaFocusPressable>
    {note?<Text accessibilityLiveRegion="polite" style={[s.muted,{marginTop:12}]}>{note}</Text>:null}
    {sent?<NexaFocusPressable accessibilityRole="button" accessibilityLabel="Open my Zeeza inbox" style={{paddingVertical:12,alignItems:'center'}} onPress={()=>{ try{router.push('/zeeza/inbox' as any);}catch{} }}><Text style={s.muted}>Open my Zeeza inbox</Text></NexaFocusPressable>:null}
  </View>;
}

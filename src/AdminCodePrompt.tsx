import React, {useState} from 'react';
import {Alert, Text, TextInput, View} from 'react-native';
import {router} from 'expo-router';
import {useAuth} from './auth';
import {s} from './styles';
import {theme, ds} from './theme';
import {NexaFocusPressable} from './motion';
import {normalizeAdminCode, isAdminCodeComplete} from './adminCodeEntry';

/** V6.1.93 B539 follow-up: the Zeeza sign-in code step for admin and Admin-staff users who sign in from the NEXA app.
 * The code arrives in the person's own Zeeza inbox. Until it is entered, the session carries no admin or staff power.
 */
export function AdminCodePrompt(){
  const {verifyAdminCode,signOut}=useAuth();
  const [code,setCode]=useState('');
  const [busy,setBusy]=useState(false);
  const [open,setOpen]=useState(true);
  const submit=async()=>{
    if(busy) return;
    if(!isAdminCodeComplete(code)){ Alert.alert('Sign-in code','Enter the 6 digits from your Zeeza inbox.'); return; }
    setBusy(true);
    try { await verifyAdminCode(code); setCode(''); }
    catch(e:any){ Alert.alert('Sign-in code',e?.message||'The code could not be checked. Try again.'); }
    finally { setBusy(false); }
  };
  const bar=ds({position:'absolute',left:0,right:0,bottom:0,zIndex:60,elevation:60,padding:14,backgroundColor:theme.colors.surface,borderTopWidth:1,borderColor:theme.colors.border});
  if(!open){
    return <View style={bar} pointerEvents="box-none"><NexaFocusPressable accessibilityRole="button" accessibilityLabel="Enter your Zeeza sign-in code" style={ds({minHeight:44,justifyContent:'center'})} onPress={()=>setOpen(true)}><Text style={ds({color:theme.colors.goldHot,fontWeight:'800'})}>Enter your sign-in code</Text></NexaFocusPressable></View>;
  }
  return <View style={bar}>
    <Text style={s.section}>Enter your sign-in code</Text>
    <Text style={[s.muted,{marginTop:4}]}>Admin and staff accounts need a 6-digit code. It is in your Zeeza inbox and works for five minutes.</Text>
    <TextInput value={code} onChangeText={t=>setCode(normalizeAdminCode(t))} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" returnKeyType="go" onSubmitEditing={submit} style={[s.authInput,{marginTop:10,letterSpacing:6,textAlign:'center'}]} accessibilityLabel="Zeeza sign-in code" placeholder="000000" placeholderTextColor={theme.colors.muted}/>
    <NexaFocusPressable accessibilityRole="button" accessibilityLabel={busy?'Checking code':'Confirm code'} disabled={busy} style={[s.button,{marginTop:12,opacity:busy?.65:1}]} onPress={submit}><Text style={s.btnText}>{busy?'Checking…':'Confirm code'}</Text></NexaFocusPressable>
    <NexaFocusPressable accessibilityRole="button" accessibilityLabel="Open my Zeeza inbox" style={{paddingVertical:10,alignItems:'center'}} onPress={()=>{setOpen(false); try{router.push('/zeeza/inbox' as any);}catch{}}}><Text style={{color:theme.colors.goldHot,fontWeight:'800'}}>Open my Zeeza inbox</Text></NexaFocusPressable>
    <NexaFocusPressable accessibilityRole="button" accessibilityLabel="Sign out" style={{paddingVertical:6,alignItems:'center'}} onPress={()=>{signOut();}}><Text style={{color:theme.colors.muted,fontWeight:'700'}}>Sign out</Text></NexaFocusPressable>
  </View>;
}

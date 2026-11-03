import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {useAuth} from '../../auth';
import {s} from '../../styles';
import {theme} from '../../theme';
import {getAdultConfirmation} from '../../ageGate';
import {NexaFocusPressable} from '../../motion';

export default function GoogleCallback(){
  const params=useLocalSearchParams<{code?:string;error?:string}>();
  const {completeGoogleSignIn}=useAuth();
  const [message,setMessage]=useState('Completing Google sign-in…');
  const [busy,setBusy]=useState(true);
  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        if(params.error) throw new Error('Google sign-in was cancelled or could not be completed.');
        const code=String(params.code||'');
        if(!code) throw new Error('Google sign-in did not return a valid code.');
        const ageConfirmed = await getAdultConfirmation();
        if(!ageConfirmed) throw new Error('NEXA is for users aged 18 and above. Children and anyone under 18 are not permitted.');
        await completeGoogleSignIn(code, true);
        router.replace('/(tabs)' as any);
      }catch(e:any){ if(active){setMessage(e?.message||'Google sign-in failed.');setBusy(false);} }
    })();
    return ()=>{active=false};
  },[params.code,params.error,completeGoogleSignIn]);
  return <View style={[s.wrap,{flex:1,justifyContent:'center',alignItems:'center'}]}><ActivityIndicator color={theme.colors.gold} size="large"/><Text style={[s.subtitle,{marginTop:16,textAlign:'center'}]}>{message}</Text>{!busy?<NexaFocusPressable accessibilityRole="button" accessibilityLabel="Back to sign in" style={[s.button,{marginTop:18,minWidth:180}]} onPress={()=>router.replace('/auth/login' as any)}><Text style={s.btnText}>Back to sign in</Text></NexaFocusPressable>:null}</View>;
}

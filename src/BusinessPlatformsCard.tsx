import React,{useEffect,useRef,useState} from 'react';
import {Alert,Text,TextInput,View} from 'react-native';
import {NexaPressable} from './motion';
import {s} from './styles';
import {ds,tc} from './theme';
import {authedFetch} from './api';
import {formatMajorCurrency} from './currencyDisplay';

// Shows which Business Hub platforms this account has, whether the one-time launch benefit
// was received, and lets the owner add a missing platform later. Launch benefits are decided
// once, at sign-up: a platform added later never gets one (the shop is paid entry only).
export function BusinessPlatformsCard({platforms,launchBenefit,businessName,register,openPayment,onDone,busy}:{platforms?:{shop:boolean;youtube:boolean};launchBenefit?:string;businessName?:string;register:(name:string,bio:string)=>Promise<any>;openPayment:(payment:any)=>Promise<void>;onDone:()=>void|Promise<void>;busy?:boolean}){
 const [channelUrl,setChannelUrl]=useState(''); const [shopName,setShopName]=useState(businessName||''); const [bio,setBio]=useState(''); const [working,setWorking]=useState(false);
 const mounted=useRef(true); useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const shop=platforms?platforms.shop!==false:true; const youtube=!!platforms?.youtube; const isBusy=working||!!busy;
 const addYouTube=async()=>{
  const url=channelUrl.trim(); if(!url)return Alert.alert('YouTube','Enter your YouTube channel URL.');
  setWorking(true);
  try{const r=await authedFetch('/api/business/youtube/register',{method:'POST',body:JSON.stringify({channelUrl:url,businessName})});setChannelUrl('');Alert.alert('YouTube',r?.syncPending?'Channel connected. First sync is waiting for YouTube access.':'Channel connected.');await onDone();}
  catch(e:any){Alert.alert('YouTube',e?.message||'Could not connect the channel.');}
  finally{if(mounted.current)setWorking(false);}
 };
 const addShop=async()=>{
  const name=(shopName||businessName||'').trim(); if(!name)return Alert.alert('Shop','Enter a shop name.');
  setWorking(true);
  try{const r=await register(name,bio.trim());if(r?.payment)await openPayment(r.payment);Alert.alert('Shop','Shop added. Complete the verified NGN payment, then tap Verify payment.');await onDone();}
  catch(e:any){Alert.alert('Shop',e?.message||'Could not add the shop.');}
  finally{if(mounted.current)setWorking(false);}
 };
 return <View style={s.card}>
  <Text style={s.section}>Your platforms</Text>
  <Text style={s.muted}>Shop: {shop?'added':'not added'}</Text>
  <Text style={s.muted}>YouTube: {youtube?'connected':'not added'}</Text>
  <Text style={[s.muted,{marginTop:6}]}>{launchBenefit==='received'?'Launch benefit: received at sign-up (30 days free shop access).':'Launch benefit: not received. Launch benefits are given once, at sign-up. Platforms added later have no launch benefit.'}</Text>
  {!youtube?<View style={ds({marginTop:12})}><Text style={s.section}>Add YouTube</Text><TextInput value={channelUrl} onChangeText={setChannelUrl} accessibilityLabel="YouTube channel URL to add" placeholder="https://youtube.com/@yourchannel" placeholderTextColor={tc('#9B907A')} autoCapitalize="none" style={s.authInput}/><NexaPressable disabled={isBusy} accessibilityRole="button" accessibilityLabel="Add YouTube to Business Hub" accessibilityState={{disabled:isBusy}} style={s.button} onPress={addYouTube}><Text style={s.buttonText}>{isBusy?'Please wait…':'Add YouTube'}</Text></NexaPressable></View>:null}
  {!shop?<View style={ds({marginTop:12})}><Text style={s.section}>Add a Shop</Text><Text style={s.muted}>Shop entry is {formatMajorCurrency(30000,'NGN','en-NG')}, paid once to start. There is no launch benefit after sign-up.</Text><TextInput value={shopName} onChangeText={setShopName} accessibilityLabel="Shop name to add" placeholder="Shop name" placeholderTextColor={tc('#9B907A')} style={s.authInput}/><TextInput value={bio} onChangeText={setBio} accessibilityLabel="Shop bio to add" placeholder="About your shop (optional)" placeholderTextColor={tc('#9B907A')} style={s.authInput}/><NexaPressable disabled={isBusy} accessibilityRole="button" accessibilityLabel="Add shop to Business Hub" accessibilityState={{disabled:isBusy}} style={s.button} onPress={addShop}><Text style={s.buttonText}>{isBusy?'Please wait…':'Add shop'}</Text></NexaPressable></View>:null}
 </View>;
}

import React,{useEffect,useRef,useState} from 'react';
import {Alert,Text,TextInput,View} from 'react-native';
import {NexaPressable} from './motion';
import {s} from './styles';
import {ds,tc} from './theme';
import {authedFetch} from './api';
import {formatMajorCurrency} from './currencyDisplay';

type Platform='shop'|'youtube';

// One uniform sign-up for Business Hub. The user enters the business details once,
// then picks the platforms they want. Existing server routes are reused unchanged:
//  - Shop:    POST /api/mall/vendor/register  (via the register prop)
//  - YouTube: POST /api/business/youtube/register
// Shop runs first on purpose: the shop route creates the vendor record and the launch
// benefit, and the YouTube route then attaches the channel to that same record.
export function BusinessHubSignup({register,openPayment,onDone,busy}:{register:(name:string,bio:string)=>Promise<any>;openPayment:(payment:any)=>Promise<void>;onDone:()=>void|Promise<void>;busy?:boolean}){
 const [businessName,setBusinessName]=useState(''); const [about,setAbout]=useState(''); const [channelUrl,setChannelUrl]=useState('');
 const [picked,setPicked]=useState<Platform[]>([]); const [working,setWorking]=useState(false);
 const mounted=useRef(true); useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const has=(p:Platform)=>picked.includes(p);
 const toggle=(p:Platform)=>setPicked(x=>x.includes(p)?x.filter(i=>i!==p):[...x,p]);
 const submit=async()=>{
  const name=businessName.trim(); const url=channelUrl.trim();
  if(!name)return Alert.alert('Business Hub','Enter your business name.');
  if(!picked.length)return Alert.alert('Business Hub','Pick at least one platform: Shop or YouTube.');
  if(has('youtube')&&!url)return Alert.alert('Business Hub','Enter your YouTube channel URL.');
  setWorking(true); const results:string[]=[]; 
  try{
   if(has('shop')){
    try{const r=await register(name,about.trim());if(r?.payment){await openPayment(r.payment);results.push('Shop: created. Payment is needed, then tap Verify payment.');}else results.push('Shop: created. Your 30-day launch benefit is active.');}
    catch(e:any){results.push(`Shop: ${e?.message||'could not be created.'}`);}
   }
   if(has('youtube')){
    try{const r=await authedFetch('/api/business/youtube/register',{method:'POST',body:JSON.stringify({channelUrl:url,businessName:name})});results.push(r?.syncPending?'YouTube: channel connected. First sync is waiting for YouTube access.':'YouTube: channel connected.');}
    catch(e:any){results.push(`YouTube: ${e?.message||'could not connect the channel.'}`);}
   }
   Alert.alert('Business Hub',results.join('\n\n'));
   await onDone();
  }finally{if(mounted.current)setWorking(false);}
 };
 const isBusy=working||!!busy;
 return <View style={s.card}>
  <Text style={s.section}>Sign up for Business Hub</Text>
  <Text style={s.muted}>Sign up once, then pick the platforms you want.</Text>
  <TextInput value={businessName} onChangeText={setBusinessName} accessibilityLabel="Business name" placeholder="Business name" placeholderTextColor={tc('#9B907A')} style={s.authInput}/>
  <TextInput value={about} onChangeText={setAbout} accessibilityLabel="About your business" placeholder="About your business (optional)" placeholderTextColor={tc('#9B907A')} style={s.authInput}/>
  <Text style={[s.section,{marginTop:12}]}>Pick your platforms</Text>
  <View style={ds({flexDirection:'row',gap:8,flexWrap:'wrap',marginTop:8})}>
   <NexaPressable accessibilityRole="checkbox" accessibilityLabel="Shop on Marketplace" accessibilityState={{checked:has('shop')}} style={has('shop')?s.button:s.buttonSecondary} onPress={()=>toggle('shop')}><Text style={s.buttonText}>{has('shop')?'✓ ':''}Shop</Text></NexaPressable>
   <NexaPressable accessibilityRole="checkbox" accessibilityLabel="YouTube creator channel" accessibilityState={{checked:has('youtube')}} style={has('youtube')?s.button:s.buttonSecondary} onPress={()=>toggle('youtube')}><Text style={s.buttonText}>{has('youtube')?'✓ ':''}YouTube</Text></NexaPressable>
  </View>
  {has('shop')?<Text style={[s.muted,{marginTop:10}]}>Shop: the first 10 successfully activated vendor accounts receive 30 days free. After that, vendor entry is {formatMajorCurrency(30000,'NGN','en-NG')}.</Text>:null}
  {has('youtube')?<><Text style={[s.muted,{marginTop:10}]}>YouTube: approved videos can appear in Yaayz. NEXA stores the YouTube reference.</Text><TextInput value={channelUrl} onChangeText={setChannelUrl} accessibilityLabel="YouTube channel URL" placeholder="https://youtube.com/@yourchannel" placeholderTextColor={tc('#9B907A')} autoCapitalize="none" style={s.authInput}/></>:null}
  <NexaPressable disabled={isBusy} accessibilityRole="button" accessibilityLabel="Sign up to Business Hub" accessibilityState={{disabled:isBusy}} style={[s.button,{marginTop:12}]} onPress={submit}><Text style={s.buttonText}>{isBusy?'Please wait…':'Sign up'}</Text></NexaPressable>
 </View>;
}

import React,{useEffect,useRef,useState} from 'react';
import {authedFetch} from './api';
import {ScrollView,Text,View} from 'react-native';
import {router} from 'expo-router';
import {s} from './styles';
import {theme, ds} from './theme';

const activities = [
 {title:'The Kitchen',icon:'🍴',description:'Order food, receive your illustrated AI receipt, and earn Kitchen referral Aami under SkyMoney.',path:'/leisure/kitchen'},
 {title:'Ball House',icon:'⚽',description:'Live football updates, fixtures, results, tables, football news and walk-in Ball House arena tickets.',path:'/leisure/ball-house'},
 {title:'Game House',icon:'🎮',description:'Gaming meetups, featured games, perks, community leaderboards and venue tickets — no game livestreams.',path:'/leisure/game-house'},
 {title:'Fitness',icon:'💪',description:'Workout and equipment-safety guides, gym wear discovery, and a directory of nearby gyms.',path:'/leisure/fitness'},
];
export function LeisureArenaScreen(){
 const [discovery,setDiscovery]=useState<any>(null); const requestRef=useRef(0);
 useEffect(()=>{const requestId=++requestRef.current; authedFetch("/api/leisure/discovery").then((d)=>{if(requestId===requestRef.current)setDiscovery(d)}).catch(()=>{}); return()=>{requestRef.current++};},[]);
 return <ScrollView style={s.wrap} contentContainerStyle={ds({paddingBottom:120})}>
  <Text style={s.title}>L.A. · Leisure Arena</Text>
  <Text style={s.subtitle}>Food, match days, gaming and fitness — connected through NEXA.</Text>
  {discovery?.upcomingTickets?.length?<View style={[s.card,{marginTop:14}]}><Text style={s.section}>Upcoming Yaayz tickets</Text>{discovery.upcomingTickets.slice(0,4).map((t:any)=><Text key={t.id} style={s.muted}>{t.title}{t.venue?` · ${t.venue}`:""}{t.startsAt?` · ${new Date(t.startsAt).toLocaleDateString()}`:""}</Text>)}</View>:null}
  {activities.map(a=><NexaPressable key={a.title} accessibilityRole="link" accessibilityLabel={`Open ${a.title} in Leisure Arena`} onPress={()=>router.push(a.path as any)} style={[s.card,{marginTop:14,minHeight:130,justifyContent:'center',borderWidth:1,borderColor:theme.colors.borderStrong}]}>
   <Text style={ds({fontSize:40})}>{a.icon}</Text><Text style={[s.section,{marginTop:7}]}>{a.title}</Text><Text style={s.muted}>{a.description}</Text>
  </NexaPressable>)}
 </ScrollView>;
}

import { NexaPressable } from './motion';

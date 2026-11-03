import { accessibilityGroup, actionHint } from './interactionAccessibility';
import React, { useMemo, useState } from 'react';
import {ImageBackground, Share, ScrollView, Text,  View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {s} from './styles';
import {ds, theme} from './theme';
import {YaayzNativeAd} from './YaayzNativeAd';
import {YaayzAdBoundary} from './YaayzAdBoundary';
import {NexaAnimatedView, NexaPressable} from './motion';
import { NexaLiveRegion } from './NexaLiveRegion';
import { YaayzSocialFeed } from './YaayzSocialFeed';
import { YaayzYoutubeFeed } from './YaayzYoutubeFeed';
import { formatMajorCurrency } from './currencyDisplay';

type FeedTicket = {id:string; title:string; type:string; providerName?:string; venue?:string; startsAt?:string; price:number; currency:string; availableQuantity:number};
type FeedAd = {id:string; title:string; body:string; advertiserName:string};
type FeedItem =
  | {kind:'hero'; id:string}
  | {kind:'filter'; id:string}
  | {kind:'quick-actions'; id:string}
  | {kind:'advert'; id:string; advert:FeedAd}
  | {kind:'ticket'; id:string; ticket:FeedTicket}
  | {kind:'native-ad'; id:string; index:number}
  | {kind:'ai'; id:string}
  | {kind:'featured'; id:string; ticket:FeedTicket};

type Props = {adverts:FeedAd[]; tickets:FeedTicket[]; onOpenAdverts:()=>void; onOpenTickets:()=>void; onAskDami?:()=>void};

const money=(n:number,c?:string)=>formatMajorCurrency(Number(n||0),c,'en');
const categories=['All','Events','Travel','Concerts','Stadium'];
const feedModes=['For You','Live','Saved'];
const extendedFeedModes=[...feedModes,'Interested'];
export const discoverySorts=['Smart','Soonest','Availability'];
export const interestFor=(id:string,interested:Record<string,boolean>)=>Boolean(interested[String(id)]);
export const recentTicketIds=(ids:string[],limit=6)=>Array.from(new Set(ids.map(String))).slice(-Math.max(1,limit));
export const feedModeFor=(mode:string,tickets:FeedTicket[],saved:Record<string,boolean>)=>{
 if(mode==='Live') return tickets.filter(t=>isLiveNow(t.startsAt));
 if(mode==='Saved') return tickets.filter(t=>Boolean(saved[String(t.id)]));
 return tickets;
};
export const sceneAccentFor=(type:string)=>{const k=type.toLowerCase(); if(k==='concert') return 'LIVE'; if(k==='stadium') return 'MATCH'; if(['bus','airplane','train','ferry'].includes(k)) return 'JOURNEY'; return 'DISCOVER';};
const categoryMatch=(ticket:FeedTicket,category:string)=>category==='All'||(category==='Events'&&['event','concert'].includes(ticket.type))||(category==='Travel'&&['bus','airplane','train','ferry'].includes(ticket.type))||(category==='Concerts'&&ticket.type==='concert')||(category==='Stadium'&&ticket.type==='stadium');

export const discoveryCategories=['All','Events','Travel','Concerts','Stadium'];
export const contextForHour=(hour:number)=>hour<6?'LATE NIGHT':hour<12?'THIS MORNING':hour<17?'THIS AFTERNOON':hour<22?'TONIGHT':'LATE NIGHT';
export const isLiveNow=(startsAt?:string)=>{if(!startsAt)return false; const t=Date.parse(startsAt); if(!Number.isFinite(t))return false; const delta=Math.abs(Date.now()-t); return delta<=90*60*1000;};
export const availabilityTone=(quantity:number)=>quantity<=0?'SOLD OUT':quantity<=5?'ALMOST GONE':quantity<=20?'LIMITED':'AVAILABLE';
export const destinationFor=(ticket:FeedTicket)=>ticket.venue||ticket.providerName||ticket.type;

/** B61 feed composer: deterministic, bounded, deduplicated and presentation-only. */
export function composeYaayzFeed(adverts:FeedAd[],tickets:FeedTicket[],category='All'):FeedItem[]{
 const seen=new Set<string>();
 const filtered=tickets.filter(t=>{const id=String(t.id); if(seen.has(id)||!categoryMatch(t,category)) return false; seen.add(id); return true;})
   .slice().sort((a,b)=>{
     const available=(b.availableQuantity||0)-(a.availableQuantity||0);
     if(available!==0) return available;
     const at=a.startsAt?Date.parse(a.startsAt):Number.MAX_SAFE_INTEGER;
     const bt=b.startsAt?Date.parse(b.startsAt):Number.MAX_SAFE_INTEGER;
     return at-bt;
   });
 const uniqueAdverts=adverts.filter((a,i,self)=>self.findIndex(x=>String(x.id)===String(a.id))===i);
 const advertSlice=uniqueAdverts.slice(0,3); const ticketSlice=filtered.slice(0,4);
 const out:FeedItem[]=[{kind:'hero',id:'hero'},{kind:'filter',id:'filter'},{kind:'quick-actions',id:'quick-actions'}];
 if(ticketSlice[0]) out.push({kind:'featured',id:`featured:${ticketSlice[0].id}`,ticket:ticketSlice[0]});
 if(advertSlice[0]) out.push({kind:'advert',id:`advert:${advertSlice[0].id}`,advert:advertSlice[0]});
 if(ticketSlice[0]) out.push({kind:'ticket',id:`ticket:${ticketSlice[0].id}`,ticket:ticketSlice[0]});
 out.push({kind:'native-ad',id:'native:0',index:0});
 if(ticketSlice[1]) out.push({kind:'ticket',id:`ticket:${ticketSlice[1].id}`,ticket:ticketSlice[1]});
 if(advertSlice[1]) out.push({kind:'advert',id:`advert:${advertSlice[1].id}`,advert:advertSlice[1]});
 out.push({kind:'native-ad',id:'native:1',index:1});
 if(ticketSlice[2]) out.push({kind:'ticket',id:`ticket:${ticketSlice[2].id}`,ticket:ticketSlice[2]});
 if(advertSlice[2]) out.push({kind:'advert',id:`advert:${advertSlice[2].id}`,advert:advertSlice[2]});
 out.push({kind:'native-ad',id:'native:2',index:2});
 if(ticketSlice[3]) out.push({kind:'ticket',id:`ticket:${ticketSlice[3].id}`,ticket:ticketSlice[3]});
 out.push({kind:'ai',id:'ai-discovery'}); return out;
}

const sceneFor=(type:string)=>{
 const key=type.toLowerCase();
 if(['concert','event'].includes(key)) return {eyebrow:'LIVE EXPERIENCE',title:'Make tonight count',icon:'🎶',copy:'Discover something worth leaving home for.',image:require('../assets/worlds/game_house_world.jpg')};
 if(key==='stadium') return {eyebrow:'MATCHDAY',title:'Feel the crowd',icon:'🏟️',copy:'Find the next stadium experience.',image:require('../assets/worlds/ball_house_world.jpg')};
 if(['bus','airplane','train','ferry'].includes(key)) return {eyebrow:'GO SOMEWHERE',title:'Your next route starts here',icon:'✈️',copy:'Explore journeys and travel inventory.',image:require('../assets/worlds/dream_marketplace_world.jpg')};
 return {eyebrow:'DISCOVER',title:'Something is happening',icon:'✨',copy:'Explore what Yaayz has surfaced for you.',image:require('../assets/worlds/zeeza_world.jpg')};
};

const heroFor=(category:string,hour:number)=>{
 const context=contextForHour(hour);
 if(category==='Travel') return {eyebrow:'YAAYZ · JOURNEYS',title:'Go somewhere unforgettable.',copy:'Routes, trips and experiences surfaced in one living stream.',image:require('../assets/worlds/dream_marketplace_world.jpg')};
 if(category==='Concerts') return {eyebrow:'YAAYZ · LIVE',title:'Turn the volume up.',copy:'Find concerts and live moments worth showing up for.',image:require('../assets/worlds/game_house_world.jpg')};
 if(category==='Stadium') return {eyebrow:'YAAYZ · MATCHDAY',title:'Feel the crowd.',copy:'Discover stadium experiences and matchday moments.',image:require('../assets/worlds/ball_house_world.jpg')};
 if(category==='Events') return {eyebrow:'YAAYZ · EVENTS',title:'Make a plan worth remembering.',copy:'Events, experiences and things happening around you.',image:require('../assets/worlds/kitchen_world.jpg')};
 return {eyebrow:`YAAYZ · ${context}`,title:context==='TONIGHT'?'Find something worth going out for.':'Find your next experience.',copy:'A living stream of events, journeys, offers and clearly labelled sponsored discoveries.',image:require('../assets/worlds/dream_marketplace_world.jpg')};
};

export function YaayzHomeFeed({adverts,tickets,onOpenAdverts,onOpenTickets,onAskDami}:Props){
 const [category,setCategory]=useState('All'); const [saved,setSaved]=useState<Record<string,boolean>>({}); const [interested,setInterested]=useState<Record<string,boolean>>({}); const [recent,setRecent]=useState<string[]>([]); const [feedMode,setFeedMode]=useState('For You'); const [sort,setSort]=useState('Smart');
 const currentHour=new Date().getHours(); const items=useMemo(()=>composeYaayzFeed(adverts,tickets,category),[adverts,tickets,category]); const hero=heroFor(category,currentHour);
 const savedCount=Object.values(saved).filter(Boolean).length;
 const modeTickets=feedModeFor(feedMode,tickets,saved).filter(t=>feedMode!=='Interested'||interestFor(t.id,interested));
 const visibleTickets=feedMode==='For You'?modeTickets:modeTickets.filter(t=>categoryMatch(t,category));
 const liveCount=tickets.filter(t=>isLiveNow(t.startsAt)).length;
 const toggleSave=(id:string)=>{setSaved(v=>({...v,[id]:!v[id]}));setRecent(v=>recentTicketIds([...v,id]));};
 const toggleInterested=(id:string)=>{setInterested(v=>({...v,[id]:!v[id]}));setRecent(v=>recentTicketIds([...v,id]));};
 const markViewed=(id:string)=>setRecent(v=>recentTicketIds([...v,id]));
 const sortedVisibleTickets=useMemo(()=>{const base=[...visibleTickets]; if(sort==='Soonest') return base.sort((a,b)=>Date.parse(a.startsAt||'')-Date.parse(b.startsAt||'')); if(sort==='Availability') return base.sort((a,b)=>(a.availableQuantity||0)-(b.availableQuantity||0)); return base;},[visibleTickets,sort]);
 const share=async(title:string)=>{try{await Share.share({message:`Discover ${title} on Yaayz inside NEXA.`});}catch{}};
 const discoveryActions=[['🎟️','Tickets',onOpenTickets],['✨','Offers',onOpenAdverts],['🤖','Ask Dami',onAskDami||(()=>{})]] as const;
 const discoveryStories=[['⚡','Live now'],['🎶','Tonight'],['✈️','Journeys'],['🏟️','Matchday'],['✨','Fresh picks'],['💫','For You']] as const;
 const liveMessage = `${feedMode} Yaayz feed, ${category} category, ${items.length} item${items.length === 1 ? "" : "s"}.`;
 return <View accessibilityLabel={`Yaayz discovery feed, ${category} category, ${items.length} items`}><NexaLiveRegion message={liveMessage} label="Yaayz discovery status" />
   <YaayzSocialFeed />
   <YaayzYoutubeFeed />
   <View {...accessibilityGroup("Yaayz discovery sorting")} accessibilityRole="tablist" style={ds({flexDirection:'row',gap:8,marginBottom:10})}>{discoverySorts.map(x=><NexaPressable accessibilityRole="tab" accessibilityLabel={`Sort Yaayz by ${x}`} key={x} onPress={()=>setSort(x)} accessibilityState={{selected:sort===x}} {...actionHint(`Sort Yaayz by ${x}`)} style={[s.pill,sort===x&&s.pillActive]}><Text style={s.pillText}>{x}</Text></NexaPressable>)}</View>
   {feedMode!=='For You'&&<View style={ds({marginBottom:10})} accessibilityLabel={`Yaayz feed mode ${feedMode}`}><Text style={s.muted}>{feedMode==='Live'?'Live experiences surfaced from the current ticket inventory.':feedMode==='Saved'?`${savedCount} saved experience${savedCount===1?'':'s'} in this feed.`:feedMode==='Interested'?`${Object.values(interested).filter(Boolean).length} experience${Object.values(interested).filter(Boolean).length===1?'':'s'} marked interested in this local session.`:'Your discovery feed.'}</Text></View>}
   {feedMode!=='For You' && sortedVisibleTickets.length>0 && <View style={ds({marginBottom:12})}><Text style={s.section}>Mode results</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds({gap:10,paddingVertical:6})}>{sortedVisibleTickets.slice(0,6).map(t=><NexaPressable accessibilityRole="button" accessibilityLabel={`Open ${t.title}`} key={`mode:${t.id}`} onPress={()=>markViewed(String(t.id))} style={[s.card,{width:250}]}><Text style={ds({color:theme.colors.goldBright,fontWeight:'900'})}>{sceneAccentFor(t.type)}</Text><Text style={s.section}>{t.title}</Text><Text style={s.muted}>{destinationFor(t)} · {availabilityTone(t.availableQuantity)}</Text><View style={ds({flexDirection:'row',gap:8,marginTop:8})}><NexaPressable onPress={()=>toggleInterested(String(t.id))} accessibilityRole="switch" accessibilityLabel={`${interestFor(String(t.id),interested)?'Remove interest from':'Mark interest in'} ${t.title}`} accessibilityState={{checked:interestFor(String(t.id),interested)}} style={[s.smallButton,{minHeight:44,minWidth:44}]}><Text style={s.buttonText}>{interestFor(String(t.id),interested)?'Interested ✓':'Interested'}</Text></NexaPressable><NexaPressable onPress={()=>toggleSave(String(t.id))} accessibilityRole="switch" accessibilityLabel={`${saved[String(t.id)]?'Remove saved ticket':'Save ticket'} ${t.title}`} accessibilityState={{checked:Boolean(saved[String(t.id)])}} style={[s.smallButton,{minHeight:44,minWidth:44}]}><Text style={s.buttonText}>{saved[String(t.id)]?'Saved ✓':'Save'}</Text></NexaPressable></View></NexaPressable>)}</ScrollView></View>}
   {recent.length>0 && <View style={ds({marginBottom:12})} accessibilityLabel="Recently viewed Yaayz discoveries"><Text style={s.section}>Recently viewed</Text><Text style={s.muted}>{recent.length} discovery{recent.length===1?'':'ies'} in your local session.</Text></View>}
   {items.map((item,index)=>{
     if(item.kind==='hero') return <NexaAnimatedView key={item.id} motion="card-enter" minLevel={30} delay={0}>
       <ImageBackground source={hero.image} imageStyle={{opacity:0.72}} style={[s.card,{padding:0,overflow:'hidden',minHeight:350,justifyContent:'flex-end'}]} accessibilityLabel={`${hero.eyebrow} Yaayz discovery hero`}>
         <LinearGradient colors={['rgba(0,0,0,0.05)','rgba(0,0,0,0.96)']} style={ds({minHeight:350,padding:22,justifyContent:'flex-end'})}>
           <Text style={ds({color:theme.colors.goldBright,fontSize:15,fontWeight:'900',letterSpacing:2})}>{hero.eyebrow}</Text>
           <Text style={[s.title,{marginTop:8,fontSize:36,lineHeight:40,color:'#FFF8E7',textShadowColor:'rgba(0,0,0,0.55)',textShadowOffset:{width:0,height:1},textShadowRadius:4}]}>{hero.title}</Text>
           <Text style={[s.muted,{marginTop:8,lineHeight:21,color:'#E8E0CF',textShadowColor:'rgba(0,0,0,0.5)',textShadowOffset:{width:0,height:1},textShadowRadius:3}]}>{hero.copy}</Text>
           <View style={ds({flexDirection:'row',gap:8,marginTop:16})}>
             <NexaPressable accessibilityLabel="Explore Yaayz tickets" onPress={onOpenTickets} style={[s.smallButton,{minHeight:44,minWidth:44}]}><Text style={s.buttonText}>Explore tickets</Text></NexaPressable>
             <NexaPressable accessibilityLabel="Open Yaayz adverts" onPress={onOpenAdverts} style={[s.smallButton,{backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:theme.colors.borderStrong}]}><Text style={[s.buttonText,{color:theme.colors.text}]}>Offers</Text></NexaPressable>
           </View>
         </LinearGradient>
       </ImageBackground>
     </NexaAnimatedView>;
     if(item.kind==='filter') return <View key={item.id} style={ds({marginVertical:12})} accessibilityLabel="Yaayz discovery categories">
       <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel="Yaayz ticket categories" contentContainerStyle={ds({gap:8})}>{categories.map(c=><NexaPressable key={c} accessibilityRole="tab" accessibilityLabel={`Show Yaayz ${c} category`} accessibilityState={{selected:category===c}} onPress={()=>setCategory(c)} style={[s.pill,category===c&&s.pillActive,{marginRight:0}]}><Text style={s.pillText}>{c}</Text></NexaPressable>)}</ScrollView>
     </View>;
     if(item.kind==='quick-actions') return <View key={item.id} style={ds({marginBottom:12})} accessibilityLabel="Yaayz quick actions">
       <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel="Yaayz feed modes" contentContainerStyle={ds({gap:8,marginBottom:10})}>{extendedFeedModes.map(m=><NexaPressable key={m} accessibilityRole="tab" accessibilityLabel={`Show Yaayz ${m} feed`} accessibilityState={{selected:feedMode===m}} onPress={()=>setFeedMode(m)} style={[s.pill,feedMode===m&&s.pillActive]}><Text style={s.pillText}>{m}{m==='Live'&&liveCount>0?` · ${liveCount}`:''}</Text></NexaPressable>)}</ScrollView>
       <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel="Yaayz discovery stories" contentContainerStyle={ds({gap:8,marginBottom:10})}>{discoveryStories.map(([icon,label])=><NexaPressable key={label} accessibilityRole="tab" accessibilityLabel={`Discovery story ${label}`} onPress={()=>label==='Live now'?setFeedMode('Live'):setCategory(label==='Journeys'?'Travel':label==='Matchday'?'Stadium':label==='Tonight'?'Concerts':'All')} style={[s.card,{width:92,minHeight:68,padding:9,justifyContent:'center',alignItems:'center',marginBottom:0}]}><Text style={ds({fontSize:22})}>{icon}</Text><Text style={[s.muted,{fontSize:15,marginTop:4}]}>{label}</Text></NexaPressable>)}</ScrollView>
       <View style={ds({flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8})}><Text style={s.section}>Your discovery shortcuts</Text>{savedCount>0?<Text style={s.muted}>{savedCount} saved</Text>:null}</View>
       <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds({gap:8})}>
         {discoveryActions.map(([icon,label,action])=><NexaPressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={action} style={[s.card,{width:112,minHeight:82,padding:10,justifyContent:'center',alignItems:'center',marginBottom:0}]}><Text style={ds({fontSize:24})}>{icon}</Text><Text style={ds({color:theme.colors.text,fontSize:14,fontWeight:'800',marginTop:5})}>{label}</Text></NexaPressable>)}
       </ScrollView>
     </View>;
     if(item.kind==='featured') { const t=item.ticket; if(feedMode!=='For You' && !visibleTickets.some(v=>String(v.id)===String(t.id))) return null; const scene=sceneFor(t.type); return <NexaAnimatedView key={item.id} motion="expand" minLevel={50} delay={20}><View style={[s.card,{padding:0,overflow:'hidden',borderColor:theme.colors.goldBright}]} accessibilityLabel={`Featured Yaayz discovery ${t.title}`}><ImageBackground source={scene.image} imageStyle={{opacity:0.5}} style={ds({minHeight:220,justifyContent:'flex-end'})}><LinearGradient colors={['rgba(0,0,0,0.02)','rgba(0,0,0,0.94)']} style={ds({padding:18})}><Text style={ds({color:theme.colors.goldBright,fontSize:14,fontWeight:'900',letterSpacing:1.8})}>FEATURED DISCOVERY · {scene.eyebrow}</Text><Text style={ds({color:theme.colors.text,fontSize:14,fontWeight:'900',marginTop:7,letterSpacing:1})}>{availabilityTone(t.availableQuantity)}{isLiveNow(t.startsAt)?' · ● LIVE NOW':''} · {destinationFor(t)}</Text><Text style={[s.title,{fontSize:29,lineHeight:32,marginTop:7}]}>{t.title}</Text><Text style={[s.muted,{marginTop:5}]}>{scene.copy}</Text><View style={ds({flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:12})}><Text style={s.title}>{money(t.price,t.currency)}</Text><NexaPressable accessibilityRole="button" accessibilityLabel={`View featured ${t.title}`} onPress={onOpenTickets} style={[s.smallButton,{minHeight:44,minWidth:44}]}><Text style={s.buttonText}>Explore</Text></NexaPressable></View></LinearGradient></ImageBackground></View></NexaAnimatedView>; }
     if(item.kind==='native-ad') return <NexaAnimatedView key={item.id} motion="card-enter" minLevel={30} delay={index*10}><View accessibilityLabel={`Sponsored Google ad ${item.index+1}`} style={ds({marginVertical:6})}><YaayzAdBoundary><YaayzNativeAd index={item.index}/></YaayzAdBoundary></View></NexaAnimatedView>;
     if(item.kind==='ai') return <NexaAnimatedView key={item.id} motion="expand" minLevel={60} delay={40}><View style={[s.card,{borderColor:theme.colors.goldBright,backgroundColor:theme.colors.surfaceElevated}]}>
       <Text style={ds({color:theme.colors.goldBright,fontSize:15,fontWeight:'900',letterSpacing:1.5})}>DAMI · DISCOVERY ASSIST</Text><Text style={[s.section,{marginTop:7}]}>Not sure what to do next?</Text><Text style={[s.muted,{marginTop:5,lineHeight:20}]}>Ask Dami to turn your mood, time and destination into a Yaayz discovery.</Text><NexaPressable accessibilityRole="button" accessibilityLabel="Ask Dami for a Yaayz discovery" onPress={onAskDami} style={[s.smallButton,{marginTop:12,alignSelf:'flex-start'}]}><Text style={s.buttonText}>Ask Dami</Text></NexaPressable>
     </View></NexaAnimatedView>;
     if(item.kind==='advert') return <NexaAnimatedView key={item.id} motion="card-enter" minLevel={30} delay={index*12}><View style={[s.card,{borderColor:theme.colors.goldBright,overflow:'hidden'}]}>
       <Text style={ds({color:theme.colors.goldBright,fontSize:15,fontWeight:'900',letterSpacing:1})}>YAAYZADVERT · SPONSORED</Text><Text style={[s.section,{marginTop:7,fontSize:23}]}>{item.advert.title}</Text><Text style={[s.muted,{marginTop:2}]}>by {item.advert.advertiserName}</Text><Text style={[s.muted,{marginTop:8,lineHeight:20}]}>{item.advert.body}</Text><View style={ds({flexDirection:'row',gap:8,marginTop:12})}><NexaPressable accessibilityRole="button" accessibilityLabel="Explore sponsored offer" onPress={onOpenAdverts} style={[s.smallButton,{minHeight:44,minWidth:44}]}><Text style={s.buttonText}>Explore offer</Text></NexaPressable><NexaPressable accessibilityRole="button" accessibilityLabel={`Share ${item.advert.title}`} onPress={()=>share(item.advert.title)} style={[s.smallButton,{backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:theme.colors.borderStrong}]}><Text style={[s.buttonText,{color:theme.colors.text}]}>Share</Text></NexaPressable></View>
     </View></NexaAnimatedView>;
     const t=item.ticket; if(feedMode!=='For You' && !visibleTickets.some(v=>String(v.id)===String(t.id))) return null; const scene=sceneFor(t.type); const isSaved=!!saved[t.id];
     return <NexaAnimatedView key={item.id} motion="card-enter" minLevel={30} delay={index*12}><View style={[s.card,{padding:0,overflow:'hidden',borderColor:isSaved?theme.colors.goldBright:theme.colors.borderQuiet}]}>
       <ImageBackground source={scene.image} imageStyle={{opacity:0.24}} style={ds({overflow:'hidden'})} accessibilityLabel={`${scene.eyebrow} ${t.title}`}>
         <LinearGradient colors={['rgba(0,0,0,0.18)','rgba(0,0,0,0.84)']} style={ds({padding:18})}>
           <View style={ds({flexDirection:'row',justifyContent:'space-between',alignItems:'center'})}><Text style={ds({color:theme.colors.goldBright,fontSize:15,fontWeight:'900',letterSpacing:1.3})}>{scene.eyebrow} · DISCOVERY</Text><Text style={ds({fontSize:27})}>{scene.icon}</Text></View><View style={ds({flexDirection:'row',gap:7,marginTop:7,flexWrap:'wrap'})}><Text style={ds({color:theme.colors.text,fontSize:14,fontWeight:'900',letterSpacing:1})}>{availabilityTone(t.availableQuantity)}</Text>{isLiveNow(t.startsAt)?<Text style={ds({color:theme.colors.goldBright,fontSize:14,fontWeight:'900',letterSpacing:1})}>● LIVE NOW</Text>:null}<Text style={ds({color:theme.colors.muted,fontSize:14,fontWeight:'800'})}>{destinationFor(t)}</Text></View>
           <Text style={[s.section,{marginTop:8,fontSize:24}]}>{t.title}</Text>{t.providerName?<Text style={[s.muted,{marginTop:2}]}>{t.providerName}</Text>:null}{t.venue?<Text style={s.muted}>{t.venue}</Text>:null}{t.startsAt?<Text style={[s.muted,{marginTop:6}]}>{new Date(t.startsAt).toLocaleString()}</Text>:null}<Text style={[s.muted,{marginTop:8,lineHeight:19}]}>{scene.copy}</Text>
           <View style={ds({flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',marginTop:14})}><View><Text style={s.title}>{money(t.price,t.currency)}</Text><Text style={s.muted}>{t.availableQuantity} available</Text></View><View style={ds({flexDirection:'row',gap:7})}><NexaPressable accessibilityRole="switch" accessibilityLabel={isSaved?'Remove saved ticket':'Save ticket'} accessibilityState={{checked:isSaved}} onPress={()=>toggleSave(t.id)} style={[s.smallButton,{backgroundColor:isSaved?theme.colors.goldBright:theme.colors.surfaceElevated,borderWidth:1,borderColor:theme.colors.borderStrong}]}><Text style={[s.buttonText,{color:isSaved?'#000':theme.colors.text}]}>{isSaved?'Saved':'Save'}</Text></NexaPressable><NexaPressable accessibilityRole="button" accessibilityLabel={`Share ${t.title}`} onPress={()=>share(t.title)} style={[s.smallButton,{backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:theme.colors.borderStrong}]}><Text style={[s.buttonText,{color:theme.colors.text}]}>Share</Text></NexaPressable><NexaPressable accessibilityRole="button" accessibilityLabel={`View ${t.title}`} onPress={onOpenTickets} style={[s.smallButton,{minHeight:44,minWidth:44}]}><Text style={s.buttonText}>View</Text></NexaPressable></View></View>
         </LinearGradient>
       </ImageBackground>
     </View></NexaAnimatedView>;
   })}
   {items.filter(x=>x.kind==='ticket'||x.kind==='featured').length===0 && <View style={[s.card,{marginTop:8}]} accessibilityLabel="No Yaayz discovery results"><Text style={s.section}>Nothing surfaced yet</Text><Text style={[s.muted,{marginTop:5,lineHeight:20}]}>There is no matching inventory in this category right now. Try another discovery category or check back later.</Text><NexaPressable accessibilityRole="button" accessibilityLabel="Show all Yaayz discovery categories" onPress={()=>setCategory('All')} style={[s.smallButton,{marginTop:12,alignSelf:'flex-start'}]}><Text style={s.buttonText}>Show all</Text></NexaPressable></View>}
 </View>;
}

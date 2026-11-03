import React,{useEffect,useState} from 'react';
import {Image,Text,View} from 'react-native';
import {NexaPressable} from './motion';
import {s} from './styles';
import {ds,theme} from './theme';
import {authedFetch} from './api';
import {openExternalUrl} from './safeExternalNavigation';

const YOUTUBE_HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','youtu.be']);
type Video={id:string;title:string;description?:string;thumbnailUrl?:string;videoUrl:string;durationSeconds:number;contentType:'short'|'long';qualifiedViews:number;activeUntil:string};
export function YaayzYoutubeFeed(){
 const [videos,setVideos]=useState<Video[]>([]); const [error,setError]=useState(''); const [autoplay,setAutoplay]=useState(true); const [integration,setIntegration]=useState<any>(null);
 const load=async()=>{try{const r=await authedFetch('/api/yaayz/youtube/feed?limit=12');setVideos(r.videos||[]);setAutoplay(r.preferences?.autoplayVideos!==false);setIntegration(r.integration||null);setError('');}catch(e:any){setError(e?.message||'Creator videos are unavailable.');}};
 useEffect(()=>{load();},[]);
 const watch=async(v:Video)=>{try{await authedFetch(`/api/yaayz/youtube/videos/${encodeURIComponent(v.id)}/view`,{method:'POST',body:JSON.stringify({watchMs:3000})});}catch{} await openExternalUrl(v.videoUrl,YOUTUBE_HOSTS);};
 return <View accessibilityLabel="Yaayz creator videos" style={ds({marginTop:12})}>
   <View style={ds({flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8})}><View><Text style={s.section}>Creator Videos</Text><Text style={s.muted}>Learn, watch and discover approved YouTube content.</Text><Text style={[s.muted,{marginTop:4}]}>Autoplay {autoplay?'ON':'OFF'} · YouTube playback stays source-controlled by YouTube.</Text>{integration&&!integration.configured?<Text style={[s.muted,{marginTop:4}]}>Live creator videos are not available yet. Check back soon.</Text>:null}</View><NexaPressable accessibilityRole="button" accessibilityLabel="Refresh creator videos" onPress={load}><Text style={{color:theme.colors.goldBright,fontWeight:'800'}}>Refresh</Text></NexaPressable></View>
   {error?<Text style={s.muted}>{error}</Text>:videos.map(v=><View key={v.id} style={[s.card,{padding:0,overflow:'hidden',marginBottom:10}]}>
      {v.thumbnailUrl?<Image source={{uri:v.thumbnailUrl}} accessibilityLabel={`Thumbnail for ${v.title}`} style={ds({width:'100%',height:190,backgroundColor:theme.colors.surface})}/>:null}
      <View style={ds({padding:14})}><Text style={ds({color:theme.colors.goldBright,fontSize:14,fontWeight:'900',letterSpacing:1.2})}>YAAYZ · {v.contentType==='short'?'SHORT':'FEATURE'}</Text><Text style={[s.section,{marginTop:6}]} numberOfLines={2}>{v.title}</Text><Text style={[s.muted,{marginTop:5}]} numberOfLines={3}>{v.description||'Approved creator content.'}</Text><Text style={[s.muted,{marginTop:5}]}>Qualified views: {Number(v.qualifiedViews||0).toLocaleString()} · active until {new Date(v.activeUntil).toLocaleDateString()}</Text><NexaPressable accessibilityRole="button" accessibilityLabel={`Watch ${v.title} on YouTube`} style={[s.button,{marginTop:10}]} onPress={()=>watch(v)}><Text style={s.buttonText}>Watch on YouTube</Text></NexaPressable></View>
   </View>)}
   {!error&&!videos.length?<Text style={s.muted}>No approved creator videos are live yet.</Text>:null}
 </View>;
}

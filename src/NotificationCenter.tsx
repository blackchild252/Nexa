import { NexaPressable } from './motion';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { authedFetch } from "./api";
import { s } from "./styles";
import { theme, tc, ds } from './theme';
import { NexaDataState } from './NexaDataState';
import { NexaLiveRegion } from './NexaLiveRegion';

type NotificationItem = { id:string; title:string; body:string; type:string; data:Record<string,any>; createdAt:string; readAt:string|null };
const FILTERS = ["all","money","marketplace","social","chat","yaayz","leisure","extension","system"] as const;
type Filter = typeof FILTERS[number];

function fmtTime(iso:string) {
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
  return d.toLocaleDateString([], {month:"short", day:"numeric"});
}
function label(type:string) { if (type === "all") return "All"; if (type === "money") return "Sky Money"; if (type === "marketplace") return "Dream Marketplace"; if (type === "social") return "Zeeza"; if (type === "chat") return "Inbox"; if (type === "leisure") return "L.A."; if (type === "extension") return "Extensions"; return type.charAt(0).toUpperCase()+type.slice(1); }

export function NotificationCenter({ onClose, onNavigate }:{ onClose?:()=>void; onNavigate?:(data:Record<string,any>)=>void }) {
  const [items,setItems]=useState<NotificationItem[]>([]);
  const [unread,setUnread]=useState(0);
  const [unreadByType,setUnreadByType]=useState<Record<string,number>>({});
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState("");
  const [filter,setFilter]=useState<Filter>("all");
  const [pushEnabled,setPushEnabled]=useState(true);
  const [savingPrefs,setSavingPrefs]=useState(false); const [markingAll,setMarkingAll]=useState(false); const [readingId,setReadingId]=useState<string|null>(null);
  const loadRequest=useRef(0);
  const preferenceRequest=useRef(0);
  const readRequest=useRef(0);
  const readAllRequest=useRef(0);

  const load=useCallback(async()=>{
    const requestId=++loadRequest.current;
    setError("");
    try {
      const query = filter === "all" ? "" : `&type=${encodeURIComponent(filter)}`;
      const data=await authedFetch(`/api/notifications?limit=100${query}`);
      if(requestId!==loadRequest.current)return;
      setItems(data.notifications||[]); setUnread(Number(data.unreadCount)||0); setUnreadByType(data.unreadByType||{});
      const pref=await authedFetch(`/api/notifications/preferences`);
      if(requestId!==loadRequest.current)return;
      setPushEnabled(Number(pref?.preferences?.pushEnabled) !== 0);
    } catch(e:any){ if(requestId===loadRequest.current)setError(e?.message||"Could not load notifications."); }
    finally { if(requestId===loadRequest.current)setLoading(false); }
  },[filter]);
  useEffect(()=>{setLoading(true);load();},[load]);

  const markRead=async(id:string)=>{
    setReadingId(id);
    const requestId=++readRequest.current;
    try { const data=await authedFetch(`/api/notifications/${encodeURIComponent(id)}/read`,{method:"POST"}); if(requestId!==readRequest.current)return; setItems(prev=>prev.map(x=>x.id===id?{...x,readAt:new Date().toISOString()}:x)); setUnread(Number(data.unreadCount)||0); setUnreadByType(prev=>({...prev,[filter]:Math.max(0,Number(prev[filter]||0)-1)})); }
    catch(e:any){ if(requestId===readRequest.current)setError(e?.message||"Could not update notification."); } finally { if(requestId===readRequest.current)setReadingId(null); }
  };
  const markAll=async()=>{
    setMarkingAll(true);
    const requestId=++readAllRequest.current;
    const targetFilter=filter;
    try {
      const query = targetFilter === "all" ? "" : `?type=${encodeURIComponent(targetFilter)}`;
      const data=await authedFetch(`/api/notifications/read-all${query}`,{method:"POST"});
      if(requestId!==readAllRequest.current)return;
      setItems(prev=>prev.map(x=>targetFilter==='all'||x.type===targetFilter?{...x,readAt:x.readAt||new Date().toISOString()}:x));
      setUnread(Number(data?.unreadCount)||0);
      if(targetFilter==='all') setUnreadByType({}); else setUnreadByType(prev=>({...prev,[targetFilter]:0}));
    } catch(e:any){ if(requestId===readAllRequest.current)setError(e?.message||"Could not mark notifications as read."); } finally { if(requestId===readAllRequest.current)setMarkingAll(false); }
  };

  const liveMessage = loading ? "Loading notifications." : error ? error : unread ? `${unread} unread notification${unread === 1 ? "" : "s"}.` : `No unread ${label(filter).toLowerCase()} notifications.`;
  return <ScrollView style={s.wrap} contentContainerStyle={ds({paddingBottom:30})} refreshControl={<RefreshControl refreshing={refreshing} tintColor={tc("#D4AF37")} onRefresh={async()=>{setRefreshing(true);await load();setRefreshing(false);}}/>}>
    <NexaLiveRegion message={liveMessage} label="Notifications status" />
    <View style={ds({flexDirection:"row",alignItems:"center",justifyContent:"space-between"})}>
      <View><Text style={s.title}>Notifications</Text><Text style={s.subtitle}>{unread ? `${unread} unread in ${label(filter).toLowerCase()}` : `No unread ${label(filter).toLowerCase()} notifications`}</Text></View>
      {onClose && <NexaPressable onPress={onClose} disabled={loading||refreshing} accessibilityState={{disabled:loading||refreshing}} style={[s.smallButton,ds({minHeight:44,opacity:loading||refreshing?0.55:1})]} accessibilityRole="button" accessibilityLabel="Close notifications"><Text style={s.buttonText}>Close</Text></NexaPressable>}
    </View>
    <NexaPressable
      disabled={savingPrefs}
      onPress={async()=>{
        const next=!pushEnabled; setSavingPrefs(true); setError("");
        const requestId=++preferenceRequest.current;
        try { const data=await authedFetch(`/api/notifications/preferences`,{method:"PATCH",body:JSON.stringify({pushEnabled:next})}); if(requestId===preferenceRequest.current)setPushEnabled(Number(data?.preferences?.pushEnabled)!==0); }
        catch(e:any){ if(requestId===preferenceRequest.current)setError(e?.message||"Could not update notification preferences."); }
        finally { if(requestId===preferenceRequest.current)setSavingPrefs(false); }
      }}
      style={[s.card,{borderWidth:1,borderColor:theme.colors.gold,marginTop:12,opacity:savingPrefs?0.65:1}]}
      accessibilityRole="switch" accessibilityLabel="Enable NEXA push notifications" accessibilityState={{checked:pushEnabled,disabled:savingPrefs}}
    >
      <Text style={ds({color:theme.colors.goldBright,fontWeight:"900"})}>PUSH ALERTS: {pushEnabled ? "ON" : "OFF"}</Text>
      <Text style={s.muted}>In-app notification history stays available either way.</Text>
    </NexaPressable>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds({gap:8,paddingVertical:12})} accessibilityRole="tablist" accessibilityLabel="Notification category filters">
      {FILTERS.map(x=><NexaPressable key={x} onPress={()=>setFilter(x)} style={[s.smallButton,{borderWidth:1,borderColor:x===filter?tc("#D4AF37"):tc("#3B2C13")}]} accessibilityRole="tab" accessibilityLabel={`Filter notifications by ${label(x)}`} accessibilityState={{selected:x===filter}}><Text style={s.buttonText}>{label(x)}{x!=="all" && Number(unreadByType[x]||0)>0 ? ` · ${unreadByType[x]}` : ""}</Text></NexaPressable>)}
    </ScrollView>
    {unread>0 && <NexaPressable onPress={markAll} style={[s.card,{borderWidth:1,borderColor:tc("#3B2C13")}]} accessibilityRole="button" accessibilityLabel={markingAll?"Marking all notifications as read":"Mark all notifications as read"} accessibilityState={{disabled:savingPrefs||markingAll}} disabled={savingPrefs||markingAll}><Text style={ds({color:tc("#D4AF37"),fontWeight:"800"})}>MARK ALL AS READ</Text></NexaPressable>}
    {error && !items.length ? <NexaDataState title="Notifications unavailable" message={error} actionLabel="Retry notifications" onAction={load} /> : null}
    {error && items.length ? <NexaDataState compact title="Showing the last notification list" message={error} actionLabel="Refresh notifications" onAction={load} /> : null}
    {loading && !items.length ? <View style={ds({minHeight:44})}><NexaDataState loading title="Loading notifications" message="Checking your NEXA activity." compact /></View> : null}
    {!loading && !items.length && !error ? <View style={s.card}><Text style={s.section}>No notifications in this category</Text><Text style={s.muted}>Updates from your NEXA activity will appear here.</Text></View> : null}
    {items.map(n=><NexaPressable key={n.id} disabled={readingId===n.id} accessibilityState={{disabled:readingId===n.id}} onPress={async()=>{await markRead(n.id); if(onNavigate) onNavigate({ ...n.data, notificationId: n.id });}} style={[s.card,{borderWidth:1,borderColor:n.readAt?tc("#1b2028"):tc("#3B2C13"),opacity:n.readAt?0.75:1}]} accessibilityRole="button" accessibilityLabel={`${n.title}. ${n.readAt ? "Read" : "Unread"}. Tap to open.`}>
      <View style={ds({flexDirection:"row",justifyContent:"space-between",gap:10})}><Text style={s.section}>{n.title}</Text><Text style={s.muted}>{fmtTime(n.createdAt)}</Text></View>
      <Text style={[s.muted,{marginTop:5}]}>{n.body}</Text>
      <Text style={ds({color:tc("#D4AF37"),fontSize:15,fontWeight:"800",marginTop:8})}>{n.readAt ? "TAP TO OPEN" : "UNREAD · TAP TO OPEN"}</Text>
    </NexaPressable>)}
  </ScrollView>;
}

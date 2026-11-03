import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { authedFetch } from './api';
import { NexaPressable, useMotion } from './motion';
import { MOTION_MS } from './motionTiming';
import { navigationForNotification } from './nexaNavigation';
import { theme } from './theme';
import { recentEnough, takeNextFresh, POPUP_QUEUE_MAX } from './notificationPopupLogic';

const IN_APP_POPUP_MS = 5000;

export type InAppNotification = { id:string; title:string; body:string; type:string; data:Record<string,any>; createdAt:string; readAt:string|null };

export function NexaInAppNotificationPopup(){
  const { reducedMotion, allows } = useMotion();
  const pathname=usePathname();
  const [item,setItem]=useState<InAppNotification|null>(null);
  const [visible,setVisible]=useState(false);
  const initialized=useRef(false);
  const seenNotificationIds=useRef<Set<string>>(new Set());
  const pendingQueue=useRef<InAppNotification[]>([]);
  const request=useRef(0);
  const dismissTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const opacity=useRef(new Animated.Value(0)).current;
  const translateY=useRef(new Animated.Value(-18)).current;

  const show=useCallback((next:InAppNotification)=>{
    if(dismissTimer.current) clearTimeout(dismissTimer.current);
    setItem(next); setVisible(true);
    opacity.stopAnimation(); translateY.stopAnimation();
    opacity.setValue(reducedMotion?1:0); translateY.setValue(reducedMotion?0:-18);
    if(!reducedMotion && allows('notification')) Animated.parallel([
      Animated.timing(opacity,{toValue:1,duration:MOTION_MS.enterBasic,useNativeDriver:true}),
      Animated.spring(translateY,{toValue:0,useNativeDriver:true,damping:16,stiffness:180}),
    ]).start();
    dismissTimer.current=setTimeout(()=>{
      Animated.timing(opacity,{toValue:0,duration:reducedMotion?MOTION_MS.instant:MOTION_MS.blinkOpen,useNativeDriver:true}).start(()=>{setVisible(false);setItem(null);});
    },IN_APP_POPUP_MS);
  },[allows,reducedMotion,opacity,translateY]);

  const load=useCallback(async()=>{
    const id=++request.current;
    try{
      const data=await authedFetch('/api/notifications?limit=20');
      if(id!==request.current) return;
      const rows=(data?.notifications||[]) as InAppNotification[];
      const popupEligible=(n:InAppNotification)=>typeof n?.id==='string' && n.id.length>0 && n.readAt==null && n.data?.inAppPopup===true && recentEnough(n.createdAt);
      if(!initialized.current) initialized.current=true;
      // API responses are newest-first; queue eligible items oldest-first so a burst is not silently lost.
      const candidates=rows.filter(n=>popupEligible(n) && !seenNotificationIds.current.has(n.id)).reverse();
      for(const row of rows) if(!popupEligible(row)) seenNotificationIds.current.add(row.id);
      const room=Math.max(0,POPUP_QUEUE_MAX-pendingQueue.current.length);
      for(const candidate of candidates.slice(0,room)){
        seenNotificationIds.current.add(candidate.id);
        pendingQueue.current.push(candidate);
      }
      if(seenNotificationIds.current.size>200){
        const preserve=new Set([...pendingQueue.current.map(n=>n.id),item?.id].filter((x):x is string=>Boolean(x)));
        seenNotificationIds.current=new Set([...new Set([...seenNotificationIds.current].slice(-100).concat([...preserve]))]);
      }
      if(!visible && !item && pendingQueue.current.length){ const next=takeNextFresh(pendingQueue.current); if(next) show(next); }
    }catch{ /* notifications are enhancement-only; never block the app */ }
  },[item?.id,show,visible]);

  useEffect(()=>{ if(String(pathname||'').startsWith('/auth/')) return; load(); const t=setInterval(load,10000); return()=>clearInterval(t); },[load,pathname]);
  useEffect(()=>{ if(!String(pathname||'').startsWith('/auth/') && !visible && !item && pendingQueue.current.length){ const next=takeNextFresh(pendingQueue.current); if(next) show(next); } },[pathname,visible,item,show]);
  useEffect(()=>()=>{if(dismissTimer.current) clearTimeout(dismissTimer.current); opacity.stopAnimation();translateY.stopAnimation();},[opacity,translateY]);

  if(!visible || !item) return null;
  const open=async()=>{
    seenNotificationIds.current.add(item.id);
    if(dismissTimer.current) clearTimeout(dismissTimer.current);
    try{ await authedFetch(`/api/notifications/${encodeURIComponent(item.id)}/read`,{method:'POST'}); }catch{}
    setVisible(false); setItem(null);
    const target=navigationForNotification({ ...item.data, notificationId:item.id, screen:item.data?.screen, id:item.data?.id });
    if(target) router.push(target as any);
  };
  const dismiss=()=>{
    seenNotificationIds.current.add(item.id);
    if(dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.timing(opacity,{toValue:0,duration:reducedMotion?MOTION_MS.instant:MOTION_MS.blinkOpen,useNativeDriver:true}).start(()=>{setVisible(false);setItem(null);});
  };
  return <Animated.View pointerEvents="box-none" style={[styles.wrap,{opacity,transform:[{translateY}]}]}>
    <View style={styles.card} accessible accessibilityLiveRegion="polite">
      <View style={styles.copy}>
        <Text style={styles.kicker}>{item.data?.aamiUnlock ? 'AAMI UNLOCKED' : 'NEXA UPDATE'}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
      </View>
      <View style={styles.actions}>
        <NexaPressable accessibilityRole="button" accessibilityLabel="Open notification" onPress={open} style={styles.open}><Text style={styles.openText}>Open</Text></NexaPressable>
        <NexaPressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={dismiss} style={styles.close}><Text style={styles.closeText}>×</Text></NexaPressable>
      </View>
    </View>
  </Animated.View>;
}

const styles={
  wrap:{position:'absolute' as const,top:Platform.OS==='ios'?54:34,left:12,right:12,zIndex:9999,elevation:20},
  card:{backgroundColor:theme.colors.graphite,borderWidth:1,borderColor:theme.colors.borderGold,borderRadius:22,padding:14,flexDirection:'row' as const,alignItems:'center',...theme.shadow.gold},
  copy:{flex:1,minWidth:0,paddingRight:10},
  kicker:{color:theme.colors.goldBright,fontSize:14,fontWeight:'900',letterSpacing:1.2},
  title:{color:theme.colors.text,fontSize:16,fontWeight:'900',marginTop:3},
  body:{color:theme.colors.muted,fontSize:14,lineHeight:19,marginTop:3},
  actions:{flexDirection:'row' as const,alignItems:'center',gap:6},
  open:{minHeight:40,paddingHorizontal:12,borderRadius:18,backgroundColor:theme.colors.brightGold,justifyContent:'center'},
  openText:{color:theme.colors.deepBlack,fontWeight:'900'},
  close:{width:40,height:40,borderRadius:18,backgroundColor:theme.colors.surfaceElevated,alignItems:'center',justifyContent:'center'},
  closeText:{color:theme.colors.text,fontSize:24,lineHeight:26},
};

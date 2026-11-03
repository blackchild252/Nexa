import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Modal, ScrollView, Text,  useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfilePhotoIcon } from './myAvatar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authedFetch } from './api';
import { subscribeNexaAutoRefresh } from './nexaAutoRefresh';
import { createCall, type CallMedia } from './callService';
import { useFriends } from './useFriends';
import { useZeeza } from './useZeeza';
import { theme, tc, themedStyles, di } from './theme';
import { BRAND } from './brand';
import {useMotion, NexaPressable, SIDE_MENU_MS, useModalAnimation} from './motion';
import { useNexaHomeSpacing } from './nexaHomeSpacing';
import { HOME_DESIGN, HOME_DIRECTORY } from './homeDesign';
import { navigationForDirectoryItem } from './nexaNavigation';
import { NexaDamiRobot } from './NexaDamiRobot';
import { NexaAvatarStudio } from './NexaAvatarStudio';
import { useAvatar, tr } from './nexaAvatar';
import { NexaBevel, NexaGlossyOrb } from './NexaGlossyOrb';
import { NexaFocusPressable } from './motion';
import { NexaTextSizeControl } from './NexaTextSizeControl';
import { useNexaNav } from './NexaNavKeys';
import { modalA11y, modalBackdropA11y, modalCloseA11y } from './modalAccessibility';
import { useModalFocus } from './modalFocus';
import { useNexaResponsiveLayout } from './nexaResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from './auth';

type Quote = { symbol:string; price:number; currency:string; change:number };
type Notice = { title:string; body:string; type:string; createdAt:string; data?:Record<string,any>; readAt?:string|null };

function money(value:number,currency:string){
  return `${currency} ${Number(value).toLocaleString(undefined,{maximumFractionDigits:2})}`;
}

// News-ticker rail: the content ENTERS at the right edge of the bar, crawls right-to-left at a steady
// speed, leaves at the left edge, then enters again from the right. One copy only, so nothing ever
// appears in the middle of the bar. Progress runs 0 -> 1 and is mapped to [bar width -> -content width].
// Reduced-motion users get a plain swipeable strip instead.
const TICKER_SPEED = 38; // pixels per second
// The crawling track must be wider than any ticker line. Inside a viewport-wide box the text wrapped to two
// lines and was cut off ("you're all caught up" lost its second line), and the measured content width was wrong.
const TICKER_TRACK_WIDTH = 6000;

function Rail({ title, icon, children, onPress }: { title:string; icon:keyof typeof Ionicons.glyphMap; children:React.ReactNode; onPress?:()=>void }) {
  const { reducedMotion } = useMotion();
  const [viewportW, setViewportW] = useState(0);
  const [contentW, setContentW] = useState(0);
  const moving = !reducedMotion && contentW > 0 && viewportW > 0;
  // A fresh Animated.Value is made for every measured size and is BORN at the right edge (value = bar width),
  // so no stale native interpolation can leave the text in the middle. The crawl runs bar width -> -content width,
  // then jumps back to the right edge and starts again.
  const x = useMemo(()=>new Animated.Value(viewportW),[viewportW,contentW]);
  useEffect(()=>{
    x.setValue(viewportW);
    if(!moving) return;
    const loop = Animated.loop(Animated.timing(x,{toValue:-contentW,duration:Math.max(4000,Math.round((viewportW+contentW)/TICKER_SPEED*1000)),easing:Easing.linear,useNativeDriver:true}));
    loop.start();
    return()=>loop.stop();
  },[moving,contentW,viewportW,x]);
  const trackX = moving ? x : viewportW;
  return <NexaBevel radius={15} style={styles.railShell}><NexaFocusPressable onPress={onPress} style={styles.rail} accessibilityRole={onPress?'button':undefined} accessibilityLabel={onPress?`Open ${title.toLowerCase()}`:title}>
    <View style={styles.railLabel}><Ionicons name={icon} size={14} color={theme.colors.brightGold}/><Text style={styles.railTitle}>{title}</Text></View>
    <View style={styles.tickerViewport} onLayout={e=>setViewportW(Math.round(e.nativeEvent.layout.width))}>
      {reducedMotion
        ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentOffset={{x:0,y:0}} contentContainerStyle={{alignItems:'center',paddingLeft:viewportW}}>{children}</ScrollView>
        : <View style={styles.tickerTrack}><Animated.View style={{width:TICKER_TRACK_WIDTH,flexDirection:'row',alignItems:'center',opacity:moving?1:0,transform:[{translateX:trackX as any}]}}>
            <View style={styles.tickerCopy} onLayout={e=>setContentW(Math.round(e.nativeEvent.layout.width))}>{children}</View>
          </Animated.View></View>}
    </View>
    <Ionicons name="chevron-forward" size={15} color={theme.colors.muted}/>
  </NexaFocusPressable></NexaBevel>;
}

const DIRECTORY = HOME_DIRECTORY;

function Directory({open,onClose,directoryWidth}:{open:boolean;onClose:()=>void;directoryWidth:number}){
  const {allows}=useMotion(); const x=useRef(new Animated.Value(1)).current; const panelInsets=useSafeAreaInsets(); const homeSpacingPanel=useNexaHomeSpacing();
  useEffect(()=>{Animated.timing(x,{toValue:open?0:1,duration:allows('navigation')?SIDE_MENU_MS:0,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();},[open,allows,x]);
  return <Modal visible={open} transparent animationType="none" onRequestClose={onClose}><View style={styles.directoryBackdrop}>
    <NexaPressable accessibilityRole="button" accessibilityLabel="Dismiss NEXA directory" style={styles.directoryDismiss} activeOpacity={1} onPress={onClose}/>
    <Animated.View style={[styles.directoryPanel,{width:directoryWidth,paddingTop:panelInsets.top+18+homeSpacingPanel,paddingBottom:panelInsets.bottom,transform:[{translateX:x.interpolate({inputRange:[0,1],outputRange:[0,380]})}]}]}>
      <View style={styles.directoryHeader}><View><Text style={styles.directoryBrand}>NEXA</Text><Text style={styles.directorySub}>Your World. One App.</Text></View><NexaFocusPressable onPress={onClose} style={styles.directoryClose} accessibilityRole="button" accessibilityLabel="Close NEXA directory"><Ionicons name="close" size={22} color={theme.colors.ivoryText}/></NexaFocusPressable></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:24}}>
        {DIRECTORY.map(([id,label,icon])=><NexaFocusPressable key={id} onPress={()=>{const target=navigationForDirectoryItem(id);onClose();if(target){ if(id==='home'||id==='notifications') router.replace(target as any); else router.push(target as any); }}} style={[styles.directoryRow,id==='home'&&styles.directoryRowActive]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:id==='home'}}>
          {id==='profile'?<ProfilePhotoIcon size={26} icon={di(icon) as any} color={theme.colors.goldBright}/>:<Ionicons name={di(icon) as any} size={20} color={id==='home'?theme.colors.deepBlack:theme.colors.goldBright}/>}<Text style={[styles.directoryLabel,id==='home'&&styles.directoryLabelActive]}>{label}</Text>
        </NexaFocusPressable>)}
        <View style={styles.directoryDivider}/><NexaTextSizeControl/><View style={styles.directoryDivider}/><NexaPressable accessibilityRole="button" accessibilityLabel="Close NEXA menu" onPress={onClose} style={styles.directoryRow}><Ionicons name="arrow-back" size={20} color={theme.colors.goldBright}/><Text style={styles.directoryLabel}>Close Menu</Text></NexaPressable>
      </ScrollView>
    </Animated.View>
  </View></Modal>;
}

function DamiCore({ onOpen }:{ onOpen:()=>void }){
  const { width } = useWindowDimensions(); const avatar=useAvatar(); const [studio,setStudio]=useState(false);
  const robot = Math.min(200, Math.max(150, width * 0.48));
  const pedestalWidth = Math.min(300, width * 0.72);
  return <View style={styles.damiArea}>
    <NexaDamiRobot size={robot} onPress={onOpen}/>
    <NexaPressable accessibilityRole="button" accessibilityLabel="Customize your Dami avatar" onPress={()=>setStudio(true)} style={{marginTop:2,minHeight:44,paddingHorizontal:18,borderRadius:18,borderWidth:1.5,borderColor:theme.colors.brightGold,flexDirection:'row',alignItems:'center',gap:6,justifyContent:'center'}}><Ionicons name="shirt-outline" size={18} color={theme.colors.brightGold}/><Text style={{color:theme.colors.goldBright,fontWeight:'900',fontSize:15}}>{tr(avatar.lang,'edit')}</Text></NexaPressable>
    <NexaAvatarStudio open={studio} initial={avatar} onClose={()=>setStudio(false)}/>
    <View style={{marginTop:-robot*0.06}}>
      <NexaGlossyOrb size={78} tone="glass" pulse style={styles.damiButton} onPress={onOpen} accessibilityLabel="Talk to Dami">
        <Ionicons name="mic" size={38} color={theme.colors.ivoryText}/>
      </NexaGlossyOrb>
    </View>
    <Text style={styles.damiName}>{BRAND.assistant}</Text>
    <Text style={styles.damiRole}>Your AI Assistant</Text>
    <NexaBevel radius={14} style={styles.damiBubble}><Text style={styles.damiHint}>{tr(avatar.lang,'hello')}</Text></NexaBevel>
  </View>;
}

export function HomeCommandCenter({ onOpenNotifications }:{ onOpenNotifications?:()=>void }){
  const callSheetRef = useRef<any>(null);
  const [quotes,setQuotes]=useState<Quote[]>([]);
  const [notices,setNotices]=useState<Notice[]>([]);
  const [unread,setUnread]=useState(0);
  const [railError,setRailError]=useState('');
  const [railLoading,setRailLoading]=useState(false);
  const [callOpen,setCallOpen]=useState(false);
  useModalFocus(callOpen, callSheetRef);
  const callModalAnimation=useModalAnimation('sheet');
  const [calling,setCalling]=useState<string|null>(null);
  const [directoryOpen,setDirectoryOpen]=useState(false);
  const { openAdd } = useNexaNav();
  const { gutter, contentWidth, directoryWidth, dockOrb, safeBottom, minimumReadableFontSize } = useNexaResponsiveLayout();
  const safeInsets = useSafeAreaInsets();
  const homeSpacing = useNexaHomeSpacing();
  const railsRequest=useRef(0);
  const { user } = useAuth();
  const friends=useFriends({active:true});
  const zeeza=useZeeza({active:true});

  const loadRails=useCallback(async()=>{
    const requestId=++railsRequest.current;
    setRailLoading(true);
    let failed=false;
    try{const data=await authedFetch('/api/market/quotes');if(requestId===railsRequest.current)setQuotes((data.quotes||[]).slice(0,8));}catch{failed=true;}
    try{const data=await authedFetch('/api/notifications?limit=8');if(requestId===railsRequest.current){setNotices(data.notifications||[]);setUnread(Number(data.unreadCount)||0);}}catch{failed=true;}
    if(requestId===railsRequest.current){setRailError(failed?'Some Home updates could not be refreshed. Tap to retry.':'');setRailLoading(false);}
  },[]);
  useEffect(()=>{loadRails();return subscribeNexaAutoRefresh(()=>{void loadRails();});},[loadRails]);

  const messageCount=useMemo(()=>zeeza.threads.reduce((sum,t)=>sum+Number(t.unread||0),0),[zeeza.threads]);
  const missedCalls=useMemo(()=>notices.filter(n=>n.type==='call' || String(n.data?.screen||'')==='call').length,[notices]);
  const activityText=useMemo(()=>{
    const parts=[];
    if(missedCalls) parts.push(`${missedCalls} missed call${missedCalls===1?'':'s'}`);
    if(messageCount) parts.push(`${messageCount} Inbox`);
    if(unread) parts.push(`${unread} notification${unread===1?'':'s'}`);
    if(!parts.length) return 'NEXA is quiet · you are all caught up';
    return parts.join('  ·  ');
  },[messageCount,missedCalls,unread]);

  const startCall=async(friendId:string, media:CallMedia)=>{
    setCalling(friendId);
    try{const r=await createCall(friendId,media);setCallOpen(false);router.push({pathname:'/zeeza/call',params:{callId:r.call.id,media}} as any);}catch(e:any){setCallOpen(false);Alert.alert('Zeeza call',e?.message||'Could not start the call.');}
    finally{setCalling(null);}
  };

  const greetingName = String(user?.name || user?.username || 'there').trim().split(/\s+/)[0] || 'there';
  return <View style={[styles.root, { paddingHorizontal: gutter, maxWidth: contentWidth, alignSelf: 'center', width: '100%', paddingTop: safeInsets.top + 8 + homeSpacing, paddingBottom: Math.max(safeBottom, safeInsets.bottom) }]} accessibilityLabel={`NEXA Home Command Center V${HOME_DESIGN.version}`}>
    <View style={styles.greetingRow}><Text style={styles.greetingText}>Hello, {greetingName} 👋</Text></View>
    <View style={styles.homeHeader}><View><Text style={styles.brandWordmark}>NEXA</Text><Text style={styles.brandTagline}>Your World. One App.</Text></View><View style={styles.headerActions} accessibilityRole="toolbar" accessibilityLabel="NEXA Home actions"><NexaPressable onPress={()=>router.push('/help' as any)} style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Open NEXA Help"><Ionicons name="help-circle-outline" size={23} color={theme.colors.brightGold}/></NexaPressable><NexaPressable onPress={openAdd} style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Open NEXA Add actions"><Ionicons name="add" size={25} color={theme.colors.brightGold}/></NexaPressable><NexaPressable onPress={()=>setDirectoryOpen(true)} style={styles.menuButton} accessibilityRole="button" accessibilityLabel="Open NEXA directory" accessibilityState={{expanded:directoryOpen}}><Ionicons name="menu" size={27} color={theme.colors.brightGold}/></NexaPressable></View></View>
    <Rail title="MARKET WATCH" icon="trending-up-outline" onPress={()=>router.push('/(tabs)/money?view=market' as any)}>
      {quotes.length ? quotes.map(q=><View key={q.symbol} style={styles.railItem}><Text style={styles.railSymbol}>{q.symbol}</Text><Text style={styles.railValue}>{money(q.price,q.currency)}</Text><Text style={[styles.railChange,{color:q.change>=0?theme.colors.success:theme.colors.errorText}]}>{q.change>=0?'+':''}{q.change.toFixed(2)}%</Text></View>) : <Text style={styles.railEmpty}>Loading live market information…</Text>}
    </Rail>

    <Rail title="NEXA UPDATES" icon="notifications-outline" onPress={onOpenNotifications}>
      <View style={styles.updateItem}><Ionicons name="flash-outline" size={14} color={theme.colors.brightGold}/><Text style={styles.updateText} numberOfLines={1}>{activityText}</Text></View>
      {railError?<NexaPressable accessibilityRole="button" accessibilityLabel="Retry home update rail" accessibilityState={{disabled:railLoading}} disabled={railLoading} onPress={loadRails} style={styles.updateItem}><Text style={styles.updateText} numberOfLines={1}>{railError}</Text></NexaPressable>:null}
      {!railError&&notices.slice(0,3).map(n=><View key={n.createdAt+n.title} style={styles.updateItem}><Text style={styles.updateText} numberOfLines={1}>{n.title}</Text></View>)}
    </Rail>

    <Rail title="SEARCH NEXA" icon="search-outline" onPress={()=>router.push('/(tabs)/search' as any)}>
      <View style={styles.searchRailItem}><Text style={styles.searchRailPrompt}>People</Text><Text style={styles.searchRailDot}>•</Text><Text style={styles.searchRailPrompt}>Groups</Text><Text style={styles.searchRailDot}>•</Text><Text style={styles.searchRailPrompt}>Products</Text><Text style={styles.searchRailDot}>•</Text><Text style={styles.searchRailPrompt}>Tickets</Text><Text style={styles.searchRailDot}>•</Text><Text style={styles.searchRailPrompt}>Money</Text></View>
    </Rail>

    <View style={styles.damiStage}><DamiCore onOpen={()=>router.push('/dami' as any)}/></View>

    <View style={styles.bottomDock} accessibilityRole="toolbar" accessibilityLabel="NEXA Home destinations">
      <NexaGlossyOrb size={dockOrb} tone="red" style={styles.dockOrb} onPress={()=>router.push('/(tabs)/zeeza?section=friends' as any)} accessibilityLabel="Open Zeeza friends">
        <Ionicons name="people" size={24} color="#fff"/>{friends.incoming.length>0?<View style={styles.redBadge}><Text style={styles.redBadgeText}>{friends.incoming.length>9?'9+':friends.incoming.length}</Text></View>:null}<Text style={[styles.dockLabel,{fontSize:Math.max(13, minimumReadableFontSize + 1)}]}>Zeeza</Text><Text style={styles.dockSub}>Friends</Text>
      </NexaGlossyOrb>
      <NexaGlossyOrb size={dockOrb} tone="gold" style={styles.dockOrb} onPress={()=>router.push('/(tabs)/yaayz' as any)} accessibilityLabel="Open Yaayz">
        <Ionicons name="ticket" size={24} color={theme.colors.deepBlack}/><Text style={[styles.dockLabel,{color:theme.colors.deepBlack,textShadowColor:'transparent'}]}>Yaayz</Text><Text style={[styles.dockSub,{color:theme.colors.deepBlack}]}>Discover</Text>
      </NexaGlossyOrb>
      <NexaGlossyOrb size={dockOrb} tone="blue" style={styles.dockOrb} onPress={()=>setCallOpen(true)} accessibilityLabel="Open Zeeza calling">
        <Ionicons name="call" size={24} color="#fff"/><Text style={[styles.dockLabel,{fontSize:Math.max(13, minimumReadableFontSize + 1)}]}>Calls</Text><Text style={styles.dockSub}>Audio · Video</Text>
      </NexaGlossyOrb>
      <NexaGlossyOrb size={dockOrb} tone="glass" style={styles.dockOrb} onPress={()=>router.push('/marketplace/vendor' as any)} accessibilityLabel="Open Business Hub">
        <Ionicons name="storefront" size={24} color={theme.colors.ivoryText}/><Text style={[styles.dockLabel,{fontSize:Math.max(13, minimumReadableFontSize + 1)}]}>Vendor</Text><Text style={styles.dockSub}>Shop</Text>
      </NexaGlossyOrb>
    </View>
    <Directory open={directoryOpen} onClose={()=>setDirectoryOpen(false)} directoryWidth={directoryWidth}/>
    <Modal visible={callOpen} transparent animationType={callModalAnimation} onRequestClose={()=>setCallOpen(false)}>
      <View style={styles.modalBackdrop} {...modalBackdropA11y()}>
        <View ref={callSheetRef} tabIndex={-1 as any} {...modalA11y("Zeeza calls", "Choose a friend and start an audio or video call.")} style={styles.callSheet}>
          <View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>Zeeza calls</Text><Text style={styles.sheetSubtitle}>Choose a friend and start an audio or video call.</Text></View><NexaPressable onPress={()=>setCallOpen(false)} style={styles.closeButton} {...modalCloseA11y("Close Zeeza calls")}><Ionicons name="close" size={20} color={theme.colors.text}/></NexaPressable></View>
          {friends.friends.slice(0,8).map(friend=><View key={friend.id} style={styles.friendRow}><View style={styles.avatar}><Text style={styles.avatarText}>{String(friend.name||friend.username||'?').slice(0,1).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={styles.friendName}>{friend.name||friend.username||'Friend'}</Text><Text style={styles.friendMeta}>Zeeza friend · choose call type</Text></View><View style={styles.callChoices}><NexaPressable accessibilityRole="button" accessibilityLabel={`Start audio call with ${friend.name||friend.username||'friend'}`} accessibilityState={{disabled:!!calling}} disabled={!!calling} onPress={()=>startCall(friend.id,'audio')} style={styles.startCall}><Ionicons name="call" size={16} color={theme.colors.deepBlack}/><Text style={styles.startCallText}>{calling===friend.id?'…':'Audio'}</Text></NexaPressable><NexaPressable accessibilityRole="button" accessibilityLabel={`Start video call with ${friend.name||friend.username||'friend'}`} accessibilityState={{disabled:!!calling}} disabled={!!calling} onPress={()=>startCall(friend.id,'video')} style={styles.videoCall}><Ionicons name="videocam" size={16} color={theme.colors.deepBlack}/><Text style={styles.startCallText}>Video</Text></NexaPressable></View></View>)}
          {!friends.friends.length?<Text style={styles.emptyFriends}>No Zeeza friends available yet. Open Zeeza to add friends.</Text>:null}
          <NexaPressable accessibilityRole="button" accessibilityLabel="Open Zeeza Friends" onPress={()=>{setCallOpen(false);router.push('/(tabs)/zeeza?section=friends' as any)}} style={styles.fullZeeza}><Text style={styles.fullZeezaText}>Open Zeeza Friends</Text></NexaPressable>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles= themedStyles(() => ({
  root:{flex:1,paddingTop:8},
  damiPedestal:{position:'absolute',bottom:94,left:'50%',height:86,alignItems:'center',justifyContent:'flex-end'},
  damiPedestalCore:{position:'absolute',left:0,right:0,bottom:8,height:58,borderRadius:999,borderWidth:1,borderColor:'rgba(255,215,0,0.34)',transform:[{scaleY:0.42}]},
  damiPedestalRim:{position:'absolute',left:'8%',right:'8%',bottom:18,height:34,borderRadius:999,borderWidth:1.5,borderColor:'rgba(255,225,140,0.55)',transform:[{scaleY:0.28}],shadowColor:'#FFD700',shadowOpacity:0.45,shadowRadius:18},
  damiPedestalGlow:{position:'absolute',left:'20%',right:'20%',bottom:25,height:24,borderRadius:999,backgroundColor:'rgba(255,190,50,0.16)',transform:[{scaleY:0.35}]},
  greetingRow:{paddingHorizontal:4,paddingBottom:14},greetingText:{color:theme.colors.text,fontSize:24,fontWeight:'900'},
  homeHeader:{minHeight:72,paddingTop:2,paddingBottom:4,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:4},headerActions:{flexDirection:'row',alignItems:'center',gap:8},headerAction:{width:46,height:46,borderRadius:23,borderWidth:1.5,borderColor:theme.colors.brightGold,backgroundColor:tc('rgba(14,10,22,0.85)'),alignItems:'center',justifyContent:'center',...theme.shadow.glow},brandWordmark:{color:theme.colors.goldBright,fontSize:26,lineHeight:32,fontWeight:'900',letterSpacing:2},brandTagline:{color:theme.colors.muted,fontSize:14,lineHeight:20,fontWeight:'700',letterSpacing:.6,marginTop:5},menuButton:{width:46,height:46,borderRadius:23,borderWidth:1.5,borderColor:theme.colors.brightGold,backgroundColor:tc('rgba(14,10,22,0.85)'),alignItems:'center',justifyContent:'center',...theme.shadow.glow},
  railShell:{marginBottom:8},rail:{height:50,flexDirection:'row',alignItems:'center',overflow:'hidden',paddingHorizontal:11},
  railLabel:{flexDirection:'row',alignItems:'center',gap:5,minWidth:106},railTitle:{fontSize:14,fontWeight:'900',letterSpacing:1,color:theme.colors.goldBright},
  marqueeViewport:{flex:1,overflow:'hidden'},tickerViewport:{flex:1,overflow:'hidden',height:28,justifyContent:'center'},tickerTrack:{position:'absolute',left:0,right:0,top:0,bottom:0,justifyContent:'center',alignItems:'flex-start'},tickerCopy:{flexDirection:'row',alignItems:'center',flexShrink:0},railItem:{flexDirection:'row',alignItems:'center',gap:7,marginRight:20},railSymbol:{color:theme.colors.ivoryText,fontSize:15,fontWeight:'900'},railValue:{color:theme.colors.textSecondary,fontSize:14},railChange:{fontSize:14,fontWeight:'900'},railEmpty:{color:theme.colors.muted,fontSize:14},
  updateItem:{flexDirection:'row',alignItems:'center',gap:6,marginRight:24},updateText:{color:theme.colors.textSecondary,fontSize:14,fontWeight:'700'},searchRailItem:{flexDirection:'row',alignItems:'center',gap:9,marginRight:20},searchRailPrompt:{color:theme.colors.textSecondary,fontSize:14,fontWeight:'800'},searchRailDot:{color:theme.colors.goldBright,fontSize:14,fontWeight:'900'},
  damiStage:{flex:1,alignItems:'center',justifyContent:'center',minHeight:170},damiArea:{alignItems:'center',justifyContent:'center',paddingBottom:6},damiButton:{width:78,height:78},zeezaDock:{width:124,height:124},callDockWrap:{width:124,height:124},damiName:{marginTop:8,color:theme.colors.goldBright,fontSize:28,fontWeight:'900',letterSpacing:.5,textShadowColor:tc('rgba(255,215,0,0.7)'),textShadowRadius:10,textShadowOffset:{width:0,height:0}},damiRole:{color:theme.colors.ivoryText,fontSize:14,fontWeight:'700',marginTop:1},damiBubble:{marginTop:8,paddingHorizontal:16,paddingVertical:8},damiHint:{color:theme.colors.ivoryText,fontSize:14,fontWeight:'700',textAlign:'center'},
  bottomDock:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',paddingHorizontal:2,paddingBottom:16,minHeight:112,gap:6},dockOrb:{flex:1,alignItems:'center',justifyContent:'center'},
  redBadge:{position:'absolute',right:14,top:12,minWidth:21,height:21,borderRadius:11,backgroundColor:theme.colors.brightGold,alignItems:'center',justifyContent:'center',paddingHorizontal:4},redBadgeText:{fontSize:14,fontWeight:'900',color:theme.colors.deepBlack},
  dockLabel:{color:'#fff',fontSize:17,fontWeight:'900',marginTop:4,textShadowColor:tc('rgba(0,0,0,0.5)'),textShadowRadius:4,textShadowOffset:{width:0,height:1}},dockSub:{color:tc('rgba(255,255,255,0.85)'),fontSize:14,fontWeight:'700',marginTop:0},
  directoryBackdrop:{flex:1,flexDirection:'row',backgroundColor:tc('rgba(0,0,0,0.62)')},directoryDismiss:{flex:1},directoryPanel:{width:'82%',maxWidth:360,backgroundColor:theme.colors.deepBlack,borderLeftWidth:1,borderLeftColor:theme.colors.borderGold,paddingTop:18,paddingHorizontal:16,shadowColor:theme.colors.royalGold,shadowOffset:{width:-4,height:0},shadowOpacity:.24,shadowRadius:24,elevation:14},directoryHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingBottom:16,borderBottomWidth:1,borderBottomColor:tc('rgba(212,175,55,0.22)')},directoryBrand:{color:theme.colors.goldBright,fontSize:30,fontWeight:'900',letterSpacing:2},directorySub:{color:theme.colors.muted,fontSize:14,marginTop:1},directoryClose:{width:44,height:44,borderRadius:21,borderWidth:1,borderColor:theme.colors.borderGold,alignItems:'center',justifyContent:'center',backgroundColor:theme.colors.graphite},directoryRow:{minHeight:52,flexDirection:'row',alignItems:'center',gap:13,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:tc('rgba(212,175,55,0.08)'),borderRadius:14},directoryRowActive:{backgroundColor:theme.colors.brightGold},directoryLabel:{flex:1,color:theme.colors.ivoryText,fontSize:15,fontWeight:'800'},directoryLabelActive:{color:theme.colors.deepBlack},directoryDivider:{height:1,backgroundColor:tc('rgba(212,175,55,0.3)'),marginVertical:10},
  modalBackdrop:{flex:1,backgroundColor:tc('rgba(0,0,0,0.78)'),justifyContent:'flex-end'},callSheet:{backgroundColor:theme.colors.graphite,borderTopLeftRadius:28,borderTopRightRadius:28,borderWidth:1,borderColor:theme.colors.borderGold,padding:18,maxHeight:'78%'},sheetHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},sheetTitle:{color:theme.colors.ivoryText,fontSize:24,fontWeight:'900'},sheetSubtitle:{color:theme.colors.muted,fontSize:15,marginTop:3},callChoices:{flexDirection:'row',gap:6},videoCall:{minHeight:44,paddingHorizontal:10,paddingVertical:9,borderRadius:18,backgroundColor:theme.colors.info,flexDirection:'row',alignItems:'center',gap:4},closeButton:{width:44,height:44,borderRadius:19,backgroundColor:theme.colors.surfaceElevated,alignItems:'center',justifyContent:'center'},friendRow:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:tc('rgba(212,175,55,0.14)')},avatar:{width:42,height:42,borderRadius:21,backgroundColor:theme.colors.goldWash,borderWidth:1,borderColor:theme.colors.borderGold,alignItems:'center',justifyContent:'center',marginRight:10},avatarText:{color:theme.colors.goldBright,fontWeight:'900'},friendName:{color:theme.colors.text,fontWeight:'900'},friendMeta:{color:theme.colors.muted,fontSize:14,marginTop:2},startCall:{minHeight:44,paddingHorizontal:12,paddingVertical:9,borderRadius:18,backgroundColor:theme.colors.brightGold,flexDirection:'row',alignItems:'center',gap:5},startCallText:{color:theme.colors.deepBlack,fontWeight:'900',fontSize:14},emptyFriends:{color:theme.colors.muted,textAlign:'center',paddingVertical:20,lineHeight:18},fullZeeza:{marginTop:14,borderWidth:1,borderColor:theme.colors.borderGold,borderRadius:20,padding:12,alignItems:'center'},fullZeezaText:{color:theme.colors.goldBright,fontWeight:'900'},
}));

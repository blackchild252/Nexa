import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { NexaPressable } from '../../motion';
import { ProfilePhotoIcon } from '../../myAvatar';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { theme, themedStyles, ds, di } from '../../theme';
import { BRAND } from '../../brand';
import { FriendsScreen } from '../../FriendsScreen';
import { ZeezaInbox } from '../../ZeezaInbox';
import { useFriends } from '../../useFriends';
import { useZeeza } from '../../useZeeza';
import { ZeezaChase } from '../../ZeezaChase';
import { LifestyleScreen } from '../../LifestyleScreen';
import { NexaWorldBackground } from '../../NexaWorldBackground';

export default function Zeeza(){
  const params = useLocalSearchParams<{section?:string;resultId?:string|string[];threadId?:string|string[];roomId?:string|string[];postId?:string|string[]}>();
  // Legacy compatibility: older callers may still pass section==='explore'; it is normalized to Chase.
  // Legacy compatibility: ZeezaExplore is retained as the implementation bridge while Chase is the official product name.
  // Legacy compatibility: section==='explore' deep links normalize to Chase.
  const requestedSectionKey = String(params.section || '');
  const requestedSection = requestedSectionKey === 'friends' ? 'friends' : requestedSectionKey === 'lifestyle' ? 'lifestyle' : requestedSectionKey === 'chase' || requestedSectionKey === 'explore' ? 'chase' : 'inbox';
  const requestedPostId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const requestedResultId = Array.isArray(params.resultId) ? params.resultId[0] : params.resultId;
  const requestedThreadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const requestedRoomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const [section, setSection] = useState<'inbox'|'friends'|'chase'|'lifestyle'>(requestedSection);
  React.useEffect(() => {
    setSection(requestedSection);
  }, [requestedSection]);
  const friends = useFriends({active:true});
  const zeeza = useZeeza({active:true});
  React.useEffect(() => {
    if (requestedThreadId) { void zeeza.openThreadById(String(requestedThreadId)); return; }
    if (requestedRoomId) { void zeeza.openRoomById(String(requestedRoomId)); return; }
    zeeza.closeThread();
    zeeza.closeRoom();
  }, [requestedThreadId, requestedRoomId, zeeza.openThreadById, zeeza.openRoomById, zeeza.closeThread, zeeza.closeRoom]);

  const openProfile = () => router.push('/zeeza/profile' as any);
  const unreadInbox = zeeza.threads.reduce((sum, thread) => sum + Number(thread.unread || 0), 0);
  const requestCount = friends.incoming.length;

  if (zeeza.activeThreadId || zeeza.activeRoomId) {
    return <NexaWorldBackground world="zeeza"><View style={ds({flex:1,backgroundColor:'transparent'})}><ZeezaInbox zeeza={zeeza}/></View></NexaWorldBackground>;
  }

  return <NexaWorldBackground world="zeeza"><View style={ds({flex:1,backgroundColor:'transparent'})}>
    <View style={local.header}>
      <View style={ds({flex:1})}>
        <Text style={local.title}>{BRAND.zeeza}</Text>
        <Text style={local.subtitle}>Friends first. Conversations that feel close.</Text>
      </View>
      <NexaPressable onPress={openProfile} style={local.profileButton} accessibilityRole="button" accessibilityLabel="Open Zeeza profile">
        <ProfilePhotoIcon size={40} icon={di('person-outline') as any} color={theme.colors.goldHot} ring/>
      </NexaPressable>
    </View>

    <View style={local.navCard}>
      <NexaPressable style={[local.navItem, section==='inbox' && local.navItemActive]} accessibilityRole="tab" accessibilityLabel="Open Zeeza Inbox" accessibilityState={{selected:section==='inbox'}} onPress={()=>setSection('inbox')}>
        <Ionicons name={di('chatbubbles-outline', section==='inbox') as any} size={18} color={section==='inbox'?theme.colors.goldHot:theme.colors.muted}/>
        <Text style={[local.navText, section==='inbox' && local.navTextActive]}>Inbox</Text>{unreadInbox > 0 ? <View style={local.badge}><Text style={local.badgeText}>{unreadInbox > 9 ? '9+' : unreadInbox}</Text></View> : null}
      </NexaPressable>
      <NexaPressable style={[local.navItem, section==='friends' && local.navItemActive]} accessibilityRole="tab" accessibilityLabel="Open Zeeza Friends" accessibilityState={{selected:section==='friends'}} onPress={()=>setSection('friends')}>
        <Ionicons name={di('people-outline', section==='friends') as any} size={18} color={section==='friends'?theme.colors.goldHot:theme.colors.muted}/>
        <Text style={[local.navText, section==='friends' && local.navTextActive]}>Friends</Text>{requestCount > 0 ? <View style={local.badge}><Text style={local.badgeText}>{requestCount > 9 ? '9+' : requestCount}</Text></View> : null}
      </NexaPressable>
      <NexaPressable style={[local.navItem, section==='chase' && local.navItemActive]} accessibilityRole="tab" accessibilityLabel="Open Zeeza Chase" accessibilityState={{selected:section==='chase'}} onPress={()=>setSection('chase')}>
        <Ionicons name={di('compass-outline', section==='chase') as any} size={18} color={section==='chase'?theme.colors.goldHot:theme.colors.muted}/>
        <Text style={[local.navText, section==='chase' && local.navTextActive]}>Chase</Text>
      </NexaPressable>
      <NexaPressable style={[local.navItem, section==='lifestyle' && local.navItemActive]} accessibilityRole="tab" accessibilityLabel="Open Zeeza Lifestyle" accessibilityState={{selected:section==='lifestyle'}} onPress={()=>setSection('lifestyle')}>
        <Ionicons name={di('images-outline', section==='lifestyle') as any} size={18} color={section==='lifestyle'?theme.colors.goldHot:theme.colors.muted}/>
        <Text style={[local.navText, section==='lifestyle' && local.navTextActive]}>Lifestyle</Text>
      </NexaPressable>
      <NexaPressable style={local.navItem} accessibilityRole="button" accessibilityLabel="Open Zeeza profile" onPress={openProfile}>
        <ProfilePhotoIcon size={22} icon="person-circle-outline" color={theme.colors.muted}/>
        <Text style={local.navText}>Profile</Text>
      </NexaPressable>
    </View>

    {section==='inbox' ? <ZeezaInbox zeeza={zeeza}/> : section==='friends' ? <FriendsScreen friends={friends} initialSearch={requestedResultId} onMessage={(f)=>{zeeza.openDm(f); setSection('inbox');}} /> : section==='lifestyle' ? <LifestyleScreen postId={requestedPostId} /> : <ZeezaChase />}
  </View></NexaWorldBackground>;
}

const local = themedStyles(() => ({
  header:{flexDirection:'row' as const,alignItems:'center',paddingHorizontal:18,paddingTop:18,paddingBottom:12},
  title:{fontSize:30,fontWeight:'900' as const,color:theme.colors.text,letterSpacing:.2},
  subtitle:{fontSize:15,color:theme.colors.textSecondary,marginTop:3},
  profileButton:{width:44,height:44,borderRadius:22,alignItems:'center' as const,justifyContent:'center' as const,backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:theme.colors.borderGold,...theme.shadow.gold},
  navCard:{flexDirection:'row' as const,marginHorizontal:18,marginBottom:4,padding:4,borderRadius:16,backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.border},
  navItem:{flex:1,flexDirection:'row' as const,alignItems:'center' as const,justifyContent:'center' as const,gap:6,paddingVertical:10,borderRadius:12},
  navItemActive:{backgroundColor:theme.colors.goldWash,borderWidth:1,borderColor:theme.colors.borderGold,...theme.shadow.glow},
  navText:{color:theme.colors.muted,fontWeight:'800' as const,fontSize:14},
  navTextActive:{color:theme.colors.goldHot},
  badge:{minWidth:18,height:18,borderRadius:9,backgroundColor:theme.colors.goldBright,alignItems:'center' as const,justifyContent:'center' as const,paddingHorizontal:4,marginLeft:2},
  badgeText:{color:theme.colors.black,fontSize:14,fontWeight:'900' as const},
}));

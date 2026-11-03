import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text,  View } from 'react-native';
import { NexaPressable } from '../../../motion';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '../../../brand';
import { theme, themedStyles, ds } from '../../../theme';
import { s } from '../../../styles';
import { apiFriendRequestByZeezaShare, apiSharedZeezaProfile, type SocialProfile } from '../../../friends';

export default function SharedZeezaProfile() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (!token) throw new Error('Profile link not found.');
        const p = await apiSharedZeezaProfile(String(token));
        if (live) setProfile(p);
      } catch (e:any) {
        if (live) Alert.alert('Zeeza', e?.message || 'This profile link is no longer available.');
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [token]);

  const addFriend = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await apiFriendRequestByZeezaShare(String(token));
      Alert.alert('Friend request sent', `${profile?.name || 'Your Zeeza friend'} will see your request.`);
    } catch (e:any) {
      Alert.alert('Could not add friend', e?.message || 'Please sign in and try again.');
    } finally { setBusy(false); }
  };

  if (loading) return <View style={local.center}><ActivityIndicator color={theme.colors.goldBright}/></View>;
  if (!profile) return <View style={local.center}><Text style={s.title}>Profile unavailable</Text><Text style={s.subtitle}>This Zeeza link may be invalid or expired.</Text></View>;
  const initials = (profile.name || 'Z').trim().slice(0,1).toUpperCase();

  return <ScrollView style={s.wrap} contentContainerStyle={ds({padding:20,paddingBottom:80})}>
    <View style={local.brand}><Ionicons name="people-circle-outline" size={26} color={theme.colors.goldHot}/><Text style={local.brandText}>{BRAND.zeeza}</Text></View>
    <View style={local.card}>
      <View style={local.avatar}>{profile.avatarUrl ? <Image accessible accessibilityRole="image" accessibilityLabel={`${profile.displayName || 'Profile'} avatar`} source={{uri:profile.avatarUrl}} style={local.avatarImage}/> : <Text style={local.initial}>{initials}</Text>}</View>
      <Text style={local.name}>{profile.name}</Text>
      {profile.username ? <Text style={local.handle}>@{profile.username}</Text> : null}
      {profile.bio ? <Text style={local.bio}>{profile.bio}</Text> : <Text style={local.bioMuted}>This person hasn't added a Zeeza bio yet.</Text>}
      <NexaPressable accessibilityRole="button" accessibilityLabel="Add Zeeza friend" disabled={busy} accessibilityState={{disabled:busy}} onPress={addFriend} style={[s.button,{marginTop:18,opacity:busy?.55:1}]}>
        {busy ? <ActivityIndicator color={theme.colors.black}/> : <Text style={s.buttonText}>Add on Zeeza</Text>}
      </NexaPressable>
      <NexaPressable accessibilityRole="button" accessibilityLabel="Open Zeeza" onPress={()=>router.replace('/(tabs)/zeeza' as any)} style={local.back}><Text style={local.backText}>Open Zeeza</Text></NexaPressable>
    </View>
    <Text style={local.note}>You received this profile through a Zeeza share link. Only the profile details shared by the owner are shown here.</Text>
  </ScrollView>;
}

const local= themedStyles(() => ({
  center:{flex:1,backgroundColor:theme.colors.background,alignItems:'center' as const,justifyContent:'center' as const,padding:24},
  brand:{flexDirection:'row' as const,alignItems:'center' as const,gap:8,marginBottom:20},
  brandText:{fontSize:24,fontWeight:'900' as const,color:theme.colors.goldHot},
  card:{alignItems:'center' as const,backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.borderGold,borderRadius:24,padding:24,...theme.shadow.gold},
  avatar:{width:100,height:100,borderRadius:50,backgroundColor:theme.colors.surfaceElevated,borderWidth:2,borderColor:theme.colors.borderGold,alignItems:'center' as const,justifyContent:'center' as const,overflow:'hidden' as const},
  avatarImage:{width:'100%' as const,height:'100%' as const},
  initial:{fontSize:40,fontWeight:'900' as const,color:theme.colors.goldHot},
  name:{fontSize:27,fontWeight:'900' as const,color:theme.colors.text,marginTop:14},
  handle:{fontSize:16,color:theme.colors.goldHot,marginTop:3},
  bio:{fontSize:17,lineHeight:22,color:theme.colors.textSecondary,textAlign:'center' as const,marginTop:16},
  bioMuted:{fontSize:16,color:theme.colors.muted,textAlign:'center' as const,marginTop:16},
  back:{paddingVertical:14},
  backText:{color:theme.colors.goldHot,fontWeight:'800' as const},
  note:{fontSize:14,lineHeight:18,color:theme.colors.muted,textAlign:'center' as const,marginTop:18},
}));

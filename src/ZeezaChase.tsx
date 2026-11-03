import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { NexaPressable } from './motion';
import { Ionicons } from '@expo/vector-icons';
import { s } from './styles';
import { theme, themedStyles, ds } from './theme';
import { apiChaseUsers, apiFriendRequestByChase, apiChaseLike, apiChaseUnlike, apiChaseComments, apiChaseComment, apiChaseReport, type ChaseUser } from './friends';

function Avatar({ user }: { user: ChaseUser }) {
  const initial = (user.name || 'Z').trim().slice(0, 1).toUpperCase();
  return user.avatarUrl ? <Image accessible accessibilityRole="image" accessibilityLabel={`${user.name || 'User'} avatar`} source={{ uri: user.avatarUrl }} style={local.avatar} /> : <View style={local.avatar}><Text style={local.initial}>{initial}</Text></View>;
}

function proximityLabel(value: ChaseUser['proximity']) {
  if (value === 'local') return 'Near your area';
  if (value === 'country') return 'Same country';
  return 'Farther away';
}

export function ZeezaChase() {
  const [users, setUsers] = useState<ChaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [commenting,setCommenting]=useState<string|null>(null);
  const [commentText,setCommentText]=useState<Record<string,string>>({});
  const [comments,setComments]=useState<Record<string,any[]>>({});
  const [showDemo,setShowDemo]=useState(true);
  const [ageMin,setAgeMin]=useState(''); const [ageMax,setAgeMax]=useState(''); const [nationality,setNationality]=useState(''); const [town,setTown]=useState(''); const [heightMin,setHeightMin]=useState(''); const [heightMax,setHeightMax]=useState(''); const [jobType,setJobType]=useState('');
  const loadRequest=useRef(0);

  const load = useCallback(async () => {
    const requestId=++loadRequest.current;
    try {
      const result = await apiChaseUsers();
      if(requestId!==loadRequest.current)return;
      setUsers(result);
    } catch (e: any) {
      if(requestId===loadRequest.current)Alert.alert('Chase', e?.message || 'Could not load Zeeza Chase right now.');
    } finally { if(requestId===loadRequest.current)setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const demoUsers: ChaseUser[] = showDemo ? [
    {id:'demo-lifestyle-1',username:'amara.lifestyle',name:'Amara K.',avatarUrl:null,bio:'Lifestyle, travel and everyday moments. This is a Chase preview profile.',country:'Nigeria',city:'Lagos',proximity:'local',age:26,nationality:'Nigerian',heightCm:168,jobType:'Creative',likeCount:148,commentCount:6,likedByMe:false,demo:true},
    {id:'demo-lifestyle-2',username:'daniel.moves',name:'Daniel M.',avatarUrl:null,bio:'Fitness, city life and weekend adventures. Demo showcase only.',country:'Nigeria',city:'Abuja',proximity:'country',age:29,nationality:'Nigerian',heightCm:180,jobType:'Fitness',likeCount:312,commentCount:18,likedByMe:false,demo:true}
  ] : [];
  const displayUsers = useMemo(() => [...demoUsers,...users], [demoUsers,users]);
  const filteredUsers = useMemo(() => displayUsers.filter(user => {
    if(ageMin && (user.age == null || user.age < Number(ageMin))) return false;
    if(ageMax && (user.age == null || user.age > Number(ageMax))) return false;
    if(nationality.trim() && !String(user.nationality||'').toLowerCase().includes(nationality.trim().toLowerCase())) return false;
    if(town.trim() && !String(user.city||'').toLowerCase().includes(town.trim().toLowerCase())) return false;
    if(heightMin && (user.heightCm == null || user.heightCm < Number(heightMin))) return false;
    if(heightMax && (user.heightCm == null || user.heightCm > Number(heightMax))) return false;
    if(jobType.trim() && !String(user.jobType||'').toLowerCase().includes(jobType.trim().toLowerCase())) return false;
    return true;
  }),[displayUsers,ageMin,ageMax,nationality,town,heightMin,heightMax,jobType]);

  const add = async (user: ChaseUser) => {
    setBusy(user.id);
    try {
      await apiFriendRequestByChase(user.id);
      setUsers(prev => prev.filter(x => x.id !== user.id));
      Alert.alert('Request sent', `Your Zeeza friend request was sent to ${user.name}.`);
    } catch (e: any) {
      Alert.alert('Could not add friend', e?.message || 'Please try again later.');
    } finally { setBusy(null); }
  };

  const toggleLike = async (user: ChaseUser) => {
    if (user.demo) { Alert.alert('Chase preview','Demo profiles are visual previews only. No real like or Aami activity is recorded.'); return; }
    try { const result = user.likedByMe ? await apiChaseUnlike(user.id) : await apiChaseLike(user.id); setUsers(prev=>prev.map(x=>x.id===user.id?{...x,likedByMe:result.liked,likeCount:result.likeCount}:x)); if((result as any).reward?.amount) Alert.alert('Aami',`You earned ${(result as any).reward.amount} Aami.`); } catch(e:any){ Alert.alert('Chase',e?.message||'Could not update the like.'); }
  };
  const loadComments = async (user: ChaseUser) => { setCommenting(commenting===user.id?null:user.id); if(commenting===user.id)return; try { const list = await apiChaseComments(user.id); setComments(v=>({...v,[user.id]:list})); } catch(e:any){ Alert.alert('Comments',e?.message||'Could not load comments.'); } };
  const submitComment = async (user: ChaseUser) => { const text=String(commentText[user.id]||'').trim(); if(!text)return; try { const r=await apiChaseComment(user.id,text); setCommentText(v=>({...v,[user.id]:''})); setComments(v=>({...v,[user.id]:[r.comment,...(v[user.id]||[])]})); setUsers(prev=>prev.map(x=>x.id===user.id?{...x,commentCount:r.commentCount}:x)); } catch(e:any){ Alert.alert('Comment',e?.message||'Could not add comment.'); } };

  const submitReport = async (user: ChaseUser, reason: string) => { try { await apiChaseReport(user.id, reason); Alert.alert('Report sent','The Chase account was sent to the Administrative Director for review.'); } catch(e:any) { Alert.alert('Chase',e?.message||'Could not send the report.'); } };
  const report = (user: ChaseUser) => { if(user.demo)return; Alert.alert('Flag this Chase account?','Choose a reason.',[{text:'Spam',onPress:()=>submitReport(user,'spam')},{text:'Harassment',onPress:()=>submitReport(user,'harassment')},{text:'Unsafe',onPress:()=>submitReport(user,'unsafe')},{text:'Nudity / adult content',onPress:()=>submitReport(user,'nudity')},{text:'Something else',onPress:()=>submitReport(user,'other')},{text:'Cancel',style:'cancel'}]); };

  return <ScrollView style={s.wrap} contentContainerStyle={ds({ paddingBottom: 120 })} refreshControl={<RefreshControl refreshing={refreshing} tintColor={theme.colors.goldBright} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
    <View style={local.hero}>
      <View style={ds({ flex: 1 })}>
        <Text style={s.title}>Chase Zeeza</Text>
        <Text style={s.subtitle}>Meet people who chose to be discoverable. Chase shows only profiles that opted in.</Text>
      </View>
      <Ionicons name="compass-outline" size={32} color={theme.colors.goldBright} />
    </View>

    <View style={local.chaseCard}>
      <Ionicons name="sparkles-outline" size={21} color={theme.colors.goldBright} />
      <View style={ds({ flex: 1 })}>
        <Text style={local.chaseTitle}>You are in Chase mode</Text>
        <Text style={local.chaseText}>Chase new friendships, shared interests and real-life connections. A profile is an invitation to say hello — never a promise or pressure to respond.</Text>
        <View style={local.vibeRow}><Text style={local.vibe}>Friendship</Text><Text style={local.vibe}>Shared interests</Text><Text style={local.vibe}>Meet people</Text></View>
      </View>
    </View>

    <View style={local.safetyCard}>
      <Ionicons name="shield-checkmark-outline" size={21} color={theme.colors.goldBright} />
      <Text style={local.safetyText}>For safety, adding strangers is limited by approximate area: local profiles have the most room, farther-away adds are more restricted. Zeeza never asks for or displays an exact address here.</Text>
    </View>

    <NexaPressable accessibilityRole="switch" accessibilityState={{checked:showDemo}} accessibilityLabel="Show Chase demo profiles" onPress={()=>setShowDemo(v=>!v)} style={local.demoToggle}><Ionicons name={showDemo?"eye-outline":"eye-off-outline"} size={18} color={theme.colors.goldBright}/><Text style={local.safetyText}>{showDemo?"Demo showcase profiles are visible":"Show demo showcase profiles"}</Text></NexaPressable>

    <View style={local.preferenceCard}><NexaPressable accessibilityRole="button" accessibilityLabel={filtersOpen?"Collapse Chase preferences":"Expand Chase preferences"} accessibilityState={{expanded:filtersOpen}} onPress={()=>setFiltersOpen(v=>!v)} style={ds({flexDirection:'row',alignItems:'center',justifyContent:'space-between'})}><View style={ds({flex:1,flexShrink:1,marginRight:10})}><Text style={local.chaseTitle}>Chase preferences</Text><Text style={local.safetyText}>Narrow your discovery by age, nationality, town, height or job type.</Text></View><Ionicons style={ds({flexShrink:0})} name={filtersOpen?'chevron-up':'chevron-down'} size={20} color={theme.colors.goldBright}/></NexaPressable>{filtersOpen&&<><View style={local.filterRow}><TextInput value={ageMin} onChangeText={setAgeMin} keyboardType="number-pad" placeholder="Age min" placeholderTextColor={theme.colors.muted} accessibilityLabel="Minimum Chase age" style={[local.filterInput,{flex:1}]}/><TextInput value={ageMax} onChangeText={setAgeMax} keyboardType="number-pad" placeholder="Age max" placeholderTextColor={theme.colors.muted} accessibilityLabel="Maximum Chase age" style={[local.filterInput,{flex:1}]}/></View><TextInput value={nationality} onChangeText={setNationality} placeholder="Nationality" placeholderTextColor={theme.colors.muted} accessibilityLabel="Chase nationality filter" style={local.filterInput}/><TextInput value={town} onChangeText={setTown} placeholder="Town / city" placeholderTextColor={theme.colors.muted} accessibilityLabel="Chase town or city filter" style={local.filterInput}/><View style={local.filterRow}><TextInput value={heightMin} onChangeText={setHeightMin} keyboardType="number-pad" placeholder="Height min (cm)" placeholderTextColor={theme.colors.muted} accessibilityLabel="Minimum Chase height in centimetres" style={[local.filterInput,{flex:1}]}/><TextInput value={heightMax} onChangeText={setHeightMax} keyboardType="number-pad" placeholder="Height max (cm)" placeholderTextColor={theme.colors.muted} accessibilityLabel="Maximum Chase height in centimetres" style={[local.filterInput,{flex:1}]}/></View><TextInput value={jobType} onChangeText={setJobType} placeholder="Job type" placeholderTextColor={theme.colors.muted} accessibilityLabel="Chase job type filter" style={local.filterInput}/><NexaPressable accessibilityRole="button" accessibilityLabel="Clear Chase preferences" accessibilityState={{disabled:loading}} disabled={loading} onPress={()=>{setAgeMin('');setAgeMax('');setNationality('');setTown('');setHeightMin('');setHeightMax('');setJobType('')}} style={[local.clearButton,{alignSelf:'flex-start'}]}><Text style={local.addText}>Clear preferences</Text></NexaPressable><Text style={local.safetyText}>Only attributes users chose to add to their Chase profile can match. Age is 18+ for Chase. Preferences filter the profiles currently available to your subscription reach.</Text></>}</View>

    {loading && users.length === 0 ? <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading Zeeza Chase profiles" color={theme.colors.goldBright} style={ds({ marginTop: 24 })} /> : null}
    {!loading && filteredUsers.length === 0 ? <View style={local.empty}><Text style={local.emptyTitle}>No new people to chase yet</Text><Text style={local.emptyText}>More people appear here when they choose to be showcased on Zeeza Chase.</Text></View> : null}
    {filteredUsers.map(user => <View key={user.id} style={local.card}>
      <View style={local.showcaseImage}><Avatar user={user} /><Text style={local.showcaseBadge}>{user.demo?'DEMO':'CHASE'}</Text></View>
      <View style={ds({ flex: 1, marginLeft: 12 })}>
        <Text style={local.name}>{user.name}</Text>
        {user.username ? <Text style={local.handle}>@{user.username}</Text> : null}
        <Text style={local.proximity}>{proximityLabel(user.proximity)}{user.city ? ` · ${user.city}` : ''}</Text>
        {user.bio ? <Text style={local.bio} numberOfLines={3}>{user.bio}</Text> : <Text style={local.bioMuted}>No status added yet.</Text>}
        {[user.age ? `${user.age}` : '',user.nationality||'',user.heightCm ? `${user.heightCm} cm` : '',user.jobType||''].filter(Boolean).join(' · ') ? <Text style={local.bioMuted}>{[user.age ? `${user.age}` : '',user.nationality||'',user.heightCm ? `${user.heightCm} cm` : '',user.jobType||''].filter(Boolean).join(' · ')}</Text> : null}
      </View>
      <View style={local.actions}>
        <NexaPressable accessibilityRole="button" accessibilityLabel={`${user.likedByMe?'Unlike':'Like'} ${user.name}'`} onPress={()=>toggleLike(user)} style={local.iconAction}><Ionicons name={user.likedByMe?'heart':'heart-outline'} size={20} color={user.likedByMe?theme.colors.goldHot:theme.colors.text}/><Text style={local.count}>{user.likeCount}</Text></NexaPressable>
        <NexaPressable accessibilityRole="button" accessibilityLabel={`Comments on ${user.name}`} onPress={()=>loadComments(user)} style={local.iconAction}><Ionicons name="chatbubble-outline" size={19} color={theme.colors.text}/><Text style={local.count}>{user.commentCount}</Text></NexaPressable>
        <NexaPressable disabled={user.demo} accessibilityState={{disabled:user.demo}} accessibilityRole="button" accessibilityLabel={`Flag ${user.name || "person"} on Chase`} onPress={()=>report(user)} style={local.iconAction}><Ionicons name="flag-outline" size={18} color={theme.colors.text}/></NexaPressable>
        <NexaPressable disabled={busy === user.id || user.demo} accessibilityState={{disabled:busy === user.id || user.demo}} accessibilityRole="button" accessibilityLabel={`Add ${user.name || "person"} from Chase`} onPress={() => add(user)} style={[local.add, (busy === user.id || user.demo) && { opacity: .55 }]}>
          {busy === user.id ? <ActivityIndicator color={theme.colors.black} /> : <><Ionicons name="person-add-outline" size={17} color={theme.colors.black} /><Text style={local.addText}>{user.demo?'Preview':'Add'}</Text></>}
        </NexaPressable>
      </View>
      {commenting===user.id ? <View style={local.commentBox}><TextInput accessibilityLabel={`Comment on ${user.name}`} value={commentText[user.id]||''} onChangeText={v=>setCommentText(x=>({...x,[user.id]:v}))} placeholder="Write a comment" placeholderTextColor={theme.colors.muted} style={local.commentInput} maxLength={500}/><NexaPressable accessibilityRole="button" accessibilityLabel={`Post comment on ${user.name}`} onPress={()=>submitComment(user)} style={local.commentButton}><Text style={local.addText}>Post</Text></NexaPressable>{(comments[user.id]||[]).slice(0,3).map((c:any)=><Text key={c.id} style={local.commentText}>{c.user?.name}: {c.comment}</Text>)}</View>:null}
    </View>)}
  </ScrollView>;
}

// Legacy compatibility: older imports resolve through src/ZeezaExplore.tsx, which re-exports ZeezaChase.

const local = themedStyles(() => ({
  demoToggle:{flexDirection:'row' as const,alignItems:'center' as const,gap:8,backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.border,borderRadius:12,padding:11,marginBottom:12},
  hero:{flexDirection:'row' as const,alignItems:'center' as const,gap:12,backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:theme.colors.borderGold,borderRadius:20,padding:18,marginBottom:12,...theme.shadow.gold},
  chaseCard:{flexDirection:'row' as const,alignItems:'flex-start' as const,gap:10,backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.borderGold,borderRadius:16,padding:14,marginBottom:12,...theme.shadow.gold},
  chaseTitle:{color:theme.colors.goldHot,fontSize:17,fontWeight:'900' as const},
  chaseText:{color:theme.colors.textSecondary,fontSize:14,lineHeight:18,marginTop:4},
  vibeRow:{flexDirection:'row' as const,flexWrap:'wrap' as const,gap:6,marginTop:9},
  vibe:{color:theme.colors.goldBright,fontSize:14,fontWeight:'800' as const,borderWidth:1,borderColor:theme.colors.borderGold,borderRadius:10,paddingHorizontal:8,paddingVertical:5},
  preferenceCard:{backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.borderGold,borderRadius:16,padding:14,marginBottom:14},
  filterRow:{flexDirection:'row' as const,gap:8,marginTop:8},
  filterInput:{backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:theme.colors.border,borderRadius:10,paddingHorizontal:11,paddingVertical:10,color:theme.colors.text,marginTop:8},
  clearButton:{backgroundColor:theme.colors.goldBright,borderRadius:10,paddingHorizontal:11,paddingVertical:9,marginTop:10},
  safetyCard:{flexDirection:'row' as const,alignItems:'flex-start' as const,gap:10,backgroundColor:theme.colors.goldWash,borderWidth:1,borderColor:theme.colors.borderGold,borderRadius:16,padding:14,marginBottom:14},
  safetyText:{flex:1,color:theme.colors.textSecondary,fontSize:14,lineHeight:18},
  showcaseImage:{alignSelf:'flex-start' as const,alignItems:'center' as const,gap:4},
  showcaseBadge:{color:theme.colors.goldBright,fontSize:15,fontWeight:'900' as const,letterSpacing:1},
  actions:{flexDirection:'row' as const,alignItems:'center' as const,gap:7,marginLeft:8},
  iconAction:{flexDirection:'row' as const,alignItems:'center' as const,gap:3,padding:7},
  count:{color:theme.colors.text,fontSize:14,fontWeight:'800' as const},
  commentBox:{marginTop:8,marginLeft:8,borderTopWidth:1,borderTopColor:theme.colors.border,paddingTop:8},
  commentInput:{backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:theme.colors.border,borderRadius:9,paddingHorizontal:9,paddingVertical:8,color:theme.colors.text},
  commentButton:{backgroundColor:theme.colors.goldBright,borderRadius:9,paddingHorizontal:12,paddingVertical:8,alignSelf:'flex-end' as const,marginTop:6},
  commentText:{color:theme.colors.textSecondary,fontSize:15,lineHeight:18,marginTop:5},
  card:{flexDirection:'row' as const,alignItems:'center' as const,backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.border,borderRadius:18,padding:14,marginBottom:10},
  avatar:{width:58,height:58,borderRadius:29,backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:theme.colors.borderGold,alignItems:'center' as const,justifyContent:'center' as const,overflow:'hidden' as const},
  initial:{fontSize:24,fontWeight:'900' as const,color:theme.colors.goldHot},
  name:{color:theme.colors.text,fontSize:17,fontWeight:'900' as const},
  handle:{color:theme.colors.muted,fontSize:14,marginTop:2},
  proximity:{color:theme.colors.goldBright,fontSize:15,fontWeight:'800' as const,marginTop:5},
  bio:{color:theme.colors.textSecondary,fontSize:14,lineHeight:17,marginTop:5},
  bioMuted:{color:theme.colors.muted,fontSize:14,marginTop:5},
  add:{flexDirection:'row' as const,alignItems:'center' as const,gap:5,backgroundColor:theme.colors.goldBright,borderRadius:11,paddingHorizontal:10,paddingVertical:10,marginLeft:8},
  addText:{color:theme.colors.black,fontWeight:'900' as const,fontSize:14},
  empty:{backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.border,borderRadius:18,padding:22,alignItems:'center' as const},
  emptyTitle:{color:theme.colors.text,fontWeight:'900' as const,fontSize:18},
  emptyText:{color:theme.colors.muted,textAlign:'center' as const,lineHeight:19,marginTop:6},
}));

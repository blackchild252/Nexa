import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { s } from './styles';
import { theme, ds } from './theme';
import { NexaPressable } from './motion';
import { useFriends } from './useFriends';
import { apiLifestyleFeed, apiLifestylePost, apiLifestyleDelete, apiLifestyleLike, apiLifestyleComments, apiLifestyleComment, apiLifestyleCommentDelete, apiLifestyleReport, apiLifestyleCommentReport, apiLifestyleGetPost, isSafePostId, mergeFeedPage, LIFESTYLE_REPORT_REASONS, timeAgo, type LifestylePost, type LifestyleComment } from './lifestyle';

// Lifestyle (V5.99.72): friends' photo posts plus two round buttons at the bottom right.
// Lower, larger button = take a new photo or video. Upper, smaller button = post a recent one from the phone.
// Photos and videos are shared with friends through the server, with likes, comments and an optional caption.

type MyPost = { id: string; uri: string; video: boolean };

function initials(name: string): string {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

function VerifiedMark({ name }: { name: string }) {
  return <Ionicons name="checkmark-circle" size={14} color={theme.colors.brightGold} accessibilityLabel={`${name} is verified`} style={ds({ marginLeft: 4 })} />;
}

function PostCard({ post, onChange, onDelete, onHide }: { post: LifestylePost; onChange: (p: LifestylePost) => void; onDelete: (id: string) => void; onHide: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<LifestyleComment[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const circle = { alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 999 };

  const like = async () => {
    const before = post;
    onChange({ ...post, liked: !post.liked, likeCount: Math.max(0, post.likeCount + (post.liked ? -1 : 1)) });
    try { const c = await apiLifestyleLike(post.id); onChange({ ...post, ...c }); }
    catch (e: any) { onChange(before); Alert.alert('Could not like that', e?.message || 'Please try again.'); }
  };
  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      try { setComments(await apiLifestyleComments(post.id)); setError(''); }
      catch (e: any) { setError(e?.message || 'Could not load comments.'); setComments([]); }
    }
  };
  const send = async () => {
    const body = text.trim();
    if (!body) { setError('Write a comment first.'); return; }
    setBusy(true);
    try {
      const r = await apiLifestyleComment(post.id, body);
      setComments((c) => [...(c || []), r.comment]); setText(''); setError('');
      onChange({ ...post, commentCount: r.commentCount });
    } catch (e: any) { setError(e?.message || 'Could not post that comment.'); }
    finally { setBusy(false); }
  };
  const report = () => Alert.alert('Report this post?', 'Why are you reporting it? It will be hidden from you right away.', [
    ...LIFESTYLE_REPORT_REASONS.map((r) => ({ text: r.label, onPress: async () => {
      try { await apiLifestyleReport(post.id, r.key); onHide(post.id); Alert.alert('Thanks for telling us', 'The post is hidden from you. Our team will look at it.'); }
      catch (e: any) { Alert.alert('Could not send the report', e?.message || 'Please try again.'); }
    } })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
  const reportComment = (c: LifestyleComment) => Alert.alert('Report this comment?', 'Why are you reporting it? It will be hidden from you right away.', [
    ...LIFESTYLE_REPORT_REASONS.map((r) => ({ text: r.label, onPress: async () => {
      try {
        await apiLifestyleCommentReport(c.id, r.key);
        setComments((x) => (x || []).filter((y) => y.id !== c.id));
        onChange({ ...post, commentCount: Math.max(0, post.commentCount - 1) });
        Alert.alert('Thanks for telling us', 'The comment is hidden from you. Our team will look at it.');
      } catch (e: any) { Alert.alert('Could not send the report', e?.message || 'Please try again.'); }
    } })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
  const removeComment = (c: LifestyleComment) => Alert.alert('Delete this comment?', '', [
    { text: 'Keep', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { const r = await apiLifestyleCommentDelete(c.id); setComments((x) => (x || []).filter((y) => y.id !== c.id)); onChange({ ...post, commentCount: r.commentCount }); }
      catch (e: any) { Alert.alert('Could not delete', e?.message || 'Please try again.'); }
    } },
  ]);

  return (
    <View style={[s.card, ds({ marginTop: 14, padding: 0, overflow: 'hidden' })]}>
      <View style={ds({ flexDirection: 'row', alignItems: 'center', padding: 12 })}>
        <View style={[circle, ds({ width: 32, height: 32, overflow: 'hidden', backgroundColor: theme.colors.goldWash })]}>
          {post.author.avatarUrl ? <Image accessible accessibilityRole="image" accessibilityLabel={`${post.author.name} profile photo`} source={{ uri: post.author.avatarUrl }} style={ds({ width: '100%', height: '100%' })} /> : <Text style={ds({ color: theme.colors.brightGold, fontSize: 14, fontWeight: '600' })}>{initials(post.author.name)}</Text>}
        </View>
        <View style={ds({ marginLeft: 10, flex: 1 })}><View style={ds({ flexDirection: 'row', alignItems: 'center' })}><Text style={ds({ color: theme.colors.text, fontWeight: '600' })}>{post.mine ? 'You' : post.author.name}</Text>{post.author.verified ? <VerifiedMark name={post.author.name} /> : null}</View><Text style={[s.muted, ds({ fontSize: 14 })]}>{timeAgo(post.createdAt)}</Text></View>
        {post.mine ? <NexaPressable accessibilityRole="button" accessibilityLabel="Delete your post" onPress={() => onDelete(post.id)} style={ds({ padding: 8 })}><Ionicons name="trash-outline" size={20} color={theme.colors.muted} /></NexaPressable> : <NexaPressable accessibilityRole="button" accessibilityLabel={`Report post from ${post.author.name}`} onPress={report} style={ds({ padding: 8 })}><Ionicons name="flag-outline" size={20} color={theme.colors.muted} /></NexaPressable>}
      </View>
      <>{post.kind === "video" ? <Video source={{ uri: post.photo }} style={ds({ width: '100%', height: 260 })} resizeMode={ResizeMode.COVER} useNativeControls shouldPlay={false} accessibilityLabel={`Video from ${post.mine ? 'you' : post.author.name}`} /> : <Image source={{ uri: post.photo }} style={ds({ width: '100%', height: 260 })} resizeMode="cover" accessibilityLabel={`Photo from ${post.mine ? 'you' : post.author.name}`} />}</>
      {post.caption ? <Text style={[s.muted, ds({ padding: 12, paddingBottom: 4 })]}>{post.caption}</Text> : null}
      <View style={ds({ flexDirection: 'row', alignItems: 'center', padding: 8 })}>
        <NexaPressable accessibilityRole="button" accessibilityState={{ selected: post.liked }} accessibilityLabel={post.liked ? `Unlike, ${post.likeCount} likes` : `Like, ${post.likeCount} likes`} onPress={like} style={ds({ flexDirection: 'row', alignItems: 'center', padding: 8, minHeight: 44 })}>
          <Ionicons name={post.liked ? 'heart' : 'heart-outline'} size={22} color={theme.colors.brightGold} /><Text style={[s.muted, ds({ marginLeft: 6 })]}>{post.likeCount}</Text>
        </NexaPressable>
        <NexaPressable accessibilityRole="button" accessibilityLabel={`Comments, ${post.commentCount}`} onPress={toggle} style={ds({ flexDirection: 'row', alignItems: 'center', padding: 8, marginLeft: 8, minHeight: 44 })}>
          <Ionicons name="chatbubble-outline" size={20} color={theme.colors.brightGold} /><Text style={[s.muted, ds({ marginLeft: 6 })]}>{post.commentCount}</Text>
        </NexaPressable>
      </View>
      {open ? (
        <View style={ds({ paddingHorizontal: 12, paddingBottom: 12 })}>
          {comments === null ? <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading comments" color={theme.colors.brightGold} /> : null}
          {(comments || []).map((c) => (
            <View key={c.id} style={ds({ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 })}>
              <Text style={ds({ flex: 1, color: theme.colors.text })}><Text style={ds({ fontWeight: '600' })}>{c.mine ? 'You' : c.author.name} </Text>{c.author.verified ? <Ionicons name="checkmark-circle" size={12} color={theme.colors.brightGold} accessibilityLabel={`${c.author.name} is verified`} /> : null}{c.author.verified ? ' ' : ''}{c.body}</Text>
              {!c.mine ? <NexaPressable accessibilityRole="button" accessibilityLabel={`Report comment from ${c.author.name}`} onPress={() => reportComment(c)} style={ds({ padding: 8 })}><Ionicons name="flag-outline" size={16} color={theme.colors.muted} /></NexaPressable> : null}
              {c.mine || post.mine ? <NexaPressable accessibilityRole="button" accessibilityLabel="Delete comment" onPress={() => removeComment(c)} style={ds({ padding: 8 })}><Ionicons name="close" size={16} color={theme.colors.muted} /></NexaPressable> : null}
            </View>
          ))}
          {comments && !comments.length && !error ? <Text style={[s.muted, ds({ marginBottom: 8 })]}>No comments yet.</Text> : null}
          <View style={ds({ flexDirection: 'row', alignItems: 'center' })}>
            <TextInput accessibilityLabel={`Comment on ${post.author.name}`} value={text} onChangeText={(v) => { setText(v); setError(''); }} placeholder="Write a comment" placeholderTextColor={theme.colors.muted} maxLength={300} accessibilityLabel="Write a comment" style={[s.authInput, ds({ flex: 1, marginTop: 0 })]} />
            <NexaPressable accessibilityRole="button" accessibilityLabel="Send comment" onPress={send} style={[circle, ds({ width: 44, height: 44, marginLeft: 8, backgroundColor: theme.colors.brightGold })]}>
              {busy ? <ActivityIndicator color={theme.colors.deepBlack} /> : <Ionicons name="send" size={18} color={theme.colors.deepBlack} />}
            </NexaPressable>
          </View>
          {error ? <Text style={[s.muted, ds({ marginTop: 6 })]} accessibilityLiveRegion="polite">{error}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export function LifestyleScreen({ postId }: { postId?: string } = {}) {
  const friendsState = useFriends({ active: true });
  const friends = (friendsState.friends || []) as Array<{ id: string; name: string; username: string | null; avatarUrl: string | null }>;
  const [mine, setMine] = useState<MyPost[]>([]);
  const [posts, setPosts] = useState<LifestylePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);
  const [caption, setCaption] = useState('');
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  // B323: the post an alert pointed at. Shown first, with a short note if it is no longer available.
  const [focus, setFocus] = useState<LifestylePost | null>(null);
  const [focusGone, setFocusGone] = useState(false);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try { const page = await apiLifestyleFeed(); setPosts(page.posts); setNextBefore(page.nextBefore); setMoreError(''); setError(''); }
    catch (e: any) { setError(e?.message || 'Could not load Lifestyle right now.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setFocus(null); setFocusGone(false);
    if (!isSafePostId(postId)) return;
    let live = true;
    apiLifestyleGetPost(postId).then((p) => { if (live) setFocus(p); }).catch(() => { if (live) setFocusGone(true); });
    return () => { live = false; };
  }, [postId]);

  // Load more (M4548). An empty page means the end, even if the server sent another cursor.
  const loadMore = async () => {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await apiLifestyleFeed(nextBefore);
      setPosts((all) => mergeFeedPage(all, page.posts));
      setNextBefore(page.posts.length ? page.nextBefore : null);
      setMoreError('');
    } catch (e: any) { setMoreError(e?.message || 'Could not load more right now.'); }
    finally { setLoadingMore(false); }
  };

  const sharePhoto = async (a: any) => {
    if (!a?.base64) { Alert.alert('Could not read that photo', 'Please pick another one.'); return; }
    const mime = String(a.mimeType || 'image/jpeg').toLowerCase();
    setPosting(true);
    try { const post = await apiLifestylePost(`data:${mime};base64,${a.base64}`, caption.trim() || undefined, a.type === "video" ? "video" : "photo"); setPosts((p) => [post, ...p]); setCaption(''); }
    catch (e: any) { Alert.alert('Could not post that', e?.message || 'Please try again.'); }
    finally { setPosting(false); }
  };
  const handle = (r: any) => {
    const a = !r.canceled ? r.assets?.[0] : null;
    if (!a) return;
    sharePhoto(a);
  };
  const remove = (id: string) => Alert.alert('Delete this post?', 'It will be removed for you and your friends.', [
    { text: 'Keep', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await apiLifestyleDelete(id); setPosts((p) => p.filter((x) => x.id !== id)); setFocus((f) => (f && f.id === id ? null : f)); } catch (e: any) { Alert.alert('Could not delete', e?.message || 'Please try again.'); } } },
  ]);

  const pickRecent = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Photos are off', 'Allow photo access in your phone settings to post a recent photo or video.'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'] as any, quality: 0.3, base64: true });
      handle(r);
    } catch { Alert.alert('Could not open photos', 'Please try again.'); }
  };

  const takeNew = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Camera is off', 'Allow camera access in your phone settings to take a photo or video.'); return; }
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'] as any, quality: 0.3, base64: true });
      handle(r);
    } catch { Alert.alert('Could not open the camera', 'Please try again.'); }
  };

  const ring = { borderWidth: 1.5, borderColor: theme.colors.brightGold };
  const circle = { alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 999 };

  return (
    <View style={ds({ flex: 1 })}>
      <ScrollView style={s.wrap} contentContainerStyle={ds({ paddingBottom: 190 })} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.brightGold} />}>
        <Text style={s.title} accessibilityRole="header">Lifestyle</Text>
        <Text style={s.subtitle}>Moments from you and your friends.</Text>
        <TextInput value={caption} onChangeText={setCaption} placeholder="Caption for your next photo or video (optional)" placeholderTextColor={theme.colors.muted} maxLength={300} accessibilityLabel="Caption for your next photo" style={[s.authInput, ds({ marginTop: 14 })]} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ds({ marginTop: 16 })} accessibilityLabel="Friends' moments">
          <NexaPressable accessibilityRole="button" accessibilityLabel="Add your moment" onPress={pickRecent} style={ds({ alignItems: 'center', width: 70 })}>
            <View style={[circle, ring, ds({ width: 56, height: 56, borderStyle: 'dashed' })]}><Ionicons name="add" size={26} color={theme.colors.brightGold} /></View>
            <Text style={[s.muted, ds({ fontSize: 14, marginTop: 4 })]}>Your moment</Text>
          </NexaPressable>
          {friends.map((f) => (
            <View key={f.id} style={ds({ alignItems: 'center', width: 70 })} accessible accessibilityLabel={`${f.name}, friend`}>
              <View style={[circle, ring, ds({ width: 56, height: 56, overflow: 'hidden', backgroundColor: theme.colors.card })]}>
                {f.avatarUrl ? <Image source={{ uri: f.avatarUrl }} style={ds({ width: '100%', height: '100%' })} accessibilityLabel={`${f.name} profile photo`} /> : <Text style={[s.section, ds({ marginBottom: 0, fontSize: 18 })]}>{initials(f.name)}</Text>}
              </View>
              <Text numberOfLines={1} style={[s.muted, ds({ fontSize: 14, marginTop: 4 })]}>{f.name.split(' ')[0]}</Text>
            </View>
          ))}
        </ScrollView>

        {posting ? <View style={ds({ marginTop: 14, flexDirection: 'row', alignItems: 'center' })} accessibilityLiveRegion="polite"><ActivityIndicator color={theme.colors.brightGold} /><Text style={[s.muted, ds({ marginLeft: 10 })]}>Posting your photo…</Text></View> : null}
        {error && !loading ? <Text style={[s.muted, ds({ marginTop: 14 })]} accessibilityLiveRegion="polite">{error} Pull down to try again.</Text> : null}

        {focusGone ? <View style={[s.card, ds({ marginTop: 14 })]} accessibilityLiveRegion="polite"><Text style={s.muted}>That post is no longer available.</Text><NexaPressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={() => setFocusGone(false)} style={ds({ minHeight: 44, justifyContent: 'center' })}><Text style={ds({ color: theme.colors.brightGold, fontWeight: '600' })}>OK</Text></NexaPressable></View> : null}
        {focus ? <PostCard key={`focus-${focus.id}`} post={focus} onChange={(next) => { setFocus(next); setPosts((all) => all.map((x) => (x.id === next.id ? next : x))); }} onDelete={remove} onHide={(id) => { setFocus(null); setPosts((all) => all.filter((x) => x.id !== id)); }} /> : null}

        {posts.filter((p) => p.id !== focus?.id).map((p) => <PostCard key={p.id} post={p} onChange={(next) => setPosts((all) => all.map((x) => (x.id === next.id ? next : x)))} onDelete={remove} onHide={(id) => setPosts((all) => all.filter((x) => x.id !== id))} />)}

        {mine.map((p) => (
          <View key={p.id} style={[s.card, ds({ marginTop: 14, padding: 0, overflow: 'hidden' })]}>
            <View style={ds({ flexDirection: 'row', alignItems: 'center', padding: 12 })}>
              <View style={[circle, ds({ width: 32, height: 32, backgroundColor: theme.colors.goldWash })]}><Ionicons name="person" size={16} color={theme.colors.brightGold} /></View>
              <View style={ds({ marginLeft: 10 })}><Text style={ds({ color: theme.colors.text, fontWeight: '600' })}>You</Text><Text style={[s.muted, ds({ fontSize: 14 })]}>Video · on this phone only</Text></View>
            </View>
            <View>
              {p.video ? <Video source={{ uri: p.uri }} style={ds({ width: '100%', height: 220 })} resizeMode={ResizeMode.COVER} useNativeControls shouldPlay={false} accessibilityLabel="Your new video" /> : <Image source={{ uri: p.uri }} style={ds({ width: '100%', height: 220 })} resizeMode="cover" accessibilityLabel="Your new photo" />}
            </View>
          </View>
        ))}

        {nextBefore ? (
          <View style={ds({ marginTop: 14, alignItems: 'center' })}>
            <NexaPressable accessibilityRole="button" accessibilityLabel="Load more posts" onPress={loadMore} style={ds({ minHeight: 44, paddingHorizontal: 20, justifyContent: 'center' })}>
              {loadingMore ? <ActivityIndicator color={theme.colors.brightGold} /> : <Text style={ds({ color: theme.colors.brightGold, fontWeight: '600' })}>Load more</Text>}
            </NexaPressable>
            {moreError ? <Text style={[s.muted, ds({ marginTop: 6 })]} accessibilityLiveRegion="polite">{moreError}</Text> : null}
          </View>
        ) : null}

        {!nextBefore ? <View style={[s.card, ds({ marginTop: 14, alignItems: 'center' })]}>
          <Ionicons name="images-outline" size={34} color={theme.colors.brightGold} />
          <Text style={[s.section, ds({ marginTop: 8, marginBottom: 4 })]}>{posts.length || mine.length ? 'That is everything for now' : friends.length ? 'No posts yet' : 'Add friends to see their moments'}</Text>
          <Text style={[s.muted, ds({ textAlign: 'center' })]}>{friends.length ? 'When a friend posts a photo, it shows here with their name.' : 'Find friends in Zeeza. Their photos will show here with their names.'}</Text>
        </View> : null}
      </ScrollView>

      <View style={ds({ position: 'absolute', right: 16, bottom: 24, alignItems: 'center' })} pointerEvents="box-none">
        <NexaPressable accessibilityRole="button" accessibilityLabel="Post a recent photo or video" onPress={pickRecent} style={[circle, ring, ds({ width: 46, height: 46, marginBottom: 12, backgroundColor: theme.colors.card })]}>
          <Ionicons name="images" size={22} color={theme.colors.brightGold} />
        </NexaPressable>
        <NexaPressable accessibilityRole="button" accessibilityLabel="Take a new photo or video" onPress={takeNew} style={[circle, ds({ width: 58, height: 58, backgroundColor: theme.colors.brightGold })]}>
          <Ionicons name="camera" size={28} color={theme.colors.deepBlack} />
        </NexaPressable>
      </View>
    </View>
  );
}

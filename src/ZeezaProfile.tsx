import { buttonA11y } from './accessibility';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Share, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from './brand';
import { setMyAvatar } from './myAvatar';
import { authedFetch } from './api';
import { theme, themedStyles, ds } from './theme';
import { s } from './styles';
import {NexaPressable} from './motion';
import { ss } from './socialStyles';
import { apiCreateZeezaShareLink, apiMyProfile, apiUpdateMyProfile, apiUploadProfileAvatar, type SocialProfile } from './friends';
import { CountryPicker } from './CountryPicker';

type Props = { onBack?: () => void };

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function ZeezaProfile({ onBack }: Props) {
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const loadRequest = useRef(0);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('friends');
  const [loading, setLoading] = useState(true);
  const [referralBusy, setReferralBusy] = useState(false);
  const [referralStatus, setReferralStatus] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [chaseOptIn, setChaseOptIn] = useState(false);
  const [chaseCountry, setChaseCountry] = useState('');
  const [chaseCity, setChaseCity] = useState('');
  const [chaseAge, setChaseAge] = useState('');
  const [chaseNationality, setChaseNationality] = useState('');
  const [chaseHeightCm, setChaseHeightCm] = useState('');
  const [chaseJobType, setChaseJobType] = useState('');

  const load = useCallback(async () => {
    const requestId = ++loadRequest.current;
    setLoading(true);
    try {
      const p = await apiMyProfile();
      if (requestId !== loadRequest.current) return;
      setProfile(p);
      setBio(p.bio || '');
      setAvatarUrl(p.avatarUrl || ''); setMyAvatar(p.avatarUrl);
      setVisibility(p.visibility || 'friends');
      setChaseOptIn(!!(p.chaseOptIn ?? p.exploreOptIn));
      setChaseCountry(p.chaseCountry || p.exploreCountry || '');
      setChaseCity(p.chaseCity || p.exploreCity || '');
      setChaseAge(p.chaseAge == null ? '' : String(p.chaseAge));
      setChaseNationality(p.chaseNationality || '');
      setChaseHeightCm(p.chaseHeightCm == null ? '' : String(p.chaseHeightCm));
      setChaseJobType(p.chaseJobType || '');
    } catch (e: any) {
      if (requestId === loadRequest.current) Alert.alert('Profile', e?.message || 'Could not load your Zeeza profile.');
    } finally {
      if (requestId === loadRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const words = useMemo(() => wordCount(bio), [bio]);
  const initials = (profile?.name || 'Z').trim().slice(0, 1).toUpperCase();

  const chooseAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow Zeeza to access your photos so you can choose a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.68,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const asset = result.assets[0];
      const mime = asset.mimeType === 'image/png' ? 'image/png' : asset.mimeType === 'image/webp' ? 'image/webp' : 'image/jpeg';
      setAvatarBusy(true);
      const p = await apiUploadProfileAvatar(asset.base64!, mime);
      setProfile(p);
      setAvatarUrl(p.avatarUrl || ''); setMyAvatar(p.avatarUrl);
      Alert.alert('Profile picture updated', 'Your Zeeza profile now has your picture.');
    } catch (e: any) {
      Alert.alert('Could not update profile picture', e?.message || 'Please choose another photo and try again.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const shareZeezaReferral = async () => {
    try {
      setReferralBusy(true);
      const result: any = await authedFetch('/api/growth/referrals/me');
      const token = String(result?.token || '').trim();
      if (!token) {
        Alert.alert('Referral link unavailable', 'Your referral link could not be generated. Please try again.');
        return;
      }
      const link = `nexa://auth/signup?ref=${encodeURIComponent(token)}`;
      await Share.share({
        message: `Join me on NEXA through Zeeza. Sign up and activate your account using my referral link: ${link}`,
      });
      setReferralStatus(result?.campaignStatus || null);
    } catch (e: any) {
      Alert.alert('Referral link unavailable', e?.message || 'Please try again.');
    } finally {
      setReferralBusy(false);
    }
  };

  const shareProfile = async () => {
    try {
      if (!profile?.username) {
        Alert.alert('Add a username first', 'Set your Zeeza username so your shared profile has a clear identity.');
        setShowEdit(true);
        return;
      }
      const token = await apiCreateZeezaShareLink();
      const link = `nexa://zeeza/share/${token}`;
      await Share.share({
        message: `Add me on Zeeza — ${profile.name}${profile.username ? ` (@${profile.username})` : ''}.\n\nOpen my NEXA profile: ${link}`,
      });
    } catch (e: any) {
      Alert.alert('Could not share profile', e?.message || 'Please try again.');
    }
  };

  const save = async () => {
    if (words > 200) {
      Alert.alert('Bio is too long', 'Keep your Zeeza status/bio within 200 words.');
      return;
    }
    if (chaseOptIn && !chaseNationality.trim()) {
      Alert.alert('Nationality is required', 'Add your nationality to appear on Zeeza Chase.');
      return;
    }
    setSaving(true);
    try {
      const p = await apiUpdateMyProfile({ bio: bio.trim(), avatarUrl: avatarUrl.trim() || null, visibility, chaseOptIn, chaseCountry: chaseCountry.trim(), chaseCity: chaseCity.trim(), chaseAge: chaseAge.trim() ? Number(chaseAge) : null, chaseNationality: chaseNationality.trim(), chaseHeightCm: chaseHeightCm.trim() ? Number(chaseHeightCm) : null, chaseJobType: chaseJobType.trim() });
      setProfile(p);
      setBio(p.bio || '');
      setAvatarUrl(p.avatarUrl || ''); setMyAvatar(p.avatarUrl);
      setVisibility(p.visibility || 'friends');
      setShowEdit(false);
      Alert.alert('Profile updated', 'Your Zeeza profile is ready to share with friends.');
    } catch (e: any) {
      Alert.alert('Could not save profile', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View accessibilityLiveRegion="polite" style={[s.wrap, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading Zeeza profile" color={theme.colors.goldBright} /></View>;
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={ds({ paddingBottom: 120 })}>
      <View style={local.header}>
        {onBack ? <NexaPressable accessibilityRole="button" onPress={onBack} style={local.back} accessibilityLabel="Back to Zeeza"><Ionicons name="chevron-back" size={25} color={theme.colors.goldHot} /></NexaPressable> : null}
        <View style={ds({ flex: 1 })}>
          <Text style={s.title}>{BRAND.zeeza} profile</Text>
          <Text style={s.subtitle}>Your friendly space — introduce yourself, then keep the conversation going.</Text>
        </View>
      </View>

      <View style={local.heroCard}>
        <View style={local.avatarRing}>
          {profile?.avatarUrl ? <Image accessible accessibilityRole="image" accessibilityLabel={`${profile.name || 'Your'} profile photo`} source={{ uri: profile.avatarUrl }} style={local.avatarImage} /> : <Text style={local.avatarInitial}>{initials}</Text>}
          <NexaPressable accessibilityRole="button" disabled={avatarBusy} accessibilityState={{disabled:avatarBusy}} onPress={chooseAvatar} hitSlop={6} style={local.avatarCamera} accessibilityLabel={avatarBusy ? 'Updating Zeeza profile picture' : (profile?.avatarUrl ? 'Change Zeeza profile picture' : 'Add Zeeza profile picture')}>
            {avatarBusy ? <ActivityIndicator color={theme.colors.black} /> : <Ionicons name="camera" size={18} color={theme.colors.black} />}
          </NexaPressable>
        </View>
        <NexaPressable accessibilityRole="button" disabled={avatarBusy} accessibilityState={{disabled:avatarBusy}} onPress={chooseAvatar} accessibilityLabel={profile?.avatarUrl ? 'Change Zeeza profile picture' : 'Add Zeeza profile picture'}>
          <Text style={local.avatarLink}>{avatarBusy ? 'Updating picture…' : (profile?.avatarUrl ? 'Change photo' : 'Add profile photo')}</Text>
        </NexaPressable>
        <Text style={local.name}>{profile?.name || 'Zeeza friend'}</Text>
        {profile?.username ? <Text style={local.handle}>@{profile.username}</Text> : <Text style={local.handle}>Set a username so friends can find you</Text>}
        <View style={local.statusPill}><View style={local.onlineDot} /><Text style={local.statusText}>Ready to connect</Text></View>
      </View>

      <View style={local.infoCard}>
        <View style={local.sectionHead}><Text style={s.section}>About you</Text><NexaPressable {...buttonA11y(saving ? 'Saving Zeeza profile' : (showEdit ? 'Finish editing Zeeza profile' : 'Edit Zeeza profile'))} disabled={saving} accessibilityState={{disabled:saving}} onPress={() => setShowEdit(v => !v)}><Text style={local.action}>{showEdit ? 'Done' : 'Edit'}</Text></NexaPressable></View>
        <Text style={local.bio}>{profile?.bio?.trim() || 'Tell your friends a little about you. Your status can be up to 200 words.'}</Text>
        <Text style={local.count}>{wordCount(profile?.bio || '')}/200 words</Text>
      </View>

      {showEdit && (
        <View style={local.infoCard}>
          <Text style={s.section}>Edit your profile</Text>
          <Text style={local.label}>Status / bio</Text>
          <TextInput
            accessibilityLabel="Zeeza profile status or bio"
            style={[ss.searchInput, local.bioInput]}
            value={bio}
            onChangeText={setBio}
            multiline
            textAlignVertical="top"
            placeholder="What should your friends know about you?"
            placeholderTextColor={theme.colors.muted}
          />
          <Text style={[local.count, words > 200 && { color: theme.colors.errorText }]}>{words}/200 words</Text>

          <Text style={local.label}>Profile picture</Text>
          <View style={local.photoEditor}>
            <View style={local.smallAvatar}>
              {avatarUrl ? <Image accessible accessibilityRole="image" accessibilityLabel={`${profile?.name || 'Profile'} avatar`} source={{ uri: avatarUrl }} style={local.smallAvatarImage} /> : <Text style={local.smallAvatarInitial}>{initials}</Text>}
            </View>
            <View style={ds({ flex: 1 })}>
              <Text style={local.photoTitle}>{avatarUrl ? 'Your Zeeza picture is set' : 'Add a profile picture'}</Text>
              <Text style={local.helper}>Choose a square photo from your phone. Zeeza keeps the image inside your profile boundary.</Text>
            </View>
            <NexaPressable accessibilityRole="button" disabled={avatarBusy} accessibilityState={{disabled:avatarBusy}} onPress={chooseAvatar} style={local.photoButton} accessibilityLabel={avatarBusy?"Updating Zeeza profile picture":"Choose Zeeza profile picture"}>
              {avatarBusy ? <ActivityIndicator color={theme.colors.black} /> : <Ionicons name="camera-outline" size={18} color={theme.colors.black} />}
            </NexaPressable>
          </View>

          <Text style={local.label}>Profile visibility</Text>
          <View style={local.visibilityRow} accessibilityRole="radiogroup" accessibilityLabel="Zeeza profile visibility choices">
            {(['public', 'friends', 'private'] as const).map(v => (
              <NexaPressable key={v} accessibilityRole="radio" accessibilityState={{selected:visibility===v,disabled:saving}} accessibilityLabel={`Set profile visibility to ${v}`} disabled={saving} onPress={() => setVisibility(v)} style={[local.visibilityButton, visibility === v && local.visibilityButtonActive]}>
                <Text style={[local.visibilityText, visibility === v && local.visibilityTextActive]}>{v[0].toUpperCase() + v.slice(1)}</Text>
              </NexaPressable>
            ))}
          </View>
          <Text style={local.label}>Zeeza Chase</Text>
          <View style={local.termsCard}>
            <Text style={local.photoTitle}>Chase visibility — your choice</Text>
            <Text style={local.helper}>If you turn this on, your Zeeza name, username, profile picture, status and broad city/area may be shown to strangers in Chase. People can send you friend requests. Age (18+) is required. Nationality is required. Optional height and job type appear on your Chase card only when you provide them. You can turn Chase off later.</Text>
            <Text style={local.helper}>Safety rule: Chase never uses or displays your exact address. Stranger adds are rate-limited, with tighter limits for people farther away.</Text>
          </View>
          <NexaPressable disabled={saving} onPress={() => setChaseOptIn(v => !v)} style={[local.chaseToggle, chaseOptIn && local.chaseToggleOn]} accessibilityRole="switch" accessibilityLabel="Allow my Zeeza profile in Chase" accessibilityState={{ checked: chaseOptIn, disabled:saving }}>
            <View style={[local.toggleDot, chaseOptIn && local.toggleDotOn]} />
            <View style={ds({ flex: 1 })}>
              <Text style={local.photoTitle}>{chaseOptIn ? 'I agree — show me on Chase' : 'I do not agree — keep me out of Chase'}</Text>
              <Text style={local.helper}>Only opted-in users are showcased.</Text>
            </View>
          </NexaPressable>
          {chaseOptIn && <>
            <Text style={local.label}>Age (18+)</Text><TextInput accessibilityLabel="Chase age" value={chaseAge} onChangeText={setChaseAge} keyboardType="number-pad" placeholder="Your age" placeholderTextColor={theme.colors.muted} style={ss.searchInput} maxLength={3} />
            <Text style={local.label}>Nationality</Text><TextInput accessibilityLabel="Chase nationality" value={chaseNationality} onChangeText={setChaseNationality} placeholder="Nationality" placeholderTextColor={theme.colors.muted} style={ss.searchInput} maxLength={60} />
            <Text style={local.label}>Height in cm (optional)</Text><TextInput accessibilityLabel="Chase height in centimetres" value={chaseHeightCm} onChangeText={setChaseHeightCm} keyboardType="number-pad" placeholder="e.g. 170" placeholderTextColor={theme.colors.muted} style={ss.searchInput} maxLength={3} />
            <Text style={local.label}>Job type (optional)</Text><TextInput accessibilityLabel="Chase job type" value={chaseJobType} onChangeText={setChaseJobType} placeholder="e.g. Student, employed, self-employed" placeholderTextColor={theme.colors.muted} style={ss.searchInput} maxLength={60} />
            <CountryPicker label="Neighbouring country" value={chaseCountry} valueMode="name" onSelect={country => setChaseCountry(country.name)} />
            <Text style={local.label}>City / area</Text>
            <TextInput accessibilityLabel="Chase city or area" value={chaseCity} onChangeText={setChaseCity} placeholder="e.g. Ibadan" placeholderTextColor={theme.colors.muted} style={ss.searchInput} maxLength={60} />
            <Text style={local.helper}>Use only a broad city/area — never your street, house number or exact location. Zeeza uses this coarse information only to order Chase and apply safer limits to distant friend requests.</Text>
          </>}
          <NexaPressable {...buttonA11y(saving ? 'Saving Zeeza profile' : 'Save Zeeza profile')} accessibilityState={{disabled:saving || words > 200}} disabled={saving || words > 200} onPress={save} style={[s.button, { marginTop: 16, opacity: saving || words > 200 ? 0.55 : 1 }]}>
            {saving ? <ActivityIndicator color={theme.colors.black} /> : <Text style={s.buttonText}>Save Zeeza profile</Text>}
          </NexaPressable>
        </View>
      )}

      <View style={local.shareCard}>
        <View style={ds({ flex: 1 })}>
          <Text style={local.shareTitle}>Share your Zeeza profile</Text>
          <Text style={local.helper}>Send a personal NEXA link to friends and family. They can open your profile and send you a friend request.</Text>
        </View>
        <NexaPressable accessibilityRole="button" onPress={shareProfile} style={local.shareButton} accessibilityLabel="Share Zeeza profile link">
          <Ionicons name="share-social-outline" size={19} color={theme.colors.black} />
          <Text style={local.shareButtonText}>Share</Text>
        </NexaPressable>
      </View>

      <View style={local.shareCard}>
        <View style={ds({ flex: 1 })}>
          <Text style={local.shareTitle}>Zeeza Invite & Earn</Text>
          <Text style={local.helper}>Share your central NEXA referral link. Qualified referrals count after signup and account activation. Your 30-day campaign begins when you generate the link.</Text>
          {referralStatus ? <Text accessibilityLiveRegion="polite" style={local.helper}>Verified referrals: {Number(referralStatus.qualifiedReferrals || 0)} · Reward status: {String(referralStatus.reward?.status || 'in progress').replace(/_/g, ' ')}</Text> : null}
        </View>
        <NexaPressable accessibilityRole="button" accessibilityState={{ disabled: referralBusy }} disabled={referralBusy} onPress={shareZeezaReferral} style={[local.shareButton, { opacity: referralBusy ? 0.6 : 1 }]} accessibilityLabel="Generate and share Zeeza referral link">
          {referralBusy ? <ActivityIndicator color={theme.colors.black} /> : <Ionicons name="gift-outline" size={19} color={theme.colors.black} />}
          <Text style={local.shareButtonText}>{referralBusy ? 'Preparing' : 'Invite'}</Text>
        </NexaPressable>
      </View>

      <View style={local.infoCard}>
        <Text style={s.section}>Profile info</Text>
        <InfoRow icon="at-outline" label="Username" value={profile?.username ? `@${profile.username}` : 'Not set'} />
        <InfoRow icon="eye-outline" label="Visibility" value={(profile?.visibility || 'friends').replace(/^./, x => x.toUpperCase())} />
        <InfoRow icon="compass-outline" label="Chase" value={(profile?.chaseOptIn ?? profile?.exploreOptIn) ? `Shown · ${profile.chaseCity || profile.exploreCity || profile.chaseCountry || profile.exploreCountry}` : "Not showcased"} />
        <InfoRow icon="chatbubble-ellipses-outline" label="Zeeza" value="Friends, inbox and rooms" />
      </View>

      <View style={local.infoCard}>
        <Text style={s.section}>Make Zeeza yours</Text>
        <Text style={local.helper}>Use a friendly username, a real profile picture and a short status that tells people what you're about. Keep your profile comfortable and respectful.</Text>
        <View style={local.tipRow}><Ionicons name="shield-checkmark-outline" size={19} color={theme.colors.goldBright} /><Text style={local.tipText}>You control profile visibility and can block people from Zeeza.</Text></View>
        <View style={local.tipRow}><Ionicons name="people-outline" size={19} color={theme.colors.goldBright} /><Text style={local.tipText}>Friend connections remain separate from Dami's AI conversations.</Text></View>
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={local.infoRow}><Ionicons name={icon} size={19} color={theme.colors.goldBright} /><View style={ds({ flex: 1 })}><Text style={local.infoLabel}>{label}</Text><Text style={local.infoValue}>{value}</Text></View></View>;
}

const local = themedStyles(() => ({
  header: { flexDirection: 'row' as const, alignItems: 'center', marginBottom: 18 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderGold, marginRight: 10 },
  heroCard: { alignItems: 'center' as const, backgroundColor: theme.colors.surfaceElevated, borderRadius: 26, borderWidth: 1, borderColor: theme.colors.borderGold, padding: 28, marginBottom: 14, ...theme.shadow.gold },
  avatarRing: { width: 108, height: 108, borderRadius: 54, padding: 3, backgroundColor: theme.colors.gold, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 14, ...theme.shadow.glow },
  avatarCamera: { position: 'absolute' as const, right: -2, bottom: -2, width: 38, height: 38, borderRadius: 19, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: theme.colors.goldBright, borderWidth: 2, borderColor: theme.colors.surfaceElevated },
  avatarLink: { color: theme.colors.goldHot, fontSize: 16, fontWeight: '900' as const, marginBottom: 12, paddingVertical: 4 },
  avatarImage: { width: 102, height: 102, borderRadius: 51, backgroundColor: theme.colors.surface },
  avatarInitial: { width: 102, height: 102, borderRadius: 51, backgroundColor: theme.colors.surface, color: theme.colors.goldHot, fontSize: 40, fontWeight: '900' as const, textAlign: 'center' as const, textAlignVertical: 'center' as const },
  name: { color: theme.colors.text, fontSize: 26, fontWeight: '900' as const },
  handle: { color: theme.colors.textSecondary, marginTop: 4 },
  statusPill: { flexDirection: 'row' as const, alignItems: 'center' as const, marginTop: 12, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.colors.goldWash, borderWidth: 1, borderColor: theme.colors.borderGold },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.success, marginRight: 7 },
  statusText: { color: theme.colors.goldHot, fontWeight: '800' as const, fontSize: 14 },
  infoCard: { backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 18, marginBottom: 14 },
  sectionHead: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  action: { color: theme.colors.goldBright, fontWeight: '900' as const },
  bio: { color: theme.colors.textSecondary, fontSize: 17, lineHeight: 22 },
  count: { color: theme.colors.muted, fontSize: 15, marginTop: 8 },
  label: { color: theme.colors.textSecondary, fontWeight: '800' as const, marginTop: 12, marginBottom: 6 },
  bioInput: { minHeight: 120 },
  helper: { color: theme.colors.muted, fontSize: 14, lineHeight: 18, marginTop: 6 },
  photoEditor: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, marginTop: 4, padding: 12, borderRadius: 16, backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border },
  smallAvatar: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' as const, backgroundColor: theme.colors.surface, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderColor: theme.colors.borderGold },
  smallAvatarImage: { width: 52, height: 52 },
  smallAvatarInitial: { color: theme.colors.goldHot, fontWeight: '900' as const, fontSize: 22 },
  photoTitle: { color: theme.colors.text, fontWeight: '900' as const, fontSize: 15 },
  photoButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: theme.colors.goldBright },
  visibilityRow: { flexDirection: 'row' as const, gap: 7, marginTop: 4 },
  visibilityButton: { flex: 1, alignItems: 'center' as const, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated },
  visibilityButtonActive: { backgroundColor: theme.colors.goldWash, borderColor: theme.colors.goldBright },
  visibilityText: { color: theme.colors.textSecondary, fontWeight: '800' as const, fontSize: 14 },
  visibilityTextActive: { color: theme.colors.goldHot },
  termsCard:{padding:13,borderRadius:16,borderWidth:1,borderColor:theme.colors.border,backgroundColor:theme.colors.surfaceElevated,marginBottom:8},
  chaseToggle:{flexDirection:'row' as const,alignItems:'center' as const,gap:12,padding:13,borderRadius:16,borderWidth:1,borderColor:theme.colors.border,backgroundColor:theme.colors.surfaceElevated},
  chaseToggleOn:{borderColor:theme.colors.borderGold,backgroundColor:theme.colors.goldWash},
  toggleDot:{width:20,height:20,borderRadius:10,borderWidth:2,borderColor:theme.colors.muted},
  toggleDotOn:{backgroundColor:theme.colors.goldBright,borderColor:theme.colors.goldBright},
  shareCard:{flexDirection:'row' as const,alignItems:'center' as const,gap:14,backgroundColor:theme.colors.surfaceElevated,borderWidth:1,borderColor:theme.colors.borderGold,borderRadius:18,padding:16,marginBottom:14,...theme.shadow.gold},
  shareTitle:{fontSize:18,fontWeight:'900' as const,color:theme.colors.text,marginBottom:5},
  shareButton:{flexDirection:'row' as const,alignItems:'center' as const,gap:6,backgroundColor:theme.colors.goldBright,borderRadius:12,paddingHorizontal:13,paddingVertical:11},
  shareButtonText:{color:theme.colors.black,fontWeight:'900' as const,fontSize:14},
  infoRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoLabel: { color: theme.colors.muted, fontSize: 14 },
  infoValue: { color: theme.colors.text, fontWeight: '800' as const, marginTop: 2 },
  tipRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, marginTop: 12 },
  tipText: { flex: 1, color: theme.colors.textSecondary, lineHeight: 19 },
}));

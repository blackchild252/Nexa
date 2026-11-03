import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { s } from './styles';
import { theme, ds } from './theme';
import { NexaPressable } from './motion';
import { apiVerificationMine, apiVerificationRequest, verificationStatusFor, VERIFY_MIN_DETAILS, VERIFY_MAX_DETAILS, type VerificationKind, type VerificationMine } from './verification';

// Get verified (M4549). Members ask for a verified mark for their account, or for their shop if they have one.
// The server decides; this screen only asks, shows where the request stands, and shows the reason if it was not approved.

const KINDS: Array<{ kind: VerificationKind; title: string; hint: string }> = [
  { kind: 'user', title: 'Your account', hint: 'Shows a verified mark next to your name on posts and comments.' },
  { kind: 'vendor', title: 'Your shop', hint: 'You need a shop first. Tell us what your shop sells and where people can find it.' },
];

function KindCard({ kind, title, hint, mine, onSent }: { kind: VerificationKind; title: string; hint: string; mine: VerificationMine | null; onSent: () => void }) {
  const status = verificationStatusFor(mine, kind);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tooShort = details.trim().length < VERIFY_MIN_DETAILS;

  const submit = async () => {
    if (tooShort) { setError(`Tell us a little more (at least ${VERIFY_MIN_DETAILS} characters).`); return; }
    setBusy(true);
    try { await apiVerificationRequest(kind, details.trim()); setDetails(''); setError(''); onSent(); }
    catch (e: any) { setError(e?.message || 'Could not send your request.'); }
    finally { setBusy(false); }
  };

  return (
    <View style={[s.card, ds({ marginTop: 14 })]}>
      <View style={ds({ flexDirection: 'row', alignItems: 'center' })}>
        <Text style={[s.section, ds({ flex: 1, marginBottom: 0 })]}>{title}</Text>
        {status.state === 'verified' ? <Ionicons name="checkmark-circle" size={22} color={theme.colors.brightGold} accessibilityLabel="Verified" /> : null}
      </View>
      {status.state === 'verified' ? <Text style={[s.muted, ds({ marginTop: 6 })]}>You are verified.</Text> : null}
      {status.state === 'pending' ? <Text style={[s.muted, ds({ marginTop: 6 })]} accessibilityLiveRegion="polite">Your request is waiting for review. We will tell you when it is decided.</Text> : null}
      {status.state === 'rejected' ? <Text style={[s.muted, ds({ marginTop: 6 })]}>Not approved{status.reason ? `: ${status.reason}` : '.'} You can send a new request below.</Text> : null}
      {status.state === 'none' || status.state === 'rejected' ? (
        <View style={ds({ marginTop: 8 })}>
          <Text style={s.muted}>{hint}</Text>
          <TextInput value={details} onChangeText={(v) => { setDetails(v); setError(''); }} placeholder="Tell us why you should be verified" placeholderTextColor={theme.colors.muted} multiline maxLength={VERIFY_MAX_DETAILS} accessibilityLabel={`Details for ${title} verification`} style={[s.authInput, ds({ marginTop: 10, minHeight: 90, textAlignVertical: 'top' })]} />
          {error ? <Text style={[s.muted, ds({ marginTop: 6 })]} accessibilityLiveRegion="polite">{error}</Text> : null}
          <NexaPressable accessibilityRole="button" accessibilityLabel={`Ask to verify ${title}`} accessibilityState={{ disabled: busy }} onPress={submit} style={ds({ marginTop: 10, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.brightGold })}>
            {busy ? <ActivityIndicator color={theme.colors.deepBlack} /> : <Text style={ds({ color: theme.colors.deepBlack, fontWeight: '600' })}>Send request</Text>}
          </NexaPressable>
        </View>
      ) : null}
    </View>
  );
}

export function GetVerifiedScreen() {
  const [mine, setMine] = useState<VerificationMine | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try { setMine(await apiVerificationMine()); setError(''); }
    catch (e: any) { setError(e?.message || 'Could not load your verification right now.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView style={s.wrap} contentContainerStyle={ds({ paddingBottom: 60 })} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.brightGold} />}>
      <Text style={s.title} accessibilityRole="header">Get verified</Text>
      <Text style={s.subtitle}>A verified mark tells people your account or shop is real. Our team reviews every request.</Text>
      {loading ? <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading verification status" style={ds({ marginTop: 20 })} color={theme.colors.brightGold} /> : null}
      {error && !loading ? <Text style={[s.muted, ds({ marginTop: 14 })]} accessibilityLiveRegion="polite">{error} Pull down to try again.</Text> : null}
      {!loading && !error ? KINDS.map((k) => <KindCard key={k.kind} {...k} mine={mine} onSent={() => load()} />) : null}
    </ScrollView>
  );
}

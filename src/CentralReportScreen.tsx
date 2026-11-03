import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { NexaPressable } from './motion';
import { authedFetch } from './api';
import { useAuth } from './auth';
import { s } from './styles';
import { ds, theme, tc } from './theme';
import { NexaDataState } from './NexaDataState';
import { isConfirmedCentralDelivery, type CentralReportRequest } from './centralReportingContract';

const CATEGORY_BY_ROLE: Record<string, string[]> = {
  customer: ['account', 'order', 'product', 'zeeza', 'safety', 'other'],
  user: ['account', 'order', 'product', 'zeeza', 'safety', 'other'],
  consumer: ['account', 'order', 'product', 'zeeza', 'safety', 'other'],
  business: ['account', 'order', 'product', 'safety', 'other'],
  vendor: ['account', 'order', 'product', 'safety', 'other'],
  seller: ['account', 'order', 'product', 'safety', 'other'],
  merchant: ['account', 'order', 'product', 'safety', 'other'],
  staff: ['account', 'order', 'product', 'zeeza', 'safety', 'privacy', 'other'],
  moderator: ['account', 'order', 'product', 'zeeza', 'safety', 'privacy', 'other'],
  admin: ['account', 'order', 'product', 'zeeza', 'safety', 'privacy', 'other'],
  administrator: ['account', 'order', 'product', 'zeeza', 'safety', 'privacy', 'other'],
  support: ['account', 'order', 'product', 'zeeza', 'safety', 'privacy', 'other'],
};
function requestKey() { return `central-report-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`; }

export function CentralReportScreen() {
  const { user } = useAuth();
  const userRecord = user as (typeof user & { accountType?: string; userType?: string; role?: string; kind?: string }) | null;
  // Match the server's role fallback behavior: an unrecognized accountType must not
  // hide a valid role/userType field supplied by the authenticated session.
  const roleCandidates = [userRecord?.accountType, userRecord?.userType, userRecord?.role, userRecord?.kind]
    .map(value => String(value || '').trim().toLowerCase())
    .map(value => ({ consumer: 'customer', user: 'customer', vendor: 'business', seller: 'business', merchant: 'business', support: 'staff', moderator: 'staff', admin: 'staff', administrator: 'staff' }[value] || value));
  const role = roleCandidates.find(candidate => Object.prototype.hasOwnProperty.call(CATEGORY_BY_ROLE, candidate)) || '';
  const categories = useMemo(() => CATEGORY_BY_ROLE[role] || [], [role]);
  const [category, setCategory] = useState(categories[0] || 'other');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'unavailable' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [retryKey, setRetryKey] = useState(requestKey);
  const canSubmit = categories.includes(category) && summary.trim().length > 0 && summary.trim().length <= 160 && description.trim().length > 0 && description.trim().length <= 4000 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setMessage(''); setStatus('idle');
    try {
      const payload: CentralReportRequest = { category: category as CentralReportRequest['category'], summary: summary.trim(), description: description.trim(), sourceType: (sourceType || undefined) as CentralReportRequest['sourceType'], sourceId: sourceId.trim() || undefined };
      const response = await authedFetch('/api/central-reports', {
        method: 'POST',
        headers: { 'Idempotency-Key': retryKey },
        body: JSON.stringify(payload),
      });
      // This is deliberately not treated as delivery unless the typed contract confirms it.
      if (isConfirmedCentralDelivery(response)) {
        setStatus('idle'); setMessage('Central confirmed receipt.'); setRetryKey(requestKey());
      } else {
        setStatus('unavailable'); setMessage('Central delivery was not confirmed. Do not assume this report was submitted. You can retry with the same request key.');
      }
    } catch (error: any) {
      const apiMessage = String(error?.message || 'The reporting service is unavailable.');
      setStatus('unavailable');
      setMessage(/central_reporting_unavailable|not connected|503/i.test(apiMessage)
        ? 'AAMI Central is not connected in this local build. No report was delivered. Retry later using the same request key.'
        : 'The request could not be confirmed. No delivery is claimed. Retry later using the same request key.');
    } finally { setBusy(false); }
  };

  return <ScrollView style={s.wrap} contentContainerStyle={ds({ padding: 16, paddingBottom: 36, gap: 12 })}>
    <NexaPressable accessibilityRole="button" accessibilityLabel="Return to NEXA home" onPress={() => router.back()} style={ds({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border })}>
      <Text style={ds({ color: theme.colors.text, fontWeight: '800' })}>← Back</Text>
    </NexaPressable>
    <Text style={s.title}>Report to AAMI Central</Text>
    <Text style={s.subtitle}>Share a concern with a bounded summary and description. This form does not confirm delivery or resolution.</Text>
    {!categories.length ? <NexaDataState title="Report categories unavailable" message="Your account type is not eligible for the currently configured report categories. No report can be submitted from this account." /> : <>
      <Text style={ds({ color: theme.colors.text, fontWeight: '800' })}>Report category</Text>
      <View style={ds({ flexDirection: 'row', flexWrap: 'wrap', gap: 8 })} accessibilityRole="radiogroup" accessibilityLabel="Report category">
        {categories.map(item => <NexaPressable key={item} accessibilityRole="radio" accessibilityState={{ selected: category === item }} accessibilityLabel={`Category ${item}`} onPress={() => setCategory(item)} style={ds({ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: category === item ? theme.colors.brightGold : theme.colors.border, backgroundColor: category === item ? theme.colors.goldWash : theme.colors.surface })}><Text style={ds({ color: theme.colors.text, fontWeight: '700' })}>{item}</Text></NexaPressable>)}
      </View>
      <Text style={ds({ color: theme.colors.text, fontWeight: '800' })}>Summary ({summary.trim().length}/160)</Text>
      <TextInput accessibilityLabel="Report summary" value={summary} onChangeText={setSummary} maxLength={160} placeholder="Briefly describe the issue" placeholderTextColor={tc('#777')} style={s.authInput} returnKeyType="next" />
      <Text style={ds({ color: theme.colors.text, fontWeight: '800' })}>Description ({description.trim().length}/4000)</Text>
      <TextInput accessibilityLabel="Report description" value={description} onChangeText={setDescription} maxLength={4000} multiline textAlignVertical="top" placeholder="Describe what happened. Do not include passwords or authentication secrets." placeholderTextColor={tc('#777')} style={[s.authInput, ds({ minHeight: 140, paddingTop: 12 })]} />
      <Text style={ds({ color: theme.colors.text, fontWeight: '800' })}>Optional source reference</Text>
      <TextInput accessibilityLabel="Source type" value={sourceType} onChangeText={setSourceType} autoCapitalize="none" maxLength={32} placeholder="order, account, product, zeeza_message" placeholderTextColor={tc('#777')} style={s.authInput} />
      <TextInput accessibilityLabel="Source record ID" value={sourceId} onChangeText={setSourceId} autoCapitalize="none" maxLength={128} placeholder="Source record identifier only" placeholderTextColor={tc('#777')} style={s.authInput} />
      <NexaPressable accessibilityRole="button" accessibilityLabel={busy ? 'Submitting report request' : 'Submit report request'} accessibilityState={{ disabled: !canSubmit }} disabled={!canSubmit} onPress={submit} style={ds({ minHeight: 48, borderRadius: 12, backgroundColor: canSubmit ? theme.colors.brightGold : theme.colors.surface, alignItems: 'center', justifyContent: 'center', padding: 12, opacity: canSubmit ? 1 : 0.65 })}>
        {busy ? <ActivityIndicator accessibilityLabel="Sending report request" color={theme.colors.deepBlack} /> : <Text style={ds({ color: canSubmit ? theme.colors.deepBlack : theme.colors.text, fontWeight: '900' })}>Submit report request</Text>}
      </NexaPressable>
      {status === 'unavailable' ? <NexaDataState title="Delivery not confirmed" message={message} actionLabel="Retry with same request key" onAction={submit} /> : null}
      {status === 'idle' && message ? <Text accessibilityRole="summary" style={s.muted}>{message}</Text> : null}
      <Text accessibilityRole="summary" style={ds({ color: theme.colors.muted, fontSize: 14 })}>Privacy: Report text is not saved locally. Because this build has no live AAMI Central connection, the request key is not reserved and delivery is not claimed.</Text>
    </>}
  </ScrollView>;
}

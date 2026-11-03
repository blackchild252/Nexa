import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { authedFetch } from '../../api';
import { theme, ds } from '../../theme';
import { s } from '../../styles';
import { NexaPressable } from '../../motion';

type Followup = { id:string; userId:string; accountType:string; campaignStartAt:string; campaignEndAt:string; qualifiedReferrals:number; referralsInWindow:number; target:number; rewardStatus:string; rewardStatusLabel?:string; campaignAgeDays?:number|null; remainingDays?:number|null; eligibleForReview:boolean; aamiRewardsUnlocked:boolean };

export default function AdminZeezaReferralFollowups() {
  const [rows,setRows] = useState<Followup[]>([]);
  const [busy,setBusy] = useState(true);
  const [error,setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { const result:any = await authedFetch('/api/admin/zeeza/referral-followups?limit=200'); setRows(Array.isArray(result?.followups) ? result.followups : []); }
    catch (e:any) { setError(e?.message || 'Could not load Zeeza referral follow-ups.'); }
    finally { setBusy(false); }
  },[]);
  useEffect(() => { load(); },[load]);
  return <ScrollView style={s.wrap} contentContainerStyle={ds({padding:16,paddingBottom:60})} refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={theme.colors.goldBright} />}>
    <Text accessibilityRole="header" style={ds({color:theme.colors.text,fontSize:24,fontWeight:'900'})}>Zeeza referral follow-ups</Text>
    <Text style={ds({color:theme.colors.muted,fontSize:14,lineHeight:20,marginTop:6,marginBottom:14})}>All user and vendor profiles that generated a Zeeza referral link. Qualification requires signup plus activation. Kitchen Hub referrals remain separate.</Text>
    {busy && rows.length===0 ? <ActivityIndicator accessibilityLabel="Loading referral follow-ups" color={theme.colors.goldBright} /> : null}
    {error ? <Text accessibilityLiveRegion="polite" style={ds({color:theme.colors.textSecondary,fontSize:14,marginBottom:12})}>{error}</Text> : null}
    {!busy && !error && rows.length===0 ? <Text style={ds({color:theme.colors.muted,fontSize:15})}>No Zeeza referral campaigns yet.</Text> : null}
    {rows.map(row => {
      const statusText = row.rewardStatusLabel || row.rewardStatus.replace(/_/g,' ');
      const timing = typeof row.campaignAgeDays==='number' && typeof row.remainingDays==='number' ? `Day ${row.campaignAgeDays} of campaign · ${row.remainingDays} day${row.remainingDays===1?'':'s'} remaining` : '';
      const spoken = `${row.accountType} account ${row.userId}. Campaign ${new Date(row.campaignStartAt).toLocaleDateString()} to ${new Date(row.campaignEndAt).toLocaleDateString()}. ${timing ? timing + '. ' : ''}Qualified ${row.qualifiedReferrals} lifetime, ${row.referralsInWindow} of ${row.target} in window. AAMI Rewards ${row.aamiRewardsUnlocked ? 'unlocked' : 'not unlocked'}. Reward status ${statusText}.${row.eligibleForReview ? ' Eligible for admin review. No automatic credit applied.' : ''}`;
      return <View key={row.id} accessible accessibilityLabel={spoken} style={ds({padding:14,borderRadius:14,borderWidth:1,borderColor:theme.colors.border,backgroundColor:theme.colors.surface,marginBottom:10})}>
      <Text style={ds({color:theme.colors.text,fontSize:16,fontWeight:'900'})}>{row.accountType.toUpperCase()} · {row.userId}</Text>
      <Text style={ds({color:theme.colors.muted,fontSize:14,marginTop:5})}>Campaign: {new Date(row.campaignStartAt).toLocaleDateString()} – {new Date(row.campaignEndAt).toLocaleDateString()}</Text>
      {timing ? <Text style={ds({color:theme.colors.muted,fontSize:14,marginTop:4})}>{timing}</Text> : null}
      <Text style={ds({color:theme.colors.textSecondary,fontSize:14,marginTop:6})}>Qualified: {row.qualifiedReferrals} lifetime · {row.referralsInWindow}/{row.target} in window</Text>
      <Text style={ds({color:theme.colors.textSecondary,fontSize:14,marginTop:4})}>AAMI Rewards: {row.aamiRewardsUnlocked ? 'unlocked' : 'not unlocked'} · Reward: {statusText}</Text>
      {row.eligibleForReview ? <Text style={ds({color:theme.colors.goldBright,fontSize:14,fontWeight:'800',marginTop:5})}>Eligible for admin review — no automatic credit applied</Text> : null}
    </View>;
    })}
    <NexaPressable accessibilityRole="button" onPress={load} style={ds({padding:12,borderRadius:12,backgroundColor:theme.colors.goldBright,alignItems:'center',marginTop:4})}><Text style={ds({color:theme.colors.black,fontWeight:'900'})}>Refresh follow-ups</Text></NexaPressable>
  </ScrollView>;
}

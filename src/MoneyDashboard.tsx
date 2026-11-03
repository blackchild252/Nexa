import { NexaPressable } from './motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text,  View } from "react-native";
import { router } from "expo-router";
import { theme, tc, ds } from './theme';
import { authedFetch } from "./api";
import { s } from "./styles";
import type { Groups } from "./useGroups";
import { GroupsTab } from "./GroupsTab";
import { FinancialPlanning } from "./FinancialPlanning";
import { StoreAjo } from "./StoreAjo";
import { MarketWatch } from "./MarketWatch";
import { MarketInsights } from "./MarketInsights";
import { BRAND } from "./brand";
import { navigationForSubscription } from './nexaNavigation';
import { Subscription } from "./Subscription";
import { formatMajorCurrency } from "./currencyDisplay";

export function MoneyDashboard({ groups, onOpenMarketplace, initialView = "overview" }: { groups: Groups; onOpenMarketplace: () => void; initialView?: "overview" | "activity" | "planning" | "ajo" | "groups" | "market" | "insights" | "subscription" }) {
  const [view, setView] = useState<"overview" | "activity" | "groups" | "planning" | "ajo" | "market" | "insights" | "subscription">(initialView);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [financial, setFinancial] = useState({ paid: 0, cashback: 0, orders: 0, receipts: 0 });
  const [skyMoney, setSkyMoney] = useState<any>(null);
  const [aamiCentre, setAamiCentre] = useState<any>(null);
  const [aamiEligibility, setAamiEligibility] = useState<any>(null);
  const [streakMessage, setStreakMessage] = useState("");
  const loadRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++loadRequest.current;
    setLoading(true);
    setError("");
    try {
      const [expenseData, debtData, moneyData, skyMoneyData, aamiData] = await Promise.all([authedFetch("/api/expenses"), authedFetch("/api/debts"), authedFetch("/api/money/summary"), authedFetch("/api/skymoney/overview"), authedFetch("/api/aami/earn")]);
      if (requestId !== loadRequest.current) return;
      setExpenses(Array.isArray(expenseData?.expenses) ? expenseData.expenses : []);
      setDebts(Array.isArray(debtData?.debts) ? debtData.debts : []);
      setFinancial({ paid: Number(moneyData?.totals?.paid || 0), cashback: Number(moneyData?.totals?.cashback || 0), orders: Number(moneyData?.totals?.orders || 0), receipts: Number(moneyData?.totals?.receipts || 0) });
      setSkyMoney(skyMoneyData || null);
      setAamiCentre(aamiData || null);
      setAamiEligibility(aamiData?.eligibility || null);
    } catch (e: any) {
      if (requestId === loadRequest.current) setError(e?.message || "Could not load your Sky Money overview.");
    } finally {
      if (requestId === loadRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const owedToMe = debts.filter(d => d.direction === "owed_to_me" && !d.settled).reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const iOwe = debts.filter(d => d.direction === "i_owe" && !d.settled).reduce((sum, d) => sum + Number(d.amount || 0), 0);
    return { expenseTotal, owedToMe, iOwe };
  }, [expenses, debts]);

  // One navigation bar for every Sky Money tab, so Overview to Sky Insights always look and flow the same.
  const skyTabBar = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ds({ flexGrow: 0, marginTop: 16, marginBottom: 14 })} contentContainerStyle={ds({ flexDirection: "row", paddingRight: 16 })} accessibilityRole="tablist">
      {([['overview', 'Overview'], ['activity', 'Activity'], ['planning', 'Planning'], ['ajo', 'Sky Store Savings'], ['groups', 'Sky Group Savings'], ['market', 'Sky Market Watch'], ['insights', 'Sky Insights']] as const).map(([id, label]) => (
        <NexaPressable key={id} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected:view===id}} onPress={() => setView(id)} style={[s.pill, view === id && s.pillActive]}>
          <Text style={s.pillText} numberOfLines={1}>{label}</Text>
        </NexaPressable>
      ))}
    </ScrollView>
  );
  const skyTabHeader = (
    <View style={ds({ paddingHorizontal: 16 })}>
      <Text style={s.heading}>{BRAND.money}</Text>
      {skyTabBar}
    </View>
  );

  if (view === "subscription") {
    return <Subscription />;
  }

  if (view === "planning") {
    return <View style={ds({ flex: 1, backgroundColor: 'transparent' })}>{skyTabHeader}<FinancialPlanning /></View>;
  }

  if (view === "ajo") {
    return <View style={ds({ flex: 1, backgroundColor: 'transparent' })}>{skyTabHeader}<StoreAjo /></View>;
  }

  if (view === "market" || view === "insights") {
    return (
      <View style={ds({ flex: 1, backgroundColor: 'transparent' })}>
        {skyTabHeader}
        <ScrollView contentContainerStyle={s.scrollWrap}>
          {view === "market" ? <MarketWatch /> : <MarketInsights />}
        </ScrollView>
      </View>
    );
  }

  if (view === "groups") {
    return (
      <View style={ds({ flex: 1, backgroundColor: 'transparent' })}>
        {skyTabHeader}
        <GroupsTab groups={groups} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={s.scrollWrap}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.goldBright} />}
    >
      <Text style={s.heading}>{BRAND.money}</Text>
      <Text style={s.subtitle}>Your NEXA financial home — Sky Wallet, savings, groups, market information, planning and payment activity.</Text>

      {skyTabBar}

      {error ? <View style={s.card}><Text style={ds({ color: tc("#ef8d8d"), fontWeight: "700" })}>{error}</Text></View> : null}
      {loading && !expenses.length && !debts.length ? <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading money dashboard" color={theme.colors.goldBright} style={ds({ marginVertical: 20 })} /> : null}

      {view === "overview" ? <>
        <View style={[s.card,{borderWidth:1,borderColor:theme.colors.goldBright}]}>
          <Text style={s.section}>SkyMoney balances</Text>
          <Text style={s.muted}>One real finance zone with two clearly separated balances. Cash remains real financial value; Aami remains the internal reward balance.</Text>
          <View style={ds({flexDirection:"row",flexWrap:"wrap",gap:10,marginTop:14})}>
            <View style={ds({flex:1,minWidth:145,backgroundColor:theme.colors.backgroundSoft,borderRadius:12,padding:14})}>
              <Text style={s.muted}>SkyMoney Cash</Text>
              <Text style={s.title}>{formatMajorCurrency(Number(skyMoney?.balances?.cash?.amount||0), skyMoney?.balances?.cash?.currency, "en-NG")}</Text>
              <Text style={[s.muted,{marginTop:5}]}>Real financial balance</Text>
            </View>
            <View style={ds({flex:1,minWidth:145,backgroundColor:theme.colors.backgroundSoft,borderRadius:12,padding:14})}>
              <Text style={s.muted}>Aami</Text>
              <Text style={s.title}>{Number(skyMoney?.balances?.aami?.amount||0).toLocaleString()} Aami</Text>
              <Text style={[s.muted,{marginTop:5}]}>Earned inside NEXA · no cash withdrawal</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={[s.section,{marginTop:16}]}>Earn Aami</Text>
          <Text style={s.muted}>Earn Aami through useful NEXA activity. Rewards are server-controlled, capped, idempotent and recorded in your Aami history.</Text>
          {aamiEligibility?.gated && !aamiEligibility?.unlocked ? <View style={ds({marginTop:12,padding:14,borderRadius:16,borderWidth:1,borderColor:theme.colors.borderGold,backgroundColor:theme.colors.backgroundSoft})}>
            <Text style={ds({color:theme.colors.goldBright,fontSize:17,fontWeight:'900'})}>Aami unlocks at 20 friends</Text>
            <Text style={[s.muted,{marginTop:5}]}>Your {aamiEligibility.planId === 'regular' ? 'Regular' : 'Free'} membership is currently reward-locked. Add friends until you reach 20 accepted friends, then Aami earning unlocks automatically.</Text>
            <Text style={ds({color:theme.colors.text,fontWeight:'900',marginTop:8})}>{aamiEligibility.friends || 0} / {aamiEligibility.requiredFriends || 20} friends</Text>
            <View style={ds({height:8,borderRadius:8,backgroundColor:theme.colors.surfaceElevated,overflow:'hidden',marginTop:7})}><View style={ds({height:8,borderRadius:8,backgroundColor:theme.colors.goldBright,width:`${Math.min(100,Math.max(0,Number(aamiEligibility.friends||0)/Number(aamiEligibility.requiredFriends||20)*100))}%` as any})}/></View>
            <NexaPressable accessibilityRole="button" accessibilityLabel="Open Zeeza friends to add friends" style={[s.buttonSecondary,{marginTop:10}]} onPress={()=>router.push('/(tabs)/zeeza?section=friends' as any)}><Text style={s.saveText}>Add friends in Zeeza</Text></NexaPressable>
          </View> : null}
          {aamiEligibility?.gated && aamiEligibility?.unlocked ? <View style={ds({marginTop:12,padding:14,borderRadius:16,borderWidth:1,borderColor:theme.colors.goldBright,backgroundColor:theme.colors.backgroundSoft})}><Text style={ds({color:theme.colors.goldBright,fontSize:17,fontWeight:'900'})}>Aami unlocked</Text><Text style={[s.muted,{marginTop:5}]}>You have {aamiEligibility.friends} friends. Aami rewards are now available on your {aamiEligibility.planId === 'regular' ? 'Regular' : 'Free'} membership.</Text></View> : null}
          <NexaPressable accessibilityRole="button" accessibilityLabel="Claim today's Aami daily streak" style={[s.buttonSecondary,{marginTop:10}]} onPress={async()=>{try{const r=await authedFetch('/api/aami/streak/check-in',{method:'POST',body:JSON.stringify({})});setStreakMessage(r.credited?`Daily streak: +${r.amount} Aami`:(r.duplicate?`Today's streak is already claimed.`:`Daily streak is currently capped.`));await load();}catch(e:any){setStreakMessage(e?.message||'Daily streak is unavailable right now.');}}}><Text style={s.saveText}>Check in for today’s Aami streak</Text></NexaPressable>
          {streakMessage ? <Text style={[s.muted,{marginTop:7}]}>{streakMessage}</Text> : null}
          <View style={ds({flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:10})}>
            {['Yaayz views, likes, posts, comments & shares','Kitchen referral Aami','Marketplace purchases & verified reviews','Successful referrals','Daily streaks & challenges','Learning & useful feedback','Verified bug reports','Community achievements','Completed seller orders','Controlled promotional campaigns'].map(label=><View key={label} style={ds({backgroundColor:theme.colors.backgroundSoft,borderRadius:10,padding:10,minWidth:145,flex:1})}><Text style={s.muted}>{label}</Text></View>)}
          </View>
          {Array.isArray(aamiCentre?.history) && aamiCentre.history.length ? <Text style={[s.muted,{marginTop:8}]}>Recent earning categories: {aamiCentre.history.slice(0,5).map((x:any)=>`${x.source} (${Number(x.amount||0)} Aami)`).join(' · ')}</Text> : null}
          <Text style={s.section}>Subscription Centre</Text>
          <Text style={ds({color:theme.colors.goldBright,fontWeight:"900",marginTop:8})}>NEXA Membership · {skyMoney?.subscription?.plan?.name || skyMoney?.subscription?.planId || "Free"}</Text>
          <Text style={s.muted}>Subscription now lives under SkyMoney. It controls membership, renewal, spending limits and subscription-only spending rules; it is not a separate money balance.</Text>
          <Text style={[s.muted,{marginTop:8}]}>Status: {skyMoney?.subscription?.status || "loading"} · Auto-pay: {skyMoney?.subscription?.autoPay ? "On" : "Off"}</Text>
          {skyMoney?.subscription?.currentPeriodEnd ? <Text style={[s.muted,{marginTop:4}]}>Current period ends: {new Date(skyMoney.subscription.currentPeriodEnd).toLocaleDateString()}</Text> : null}
          <View style={ds({marginTop:12,gap:8})}>
            <NexaPressable accessibilityRole="button" accessibilityLabel="Manage SkyMoney subscription" style={s.buttonSecondary} onPress={() => router.push(navigationForSubscription() as any)}><Text style={s.saveText}>Manage Subscription Centre</Text></NexaPressable>
            <Text style={s.muted}>Aami redemption and Yaayz PPV allocation remain connected to this subscription state.</Text>
          </View>
        </View>
        <View style={s.card}>
          <Text style={s.section}>Financial snapshot</Text>
          <Text style={s.muted}>Based on money records stored in your NEXA account. External bank or broker balances are not connected by this dashboard.</Text>
          <View style={ds({ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 })}>
            <View style={ds({ flex: 1, minWidth: 135, backgroundColor: theme.colors.backgroundSoft, borderRadius: 12, padding: 13 })}>
              <Text style={s.muted}>Logged expenses</Text>
              <Text style={s.title}>{formatMajorCurrency(totals.expenseTotal, "NGN", "en-NG")}</Text>
            </View>
            <View style={ds({ flex: 1, minWidth: 135, backgroundColor: theme.colors.backgroundSoft, borderRadius: 12, padding: 13 })}>
              <Text style={s.muted}>Owed to you</Text>
              <Text style={s.title}>{formatMajorCurrency(totals.owedToMe, "NGN", "en-NG")}</Text>
            </View>
            <View style={ds({ flex: 1, minWidth: 135, backgroundColor: theme.colors.backgroundSoft, borderRadius: 12, padding: 13 })}>
              <Text style={s.muted}>You owe</Text>
              <Text style={s.title}>{formatMajorCurrency(totals.iOwe, "NGN", "en-NG")}</Text>
            </View>
            <View style={ds({ flex: 1, minWidth: 135, backgroundColor: theme.colors.backgroundSoft, borderRadius: 12, padding: 13 })}>
              <Text style={s.muted}>Paid across NEXA</Text>
              <Text style={s.title}>{formatMajorCurrency(financial.paid, "NGN", "en-NG")}</Text>
            </View>
            <View style={ds({ flex: 1, minWidth: 135, backgroundColor: theme.colors.backgroundSoft, borderRadius: 12, padding: 13 })}>
              <Text style={s.muted}>Kitchen referral rewards</Text>
              <Text style={s.title}>{Number(skyMoney?.balances?.aami?.amount||0).toLocaleString()} Aami</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.section}>NEXA payment activity</Text>
          <Text style={s.muted}>Payment-bearing activity from Dream Marketplace, Yaayz tickets and Kitchen is included here alongside your original Sky Money records.</Text>
          <View style={ds({ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 })}>
            <Text style={s.muted}>{financial.orders} paid orders/tickets</Text>
            <Text style={s.muted}>{financial.receipts} illustrated receipts</Text>
            <Text style={s.muted}>Kitchen referral rewards now credit Aami under SkyMoney</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.section}>SkyMoney financial tools</Text>
          <NexaPressable accessibilityRole="button" accessibilityLabel={`Open ${BRAND.wallet}`} style={s.buttonSecondary} onPress={() => router.push("/wallet" as any)}><Text style={s.saveText}>Open {BRAND.wallet}</Text></NexaPressable>
          <NexaPressable accessibilityRole="button" accessibilityLabel="Open NEXA Membership and service fees" style={s.buttonSecondary} onPress={() => router.push(navigationForSubscription() as any)}><Text style={s.saveText}>NEXA Membership & service fees</Text></NexaPressable>
          <NexaPressable accessibilityRole="button" accessibilityLabel="Open Sky Financial Planning and Goals" style={s.buttonSecondary} onPress={() => setView("planning")}><Text style={s.saveText}>Open Sky Financial Planning & Goals</Text></NexaPressable>
          <NexaPressable accessibilityRole="button" accessibilityLabel={`Open ${BRAND.storeSavings} savings`} style={s.buttonSecondary} onPress={() => setView("ajo")}><Text style={s.saveText}>{BRAND.storeSavings} — save toward a Marketplace item</Text></NexaPressable>
          <NexaPressable accessibilityRole="button" accessibilityLabel={`Open ${BRAND.marketWatch}`} style={s.buttonSecondary} onPress={() => setView("market")}><Text style={s.saveText}>Open {BRAND.marketWatch}</Text></NexaPressable>
          <NexaPressable accessibilityRole="button" accessibilityLabel={`Open ${BRAND.insights}`} style={s.buttonSecondary} onPress={() => setView("insights")}><Text style={s.saveText}>Open {BRAND.insights}</Text></NexaPressable>
          <NexaPressable accessibilityRole="button" accessibilityLabel={`Open ${BRAND.groupSavings}`} style={s.buttonSecondary} onPress={() => setView("groups")}><Text style={s.saveText}>Open {BRAND.groupSavings} — Split, Pot & Groups ({groups.groups.length})</Text></NexaPressable>
          <NexaPressable accessibilityRole="button" accessibilityLabel="Open Marketplace payments and history" style={s.buttonSecondary} onPress={onOpenMarketplace}><Text style={s.saveText}>Open Marketplace payments & history</Text></NexaPressable>
        </View>

        <View style={s.card}>
          <Text style={s.section}>Recent activity</Text>
          {[...expenses.map(e => ({ ...e, kind: "Expense", when: e.date || e.createdAt })), ...debts.map(d => ({ ...d, kind: d.direction === "owed_to_me" ? "Owed to you" : "You owe", when: d.createdAt }))]
            .sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime())
            .slice(0, 5)
            .map((item, index) => (
              <View key={item.id || index} style={ds({ paddingVertical: 10, borderBottomWidth: index < 4 ? 1 : 0, borderBottomColor: theme.colors.border })}>
                <Text style={ds({ color: theme.colors.text, fontWeight: "800" })}>{item.kind}</Text>
                <Text style={s.muted}>{item.note || item.person || item.category || "Sky Money record"}</Text>
                <Text style={ds({ color: theme.colors.text, marginTop: 4, fontWeight: "700" })}>{formatMajorCurrency(Number(item.amount || 0), "NGN", "en-NG")}</Text>
              </View>
            ))}
          {!expenses.length && !debts.length ? <Text style={s.muted}>No Sky Money activity recorded yet.</Text> : null}
        </View>
      </> : <View style={s.card}>
        <Text style={s.section}>Sky Money activity</Text>
        <Text style={s.muted}>Expenses and debts recorded under your authenticated NEXA account.</Text>
        {[...expenses.map(e => ({ ...e, kind: "Expense", when: e.date || e.createdAt })), ...debts.map(d => ({ ...d, kind: d.direction === "owed_to_me" ? "Owed to you" : "You owe", when: d.createdAt }))]
          .sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime())
          .map((item, index) => (
            <View key={item.id || index} style={ds({ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border })}>
              <View style={ds({ flexDirection: "row", justifyContent: "space-between" })}>
                <Text style={ds({ color: theme.colors.text, fontWeight: "800" })}>{item.kind}</Text>
                <Text style={ds({ color: theme.colors.text, fontWeight: "800" })}>{formatMajorCurrency(Number(item.amount || 0), "NGN", "en-NG")}</Text>
              </View>
              <Text style={[s.muted, { marginTop: 4 }]}>{item.note || item.person || item.category || "Sky Money record"}</Text>
              <Text style={[s.muted, { marginTop: 4 }]}>{item.when ? new Date(item.when).toLocaleString() : "Date unavailable"}{item.settled != null ? ` · ${item.settled ? "Settled" : "Open"}` : ""}</Text>
            </View>
          ))}
        {!expenses.length && !debts.length ? <Text style={[s.muted, { marginTop: 12 }]}>No Sky Money activity recorded yet.</Text> : null}
      </View>}
    </ScrollView>
  );
}

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { authedFetch } from "./api";
import { s } from "./styles";
import { theme, tc, ds } from './theme';
import {NexaPressable} from './motion';
import { nexaGoBack } from './NexaNavKeys';
import { formatMajorCurrency } from './currencyDisplay';

type Friend = { id: string; name: string; username: string | null };
type Tx = { id:string; type:string; direction:string; amount:number; currency:string; status:string; source:string; reference:string; description:string; counterparty?:{name:string;username:string|null}|null; createdAt:string };

function money(amount:number, currency?:string) { return formatMajorCurrency(Number(amount || 0), currency, "en-NG"); }

export function Wallet() {
  const [wallet, setWallet] = useState<any>(null);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyRequest = useRef(0);
  const [friends, setFriends] = useState<Friend[]>([]);
  const params = useLocalSearchParams<{ view?: string }>();
  const initialView = params.view === "deposit" || params.view === "withdraw" || params.view === "send" || params.view === "history" ? params.view : "home";
  const [view, setView] = useState<"home"|"deposit"|"withdraw"|"send"|"history">(initialView);
  useEffect(() => { if (params.view === "deposit" || params.view === "withdraw" || params.view === "send" || params.view === "history") setView(params.view); }, [params.view]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feePreview, setFeePreview] = useState<any>(null);
  const loadRequest=useRef(0);
  const feeRequest=useRef(0);
  // One idempotency key per attempt: a retry of the same request (after a timeout) reuses it, so it cannot send twice.
  const attemptKey=useRef<{sig:string;key:string}|null>(null);

  const load = useCallback(async () => {
    const requestId=++loadRequest.current;
    setLoading(true); setError("");
    try {
      const [w, f] = await Promise.all([authedFetch("/api/wallet"), authedFetch("/api/wallet/friends")]);
      if(requestId!==loadRequest.current)return;
      setWallet(w); setFriends(Array.isArray(f?.friends) ? f.friends : []);
    } catch (e:any) { if(requestId===loadRequest.current)setError(e?.message || "Could not load your Sky Wallet."); }
    finally { if(requestId===loadRequest.current)setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const previewFee = async (action:"withdraw"|"send") => {
    const requestId=++feeRequest.current;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return Alert.alert("Sky Wallet", "Enter an amount greater than zero first.");
    try {
      const serviceCode = action === "send" ? "wallet_transfer" : "wallet_withdrawal";
      const d = await authedFetch(`/api/subscription/fee-preview?serviceCode=${encodeURIComponent(serviceCode)}&amount=${encodeURIComponent(String(value))}&currency=NGN`);
      if(requestId!==feeRequest.current)return;
      setFeePreview(d?.preview || null);
    } catch (e:any) { if(requestId===feeRequest.current)Alert.alert("Service fee", e?.message || "Could not calculate the service fee."); }
  };

  const submit = async (action:"deposit"|"withdraw"|"send") => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return Alert.alert("Sky Wallet", "Enter an amount greater than zero.");
    if (action === "send" && !selectedFriend) return Alert.alert("Sky Wallet", "Choose a Zeeza friend to receive the money.");
    if (wallet && wallet.providerConnected === false) return Alert.alert("Sky Wallet", "Sky Wallet will open once our licensed wallet partner is connected.");
    setBusy(true);
    try {
      const sig = `${action}|${value}|${selectedFriend?.id || ""}`;
      if (!attemptKey.current || attemptKey.current.sig !== sig) attemptKey.current = { sig, key:`wallet-${action}-${Date.now()}-${Math.random().toString(16).slice(2)}` };
      const body:any = { amount:value, currency:"NGN", idempotencyKey:attemptKey.current.key, description:description.trim() };
      if (action === "send") body.recipientUserId = selectedFriend!.id;
      if (action !== "deposit") body.feePreviewId = feePreview?.previewId;
      const result = await authedFetch(`/api/wallet/${action}`, { method:"POST", body:JSON.stringify(body) });
      setWallet((current:any) => ({ ...current, balance: result.balance, transactions:[result.transaction, ...(current?.transactions || [])] }));
      const chargedFee = Number(result?.fee?.amount || 0);
      attemptKey.current = null;
      setAmount(""); setDescription(""); setSelectedFriend(null); setFeePreview(null); setView("home");
      Alert.alert(action === "deposit" ? "Money added" : action === "withdraw" ? "Withdrawal recorded" : "Money sent", `${money(result.transaction.amount)} ${action === "send" ? `sent to ${result.transaction.counterparty?.name || "your friend"}.` : "recorded in the Sky Wallet sandbox."}${chargedFee ? ` NEXA service fee: ${money(chargedFee)}.` : ""}`);
    } catch (e:any) { Alert.alert("Sky Wallet", e?.message || "The wallet action could not be completed."); }
    finally { setBusy(false); }
  };

  if (loading && !wallet) return <View style={[s.wrap,{flex:1,justifyContent:"center"}]}><ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading Sky Money wallet" color={theme.colors.goldBright}/></View>;
  const transactions:Tx[] = wallet?.transactions || [];
  const mergeTransactionsById = (existing:Tx[], incoming:Tx[]) => { const map = new Map(existing.map(x => [x.id, x])); incoming.forEach(x => map.set(x.id, x)); return [...map.values()].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); };
  const loadHistory = async (cursor?: string | null) => { const requestId = ++historyRequest.current; setHistoryLoading(true); try { const q = cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""; const d = await authedFetch(`/api/wallet/transactions?limit=50${q}`); if (requestId !== historyRequest.current) return; setWallet((current:any)=>current ? ({...current,transactions: cursor ? mergeTransactionsById(current.transactions||[], d.transactions||[]) : (d.transactions||[])}) : current); setHistoryCursor(d.nextCursor || null); setHistoryHasMore(Boolean(d.hasMore)); } catch(e:any) { if (requestId === historyRequest.current) setError(e?.message || "Could not load wallet history."); } finally { if (requestId === historyRequest.current) setHistoryLoading(false); } };
  const identity = wallet?.identity || {};

  return <ScrollView style={s.wrap} contentContainerStyle={ds({paddingBottom:50})} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.goldBright}/>}> 
    <NexaPressable accessibilityRole="button" accessibilityLabel="Back from Sky Wallet" onPress={()=>nexaGoBack()}><Text style={s.back}>‹ Back</Text></NexaPressable>
    <Text style={[s.title,{marginTop:10}]}>Sky Wallet</Text>
    <Text style={s.subtitle}>Your Sky Wallet account surface for deposits, withdrawals, transfers and wallet activity.</Text>

    <View style={[s.card,{marginTop:16,borderWidth:1,borderColor:theme.colors.borderStrong}]}> 
      <Text style={s.muted}>Available balance · {wallet?.balance?.currency}</Text>
      <Text style={[s.title,{fontSize:36,marginTop:5}]}>{money(wallet?.balance?.amount || 0, wallet?.balance?.currency)}</Text>
      <Text style={[s.muted,{marginTop:7}]}>Mode: {wallet?.mode === "sandbox" ? "Sandbox (development only)" : wallet?.providerConnected === false ? "Wallet partner not connected yet" : "Wallet partner connected"}</Text>
      <Text style={[s.muted,{marginTop:3}]}>Sandbox funds are simulated and are not bank deposits.</Text>
    </View>

    {error ? <View style={s.card}><Text style={ds({color:tc("#ef8d8d"),fontWeight:"800"})}>{error}</Text></View> : null}

    {view === "home" ? <>
      <View style={ds({flexDirection:"row",flexWrap:"wrap",gap:10,marginTop:14})}>
        {[["deposit","Add Money"],["withdraw","Withdraw"],["send","Send Money"],["history","History"]].map(([id,label])=><NexaPressable key={id} style={[s.buttonSecondary,{flexGrow:1,minWidth:145}]} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected:view===id}} onPress={()=>{setView(id as any); if(id === "history") loadHistory(null);}}><Text style={s.saveText}>{label}</Text></NexaPressable>)}
      </View>
      <View style={s.card}>
        <Text style={s.section}>Receive Money</Text>
        <Text style={s.muted}>Friends can send money to you through your Zeeza connection.</Text>
        <Text style={ds({color: theme.colors.text,fontWeight:"800",marginTop:12})}>{identity.username ? `@${identity.username}` : identity.email || "Your NEXA account"}</Text>
        <Text style={[s.muted,{marginTop:5}]}>Sky Wallet transfers are currently limited to accepted Zeeza friends.</Text>
      </View>
      <View style={s.card}>
        <Text style={s.section}>Connected financial features</Text>
        <Text style={s.muted}>Sky Wallet is the account surface inside Sky Money. Sky Money remains the planning/records area. Bank or fintech funding will attach beneath this boundary later.</Text>
        <View style={ds({marginTop:12,gap:8})}>
          {['Sky Store Savings','Sky Group Savings & friend contributions','Dream Marketplace payments','Yaayz tickets','Kitchen payments','Cashback'].map(x=><View key={x} style={ds({paddingVertical:7,borderBottomWidth:1,borderBottomColor:theme.colors.border})}><Text style={ds({color: theme.colors.text,fontWeight:"700"})}>{x}</Text><Text style={s.muted}>Wallet integration boundary ready; existing provider flow remains unchanged until connected.</Text></View>)}
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.section}>Recent Wallet activity</Text>
        {transactions.slice(0,5).map((x,i)=><View key={x.id} style={ds({paddingVertical:10,borderBottomWidth:i<Math.min(4,transactions.length-1)?1:0,borderBottomColor:theme.colors.border})}><View style={ds({flexDirection:"row",justifyContent:"space-between"})}><Text style={ds({color: theme.colors.text,fontWeight:"800"})}>{x.type}</Text><Text style={ds({color:x.direction==="credit"?tc("#9fe0b0"):theme.colors.text,fontWeight:"800"})}>{x.direction==="credit"?"+":"-"}{money(x.amount,x.currency)}</Text></View><Text style={s.muted}>{x.counterparty?.name ? `${x.counterparty.name} · ` : ""}{x.description || x.source}</Text></View>)}
        {!transactions.length ? <Text style={s.muted}>No Sky Wallet activity yet.</Text> : null}
      </View>
    </> : <>
      <NexaPressable accessibilityRole="button" accessibilityLabel="Back to Sky Wallet overview" onPress={()=>setView("home")}><Text style={s.back}>‹ Sky Wallet overview</Text></NexaPressable>
      <View style={s.card}>
        <Text style={s.section}>{view === "deposit" ? "Add Money" : view === "withdraw" ? "Withdraw" : view === "send" ? "Send Money" : "Sky Wallet History"}</Text>
        {view === "history" ? <>{transactions.map(x=><View key={x.id} style={ds({paddingVertical:12,borderBottomWidth:1,borderBottomColor:theme.colors.border})}><View style={ds({flexDirection:"row",justifyContent:"space-between"})}><Text style={ds({color: theme.colors.text,fontWeight:"800"})}>{x.type}</Text><Text style={ds({color: theme.colors.text,fontWeight:"800"})}>{x.direction==="credit"?"+":"-"}{money(x.amount,x.currency)}</Text></View><Text style={s.muted}>{x.description || x.source} · {new Date(x.createdAt).toLocaleString()}</Text><Text style={s.muted}>{x.status} · {x.reference}</Text>{(x.type === "deposit" || x.type === "withdrawal") && x.source !== "internal" && x.source !== "paystack" ? <View style={ds({flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:8})}><NexaPressable accessibilityRole="button" accessibilityLabel="Check wallet provider status" accessibilityState={{disabled:busy}} disabled={busy} style={[s.buttonSecondary,{flexGrow:1}]} onPress={async()=>{try{const d=await authedFetch(`/api/wallet/transactions/${encodeURIComponent(x.id)}/provider-status`,{method:"POST"});setWallet((current:any)=>current?({...current,transactions:(current.transactions||[]).map((tx:Tx)=>tx.id===x.id?({...tx,status:d?.transaction?.status||d?.provider?.mappedStatus||tx.status}):tx)}):current);Alert.alert("Provider status",`NEXA recorded this transaction as ${d?.provider?.status || d?.transaction?.status || x.status}.`);}catch(e:any){Alert.alert("Provider status",e?.message || "Provider status is unavailable.");}}}><Text style={s.saveText}>Check provider status</Text></NexaPressable><NexaPressable accessibilityRole="button" accessibilityLabel="Reconcile wallet transaction" accessibilityState={{disabled:busy}} disabled={busy} style={[s.buttonSecondary,{flexGrow:1}]} onPress={async()=>{try{const d=await authedFetch(`/api/wallet/transactions/${encodeURIComponent(x.id)}/reconcile`,{method:"POST"});const r=d?.reconciliation;setWallet((current:any)=>current?({...current,transactions:(current.transactions||[]).map((tx:Tx)=>tx.id===x.id?({...tx,status:d?.transaction?.status||tx.status}):tx)}):current);Alert.alert("Reconciliation",r?.applicable===false?"This is an internal NEXA transaction and does not use a provider.":r?.updated?`NEXA updated the transaction to ${r.mappedStatus}.`:`Provider check complete: ${r?.mappedStatus || x.status}.`);}catch(e:any){Alert.alert("Reconciliation",e?.message || "Reconciliation is unavailable.");}}}><Text style={s.saveText}>Reconcile</Text></NexaPressable></View> : null}</View>)}{historyHasMore ? <NexaPressable disabled={historyLoading} accessibilityState={{disabled:historyLoading}} style={[s.buttonSecondary,{marginTop:12,opacity:historyLoading?0.55:1}]} accessibilityRole="button" accessibilityLabel="Load older wallet activity" onPress={()=>loadHistory(historyCursor)}><Text style={s.saveText}>{historyLoading ? "Loading…" : "Load older activity"}</Text></NexaPressable> : null}</> : <>
          <Text style={s.muted}>{wallet?.providerConnected === false ? "Sky Wallet is coming soon. Adding money, sending and withdrawals will open once our licensed wallet partner is connected." : "This milestone uses the Sky Wallet sandbox. It does not move real bank funds."}</Text>
          <TextInput accessibilityLabel="Wallet transaction amount in Nigerian naira" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount (NGN)" placeholderTextColor={tc("#7f8794")} style={[{backgroundColor:tc("#15110A"),borderRadius:12,padding:13,color: theme.colors.text,borderWidth:1,borderColor:theme.colors.border},{marginTop:14}]}/>
          <TextInput accessibilityLabel="Wallet transaction description" value={description} onChangeText={setDescription} placeholder="Description (optional)" placeholderTextColor={tc("#7f8794")} style={[{backgroundColor:tc("#15110A"),borderRadius:12,padding:13,color: theme.colors.text,borderWidth:1,borderColor:theme.colors.border},{marginTop:10}]}/>
          {view === "send" ? <>
            <Text style={[s.muted,{marginTop:14,marginBottom:8}]}>Choose a Zeeza friend</Text>
            {friends.length ? friends.map(f=><NexaPressable accessibilityRole="radio" accessibilityState={{selected:selectedFriend?.id===f.id}} accessibilityLabel={`Select Zeeza friend ${f.name || f.username || f.id}`} key={f.id} onPress={()=>setSelectedFriend(f)} style={[s.card,{marginTop:7,padding:12,borderWidth:1,borderColor:selectedFriend?.id===f.id?theme.colors.goldBright:theme.colors.border}]}><Text style={ds({color: theme.colors.text,fontWeight:"800"})}>{f.name}</Text><Text style={s.muted}>{f.username ? `@${f.username}` : "NEXA friend"}</Text></NexaPressable>) : <Text style={s.muted}>No Zeeza friends are available for wallet transfers yet.</Text>}
          </> : null}
          {view !== "deposit" ? <>
            <NexaPressable disabled={busy} accessibilityState={{disabled:busy}} style={[s.buttonSecondary,{marginTop:12,opacity:busy?0.55:1}]} accessibilityRole="button" accessibilityLabel="Preview NEXA service fee" onPress={()=>previewFee(view as "withdraw"|"send")}><Text style={s.saveText}>Preview NEXA service fee</Text></NexaPressable>
            {feePreview ? <View style={[s.card,{marginTop:10,borderWidth:1,borderColor:theme.colors.goldBright}]}>
              <Text style={s.section}>Before you confirm</Text>
              <Text style={s.muted}>{feePreview.planName} · {view === "send" ? "Sky Wallet transfer" : "Sky Wallet withdrawal"}</Text>
              <Text style={ds({color: theme.colors.text,fontWeight:"900",fontSize:20,marginTop:7})}>Service fee: {money(feePreview.fee.amount)}</Text>
              <Text style={s.muted}>Action: {money(feePreview.actionAmount.amount)} · Total Sky Wallet debit: {money(feePreview.totalDebit.amount)}</Text>
              {feePreview.cap ? <Text style={s.muted}>Monthly cap remaining before this action: {money(feePreview.capRemaining.amount)}</Text> : null}
              <Text style={[s.muted,{marginTop:7}]}>The final server check recalculates this fee before the action is recorded.</Text>
            </View> : null}
          </> : null}
          <NexaPressable disabled={busy || wallet?.providerConnected === false || (view !== "deposit" && !feePreview)} accessibilityState={{disabled:busy || wallet?.providerConnected === false || (view !== "deposit" && !feePreview)}} style={[s.button,{marginTop:16,opacity:(busy || wallet?.providerConnected === false || (view !== "deposit" && !feePreview))?0.55:1}]} accessibilityRole="button" accessibilityLabel="Confirm wallet transaction" onPress={()=>submit(view as any)}><Text style={s.buttonText}>{busy?"Processing…":view === "deposit"?(wallet?.providerConnected === false ? "Coming soon" : "Add sandbox money"):view === "withdraw"?"Confirm withdrawal":"Confirm transfer"}</Text></NexaPressable>
        </>}
      </View>
    </>}
  </ScrollView>;
}

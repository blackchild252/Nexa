import React, { useCallback, useEffect, useRef, useState } from "react";
import {openPaymentUrl} from "./safeExternalNavigation";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from "react-native";
import { authedFetch } from "./api";
import { s } from "./styles";

import { theme, tc, ds } from './theme';
import {NexaPressable} from './motion';
import { formatMajorCurrency } from './currencyDisplay';
function money(currency: string | null | undefined, value: number) {
  return formatMajorCurrency(Number(value || 0), currency, "en-NG");
}

export function StoreAjo({ onBack }: { onBack?: () => void } = {}) {
  const [products, setProducts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [termMonths, setTermMonths] = useState(2);
  const [variantByProduct, setVariantByProduct] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feePreview, setFeePreview] = useState<Record<string, any>>({});
  const loadRequest = useRef(0);
  const feeRequests = useRef<Record<string, number>>({});

  const load = useCallback(async () => {
    const requestId = ++loadRequest.current;
    setLoading(true); setError("");
    try {
      const [catalog, ajo] = await Promise.all([
        authedFetch("/api/mall/products?limit=50&sort=newest"),
        authedFetch("/api/money/ajo/store"),
      ]);
      if (requestId !== loadRequest.current) return;
      const baseProducts = (catalog?.products || []).filter((p: any) => Number(p.stock) > 0 && String(p.currency || "").toUpperCase() === "NGN");
      const productsWithVariants = await Promise.all(baseProducts.map(async (p: any) => {
        if (!p.hasVariants) return p;
        try { const detail = await authedFetch(`/api/mall/products/${encodeURIComponent(p.id)}`); return { ...p, variants: Array.isArray(detail?.product?.variants) ? detail.product.variants : [] }; }
        catch (_) { return { ...p, variants: [] }; }
      }));
      if (requestId !== loadRequest.current) return;
      setProducts(productsWithVariants);
      setAccounts(Array.isArray(ajo?.accounts) ? ajo.accounts : []);
    } catch (e: any) { if (requestId === loadRequest.current) setError(e?.message || "Could not load Sky Store Savings."); }
    finally { if (requestId === loadRequest.current) setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createAjo(product: any) {
    const variantId = product.hasVariants ? variantByProduct[product.id] : undefined;
    if (product.hasVariants && !variantId) { setError(`Choose a size or colour for ${product.name}.`); return; }
    setBusy(true); setError("");
    try {
      const data = await authedFetch("/api/money/ajo/store", { method: "POST", body: JSON.stringify({ productId: product.id, termMonths, ...(variantId ? { variantId } : {}) }) });
      setAccounts((x) => [data.account, ...x]);
      Alert.alert("Sky Store Savings created", `${product.name} is now reserved for your Sky Store Savings target of ${money(product.currency, Number(data.account.targetAmount))}.`);
      await load();
    } catch (e: any) { setError(e?.message || "Could not create the Sky Store Savings account."); }
    finally { setBusy(false); }
  }

  async function previewContributionFee(account: any, rawAmount: string) {
    const value = Number(rawAmount);
    const requestId = (feeRequests.current[account.id] || 0) + 1;
    feeRequests.current[account.id] = requestId;
    if (!Number.isFinite(value) || value <= 0) {
      setFeePreview((x) => ({ ...x, [account.id]: null }));
      return;
    }
    try {
      const data = await authedFetch(`/api/subscription/fee-preview?serviceCode=ajo_contribution&amount=${encodeURIComponent(value)}&currency=${encodeURIComponent(account.currency || "")}`);
      if (requestId !== feeRequests.current[account.id]) return;
      setFeePreview((x) => ({ ...x, [account.id]: data?.preview || null }));
    } catch (_) {
      if (requestId !== feeRequests.current[account.id]) return;
      setFeePreview((x) => ({ ...x, [account.id]: null }));
    }
  }

  async function contribute(account: any) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError("Enter a contribution greater than zero.");
    if (!email.trim()) return setError("Enter the email used for the payment.");
    setBusy(true); setError("");
    try {
      const data = await authedFetch(`/api/money/ajo/store/${account.id}/contributions`, { method: "POST", body: JSON.stringify({ amount: value, email: email.trim(), feePreviewId: feePreview[account.id]?.previewId }) });
      setAmount("");
      if (data?.payment?.authorization_url) {
        await openPaymentUrl(String(data.payment.authorization_url));
        Alert.alert("Contribution started", "Complete the secure payment page, then return to NEXA and tap Verify contribution.");
      } else {
        Alert.alert("Contribution recorded", "Your contribution has been recorded.");
      }
      await load();
    } catch (e: any) { setError(e?.message || "Could not start the contribution."); }
    finally { setBusy(false); }
  }

  async function verify(reference: string) {
    setBusy(true); setError("");
    try { await authedFetch("/api/money/ajo/store/contributions/verify", { method: "POST", body: JSON.stringify({ reference }) }); await load(); }
    catch (e: any) { setError(e?.message || "Could not verify the contribution."); }
    finally { setBusy(false); }
  }

  async function pickup(account: any) {
    setBusy(true); setError("");
    try { await authedFetch(`/api/money/ajo/store/${account.id}/pickup`, { method: "POST" }); Alert.alert("Ready", "Your Sky Store Savings item has been marked as picked up."); await load(); }
    catch (e: any) { setError(e?.message || "Pickup is not available yet."); }
    finally { setBusy(false); }
  }

  async function remove(account: any) {
    setBusy(true); setError("");
    try { await authedFetch(`/api/money/ajo/store/${account.id}`, { method: "DELETE" }); await load(); }
    catch (e: any) { setError(e?.message || "This Sky Store Savings account cannot be removed."); }
    finally { setBusy(false); }
  }

  return <ScrollView contentContainerStyle={s.scrollWrap} keyboardShouldPersistTaps="handled">
    {onBack ? <NexaPressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Sky Money"><Text style={s.back}>‹ Back to Sky Money</Text></NexaPressable> : null}
    <Text style={s.heading}>Sky Store Savings</Text>
    <Text style={s.subtitle}>Save toward one specific Dream Marketplace item. Zero interest. The item is reserved and pickup unlocks only when your contribution reaches 100%.</Text>
    {error ? <View style={s.card}><Text style={ds({ color: tc("#ef8d8d"), fontWeight: "800" })}>{error}</Text></View> : null}
    <View style={s.card}>
      <Text style={s.section}>How it works</Text>
      <Text style={s.muted}>1. Pick an item. 2. NEXA locks its current price and reserves one unit. 3. Contribute in parts through secure payments. 4. At full contribution, pickup unlocks. There is no interest or extra charge added by Sky Store Savings.</Text>
    </View>

    <View style={s.card}>
      <Text accessibilityRole="header" style={s.section}>Create a Sky Store Savings account</Text>
      {loading ? <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading savings options" color={theme.colors.goldBright} /> : null}
      {products.map((p) => <View key={p.id} style={ds({ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border })}>
        <Text style={s.title}>{p.name}</Text>
        <Text style={s.muted}>{p.vendorName || "Dream Marketplace"} · {money(p.currency, Number(p.salePrice ?? p.price))}</Text>
        {p.hasVariants ? <><Text style={[s.muted, { marginTop: 7 }]}>Choose your locked item option</Text><View style={ds({ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 7 })} accessibilityRole="radiogroup" accessibilityLabel={`Options for ${p.name}`} >{(p.variants || []).filter((v: any) => Number(v.stock) > 0).map((v: any) => <NexaPressable key={v.id} accessibilityRole="radio" accessibilityState={{selected:variantByProduct[p.id]===v.id}} accessibilityLabel={`Choose ${[v.size,v.colour].filter(Boolean).join(" / ")} for ${p.name}`} onPress={() => setVariantByProduct(x => ({...x, [p.id]: v.id}))} style={[s.pill, variantByProduct[p.id]===v.id && s.pillActive]}><Text style={s.pillText}>{[v.size,v.colour].filter(Boolean).join(" / ")}</Text></NexaPressable>)}</View></> : null}
        {p.hasVariants && !(p.variants || []).some((v: any) => Number(v.stock) > 0) ? <Text style={s.muted}>All options are currently out of stock.</Text> : null}
        <Text style={[s.muted, { marginTop: 6 }]}>Sky Store Savings term</Text>
        <View style={ds({ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 7 })} accessibilityRole="radiogroup" accessibilityLabel="Sky Store Savings term choices">
          {[2,3,4,5,6].map((m) => <NexaPressable accessibilityRole="radio" accessibilityState={{selected:termMonths===m}} accessibilityLabel={`Set savings term to ${m} months`} key={m} onPress={() => setTermMonths(m)} style={[s.pill, termMonths === m && s.pillActive]}><Text style={s.pillText}>{m} months</Text></NexaPressable>)}
        </View>
        <Text style={[s.muted, { marginTop: 7 }]}>Zero interest. No Sky Store Savings discount. You pay the locked item price.</Text>
        <NexaPressable accessibilityRole="button" accessibilityLabel={`Create Sky Store Savings for ${p.name || "this product"}`} disabled={busy} accessibilityState={{disabled:busy}} style={[s.buttonSecondary, { marginTop: 8 }]} onPress={() => createAjo(p)}><Text style={s.saveText}>Create Sky Store Savings</Text></NexaPressable>
      </View>)}
      {!loading && !products.length ? <Text style={s.muted}>No eligible NGN items are currently in stock.</Text> : null}
    </View>

    <View style={s.card}>
      <Text accessibilityRole="header" style={s.section}>Your Sky Store Savings accounts</Text>
      {!accounts.length ? <Text style={s.muted}>No Sky Store Savings accounts yet.</Text> : null}
      {accounts.map((a) => {
        const pct = Math.min(100, (Number(a.contributed || 0) / Number(a.targetAmount || 1)) * 100);
        return <View key={a.id} style={ds({ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.colors.border })}>
          <Text style={s.title}>{a.productName}</Text>
          {a.variantLabel ? <Text style={s.muted}>Locked option: {a.variantLabel}</Text> : null}
          <Text style={s.muted}>{money(a.currency, Number(a.contributed))} of {money(a.currency, Number(a.targetAmount))} · {pct.toFixed(0)}% · {a.termMonths || 2} months · {a.interestRate}% interest · {a.discountRate || 0}% discount</Text>
          <View style={ds({ height: 8, backgroundColor: theme.colors.surfacePressed, borderRadius: 8, overflow: "hidden", marginTop: 9 })}><View style={ds({ width: `${pct}%`, height: 8, backgroundColor: theme.colors.goldBright })} /></View>
          {a.status === "saving" ? <>
            <TextInput accessibilityLabel={`Contribution amount for ${a.productName || a.id}`} style={[s.authInput, { marginTop: 10 }]} keyboardType="decimal-pad" placeholder={`Contribution up to ${money(a.currency, Number(a.remaining))}`} placeholderTextColor={tc("#666")} value={selected?.id === a.id ? amount : ""} onFocus={() => setSelected(a)} onChangeText={(v) => { setAmount(v); previewContributionFee(a, v); }} />
            {selected?.id === a.id && feePreview[a.id] ? <Text style={[s.muted, { marginTop: 7 }]}>NEXA service fee: {money(feePreview[a.id].fee?.currency || a.currency, Number(feePreview[a.id].fee?.amount || 0))} · Sky Wallet fee payment required</Text> : null}
            <TextInput style={[s.authInput, { marginTop: 8 }]} keyboardType="email-address" autoCapitalize="none" placeholder="Payment email" accessibilityLabel="Payment email" placeholderTextColor={tc("#666")} value={email} onChangeText={setEmail} />
            <NexaPressable accessibilityRole="button" accessibilityLabel={`Contribute to ${a.productName || a.id} with service fee`} disabled={busy || !feePreview[a.id]} accessibilityState={{disabled:busy || !feePreview[a.id]}} style={[s.button, { marginTop: 8, opacity: busy || !feePreview[a.id] ? 0.5 : 1 }]} onPress={() => contribute(a)}><Text style={s.buttonText}>Contribute + service fee</Text></NexaPressable>
            <NexaPressable accessibilityRole="button" accessibilityLabel={`Delete ${a.productName || a.id} savings before first contribution`} disabled={busy} accessibilityState={{disabled:busy}} style={[s.buttonSecondary, { marginTop: 8 }]} onPress={() => remove(a)}><Text style={s.saveText}>Delete before first contribution</Text></NexaPressable>
          </> : a.status === "ready_for_pickup" ? <NexaPressable accessibilityRole="button" accessibilityLabel={`Pick up ${a.productName || a.id} order`} disabled={busy} accessibilityState={{disabled:busy}} style={[s.button, { marginTop: 10 }]} onPress={() => pickup(a)}><Text style={s.buttonText}>Pick up order</Text></NexaPressable> : <Text style={[s.muted, { marginTop: 10 }]}>Picked up — Sky Store Savings complete.</Text>}
          {(a.contributions || []).map((c: any) => c.status === "pending" ? <NexaPressable accessibilityRole="button" accessibilityLabel={`Verify contribution payment ${c.paymentRef || c.id}`} key={c.id} disabled={busy} accessibilityState={{disabled:busy}} style={[s.buttonSecondary, { marginTop: 8 }]} onPress={() => verify(c.paymentRef)}><Text style={s.saveText}>Verify contribution payment</Text></NexaPressable> : null)}
        </View>;
      })}
    </View>
  </ScrollView>;
}

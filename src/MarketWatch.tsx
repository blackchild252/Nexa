import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { authedFetch } from "./api";
import { s } from "./styles";

import { theme, tc, ds } from './theme';
import { NexaPressable } from './motion';
import { NexaDataState } from './NexaDataState';
import { NexaLiveRegion } from './NexaLiveRegion';
type Point = { t: number; price: number };
type Quote = { symbol: string; name: string; currency: string; price: number; change: number; series: Point[]; dataStatus?: string; freshness?: string; source?: string };

function fmt(n: number, currency: string) {
  return `${currency} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function MiniChart({ points }: { points: Point[] }) {
  const vals = points.map((p) => p.price);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  return <View style={ds({ height: 88, flexDirection: "row", alignItems: "flex-end", gap: 2, marginTop: 12 })}>
    {points.map((p, i) => <View key={p.t} style={ds({ flex: 1, height: 18 + ((p.price - min) / span) * 58, backgroundColor: tc("#52606d"), borderRadius: 2, opacity: i === points.length - 1 ? 1 : 0.72 })} />)}
  </View>;
}

export function MarketWatch() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastSuccessfulAt, setLastSuccessfulAt] = useState<string | null>(null);
  const loadRequest=useRef(0);

  const load = useCallback(async (q = "") => {
    const requestId=++loadRequest.current;
    setLoading(true); setError("");
    try {
      const data = await authedFetch(`/api/market/quotes${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      if(requestId!==loadRequest.current)return;
      setQuotes(data.quotes || []);
      setLastSuccessfulAt(new Date().toISOString());
      setSelected((cur: Quote | null) => cur ? (data.quotes || []).find((x: Quote) => x.symbol === cur.symbol) || null : (data.quotes || [])[0] || null);
    } catch (e: any) { if(requestId===loadRequest.current)setError(e?.message || "Market information is unavailable right now."); }
    finally { if(requestId===loadRequest.current)setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(() => load(query), 30000); return () => clearInterval(id); }, [load, query]);

  const headline = useMemo(() => selected ? `${selected.change >= 0 ? "+" : ""}${selected.change.toFixed(2)}%` : "", [selected]);

  const liveMessage = loading ? "Loading market data." : error ? error : selected ? `${selected.symbol} selected. Market quote is ${fmt(selected.price, selected.currency)}.` : quotes.length ? `${quotes.length} market quotes available.` : "No market quotes available.";

  return <View style={ds({ marginTop: 20 })}><NexaLiveRegion message={liveMessage} label="Market status" />
    <Text style={s.heading}>Sky Market Watch</Text>
    <Text style={s.muted}>Charts and market information only. No broker or trader accounts.</Text>
    <TextInput accessibilityLabel="Search market symbols" value={query} onChangeText={setQuery} onSubmitEditing={() => load(query)} placeholder="Search markets e.g. SPX, BTC" placeholderTextColor={tc("#666")} style={[s.authInput, { marginTop: 12 }]} />
    {loading && !quotes.length ? <View style={ds({minHeight:44})}><NexaDataState loading title="Loading market data" message="Checking the configured market-data source." compact /></View> : null}
    {error && !quotes.length ? <NexaDataState title="Market data unavailable" message={error} actionLabel="Retry market data" onAction={() => load(query)} /> : null}
    {error && quotes.length ? <NexaDataState compact title="Showing the last successful market snapshot" message={`${error} No synthetic replacement prices are being shown.`} actionLabel="Refresh now" onAction={() => load(query)} /> : null}
    {selected ? <View style={ds({ backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, marginTop: 14 })}>
      <View style={ds({ flexDirection: "row", justifyContent: "space-between" })}><View><Text style={ds({ color: theme.colors.text, fontWeight: "900", fontSize: 20 })}>{selected.symbol}</Text><Text style={s.muted}>{selected.name}</Text></View><Text style={ds({ color: selected.change >= 0 ? theme.colors.goldBright : tc("#ff8f8f"), fontWeight: "900" })}>{headline}</Text></View>
      <Text style={ds({ color: theme.colors.text, fontSize: 26, fontWeight: "900", marginTop: 12 })}>{fmt(selected.price, selected.currency)}</Text>
      <MiniChart points={selected.series} />
      <Text style={[s.muted, { marginTop: 8 }]}>{selected.dataStatus === "preview" ? "Development preview chart" : selected.series.length ? "Provider chart · refreshed automatically" : "Provider quote · historical chart unavailable"}</Text>
      {selected.source ? <Text style={[s.muted, { marginTop: 4 }]}>{selected.source} · {selected.freshness || selected.dataStatus || "unknown"}</Text> : null}
    </View> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ds({ marginTop: 12 })}>
      {quotes.map((q) => <NexaPressable accessibilityRole="button" accessibilityLabel={`Open market quote for ${q.symbol}`} accessibilityState={{selected:selected?.symbol===q.symbol}} key={q.symbol} onPress={() => setSelected(q)} style={ds({ backgroundColor: selected?.symbol === q.symbol ? theme.colors.goldWash : theme.colors.surface, padding: 12, borderRadius: 12, marginRight: 8, minWidth: 112 })}><Text style={ds({ color: theme.colors.text, fontWeight: "900" })}>{q.symbol}</Text><Text style={s.muted}>{fmt(q.price, q.currency)}</Text><Text style={ds({ color: q.change >= 0 ? theme.colors.goldBright : tc("#ff8f8f"), marginTop: 3 })}>{q.change >= 0 ? "+" : ""}{q.change.toFixed(2)}%</Text></NexaPressable>)}
    </ScrollView>
    {lastSuccessfulAt && quotes.length ? <Text style={[s.muted, { marginTop: 8 }]}>Last successful refresh: {new Date(lastSuccessfulAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.</Text> : null}
    <Text style={[s.muted, { marginTop: 10 }]}>Market information only. Provider data is shown only when the configured provider responds; NEXA does not replace a failed provider with synthetic live-looking prices.</Text>
  </View>;
}

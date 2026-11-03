import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { authedFetch } from "./api";
import { s } from "./styles";

import { theme, tc, ds } from './theme';
import { NexaDataState } from './NexaDataState';
import { NexaLiveRegion } from './NexaLiveRegion';
type Insight = { symbol:string; name:string; kind:string; signal:string; headline:string; reasons:string[]; risks:string[]; price?:number; currency?:string; change?:number; freshness:string };
type Research = { spendingContext:string; topSpendingCategory:string|null; candidates:Array<{symbol:string;name:string;currency?:string;price?:number;change?:number;relevance:string;action:string;why:string;checks:string[]}>; disclaimer:string };
type Prefs = { insightsEnabled:number; spendingContextEnabled:number; showFx:number; showGold:number; showEquities:number; updatedAt?:string|null };
type Summary = { gainers:Array<{symbol:string;name:string;change:number}>; losers:Array<{symbol:string;name:string;change:number}> };

export function MarketInsights() {
  const [items,setItems]=useState<Insight[]>([]); const [research,setResearch]=useState<Research|null>(null); const [summary,setSummary]=useState<Summary|null>(null); const [prefs,setPrefs]=useState<Prefs|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const loadRequest=useRef(0);
  const load=useCallback(async()=>{const requestId=++loadRequest.current;setLoading(true);setError("");try{const d=await authedFetch("/api/market/insights");if(requestId!==loadRequest.current)return;setItems(d.insights||[]);setResearch(d.research||null);setSummary(d.summary||null);setPrefs(d.preferences||null);}catch(e:any){if(requestId===loadRequest.current)setError(e?.message||"Sky Insights are unavailable right now.");}finally{if(requestId===loadRequest.current)setLoading(false);}},[]);
  useEffect(()=>{load();},[load]);
  const toggle=async(key:keyof Prefs)=>{if(!prefs || key==='updatedAt')return; const next={...prefs,[key]:prefs[key]?0:1}; setPrefs(next); try{const d=await authedFetch("/api/market/preferences",{method:"PATCH",body:JSON.stringify({[key]:!!next[key]})});setPrefs(d.preferences);}catch{setPrefs(prefs);}};
  const liveMessage = loading ? "Loading Sky Insights." : error ? error : items.length ? `${items.length} Sky Insights results available.` : "No Sky Insights results available.";
  return <View style={ds({marginTop:18})}><NexaLiveRegion message={liveMessage} label="Sky Insights status" />
    <Text style={s.heading}>Sky Insights</Text>
    <Text style={s.muted}>Research signals from market data. Sky Market Watch and context. No broker accounts, trade orders, custody or investment execution. These are not personalized investment advice.</Text>
    {prefs ? <View style={ds({marginTop:12,backgroundColor:theme.colors.surface,borderRadius:14,padding:12})}>
      <Text style={ds({color:theme.colors.ivoryText,fontWeight:"900"})}>Your market settings</Text>
      <View style={ds({flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:9})}>
        {([['insightsEnabled','Insights'],['spendingContextEnabled','Spending context'],['showEquities','Equities'],['showFx','FX'],['showGold','Gold']] as const).map(([key,label])=><NexaPressable key={key} accessibilityRole="button" accessibilityLabel={`Toggle ${label}`} onPress={()=>toggle(key)} style={ds({paddingHorizontal:10,paddingVertical:8,borderRadius:9,backgroundColor:prefs[key]?theme.colors.goldBright:theme.colors.surfaceElevated})}><Text style={ds({fontSize:15,fontWeight:"800",color:prefs[key]?tc("#08100b"):theme.colors.ivoryText})}>{prefs[key]?"✓ ":""}{label}</Text></NexaPressable>)}
      </View>
    </View>:null}
    {loading && !items.length ? <View style={ds({minHeight:44})}><NexaDataState loading title="Loading Sky Insights" message="Preparing the latest research snapshot." compact /></View> : null}
    {error && !items.length ? <NexaDataState title="Sky Insights unavailable" message={error} actionLabel="Retry insights" onAction={load} /> : null}
    {error && items.length ? <NexaDataState compact title="Previous insights are still visible" message={error} actionLabel="Refresh insights" onAction={load} /> : null}
    {summary ? <View style={ds({marginTop:12,backgroundColor:theme.colors.surface,borderRadius:14,padding:14})}>
      <Text style={ds({color:theme.colors.ivoryText,fontWeight:"900",fontSize:18})}>Market movers</Text>
      <Text style={[s.muted,{marginTop:5}]}>Snapshot of reported equity price changes; not a recommendation.</Text>
      <View style={ds({flexDirection:"row",gap:12,marginTop:10})}><View style={ds({flex:1})}><Text style={ds({color:theme.colors.goldBright,fontWeight:"900"})}>Gainers</Text>{summary.gainers.slice(0,3).map(x=><Text key={x.symbol} style={[s.muted,{marginTop:4}]}>{x.symbol} {x.change>=0?"+":""}{x.change.toFixed(2)}%</Text>)}</View><View style={ds({flex:1})}><Text style={ds({color:tc("#ff9b9b"),fontWeight:"900"})}>Losers</Text>{summary.losers.slice(0,3).map(x=><Text key={x.symbol} style={[s.muted,{marginTop:4}]}>{x.symbol} {x.change>=0?"+":""}{x.change.toFixed(2)}%</Text>)}</View></View>
    </View>:null}
    {research ? <View style={ds({marginTop:12,backgroundColor:theme.colors.surface,borderRadius:14,padding:14})}>
      <Text style={ds({color:theme.colors.ivoryText,fontWeight:"900",fontSize:18})}>Research matches</Text><Text style={[s.muted,{marginTop:5}]}>{research.spendingContext}</Text>
      <Text style={[s.muted,{marginTop:5}]}>Spending history is used only to explain a research theme; it does not create a trade order or determine suitability.</Text>
      {research.candidates.map(x=><View key={x.symbol} style={ds({marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:theme.colors.border})}><Text style={ds({color:theme.colors.ivoryText,fontWeight:"900"})}>{x.symbol} · {x.action}</Text><Text style={s.muted}>{x.name}</Text><Text style={ds({color:theme.colors.goldBright,fontWeight:"800",marginTop:5})}>{x.relevance}</Text><Text style={[s.muted,{marginTop:4}]}>Why surfaced: {x.why}</Text>{x.checks.map((c,i)=><Text key={i} style={[s.muted,{marginTop:3}]}>• {c}</Text>)}</View>)}
      <Text style={[s.muted,{fontSize:15,marginTop:12}]}>{research.disclaimer}</Text>
    </View>:null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ds({marginTop:10})}>{items.map(x=><View key={x.symbol} style={ds({width:300,backgroundColor:theme.colors.surface,borderRadius:14,padding:14,marginRight:10})}><Text style={ds({color:theme.colors.ivoryText,fontSize:20,fontWeight:"900"})}>{x.symbol} · {x.kind}</Text><Text style={s.muted}>{x.name}</Text><Text style={ds({color:theme.colors.goldBright,fontWeight:"900",marginTop:10})}>{x.signal}</Text><Text style={ds({color:theme.colors.ivoryText,fontWeight:"800",marginTop:6})}>{x.headline}</Text>{x.reasons.map((r,i)=><Text key={i} style={[s.muted,{marginTop:6}]}>• {r}</Text>)}<Text style={ds({color:tc("#ffcc9a"),fontWeight:"800",marginTop:10})}>Risk checks</Text>{x.risks.map((r,i)=><Text key={i} style={[s.muted,{marginTop:4}]}>• {r}</Text>)}<Text style={[s.muted,{marginTop:9,fontSize:15}]}>Data: {x.freshness}</Text></View>)}</ScrollView>
  </View>;
}

import { NexaPressable } from './motion';

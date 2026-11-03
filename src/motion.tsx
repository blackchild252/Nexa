import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {AccessibilityInfo, AccessibilityState, Animated, Easing, Pressable, PressableProps, Platform, StyleProp, StyleSheet, ViewStyle} from 'react-native';
import {authedFetch} from './api';
import {useAuth} from './auth';
import { currentThemeMode } from './themeMode';
import { motionProfile } from './themeDesign';
import { touchTargetStyle } from './interactionAccessibility';
import { MOTION_MS, enterMs, itemEnterMs } from './motionTiming';

type MotionTier = 'free'|'regular'|'premium'|'vip';
// M4494: every account, Free included, gets the basic set (level 30: screen change, press, menu/sheet, loading). Richer effects stay tiered.
export const BASIC_MOTION_LEVEL = 30;
const LEVELS: Record<MotionTier, number> = {free:BASIC_MOTION_LEVEL, regular:30, premium:60, vip:100};
export type MotionName = 'navigation'|'card-enter'|'press'|'expand'|'loading'|'success'|'error'|'notification'|'payment'|'dami'|'live-update'|'news'|'world-ambient'|'vip-spotlight';
const MOTION_CATALOG: Record<MotionName, 30|60|100> = Object.freeze({navigation:30,'card-enter':30,press:30,expand:30,loading:30,success:60,error:60,notification:60,payment:60,dami:60,'live-update':60,news:100,'world-ambient':60,'vip-spotlight':100});
type MotionContextValue = { tier: MotionTier; level: number; loading: boolean; reducedMotion: boolean; allows: (name: MotionName) => boolean };
// M4495: the default context already carries basic motion, so nothing flips from none to animated when the plan arrives.
const MotionContext = createContext<MotionContextValue>({tier:'free', level:BASIC_MOTION_LEVEL, loading:true, reducedMotion:false, allows:(name:MotionName)=>BASIC_MOTION_LEVEL>=MOTION_CATALOG[name]});
/**
 * Developer-only motion preview (V5.20.0): run `EXPO_PUBLIC_NEXA_MOTION_PREVIEW=premium npx expo start` (or regular / vip)
 * to see that tier's animations on any account. Ignored in release builds (__DEV__ is false there).
 * Reduced-motion accessibility still wins.
 */
// Preview tier: 'regular', 'premium' or 'vip'. Anything else (or a release build) means no preview.
const PREVIEW_TIER: MotionTier | null = (() => { if (!(typeof __DEV__ !== 'undefined' && __DEV__)) return null; const raw = process.env.EXPO_PUBLIC_NEXA_MOTION_PREVIEW; const v = String(raw ?? 'vip').toLowerCase(); if (v === 'off' || v === 'none' || v === 'false') return null; return v === 'regular' || v === 'premium' || v === 'vip' ? v : null; })();
export const NEXA_MOTION_PREVIEW: boolean = PREVIEW_TIER !== null;
function normalizeTier(value: unknown): MotionTier { const tier=String(value||'').toLowerCase(); return tier==='regular'||tier==='premium'||tier==='vip'?tier:'free'; }
// M4498: ask the phone about reduced motion as soon as this file loads (before the first screen), and keep the answer current.
// Until the phone answers, motion is held off (true) rather than assumed on.
let reducedMotionCache: boolean | null = null;
const reducedMotionListeners = new Set<(v: boolean) => void>();
const setReducedMotionCache = (v: unknown) => { reducedMotionCache = Boolean(v); reducedMotionListeners.forEach(fn => fn(reducedMotionCache as boolean)); };
try { AccessibilityInfo.isReduceMotionEnabled?.().then(setReducedMotionCache).catch(() => setReducedMotionCache(false)); } catch { reducedMotionCache = false; }
try { AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReducedMotionCache); } catch { /* the provider below still reads on mount */ }
export function MotionProvider({children}:{children:React.ReactNode}){
 const {status}=useAuth(); const [tier,setTier]=useState<MotionTier>('free'); const [loading,setLoading]=useState(true); const [reducedMotion,setReducedMotion]=useState<boolean>(reducedMotionCache===null?true:reducedMotionCache);
 useEffect(()=>{ if(reducedMotionCache!==null)setReducedMotion(reducedMotionCache); reducedMotionListeners.add(setReducedMotion); return()=>{reducedMotionListeners.delete(setReducedMotion);}; },[]);
 useEffect(()=>{ if(status==='loading') return; if(status!=='authenticated'){setTier('free');setLoading(false);return;} let active=true; setLoading(true); authedFetch('/api/subscription').then((data:any)=>{if(active)setTier(normalizeTier(data?.subscription?.planId));}).catch(()=>{if(active)setTier('free');}).finally(()=>{if(active)setLoading(false);}); return()=>{active=false;} },[status]);
 return <MotionContext.Provider value={useMemo(()=>{const level=PREVIEW_TIER?LEVELS[PREVIEW_TIER]:LEVELS[tier]; return {tier:PREVIEW_TIER||tier,level,loading,reducedMotion,allows:(name:MotionName)=>!reducedMotion&&level>=MOTION_CATALOG[name]};},[tier,loading,reducedMotion])}>{children}</MotionContext.Provider>;
}
export function useMotion(){return useContext(MotionContext);}
/** M4497: one rule for side menus (the panel slides itself for this long; Modal animation stays 'none'). */
export const SIDE_MENU_MS = MOTION_MS.menu;
/** M4497: one rule for Modals. Bottom sheets slide, centred dialogs fade, reduced motion means none. */
export type NexaModalKind = 'sheet' | 'dialog';
export function modalAnimationType(kind: NexaModalKind, reducedMotion: boolean): 'none' | 'slide' | 'fade' {
  if (reducedMotion) return 'none';
  return kind === 'sheet' ? 'slide' : 'fade';
}
export function useModalAnimation(kind: NexaModalKind){ const {reducedMotion}=useMotion(); return modalAnimationType(kind,reducedMotion); }
export function NexaAnimatedView({children,style,delay=0,travel=8,scale=0.98,disabled=false,minLevel=30,motion='card-enter'}:{children:React.ReactNode;style?:StyleProp<ViewStyle>;delay?:number;travel?:number;scale?:number;disabled?:boolean;minLevel?:30|60|100;motion?:MotionName}){
 const {level,allows,reducedMotion}=useMotion(); const mp=motionProfile(currentThemeMode()); const enabled=!reducedMotion&&!disabled&&allows(motion)&&level>=minLevel; const opacity=useRef(new Animated.Value(enabled?0:1)).current; const y=useRef(new Animated.Value(enabled?travel*mp.travelScale:0)).current; const sc=useRef(new Animated.Value(enabled?scale:1)).current;
 useEffect(()=>{if(!enabled){stopNexaAnimations([opacity,y,sc]);opacity.setValue(1);y.setValue(0);sc.setValue(1);return;} const duration=enterMs(level)+mp.enterMsDelta; const animation=Animated.parallel([Animated.timing(opacity,{toValue:1,duration,delay,easing:Easing.out(Easing.cubic),useNativeDriver:true}),Animated.timing(y,{toValue:0,duration,delay,easing:Easing.out(Easing.cubic),useNativeDriver:true}),Animated.timing(sc,{toValue:1,duration,delay,easing:Easing.out(Easing.cubic),useNativeDriver:true})]); animation.start(); return ()=>animation.stop();},[enabled,level,delay,travel,scale,opacity,y,sc]);
 return <Animated.View style={[style,{opacity,transform:[{translateY:y},{scale:sc}]}]}>{children}</Animated.View>;
}
// The press-scale wrapper sits between the Pressable and its children. The Pressable keeps the box (size, colour, padding, border),
// but row layouts (icon + label + trailing item) must be laid out by the wrapper that actually holds the children, or they stack
// in a column. This copies only the child-layout keys onto the wrapper and lets it fill the Pressable.
const INNER_LAYOUT_KEYS=['flexDirection','alignItems','justifyContent','gap','rowGap','columnGap','flexWrap'] as const;
export function pressableInnerLayout(style:any){
  let flat:any={};
  try{flat=StyleSheet.flatten(typeof style==='function'?style({pressed:false}):style)||{};}catch{flat={};}
  const out:any={flexGrow:1,flexShrink:1};
  for(const k of INNER_LAYOUT_KEYS){if(flat[k]!==undefined)out[k]=flat[k];}
  return out;
}

/** Props NexaPressable and NexaFocusPressable pass straight through to the underlying Pressable (M4492). */
export type NexaPressableForwarded=Omit<PressableProps,'children'|'style'|'onPress'|'disabled'|'accessibilityLabel'|'accessibilityRole'|'accessibilityState'|'hitSlop'|'focusable'|'onFocus'|'onBlur'>;

export function NexaPressable({children,onPress,onPressIn,onPressOut,style,disabled=false,accessibilityLabel,accessibilityRole='button',accessibilityState,hitSlop,activeOpacity,...rest}:
 {children:React.ReactNode;onPress?:()=>void;style?:any;disabled?:boolean;accessibilityLabel?:string;accessibilityRole?:'button'|'link'|'none'|'tab'|'radio'|'checkbox'|'switch'|'menuitem'|'imagebutton';accessibilityState?:AccessibilityState;hitSlop?:any;activeOpacity?:number}&NexaPressableForwarded){
 const {level,reducedMotion}=useMotion(); const mp=motionProfile(currentThemeMode()); const scale=useRef(new Animated.Value(1)).current; const [focused,setFocused]=useState(false); const springRef=useRef<Animated.CompositeAnimation|null>(null); const animate=(toValue:number)=>{if(level<=0||reducedMotion||disabled)return; springRef.current?.stop(); springRef.current=Animated.spring(scale,{toValue,useNativeDriver:true,speed:(level>=100?24:level>=60?20:16)+mp.springSpeedDelta,bounciness:Math.max(0,(level>=100?7:level>=60?5:3)+mp.bounceDelta)}); springRef.current.start(()=>{springRef.current=null;});}; useEffect(()=>()=>{springRef.current?.stop();springRef.current=null;},[scale]);
 const resolveStyle=(state:any)=>[...touchTargetStyle(typeof style==='function'?style(state):style), focused&&Platform.OS==='web'?{outlineStyle:'solid',outlineWidth:2,outlineColor:currentThemeMode()==='dark'?'#FFD700':'#1767A9',outlineOffset:2}:null];
 return <Pressable {...rest} accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel} accessibilityState={accessibilityState} hitSlop={hitSlop} focusable={!disabled} disabled={disabled} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onPress={onPress} onPressIn={(e:any)=>{animate((level>=60?0.975:0.985)+mp.pressScale);onPressIn?.(e);}} onPressOut={(e:any)=>{animate(1);onPressOut?.(e);}} style={resolveStyle}><Animated.View style={[{transform:[{scale}]},pressableInnerLayout(style)]}>{children}</Animated.View></Pressable>;
}

/** Shared keyboard-focus primitive for important controls that still use TouchableOpacity/Pressable directly.
 * Native touch presentation is unchanged; React Native Web receives a visible WCAG-oriented focus ring.
 */
export function NexaFocusPressable({children,onPress,onPressIn,onPressOut,style,disabled=false,accessibilityLabel,accessibilityRole='button',...rest}:{children:React.ReactNode;onPress?:()=>void;style?:any;disabled?:boolean;accessibilityLabel?:string;accessibilityRole?:'button'|'link'|'tab'|'radio'|'checkbox'|'switch'|'menuitem'|'imagebutton'}&NexaPressableForwarded){
 const {level,reducedMotion}=useMotion();
 const mp=motionProfile(currentThemeMode());
 const [focused,setFocused]=useState(false);
 const scale=useRef(new Animated.Value(1)).current;
 const springRef=useRef<Animated.CompositeAnimation|null>(null);
 const animate=(toValue:number)=>{
   if(level<=0||reducedMotion||disabled)return;
   springRef.current?.stop();
   springRef.current=Animated.spring(scale,{toValue,useNativeDriver:true,speed:(level>=100?24:level>=60?20:16)+mp.springSpeedDelta,bounciness:Math.max(0,(level>=100?7:level>=60?5:3)+mp.bounceDelta)});
   springRef.current.start(()=>{springRef.current=null;});
 };
 useEffect(()=>()=>{springRef.current?.stop();springRef.current=null;},[scale]);
 const resolveStyle=(state:any)=>[...touchTargetStyle(typeof style==='function'?style(state):style),focused&&Platform.OS==='web'?{outlineStyle:'solid',outlineWidth:2,outlineColor:currentThemeMode()==='dark'?'#FFD700':'#1767A9',outlineOffset:2}:null];
 return <Pressable {...rest} accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel} focusable={!disabled} disabled={disabled} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onPress={onPress} onPressIn={(e:any)=>{animate((level>=60?0.975:0.985)+mp.pressScale);onPressIn?.(e);}} onPressOut={(e:any)=>{animate(1);onPressOut?.(e);}} style={resolveStyle}><Animated.View style={[{transform:[{scale}]},pressableInnerLayout(style)]}>{children}</Animated.View></Pressable>;
}

export function NexaMotionSurface({children,style,visible=true,motion='expand',minLevel=30,distance=12}:{children:React.ReactNode;style?:StyleProp<ViewStyle>;visible?:boolean;motion?:MotionName;minLevel?:30|60|100;distance?:number}){
 const {level,allows,reducedMotion}=useMotion();
 const mp=motionProfile(currentThemeMode());
 const enabled=visible&&!reducedMotion&&allows(motion)&&level>=minLevel;
 const opacity=useRef(new Animated.Value(enabled?0:1)).current;
 const y=useRef(new Animated.Value(enabled?distance*mp.travelScale:0)).current;
 useEffect(()=>{
   if(!visible){stopNexaAnimations([opacity,y]); opacity.setValue(0); y.setValue(distance*mp.travelScale); return;}
   if(!enabled){stopNexaAnimations([opacity,y]); opacity.setValue(1); y.setValue(0); return;}
   const duration=itemEnterMs(level)+mp.enterMsDelta;
   const a=Animated.parallel([
     Animated.timing(opacity,{toValue:1,duration,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
     Animated.timing(y,{toValue:0,duration,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
   ]);
   a.start();
   return()=>a.stop();
 },[visible,enabled,level,distance,mp.enterMsDelta,mp.travelScale,opacity,y]);
 return <Animated.View style={[style,{opacity,transform:[{translateY:y}]}]}>{children}</Animated.View>;
}

export function NexaLoadingPulse({size='small'}:{size?:'small'|'large'}){
 const {level,reducedMotion}=useMotion();
 const pulse=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
   stopNexaAnimations([pulse]);
   if(reducedMotion||level<30) { pulse.setValue(0); return; }
   const loop=Animated.loop(Animated.sequence([
     Animated.timing(pulse,{toValue:1,duration:MOTION_MS.pulse,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
     Animated.timing(pulse,{toValue:0,duration:MOTION_MS.pulse,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
   ]));
   loop.start();
   return()=>loop.stop();
 },[level,reducedMotion,pulse]);
 const diameter=size==='large'?30:20;
 const scale=reducedMotion||level<30?1:pulse.interpolate({inputRange:[0,1],outputRange:[0.88,1.12]});
 const opacity=reducedMotion||level<30?1:pulse.interpolate({inputRange:[0,1],outputRange:[0.55,1]});
 return <Animated.View accessibilityRole="progressbar" style={{width:diameter,height:diameter,borderRadius:diameter/2,borderWidth:2,borderColor:themeColor(),opacity,transform:[{scale}]}}/>;
}
function themeColor(){ return currentThemeMode()==='dark' ? '#FFD700' : '#1767A9'; }

export const MOTION_LEVELS=Object.freeze(LEVELS);
export const NEXA_MOTION_CATALOG=Object.freeze(MOTION_CATALOG);

/** Shared motion-safety contract: reduced motion always disables animation and
 * every component that starts an animation retains a cleanup path. */
export const NEXA_MOTION_ACCESSIBILITY_CONTRACT = Object.freeze({
  reducedMotionWins: true,
  freeTierStatic: true,
  requiresCleanup: true,
  systemSettingLive: true,
  decorativeLayersIgnoreInput: true,
});

export function stopNexaAnimations(values: Animated.Value[]) {
  values.forEach(value => { value.stopAnimation(); });
}

export function motionLevelFor(name:MotionName){return MOTION_CATALOG[name];}

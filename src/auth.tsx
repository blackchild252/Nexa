import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Platform, Text, View} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {Redirect, router, useSegments} from 'expo-router';
import {openGoogleUrl} from './safeExternalNavigation';
import {API_BASE, publicFetch, authedFetch, setAuthFailureHandler, setNexaToken, setNexaDeviceId, exchangeGoogleAuth, rotateAuthSession, verifyAdminLoginCode} from './api';
import {AdminCodePrompt} from './AdminCodePrompt';
import {readPendingAdminCode, isAdminCodeExpired, parseStoredAdminCode, adminCodeFailureKind, type PendingAdminCode} from './adminCodeEntry';
import {s} from './styles';
import {NexaFocusPressable} from './motion';
import {theme} from './theme';
import {clearMyAvatar} from './myAvatar';
import {startGoogleAuth} from './api';

type User = {id:string; email:string; name:string; username?:string|null; accountType?:string|null; userType?:string|null; role?:string|null; kind?:string|null};
type AuthStatus = 'loading'|'authenticated'|'signed_out'|'offline';
type AuthContextValue = {
  user: User|null;
  status: AuthStatus;
  isLoading: boolean;
  signIn: (email:string,password:string,ageConfirmed:boolean)=>Promise<void>;
  signUp: (email:string,password:string,name:string,ageConfirmed:boolean)=>Promise<void>;
  signInWithGoogle: ()=>Promise<void>;
  completeGoogleSignIn: (code:string,ageConfirmed:boolean)=>Promise<void>;
  signOut: ()=>Promise<void>;
  retry: ()=>Promise<void>;
  /** True while an admin or Admin-staff user still has to enter the Zeeza sign-in code. */
  adminCodePending: boolean;
  verifyAdminCode: (code:string)=>Promise<void>;
};

const TOKEN_KEY='nexa.auth.token.v1';
let webRuntimeToken:string|null=null;
const WEB_TOKEN_STORAGE_KEY='nexa.auth.web.token.v1';
const DEVICE_KEY='nexa.auth.device.id.v1';
const ADMIN_CODE_KEY='nexa.auth.admin.code.v1';
let runtimeDeviceId:string|null=null;

function readWebToken(){
  if(typeof window==='undefined' || !window.sessionStorage) return webRuntimeToken;
  try { return window.sessionStorage.getItem(WEB_TOKEN_STORAGE_KEY) || webRuntimeToken; } catch { return webRuntimeToken; }
}

function writeWebToken(token:string){
  webRuntimeToken=token;
  try { window.sessionStorage.setItem(WEB_TOKEN_STORAGE_KEY,token); } catch {}
}

function deleteWebToken(){
  webRuntimeToken=null;
  try { window.sessionStorage.removeItem(WEB_TOKEN_STORAGE_KEY); } catch {}
}
const AuthContext=createContext<AuthContextValue|null>(null);

async function ensureDeviceId(){
  if(runtimeDeviceId) return runtimeDeviceId;
  if(Platform.OS==='web'){
    try { const existing=window.sessionStorage.getItem(DEVICE_KEY); if(existing){ runtimeDeviceId=existing; setNexaDeviceId(existing); return existing; } } catch {}
    const created=`web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,14)}`; runtimeDeviceId=created; setNexaDeviceId(created); try { window.sessionStorage.setItem(DEVICE_KEY,created); } catch {} return created;
  }
  try { const existing=await SecureStore.getItemAsync(DEVICE_KEY); if(existing){ runtimeDeviceId=existing; setNexaDeviceId(existing); return existing; } } catch {}
  const created=`mob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,14)}`; runtimeDeviceId=created; setNexaDeviceId(created); try { await SecureStore.setItemAsync(DEVICE_KEY,created); } catch {} return created;
}

async function readStoredToken(){
  if(Platform.OS==='web') return readWebToken();
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
}


async function writeStoredToken(token:string){
  if(Platform.OS==='web'){ writeWebToken(token); return; }
  await SecureStore.setItemAsync(TOKEN_KEY,token);
}


async function deleteStoredToken(){
  if(Platform.OS==='web'){ deleteWebToken(); return; }
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
}

async function readPendingStored(){
  try { return Platform.OS==='web' ? (typeof window!=='undefined' ? window.sessionStorage.getItem(ADMIN_CODE_KEY) : null) : await SecureStore.getItemAsync(ADMIN_CODE_KEY); } catch { return null; }
}
async function writePendingStored(p:PendingAdminCode){
  const raw=JSON.stringify(p);
  try { if(Platform.OS==='web') window.sessionStorage.setItem(ADMIN_CODE_KEY,raw); else await SecureStore.setItemAsync(ADMIN_CODE_KEY,raw); } catch {}
}
async function deletePendingStored(){
  try { if(Platform.OS==='web') window.sessionStorage.removeItem(ADMIN_CODE_KEY); else await SecureStore.deleteItemAsync(ADMIN_CODE_KEY); } catch {}
}

export function AuthProvider({children}:{children:React.ReactNode}){
  const [user,setUser]=useState<User|null>(null);
  const [status,setStatus]=useState<AuthStatus>('loading');
  const restoreRequest=useRef(0);
  const [adminCode,setAdminCode]=useState<PendingAdminCode|null>(null);

  const clearSession=useCallback(async()=>{
    setNexaToken(undefined);
    clearMyAvatar();
    setUser(null);
    setAdminCode(null);
    await deletePendingStored();
    await deleteStoredToken();
  },[]);

  const restore=useCallback(async()=>{
    const requestId=++restoreRequest.current;
    setStatus('loading');
    await ensureDeviceId();
    const token=await readStoredToken();
    if(requestId!==restoreRequest.current)return;
    if(!token){ setNexaToken(undefined); setUser(null); setStatus('signed_out'); return; }
    setNexaToken(token);
    try {
      const data=await authedFetch('/api/auth/me');
      if(requestId!==restoreRequest.current)return;
      try {
        const rotated=await rotateAuthSession();
        if(rotated?.token){ await writeStoredToken(String(rotated.token)); setNexaToken(String(rotated.token)); }
      } catch (rotationError:any) {
        if(rotationError?.code==='AUTH_EXPIRED') { await clearSession(); if(requestId===restoreRequest.current)setStatus('signed_out'); return; }
      }
      setUser(data.user||null);
      // The code step survives an app restart for as long as the five-minute code lives.
      const stored=parseStoredAdminCode(await readPendingStored());
      if(requestId!==restoreRequest.current)return;
      if(stored && data.user) setAdminCode(stored); else { setAdminCode(null); await deletePendingStored(); }
      setStatus(data.user?'authenticated':'signed_out');
    } catch (error:any) {
      if(requestId!==restoreRequest.current)return;
      if(error?.code==='AUTH_EXPIRED'){
        await clearSession();
        if(requestId===restoreRequest.current)setStatus('signed_out');
      } else {
        // Preserve a valid stored credential during transient API/network failure.
        setStatus('offline');
      }
    }
  },[clearSession]);

  useEffect(()=>{
    setAuthFailureHandler(async()=>{
      await clearSession();
      setStatus('signed_out');
    });
    restore();
    return ()=>setAuthFailureHandler(null);
  },[clearSession,restore]);

  const signIn=useCallback(async(email:string,password:string,ageConfirmed:boolean)=>{
    await ensureDeviceId();
    const data=await publicFetch('/api/auth/login',{method:'POST',body:JSON.stringify({email,password,ageConfirmed})});
    if(!data?.token || !data?.user) throw new Error('Login response was incomplete.');
    await writeStoredToken(String(data.token));
    setNexaToken(String(data.token));
    clearMyAvatar(); setUser(data.user);
    // V6.1.93 B539: an admin or Admin-staff user gets an ordinary session plus a code step. Admin power stays off until the code is entered.
    const pending=readPendingAdminCode(data);
    if(pending){ await writePendingStored(pending); setAdminCode(pending); } else { await deletePendingStored(); setAdminCode(null); }
    setStatus('authenticated');
  },[]);

  const verifyAdminCode=useCallback(async(code:string)=>{
    const pending=adminCode;
    if(!pending) throw new Error('No sign-in code is waiting.');
    if(isAdminCodeExpired(pending)){ setAdminCode(null); await deletePendingStored(); throw new Error('This code has expired. Sign out and sign in again to get a new one.'); }
    let data:any;
    try {
      data=await verifyAdminLoginCode(pending.challengeId,code);
    } catch(e:any) {
      if(adminCodeFailureKind(e?.status)==='retry') throw new Error('That code is not correct. Check your Zeeza inbox and try again.');
      setAdminCode(null); await deletePendingStored();
      throw new Error('This sign-in code can no longer be used. Sign out and sign in again to get a new one.');
    }
    if(!data?.token || !data?.user) throw new Error('Code check response was incomplete.');
    // Retire the ordinary session, then switch to the verified one.
    try { await authedFetch('/api/auth/logout',{method:'POST'}); } catch {}
    await writeStoredToken(String(data.token));
    setNexaToken(String(data.token));
    setUser(data.user);
    setAdminCode(null);
    await deletePendingStored();
  },[adminCode]);

  const signUp=useCallback(async(email:string,password:string,name:string,ageConfirmed:boolean)=>{
    await ensureDeviceId();
    const data=await publicFetch('/api/auth/signup',{method:'POST',body:JSON.stringify({email,password,name,ageConfirmed})});
    if(!data?.token || !data?.user) throw new Error('Signup response was incomplete.');
    await writeStoredToken(String(data.token));
    setNexaToken(String(data.token));
    clearMyAvatar(); setUser(data.user); setStatus('authenticated');
  },[]);

  const signInWithGoogle=useCallback(async()=>{
    const data=await startGoogleAuth();
    if(!data?.url) throw new Error('Google sign-in is not configured.');
    await openGoogleUrl(String(data.url));
  },[]);

  const completeGoogleSignIn=useCallback(async(code:string,ageConfirmed:boolean)=>{
    await ensureDeviceId();
    const data=await exchangeGoogleAuth(code,ageConfirmed);
    if(!data?.token || !data?.user) throw new Error('Google sign-in response was incomplete.');
    await writeStoredToken(String(data.token));
    setNexaToken(String(data.token));
    clearMyAvatar();
    setUser(data.user);
    setStatus('authenticated');
  },[]);

  const signOut=useCallback(async()=>{
    try { if(user) await authedFetch('/api/auth/logout',{method:'POST'}); } catch {}
    await clearSession();
    router.replace('/auth/login' as any);
  },[clearSession,user]);

  const value=useMemo(()=>({user,status,isLoading:status==='loading',signIn,signUp,signInWithGoogle,completeGoogleSignIn,signOut,retry:restore,adminCodePending:!!adminCode,verifyAdminCode}),[user,status,signIn,signUp,signInWithGoogle,completeGoogleSignIn,signOut,restore,adminCode,verifyAdminCode]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(){
  const value=useContext(AuthContext);
  if(!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}

export function AuthGate(){
  const {status,retry,adminCodePending}=useAuth();
  const segments = useSegments() as string[];
  const vendorStaffRedirected = useRef(false);
  useEffect(()=>{
    if(status !== 'authenticated' || vendorStaffRedirected.current) return;
    const current = segments.join('/');
    if(current === 'staff' || current === 'auth/login') return;
    let cancelled = false;
    authedFetch('/api/mall/staff/me').then((data:any)=>{
      if(cancelled || vendorStaffRedirected.current || !data?.staff) return;
      vendorStaffRedirected.current = true;
      router.replace('/staff' as any);
    }).catch(()=>{});
    return ()=>{ cancelled = true; };
  },[status,segments]);
  const inAuth=segments[0]==='auth';
  const isPublicRoute=inAuth || (segments[0]==='zeeza' && segments[1]==='share');
  if(status==='authenticated' && inAuth && segments[1] !== 'signup') return <Redirect href={'/(tabs)' as any}/>;
  if(status==='signed_out' && !isPublicRoute) return <Redirect href={'/auth/login' as any}/>;
  if(status==='loading') return <View style={[s.wrap,{justifyContent:'center',alignItems:'center',backgroundColor:theme.colors.background}]}><ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Restoring your NEXA session" size="large" color={theme.colors.gold}/><Text style={[s.muted,{marginTop:12}]}>Restoring your NEXA session…</Text></View>;
  if(status==='offline') return <View style={[s.wrap,{justifyContent:'center',backgroundColor:theme.colors.background}]}><View style={s.card}><Text style={s.title}>NEXA is offline</Text><Text style={[s.subtitle,{marginTop:8}]}>Your saved session is still protected. We could not reach the NEXA service to verify it right now.</Text><NexaFocusPressable accessibilityRole="button" accessibilityLabel="Retry NEXA connection" style={[s.button,{marginTop:18}]} onPress={retry}><Text style={s.btnText}>Try again</Text></NexaFocusPressable><Text style={[s.muted,{marginTop:12,fontSize:14}]}>API: {API_BASE}</Text></View></View>;
  if(status==='authenticated' && adminCodePending && !inAuth) return <AdminCodePrompt/>;
  return null;
}

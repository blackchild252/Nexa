import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { authedFetch } from './api';

export type NexaLocationStatus = 'unknown'|'requesting'|'granted'|'denied'|'unavailable'|'manual';
export type NexaLocationContextValue = {
  status: NexaLocationStatus;
  approximate: { country: string|null; city: string|null; cell: string|null };
  requestLocationPermission: () => Promise<void>;
  refreshLocation: () => Promise<void>;
};
const Ctx=createContext<NexaLocationContextValue|undefined>(undefined);
const GEOHASH_BASE='0123456789bcdefghjkmnpqrstuvwxyz';
function coarseCell(lat:number,lon:number,precision=5){
  let minLat=-90,maxLat=90,minLon=-180,maxLon=180,bits=0,idx=0,out='';
  while(out.length<precision){ const value=bits%2===0?lon:lat; const mid=bits%2===0?(minLon+maxLon)/2:(minLat+maxLat)/2; if(value>=mid){idx=(idx<<1)|1;if(bits%2===0)minLon=mid;else minLat=mid;}else{idx<<=1;if(bits%2===0)maxLon=mid;else maxLat=mid;} bits++; if(bits===5){out+=GEOHASH_BASE[idx];bits=0;idx=0;} }
  return out;
}
async function sendCoarse(cell:string){ try{await authedFetch('/api/location/context',{method:'POST',body:JSON.stringify({cell})});}catch{} }
export function NexaLocationProvider({children}:{children:React.ReactNode}){
  const [status,setStatus]=useState<NexaLocationStatus>('unknown');
  const [approximate,setApproximate]=useState({country:null as string|null,city:null as string|null,cell:null as string|null});
  const refreshLocation=useCallback(async()=>{
    if(typeof navigator==='undefined'||!navigator.geolocation){setStatus('unavailable');return;}
    setStatus('requesting');
    await new Promise<void>(resolve=>navigator.geolocation.getCurrentPosition(async pos=>{const cell=coarseCell(pos.coords.latitude,pos.coords.longitude);setApproximate(v=>({...v,cell}));setStatus('granted');await sendCoarse(cell);resolve();},()=>{setStatus('denied');resolve();},{enableHighAccuracy:false,maximumAge:15*60*1000,timeout:8000}));
  },[]);
  const requestLocationPermission=useCallback(async()=>refreshLocation(),[refreshLocation]);
  useEffect(()=>{ let cancelled=false; (async()=>{try{const r=await authedFetch('/api/location/context');if(cancelled)return;if(r?.cell)setApproximate(v=>({...v,cell:r.cell}));if(r?.city||r?.country)setApproximate(v=>({...v,city:r.city||null,country:r.country||null}));if(r?.status==='manual')setStatus('manual');}catch{}})();return()=>{cancelled=true;};},[]);
  const value=useMemo(()=>({status,approximate,requestLocationPermission,refreshLocation}),[status,approximate,requestLocationPermission,refreshLocation]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useNexaLocation(){const value=useContext(Ctx);if(!value)throw new Error('useNexaLocation must be used inside NexaLocationProvider');return value;}
export function NexaLocationBanner(){const {status,requestLocationPermission}=useNexaLocation();if(status==='granted')return null;return null;}
export const NEXA_LOCATION_PLATFORM=Platform.OS;

import { authedFetch } from './api';

export type CallMedia = 'audio' | 'video';
export type CallInfo = { id:string; callerId:string; calleeId:string; role:'caller'|'callee'; media:CallMedia; status:string; createdAt:string; startedAt?:string|null; endedAt?:string|null; with?:any };

export async function createCall(userId:string, media:CallMedia){ return authedFetch('/api/zeeza/calls',{method:'POST',body:JSON.stringify({userId,media})}) as Promise<{call:CallInfo;iceServers:any[]}>; }
export async function getCall(callId:string){ return authedFetch(`/api/zeeza/calls/${encodeURIComponent(callId)}`) as Promise<{call:CallInfo;iceServers:any[]}>; }
export async function acceptCall(callId:string){ return authedFetch(`/api/zeeza/calls/${encodeURIComponent(callId)}/accept`,{method:'POST'}) as Promise<{call:CallInfo;iceServers:any[]}>; }
export async function declineCall(callId:string){ return authedFetch(`/api/zeeza/calls/${encodeURIComponent(callId)}/decline`,{method:'POST'}) as Promise<{call:CallInfo}>; }
export async function endCall(callId:string){ return authedFetch(`/api/zeeza/calls/${encodeURIComponent(callId)}/end`,{method:'POST'}) as Promise<{call:CallInfo}>; }
export async function sendSignal(callId:string,type:'offer'|'answer'|'candidate',payload:any){ return authedFetch(`/api/zeeza/calls/${encodeURIComponent(callId)}/signals`,{method:'POST',body:JSON.stringify({type,payload})}); }
export async function getSignals(callId:string,after?:string){ const q=after?`?after=${encodeURIComponent(after)}`:''; return authedFetch(`/api/zeeza/calls/${encodeURIComponent(callId)}/signals${q}`) as Promise<{signals:Array<{id:string;senderId:string;type:string;payload:any;createdAt:string}>}>; }

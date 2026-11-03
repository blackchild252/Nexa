import { authedFetch } from './api';

export type GroupCallMedia = 'audio'|'video';
export async function createGroupCall(roomId:string, media:GroupCallMedia){ return authedFetch('/api/zeeza/group-calls',{method:'POST',body:JSON.stringify({roomId,media})}); }
export async function getActiveGroupCall(roomId:string){ return authedFetch(`/api/zeeza/group-calls/room/${encodeURIComponent(roomId)}/active`); }
export async function getGroupCall(callId:string){ return authedFetch(`/api/zeeza/group-calls/${encodeURIComponent(callId)}`); }
export async function joinGroupCall(callId:string){ return authedFetch(`/api/zeeza/group-calls/${encodeURIComponent(callId)}/join`,{method:'POST',body:'{}'}); }
export async function leaveGroupCall(callId:string){ return authedFetch(`/api/zeeza/group-calls/${encodeURIComponent(callId)}/leave`,{method:'POST',body:'{}'}); }
export async function reconnectGroupCall(callId:string){ return authedFetch(`/api/zeeza/group-calls/${encodeURIComponent(callId)}/reconnect`,{method:'POST',body:'{}'}); }
export async function getGroupSignals(callId:string,after?:string){ const q=after?`?after=${encodeURIComponent(after)}`:''; return authedFetch(`/api/zeeza/group-calls/${encodeURIComponent(callId)}/signals${q}`); }
export async function sendGroupSignal(callId:string,type:'offer'|'answer'|'candidate',payload:any,targetUserId?:string){ return authedFetch(`/api/zeeza/group-calls/${encodeURIComponent(callId)}/signals`,{method:'POST',body:JSON.stringify({type,payload,targetUserId})}); }

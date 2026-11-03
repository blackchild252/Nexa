const DEFAULT_MIN_INTERVAL_MS = 1000;
const MAX_POLL_BUDGET = 120;
const MAX_RECONNECT_ATTEMPTS = 8;
const MAX_SIGNAL_AGE_MS = 120000;
const MAX_CANDIDATE_QUEUE = 64;
const TERMINAL_STATES = new Set(['ended','expired','declined','missed','cancelled','completed','closed','failed']);
const TRANSIENT_STATES = new Set(['connecting','ringing','active','pending','waiting','starting']);

function lifecycleState(value){
  const v=String(value||'active').toLowerCase();
  return v==='background'||v==='inactive'||v==='unknown'?'background':'active';
}
function isForeground(value){return lifecycleState(value)==='active';}
function shouldPoll({lifecycle='active',lastPollAt=0,now=Date.now(),minIntervalMs=DEFAULT_MIN_INTERVAL_MS,terminal=false}={}){
  if(!isForeground(lifecycle)||terminal)return false;
  return Math.max(0,Number(now)-Number(lastPollAt))>=Math.max(DEFAULT_MIN_INTERVAL_MS,Number(minIntervalMs)||0);
}
function clampInterval(ms,min=DEFAULT_MIN_INTERVAL_MS,max=30000){return Math.min(max,Math.max(min,Number(ms)||min));}
function pollInterval({base=2500,attempt=0,jitter=0.15}={}){
  const safe=clampInterval(base,DEFAULT_MIN_INTERVAL_MS,30000)*Math.pow(1.25,Math.min(8,Math.max(0,Number(attempt)||0)));
  const factor=1+(Math.max(-1,Math.min(1,Number(jitter)||0))*0.15);
  return Math.round(clampInterval(safe)*factor);
}
function boundedPollBudget(used=0,max=MAX_POLL_BUDGET){return {used:Math.max(0,Number(used)||0),max:Math.max(1,Number(max)||MAX_POLL_BUDGET),remaining:Math.max(0,(Number(max)||MAX_POLL_BUDGET)-(Number(used)||0))};}
function pollBudgetAllowed(used=0,max=MAX_POLL_BUDGET){return Number(used)<Number(max);}
function stale(value,now=Date.now(),maxAgeMs=MAX_SIGNAL_AGE_MS){const t=Date.parse(value);return !Number.isFinite(t)||Math.max(0,Number(now)-t)>Math.max(0,Number(maxAgeMs)||MAX_SIGNAL_AGE_MS);}
function sequenceToken(prefix='poll'){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;}
function isCurrentSequence(token,current){return Boolean(token)&&token===current;}
function duplicateKey(type,id,createdAt=''){return `${String(type||'')}:${String(id||'')}:${String(createdAt||'')}`.slice(0,256);}
function cursorMonotonic(previous='',next=''){if(!next)return previous||'';if(!previous)return String(next);return String(next)>String(previous)?String(next):String(previous);}
function isTerminalState(state){return TERMINAL_STATES.has(String(state||'').toLowerCase());}
function isTransientState(state){return TRANSIENT_STATES.has(String(state||'').toLowerCase());}
function reconnectDelay(attempt=0,base=500,max=10000){return Math.round(Math.min(max,Math.max(base,base*Math.pow(2,Math.max(0,Number(attempt)||0)))));}
function reconnectAllowed(attempt=0,max=MAX_RECONNECT_ATTEMPTS){return Number(attempt)<Number(max);}
function heartbeatExpired(lastHeartbeat=0,now=Date.now(),timeoutMs=30000){return !lastHeartbeat||Math.max(0,Number(now)-Number(lastHeartbeat))>Math.max(1000,Number(timeoutMs)||30000);}
function signalFresh(createdAt,now=Date.now(),maxAgeMs=MAX_SIGNAL_AGE_MS){return !stale(createdAt,now,maxAgeMs);}
function capCandidateQueue(queue=[],max=MAX_CANDIDATE_QUEUE){const list=Array.isArray(queue)?queue:[];return list.slice(Math.max(0,list.length-Math.max(1,Number(max)||MAX_CANDIDATE_QUEUE)));}
function dedupeParticipants(participants=[]){const seen=new Set();return (Array.isArray(participants)?participants:[]).filter(p=>{const id=String(p?.userId??p?.id??'');if(!id||seen.has(id))return false;seen.add(id);return true;});}
function roomPollInterval(){return 2500;}
function foregroundRefreshAllowed(lastRefreshAt=0,now=Date.now,minIntervalMs=1000){return Math.max(0,Number(now)-Number(lastRefreshAt))>=Math.max(1000,Number(minIntervalMs)||1000);}
function resumeRefreshState({lifecycle='active',wasBackground=false}={}){return {shouldRefresh:isForeground(lifecycle)&&Boolean(wasBackground),wasBackground:Boolean(wasBackground)};}
function cleanupOnce(state={}){if(state.cleaned)return {cleaned:true,changed:false};return {cleaned:true,changed:true};}
function cumulativeCertification(results){return {ok:Array.isArray(results)&&results.length===25&&results.every(Boolean)};}
module.exports={DEFAULT_MIN_INTERVAL_MS,MAX_POLL_BUDGET,MAX_RECONNECT_ATTEMPTS,MAX_SIGNAL_AGE_MS,MAX_CANDIDATE_QUEUE,TERMINAL_STATES,TRANSIENT_STATES,lifecycleState,isForeground,shouldPoll,clampInterval,pollInterval,boundedPollBudget,pollBudgetAllowed,stale,sequenceToken,isCurrentSequence,duplicateKey,cursorMonotonic,isTerminalState,isTransientState,reconnectDelay,reconnectAllowed,heartbeatExpired,signalFresh,capCandidateQueue,dedupeParticipants,roomPollInterval,foregroundRefreshAllowed,resumeRefreshState,cleanupOnce,cumulativeCertification};

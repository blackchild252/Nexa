const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30000;
const UPLOAD_TIMEOUT_MS = 90000;
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([408,425,429,500,502,503,504]);
function normalizeMethod(method){return String(method||'GET').trim().toUpperCase();}
function isIdempotentMethod(method){return new Set(['GET','HEAD','OPTIONS','PUT','DELETE']).has(normalizeMethod(method));}
function isRetryableStatus(status){return RETRYABLE_STATUSES.has(Number(status));}
// Browsers and React Native word a dropped connection differently (Chrome 'Failed to fetch', Firefox 'NetworkError', Safari 'Load failed', RN 'Network request failed').
const NETWORK_FAILURE_PATTERN=/network|fetch|load failed|internet connection|offline|connection (?:was )?(?:lost|reset)/i;
function isNetworkFailureMessage(error){return Boolean(error)&&error.name==='TypeError'&&NETWORK_FAILURE_PATTERN.test(String(error.message||''));}
function isRetryableError(error){if(!error)return false;if(error.code==='REQUEST_TIMEOUT')return true;if(error.code==='NETWORK_ERROR')return true;if(isNetworkFailureMessage(error))return true;return false;}
function retryPolicy({method='GET',authFailure=false,mutationRetry=false}={}){const m=normalizeMethod(method);if(authFailure)return {maxAttempts:1};if(isIdempotentMethod(m)||mutationRetry)return {maxAttempts:MAX_ATTEMPTS};return {maxAttempts:1};}
function jitterFactor(seed=Math.random()){const n=Number(seed);const v=Number.isFinite(n)?n:0.5;return Math.min(1.5,Math.max(0.5,v));}
function backoffMs(attempt,base=100,max=2000){const raw=Math.min(max,Math.max(0,base)*Math.pow(2,Math.max(0,Number(attempt)-1)));return Math.round(raw*jitterFactor(1));}
function parseRetryAfter(value,now=Date.now()){if(value==null)return null;const s=String(value).trim();if(/^\d+(?:\.\d+)?$/.test(s))return Math.min(60000,Math.max(0,Number(s)*1000));const t=Date.parse(s);return Number.isFinite(t)?Math.min(60000,Math.max(0,t-now)):null;}
function timeoutFor({method='GET',upload=false}={}){return upload?UPLOAD_TIMEOUT_MS:REQUEST_TIMEOUT_MS;}
function abortReason(error){if(error?.name==='AbortError')return 'aborted';if(error?.code==='REQUEST_TIMEOUT')return 'timeout';return 'unknown';}
function canRetryMutation({method='POST',idempotencyKey=''}){return isIdempotentMethod(method)||Boolean(String(idempotencyKey||'').trim());}
function simpleHash(input){let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
function idempotencyKey(method,path){const seed=`${normalizeMethod(method)}\n${String(path||'')}`;return `${simpleHash(seed)}${simpleHash(seed.split('').reverse().join(''))}${simpleHash(seed+'nexa')}${simpleHash('nexa'+seed)}`.slice(0,32);}
function requestId(){return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,14)}`;}
function responseSizeAllowed(bytes,max=MAX_RESPONSE_BYTES){return Number.isFinite(Number(bytes))&&Number(bytes)>=0&&Number(bytes)<=max;}
function utf8Bytes(text){return encodeURIComponent(String(text)).replace(/%[0-9A-F]{2}/gi,'x').length;}
function requestBodyAllowed(body,max=MAX_REQUEST_BODY_BYTES){if(body==null)return true;const raw=typeof body==='string'?body:JSON.stringify(body);return utf8Bytes(raw)<=max;}
function contentTypeAllowed(value){const v=String(value||'').toLowerCase();return !v||v.includes('application/json')||v.includes('multipart/form-data')||v.includes('text/plain');}
function parseJsonText(text){try{return {ok:true,value:text?JSON.parse(text):null};}catch{return {ok:false,value:null};}}
function normalizeClientError(error={}){const status=Number(error.status||0);const code=error.code|| (status?`HTTP_${status}`:'NETWORK_ERROR');return {code:String(code).slice(0,64),status:Number.isFinite(status)?status:0,message:String(error.message||'Request failed.').slice(0,300)};}
function classifyNetworkError(error={}){if(error?.code==='REQUEST_TIMEOUT')return 'timeout';if(error?.name==='AbortError')return 'aborted';if(isNetworkFailureMessage(error))return 'offline_or_network';return 'unknown';}
function cachePolicy(method){return normalizeMethod(method)==='GET'?'no-store':'no-cache';}
function dedupeKey(method,path,body=''){return `${normalizeMethod(method)} ${String(path||'')} ${String(body||'')}`.trim();}
function retryBudget(used,max){return {allowed:Number(used||0)<Number(max||0),remaining:Math.max(0,Number(max||0)-Number(used||0))};}
function cumulativeCertification(results){return {ok:Array.isArray(results)&&results.length===25&&results.every(Boolean)};}
module.exports={isNetworkFailureMessage,MAX_RESPONSE_BYTES,MAX_REQUEST_BODY_BYTES,normalizeMethod,isIdempotentMethod,isRetryableStatus,isRetryableError,retryPolicy,jitterFactor,backoffMs,parseRetryAfter,timeoutFor,abortReason,canRetryMutation,idempotencyKey,requestId,responseSizeAllowed,requestBodyAllowed,contentTypeAllowed,parseJsonText,normalizeClientError,classifyNetworkError,cachePolicy,dedupeKey,retryBudget,cumulativeCertification};

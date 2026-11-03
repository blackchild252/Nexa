const configuredApiBase = String(process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
const isProductionBuild = typeof __DEV__ !== 'undefined' ? !__DEV__ : process.env.NODE_ENV === 'production';
if (configuredApiBase && !/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(configuredApiBase)) {
  throw new Error('EXPO_PUBLIC_API_URL must be an absolute HTTP(S) URL.');
}
if (configuredApiBase) {
  let apiHost = '';
  try { apiHost = new URL(configuredApiBase).hostname.toLowerCase().replace(/^\[|\]$/g, ''); } catch {}
  if (!['localhost', '127.0.0.1', '::1', '10.0.2.2', '10.0.3.2'].includes(apiHost)) {
    throw new Error('NEXA local-only mode permits loopback API endpoints only; external API hosts are disabled.');
  }
}
if (configuredApiBase && /@/.test(configuredApiBase.replace(/^https?:\/\//, ''))) {
  throw new Error('EXPO_PUBLIC_API_URL must not contain embedded credentials.');
}
if (isProductionBuild && !configuredApiBase) {
  throw new Error('EXPO_PUBLIC_API_URL must be configured for production builds.');
}
if (isProductionBuild && configuredApiBase && !/^https:\/\//.test(configuredApiBase)) {
  throw new Error('EXPO_PUBLIC_API_URL must use HTTPS in production builds.');
}
const API_BASE = configuredApiBase || 'http://localhost:3000';
import { normalizeMethod, retryPolicy, isRetryableStatus, isRetryableError, isNetworkFailureMessage, backoffMs, parseRetryAfter, requestId, responseSizeAllowed, requestBodyAllowed, contentTypeAllowed, parseJsonText, normalizeClientError, classifyNetworkError, canRetryMutation, idempotencyKey, timeoutFor } from './nexaNetworkPolicy';
let authFailureHandler: (() => void | Promise<void>) | null = null;
let nexDeviceId: string | null = null;
export function setNexaDeviceId(id?: string){ nexDeviceId = String(id || '').trim() || null; }
export function getNexaDeviceId(){ return nexDeviceId; }
// B328 (M4594): why the app signed the person out (for example a suspended account). The sign-in screen shows it once.
let authNotice: string | null = null;
export function takeAuthNotice(){ const n = authNotice; authNotice = null; return n; }
export function setAuthFailureHandler(handler: (() => void | Promise<void>) | null){ authFailureHandler = handler; }

const REQUEST_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 90_000;
// V5.68.1/B110: shared client resilience boundary. Idempotent reads may retry;
// ordinary mutations never retry automatically unless explicitly idempotency-bound.
async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const outer = init.signal as AbortSignal | undefined | null;
  const onOuterAbort = () => controller.abort();
  if (outer) { if (outer.aborted) controller.abort(); else outer.addEventListener('abort', onOuterAbort); }
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e: any) {
    if (timedOut) {
      const error: any = new Error('The request timed out. Check your connection and try again.');
      error.code = 'REQUEST_TIMEOUT'; error.status = 0;
      throw error;
    }
    throw e;
  } finally {
    clearTimeout(timer);
    if (outer) outer.removeEventListener('abort', onOuterAbort);
  }
}

async function resilientFetch(url: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const method = normalizeMethod(init.method || 'GET');
  const rawHeaders:any = { ...(init.headers || {}) };
  const body = init.body as any;
  if (!requestBodyAllowed(body)) { const e:any = new Error('Request payload is too large.'); e.code='REQUEST_BODY_TOO_LARGE'; e.status=413; throw e; }
  const existingIdempotency = String(rawHeaders['Idempotency-Key'] || rawHeaders['idempotency-key'] || '').trim();
  const mutationRetry = rawHeaders['X-Nexa-Retry-Mutation'] === '1' || rawHeaders['x-nexa-retry-mutation'] === '1';
  const policy = retryPolicy({ method, mutationRetry: mutationRetry && canRetryMutation({method,idempotencyKey:existingIdempotency}) });
  if (mutationRetry && canRetryMutation({method,idempotencyKey:existingIdempotency}) && !existingIdempotency) rawHeaders['Idempotency-Key'] = idempotencyKey(method, url);
  rawHeaders['X-Request-ID'] = rawHeaders['X-Request-ID'] || requestId();
  rawHeaders['X-Nexa-Platform'] = rawHeaders['X-Nexa-Platform'] || String(process.env.EXPO_OS || 'web').toLowerCase();
  if (process.env.EXPO_PUBLIC_APP_VERSION) rawHeaders['X-Nexa-App-Version'] = rawHeaders['X-Nexa-App-Version'] || process.env.EXPO_PUBLIC_APP_VERSION;
  rawHeaders['Cache-Control'] = rawHeaders['Cache-Control'] || 'no-store';
  if (body && !contentTypeAllowed(rawHeaders['Content-Type'])) { const e:any = new Error('Unsupported request content type.'); e.code='UNSUPPORTED_CONTENT_TYPE'; e.status=415; throw e; }
  let attempt = 0;
  while (attempt < policy.maxAttempts) {
    attempt += 1;
    try {
      const res = await fetchWithTimeout(url, { ...init, headers: rawHeaders }, timeoutMs);
      const retryAfter = parseRetryAfter(res.headers?.get?.('retry-after'));
      if (attempt < policy.maxAttempts && isRetryableStatus(res.status)) {
        const wait = retryAfter == null ? backoffMs(attempt) : retryAfter;
        await new Promise(resolve => setTimeout(resolve, wait));
        continue;
      }
      return res;
    } catch (e:any) {
      if (attempt >= policy.maxAttempts || !isRetryableError(e)) {
        // Offline UX: a dropped connection reads the same on every platform instead of a raw browser or React Native message.
        if (isNetworkFailureMessage(e)) { const offline: any = new Error('You appear to be offline. Check your connection and try again.'); offline.code = 'NETWORK_ERROR'; offline.status = 0; offline.networkClass = 'offline_or_network'; throw offline; }
        throw e;
      }
      await new Promise(resolve => setTimeout(resolve, backoffMs(attempt)));
    }
  }
  throw new Error('Request retry budget exhausted.');
}

async function readResponseData(res: Response) {
  const declared = Number(res.headers?.get?.('content-length') || 0);
  if (declared && !responseSizeAllowed(declared)) { const e:any = new Error('Response is too large.'); e.code='RESPONSE_TOO_LARGE'; e.status=502; throw e; }
  const text = await res.text();
  if (!responseSizeAllowed(encodeURIComponent(text).replace(/%[0-9A-F]{2}/gi, 'x').length)) { const e:any = new Error('Response is too large.'); e.code='RESPONSE_TOO_LARGE'; e.status=502; throw e; }
  const parsed = parseJsonText(text);
  return parsed.ok ? parsed.value : text;
}

function throwClientError(res: Response, data:any) {
  const error:any = new Error(data?.error || data?.message || `Request failed (${res.status})`);
  error.status = res.status;
  const serverCode = typeof data?.code === 'string' ? data.code : '';
  error.code = res.status === 401 ? 'AUTH_EXPIRED' : (res.status === 403 && serverCode === 'ACCOUNT_SUSPENDED') ? 'ACCOUNT_SUSPENDED' : normalizeClientError(error).code;
  error.networkClass = classifyNetworkError(error);
  return error;
}

const PlatformLabel = typeof navigator !== 'undefined' && navigator.userAgent ? String(navigator.userAgent).slice(0,80) : 'NEXA mobile device';

export async function authedFetch(path: string, init: RequestInit = {}) {
  const token = typeof globalThis !== 'undefined' && (globalThis as any).__NEXA_TOKEN;
  const headers:any = {'Content-Type':'application/json', ...(init.headers || {})};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (nexDeviceId) headers['X-Nexa-Device-ID'] = nexDeviceId;
  headers['X-Nexa-Device-Label'] = PlatformLabel;
  const res = await resilientFetch(`${API_BASE}${path}`, {...init, headers}, timeoutFor({method:init.method || 'GET'}));
  const data:any = await readResponseData(res);
  if (!res.ok) {
    const error:any = throwClientError(res, data);
    if (res.status === 401) { error.code = 'AUTH_EXPIRED'; if (authFailureHandler) await authFailureHandler(); }
    // B328 (M4594): a suspended account is refused on every call. Sign out and say why, instead of leaving screens that cannot work.
    else if (res.status === 403 && error.code === 'ACCOUNT_SUSPENDED') { authNotice = error.message; if (authFailureHandler) await authFailureHandler(); }
    throw error;
  }
  return data;
}
export async function publicFetch(path: string, init: RequestInit = {}) {
  const headers:any = {'Content-Type':'application/json', ...(init.headers || {})};
  if (nexDeviceId) headers['X-Nexa-Device-ID'] = nexDeviceId;
  headers['X-Nexa-Device-Label'] = PlatformLabel;
  const res = await resilientFetch(`${API_BASE}${path}`, {...init, headers}, timeoutFor({method:init.method || 'GET'}));
  const data:any = await readResponseData(res);
  if (!res.ok) throw throwClientError(res, data);
  return data;
}

// V6.1.93 B539 follow-up: second step of login for admin and Admin-staff users who sign in from the NEXA app.
/** V6.1.97 B543: asks for the AAMI Central activation code. It lands in the person's own Zeeza inbox; the reply never holds the digits. */
export async function requestCentralActivationCode(){
  return authedFetch('/api/zeeza/central-activation/challenge',{method:'POST',body:JSON.stringify({})});
}
export async function verifyAdminLoginCode(challengeId: string, code: string){
  return publicFetch('/api/auth/admin-mfa/verify',{method:'POST',body:JSON.stringify({challengeId,code})});
}

export async function rotateAuthSession(){ return authedFetch('/api/auth/session/rotate',{method:'POST'}); }

export async function startGoogleAuth(){ return publicFetch('/api/auth/google/start'); }
export async function exchangeGoogleAuth(code:string, ageConfirmed = false){ return publicFetch('/api/auth/google/exchange',{method:'POST',body:JSON.stringify({code,ageConfirmed})}); }

export function setNexaToken(token?: string){ (globalThis as any).__NEXA_TOKEN = token; }
export { API_BASE };

export async function askNexa(message: string, history: Array<{role:string;content:string}> = []) {
  return authedFetch("/api/dami", { method: "POST", body: JSON.stringify({ message, history }) });
}

export async function scamCheckImage(imageBase64: string, mimeType = "image/jpeg", caption = "") {
  return authedFetch("/api/scamcheck-image", {
    method: "POST",
    body: JSON.stringify({ imageBase64, mimeType, caption }),
  });
}


export async function authedMultipart(path: string, form: FormData) {
  const token = (globalThis as any).__NEXA_TOKEN;
  const headers:any = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (nexDeviceId) headers['X-Nexa-Device-ID'] = nexDeviceId;
  headers['X-Nexa-Device-Label'] = PlatformLabel;
  const res = await resilientFetch(`${API_BASE}${path}`, { method:'POST', headers, body:form }, timeoutFor({method:'POST',upload:true}));
  const data:any = await readResponseData(res);
  if (!res.ok) throw throwClientError(res,data);
  return data;
}

export async function transcribeNexa(uri: string) {
  const token = (globalThis as any).__NEXA_TOKEN;
  const form = new FormData();
  form.append("audio", { uri, name: "nexa-voice.m4a", type: "audio/m4a" } as any);
  const headers:any = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await resilientFetch(`${API_BASE}/api/transcribe`, { method: "POST", headers, body: form }, timeoutFor({method:'POST',upload:true}));
  const data = await readResponseData(res);
  if (!res.ok) throw new Error(data?.error || `Transcription failed (${res.status})`);
  return String(data.text || "");
}

export async function speakNexa(text: string) {
  const data:any = await authedFetch("/api/speak", { method: "POST", body: JSON.stringify({ text }) });
  return String(data.audio || "");
}

export async function confirmNexaAction(actionId: string) {
  return authedFetch("/api/ai/actions/confirm", { method: "POST", body: JSON.stringify({ actionId }) });
}

export async function getDamiActionHistory(limit = 20) {
  return authedFetch(`/api/dami/actions/history?limit=${encodeURIComponent(String(limit))}`);
}

export async function getDamiWorkflows() {
  return authedFetch('/api/dami/operations/workflows');
}

export async function getDamiWorkflowHistory(workflowId: string) {
  return authedFetch(`/api/dami/operations/workflow-history/${encodeURIComponent(workflowId)}`);
}


export async function getRealtimeClientSecret() {
  return authedFetch("/api/realtime/client-secret", { method: "POST" });
}

export async function exportNexaAccount(){ return authedFetch('/api/account/export'); }
export async function getYaayzPreferences(){ return authedFetch('/api/yaayz/preferences'); }
export async function updateYaayzPreferences(autoplayVideos:boolean){ return authedFetch('/api/yaayz/preferences',{method:'PATCH',body:JSON.stringify({autoplayVideos})}); }
export async function getCurrencyPreferences(){ return authedFetch('/api/currency/preferences'); }
export async function updateCurrencyPreferences(displayCurrency:string,countryCode:string|null){ return authedFetch('/api/currency/preferences',{method:'PUT',body:JSON.stringify({displayCurrency,countryCode})}); }

export async function getAccountPrivacy(){ return authedFetch('/api/account/privacy'); }
export async function updateAccountPrivacy(privacy:{visibility:'public'|'friends'|'private';discoverable:boolean;allowFriendRequests:boolean;allowInboxRequests:boolean}){ return authedFetch('/api/account/privacy',{method:'PATCH',body:JSON.stringify(privacy)}); }
export async function getAccountSecuritySummary(){ return authedFetch('/api/account/security-summary'); }
export async function getAccountLifecycleReadiness(){ return authedFetch('/api/account/lifecycle-readiness'); }
export async function getLegalReadiness(){ return authedFetch('/api/legal/readiness'); }
export async function acceptLegalDocuments(ageConfirmed=true){ return authedFetch('/api/account/legal-acceptance',{method:'POST',body:JSON.stringify({ageConfirmed,privacyAccepted:true,termsAccepted:true})}); }
export async function closeNexaAccount(password:string){ return authedFetch('/api/account',{method:'DELETE',body:JSON.stringify({confirmed:true,password})}); }
export async function importNexaAccount(bundle:any){ return authedFetch('/api/account/import',{method:'POST',body:JSON.stringify({bundle})}); }
export async function validateNexaAccountImport(bundle:any){ return authedFetch('/api/account/import/validate',{method:'POST',body:JSON.stringify({bundle})}); }

export async function getDamiVoicePreferences(){ return authedFetch('/api/ai/voice-preferences'); }
export async function updateDamiVoicePreferences(preferences:{voiceStyle:'female'|'male';languageCode:string;languageMode?:string}){ return authedFetch('/api/ai/voice-preferences',{method:'PATCH',body:JSON.stringify(preferences)}); }

export async function getDamiAvatar(){ return authedFetch('/api/ai/avatar'); }
export async function saveDamiAvatar(avatar:Record<string,string>){ return authedFetch('/api/ai/avatar',{method:'PUT',body:JSON.stringify({avatar})}); }

export async function getDamiPersonalization(){ return authedFetch('/api/ai/personalization'); }
export async function updateDamiPersonalization(personalization:{tone:'natural'|'concise'|'warm'|'professional';responseLength:'brief'|'balanced'|'detailed';proactive:boolean;preferredCategories:string[]}){ return authedFetch('/api/ai/personalization',{method:'PATCH',body:JSON.stringify(personalization)}); }
export async function resetDamiPersonalization(){ return authedFetch('/api/ai/personalization',{method:'DELETE'}); }
export async function resetDamiVoicePreferences(){ return authedFetch('/api/ai/voice-preferences',{method:'DELETE'}); }

// B349: owner-scoped Dami adaptive-learning controls.
export async function getDamiLearningState(){ return authedFetch('/api/ai/learning/state'); }
export async function exportDamiLearning(){ return authedFetch('/api/ai/learning/export'); }
export async function teachDami(lesson:string, activity = '', topicKey = ''){ return authedFetch('/api/ai/learning/learn',{method:'POST',body:JSON.stringify({lesson,activity,topicKey})}); }
export async function scheduleDamiFollowup(title:string, reason:string, dueAt:string, memoryId?:string|null){ return authedFetch('/api/ai/learning/followups',{method:'POST',body:JSON.stringify({title,reason,dueAt,memoryId:memoryId??null})}); }
export async function completeDamiFollowup(id:string){ return authedFetch(`/api/ai/learning/followups/${encodeURIComponent(id)}/complete`,{method:'POST',body:JSON.stringify({})}); }
export async function cancelDamiFollowup(id:string){ return authedFetch(`/api/ai/learning/followups/${encodeURIComponent(id)}/cancel`,{method:'POST',body:JSON.stringify({})}); }
export async function feedbackDamiLearning(memoryId:string, signal:'confirm'|'correct'|'forget', note = ''){ return authedFetch('/api/ai/learning/feedback',{method:'POST',body:JSON.stringify({memoryId,signal,note})}); }
export async function resetDamiLearning(){ return authedFetch('/api/ai/learning/reset',{method:'POST',body:JSON.stringify({})}); }
export async function pruneDamiLearning(){ return authedFetch('/api/ai/learning/prune',{method:'POST',body:JSON.stringify({})}); }
export async function setDamiLearningPaused(paused:boolean){ return authedFetch('/api/ai/learning/pause',{method:'POST',body:JSON.stringify({paused})}); }
export async function forgetDamiTopic(topicKey:string){ return authedFetch('/api/ai/learning/topic/forget',{method:'POST',body:JSON.stringify({topicKey})}); }

export async function openCustomerCare(source:'help'|'dami'='help', reason='', context='') {
  return authedFetch('/api/customer-care/threads', { method:'POST', body:JSON.stringify({source,reason,context}) });
}
export async function getCustomerCareThread(threadId:string) {
  return authedFetch(`/api/customer-care/threads/${encodeURIComponent(threadId)}`);
}
export async function sendCustomerCareMessage(threadId:string, body:string, idempotencyKey?:string) {
  return authedFetch(`/api/customer-care/threads/${encodeURIComponent(threadId)}/messages`, { method:'POST', body:JSON.stringify({body,idempotencyKey:idempotencyKey||undefined}) });
}
export async function escalateCustomerCare(threadId:string, reason='customer_requested') { return authedFetch(`/api/customer-care/threads/${encodeURIComponent(threadId)}/escalate`, { method:'POST', body:JSON.stringify({reason}) }); }
export async function reopenCustomerCare(threadId:string) { return authedFetch(`/api/customer-care/threads/${encodeURIComponent(threadId)}/reopen`, { method:'POST', body:JSON.stringify({}) }); }
export async function markCustomerCareRead(threadId:string) {
  return authedFetch(`/api/customer-care/threads/${encodeURIComponent(threadId)}/read`, { method:'POST', body:JSON.stringify({}) });
}

// Block 03 authentication lifecycle. Public recovery responses are deliberately non-enumerating.
export async function requestPasswordReset(email: string) {
  return publicFetch('/api/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) });
}
export async function confirmPasswordReset(token: string, password: string) {
  return publicFetch('/api/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ token, password }) });
}
export async function requestEmailVerification(email: string) {
  return publicFetch('/api/auth/email-verification/request', { method: 'POST', body: JSON.stringify({ email }) });
}
export async function confirmEmailVerification(token: string) {
  return publicFetch('/api/auth/email-verification/confirm', { method: 'POST', body: JSON.stringify({ token }) });
}
export async function changeAccountPassword(currentPassword: string, newPassword: string) {
  return authedFetch('/api/auth/password/change', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
}
export async function getAuthSecurityEvents(limit = 50) {
  return authedFetch(`/api/auth/security-events?limit=${Math.max(1, Math.min(100, Math.trunc(limit) || 50))}`);
}

export async function getRegionalPreferences(){ return authedFetch('/api/regional/preferences'); }
export async function updateRegionalPreferences(countryCode:string|null,locale:string,languageCode:string){ return authedFetch('/api/regional/preferences',{method:'PUT',body:JSON.stringify({countryCode,locale,languageCode})}); }

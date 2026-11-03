/** V6.1.93 B539 follow-up: pure helpers for the NEXA app's Zeeza sign-in code step.
 * The server stays authoritative. This file only reads the login reply and tidies what the person types.
 */
export type PendingAdminCode = { challengeId: string; expiresAt: number };

export function normalizeAdminCode(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

export function isAdminCodeComplete(value: string): boolean {
  return /^\d{6}$/.test(String(value || ''));
}

/** Reads a login reply. Returns the pending code step, or null when no code is needed. */
export function readPendingAdminCode(data: any, now: number = Date.now()): PendingAdminCode | null {
  if (!data || data.mfaRequired !== true || typeof data.challengeId !== 'string') return null;
  const id = data.challengeId;
  if (id.length < 32 || id.length > 128) return null;
  const seconds = Number(data.expiresInSeconds);
  const life = Number.isFinite(seconds) && seconds > 0 && seconds <= 900 ? seconds : 300;
  return { challengeId: id, expiresAt: now + life * 1000 };
}

export function isAdminCodeExpired(p: PendingAdminCode | null, now: number = Date.now()): boolean {
  return !p || !(p.expiresAt > now);
}

export function parseStoredAdminCode(raw: string | null | undefined, now: number = Date.now()): PendingAdminCode | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p.challengeId !== 'string' || typeof p.expiresAt !== 'number') return null;
    return isAdminCodeExpired(p, now) ? null : { challengeId: p.challengeId, expiresAt: p.expiresAt };
  } catch { return null; }
}

/** 'retry' = wrong code, can try again. 'restart' = the challenge is dead, sign in again. */
export function adminCodeFailureKind(status: number | undefined): 'retry' | 'restart' {
  return status === 401 ? 'retry' : 'restart';
}

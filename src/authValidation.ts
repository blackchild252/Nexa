/** Shared client-side authentication input contract.
 * Server-side auth remains authoritative; this only prevents avoidable client/server validation drift.
 */
export type AuthValidationResult = { ok: true } | { ok: false; message: string };

export function normalizeAuthEmail(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function validateAuthEmail(value: string): AuthValidationResult {
  const email = normalizeAuthEmail(value);
  return /^\S+@\S+\.\S+$/.test(email)
    ? { ok: true }
    : { ok: false, message: 'Enter a valid email.' };
}

export function validateAuthPassword(value: string): AuthValidationResult {
  return String(value || '').length >= 8
    ? { ok: true }
    : { ok: false, message: 'Password must be at least 8 characters.' };
}

export function passwordRequirements(value: string) {
  const p = String(value || '');
  return {
    lowercase: /[a-z]/.test(p),
    uppercase: /[A-Z]/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
    number: /\d/.test(p),
    length: p.length >= 8,
  };
}

export function validateNewPassword(value: string): AuthValidationResult {
  const r = passwordRequirements(value);
  if (!r.length) return { ok: false, message: 'Password must be at least 8 characters.' };
  if (!r.lowercase || !r.uppercase || !r.special || !r.number) return { ok: false, message: 'Password must include a lowercase letter, uppercase letter, special character and number.' };
  return { ok: true };
}

export function validateAuthCredentials(email: string, password: string): AuthValidationResult {
  const emailResult = validateAuthEmail(email);
  if (!emailResult.ok) return emailResult;
  return validateAuthPassword(password);
}

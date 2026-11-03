/** V6.1.97 B543: plain messages for the "Send my activation code" step. The server stays authoritative; this only words its answer. */
export type ActivationCodeOutcome = { ok: boolean; message: string; openInbox: boolean };

export function readActivationCodeReply(data: any): ActivationCodeOutcome {
  if (data && data.issued === true) {
    const s = Number(data.expiresInSeconds);
    const minutes = Number.isFinite(s) && s > 0 && s <= 900 ? Math.max(1, Math.round(s / 60)) : 5;
    return { ok: true, openInbox: true, message: `Your code is in your Zeeza inbox. It works once and expires in ${minutes} minutes. Type it into AAMI Admin.` };
  }
  return { ok: false, openInbox: false, message: 'The code could not be sent. Try again.' };
}

export function describeActivationCodeError(e: any): ActivationCodeOutcome {
  const status = Number(e?.status);
  if (status === 403) return { ok: false, openInbox: false, message: 'There is no pending activation for this account. Sign in with the account named in your invitation.' };
  if (status === 429) return { ok: false, openInbox: false, message: 'Too many requests. Wait a minute, then try again.' };
  if (status === 401) return { ok: false, openInbox: false, message: 'Please sign in again, then ask for the code.' };
  return { ok: false, openInbox: false, message: 'The code could not be sent right now. Try again later.' };
}

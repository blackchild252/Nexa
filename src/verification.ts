import { authedFetch } from "./api";

export type VerificationKind = "user" | "vendor";
export type VerificationRequest = { id: string; kind: VerificationKind; status: "pending" | "approved" | "rejected"; reason: string; createdAt: string; reviewedAt: string | null };
export type VerificationMine = { verified: { user: boolean; vendor: boolean }; requests: VerificationRequest[] };

// Same limits as the server (server/verification.js). The server is the real check; these only save a round trip.
export const VERIFY_MIN_DETAILS = 20;
export const VERIFY_MAX_DETAILS = 1000;

async function send<T>(path: string, method: string, body: unknown, fallback: string): Promise<T> {
  try {
    return (await authedFetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })) as T;
  } catch (e: any) {
    throw new Error(e?.message || fallback);
  }
}

export const apiVerificationMine = (): Promise<VerificationMine> =>
  send<VerificationMine>("/api/verification/requests/mine", "GET", undefined, "Could not load your verification right now.");

export const apiVerificationRequest = (kind: VerificationKind, details: string) =>
  send<{ request: VerificationRequest }>("/api/verification/requests", "POST", { kind, details }, "Could not send your request.");

/** What to show for one kind: verified, waiting, not approved (with the reason), or nothing yet. */
export function verificationStatusFor(mine: VerificationMine | null, kind: VerificationKind): { state: "verified" | "pending" | "rejected" | "none"; reason: string } {
  if (!mine) return { state: "none", reason: "" };
  if (mine.verified?.[kind]) return { state: "verified", reason: "" };
  const latest = (mine.requests || []).find((r) => r.kind === kind);
  if (latest?.status === "pending") return { state: "pending", reason: "" };
  if (latest?.status === "rejected") return { state: "rejected", reason: latest.reason || "" };
  return { state: "none", reason: "" };
}

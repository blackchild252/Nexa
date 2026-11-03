import { authedFetch } from "./api";

// Shared money ledgers (V3.14): one ledger, three kinds of group.
//   split = friends sharing costs (who owes whom)
//   pot   = shared pool (owner records contributions, spending, payouts)
//   ajo   = rotating savings (fixed contribution per round, one member collects each round)
// Amounts are major units in the group's explicitly stored currency; display must preserve that source currency.

export type GroupKind = "split" | "pot" | "ajo";
export type EntryType = "expense" | "contribution" | "payout" | "settlement";

export const GROUP_KIND_LABELS: Record<GroupKind, string> = {
  split: "Split expenses", pot: "Shared pot", ajo: "Sky Savings",
};
export const GROUP_KIND_HINTS: Record<GroupKind, string> = {
  split: "Log shared costs and see who owes whom.",
  pot: "Everyone chips in; the owner records spending.",
  ajo: "Sky Savings: same amount each round; one member collects per round.",
};

export type GroupSummary =
  | { myNet: number }                                                            // split: > 0 you're owed, < 0 you owe
  | { balance: number; myContributed: number }                                   // pot
  | { round: number; totalRounds: number; complete: boolean; myOwing: number; iAmRecipient: boolean }; // ajo

export type MoneyGroup = {
  id: string; name: string; kind: GroupKind; currency: string;
  isOwner: boolean; closed: boolean; started: boolean; memberCount: number;
  inviteCode: string | null;              // owner only
  contributionAmount: number | null; cycleDays: number | null; startDate: string | null; // ajo
  createdAt: string;
};
export type MoneyGroupListItem = MoneyGroup & { summary: GroupSummary };

export type GroupMember = {
  id: string; name: string; role: "owner" | "member"; isYou: boolean;
  hasAccount: boolean;                    // false = placeholder the owner records for
  claimCode: string | null;               // owner only, placeholders only: give it to that person to take over this spot
  payoutPosition: number | null;          // ajo only
  paid: number; share: number; net: number; contributed: number; received: number; // net > 0: the group owes them
};

export type GroupEntry = {
  id: string; type: EntryType; amount: number; currency: string;
  memberId: string | null; memberName: string | null;      // payer / contributor / recipient / settlement sender (null = paid from the pot)
  toMemberId: string | null; toMemberName: string | null;  // settlements only
  round: number | null; note: string; date: string; recordedByName: string;
  shares: { memberId: string; name: string; amount: number }[];
  voided: boolean; canVoid: boolean; createdAt: string;
};

export type AjoState = {
  round: number; totalRounds: number; complete: boolean;
  recipientMemberId: string | null; dueDate: string | null;
  dueEach: number; expected: number; collected: number;
  members: { memberId: string; contributed: number; owing: number }[];
};

export type GroupDetail = {
  group: MoneyGroup;
  members: GroupMember[];
  entries: GroupEntry[];
  suggestedSettlements?: { fromMemberId: string; toMemberId: string; amount: number }[]; // split
  pot?: { balance: number; contributed: number; spent: number; paidOut: number };        // pot
  ajo?: AjoState;                                                                        // ajo
};

export type NewGroup = {
  name: string; kind: GroupKind; currency?: string; memberNames?: string[];
  contributionAmount?: number; cycleDays?: number; startDate?: string;                   // ajo
};

export type NewEntry =
  | { type: "expense"; amount: number; note?: string; date?: string; paidByMemberId: string; splitAmong: string[] } // split, equal
  | { type: "expense"; amount: number; note?: string; date?: string; paidByMemberId: string; shares: Record<string, number> } // split, exact
  | { type: "expense"; amount: number; note?: string; date?: string }                                              // pot: paid from the pot
  | { type: "settlement"; amount: number; note?: string; date?: string; fromMemberId: string; toMemberId: string }
  | { type: "contribution" | "payout"; amount: number; note?: string; date?: string; memberId: string };

async function send<T>(path: string, method: string, body: unknown, fallback: string): Promise<T> {
  try {
    return await authedFetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }) as T;
  } catch (e: any) {
    throw new Error(e?.message || fallback);
  }
}

export const apiGroupsList = async (): Promise<MoneyGroupListItem[]> =>
  (await send<{ groups: MoneyGroupListItem[] }>("/api/groups", "GET", undefined, "Could not load your groups.")).groups;
export const apiGroupGet = (id: string, limit = 100) =>
  send<GroupDetail>(`/api/groups/${id}?limit=${limit}`, "GET", undefined, "Could not load this group.");
export const apiGroupCreate = (g: NewGroup) => send<GroupDetail>("/api/groups", "POST", g, "Could not create the group.");
export const apiGroupJoin = (code: string) => send<GroupDetail>("/api/groups/join", "POST", { code }, "Could not join that group.");
export const apiGroupUpdate = (id: string, patch: { name?: string; closed?: boolean; contributionAmount?: number; cycleDays?: number; startDate?: string }) =>
  send<GroupDetail>(`/api/groups/${id}`, "PATCH", patch, "Could not update the group.");
export const apiGroupDelete = (id: string) => send<{ ok: true }>(`/api/groups/${id}`, "DELETE", undefined, "Could not delete the group.");
export const apiGroupAddMember = (id: string, name: string) =>
  send<GroupDetail>(`/api/groups/${id}/members`, "POST", { name }, "Could not add that person.");
export const apiGroupRemoveMember = (id: string, memberId: string) =>
  send<GroupDetail | { ok: true }>(`/api/groups/${id}/members/${memberId}`, "DELETE", undefined, "Could not remove that person.");
export const apiGroupSetOrder = (id: string, order: string[]) =>
  send<GroupDetail>(`/api/groups/${id}/members/order`, "PATCH", { order }, "Could not save the payout order.");
export const apiGroupAddEntry = (id: string, entry: NewEntry) =>
  send<GroupDetail>(`/api/groups/${id}/entries`, "POST", entry, "Could not record that.");
export const apiGroupVoidEntry = (id: string, entryId: string) =>
  send<GroupDetail>(`/api/groups/${id}/entries/${entryId}/void`, "POST", undefined, "Could not void that entry.");

// Placeholder linking. `invite` gives the owner a code for one placeholder (the same code back on repeat
// calls, or a new one with regenerate). That person enters it in apiGroupJoin and becomes that member,
// history intact. `merge` folds a placeholder into a real member who joined separately with the group code.
export const apiGroupInviteMember = (id: string, memberId: string, regenerate = false) =>
  send<GroupDetail>(`/api/groups/${id}/members/${memberId}/invite`, "POST", { regenerate }, "Could not make an invite for that person.");
export const apiGroupMergeMember = (id: string, memberId: string, intoMemberId: string) =>
  send<GroupDetail>(`/api/groups/${id}/members/${memberId}/merge`, "POST", { intoMemberId }, "Could not merge those two.");

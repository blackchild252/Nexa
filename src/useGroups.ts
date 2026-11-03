import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, Share } from "react-native";
import {
  GroupKind, GroupDetail, MoneyGroupListItem, NewEntry, EntryType,
  apiGroupsList, apiGroupGet, apiGroupCreate, apiGroupJoin, apiGroupUpdate, apiGroupDelete,
  apiGroupAddMember, apiGroupRemoveMember, apiGroupSetOrder, apiGroupAddEntry, apiGroupVoidEntry,
  apiGroupInviteMember, apiGroupMergeMember,
} from "./groups";
import { subscribeNexaAutoRefresh } from "./nexaAutoRefresh";
import { fmtMoney } from "./catalog";

// All state and logic for shared money groups (V3.14): the list, creating/joining, and one group's ledger.

export type GroupsView = "list" | "new" | "join" | "detail";

const todayStr = () => new Date().toISOString().slice(0, 10);
export const parseNum = (v: string) => Number(String(v).replace(/,/g, "").trim());
export const money = (cur: string, n: number) => fmtMoney(cur, Math.round(n * 100) / 100);

export function useGroups({ userId, active }: { userId?: string; active: boolean }) {
  const [view, setView] = useState<GroupsView>("list");
  const [groups, setGroups] = useState<MoneyGroupListItem[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState("");
  const listRequest = useRef(0);

  // -- one group --
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [busy, setBusy] = useState(false);
  const openId = useRef<string | null>(null);
  const detailRequest = useRef(0);

  // -- create form --
  const [gKind, setGKind] = useState<GroupKind>("split");
  const [gName, setGName] = useState("");
  const [gCurrency, setGCurrency] = useState("NGN");
  const [gNames, setGNames] = useState("");
  const [gContribution, setGContribution] = useState("");
  const [gCycleDays, setGCycleDays] = useState(7);
  const [gStart, setGStart] = useState(todayStr());
  const [formError, setFormError] = useState("");

  // -- join form --
  const [joinCode, setJoinCode] = useState("");

  // -- entry composer --
  const [composerOpen, setComposerOpen] = useState(false);
  const [eType, setEType] = useState<EntryType>("expense");
  const [eAmount, setEAmount] = useState("");
  const [eNote, setENote] = useState("");
  const [eDate, setEDate] = useState(todayStr());
  const [ePaidBy, setEPaidBy] = useState("");          // split expense: who paid
  const [eSplitAmong, setESplitAmong] = useState<string[]>([]);
  const [eUneven, setEUneven] = useState(false);
  const [eShares, setEShares] = useState<Record<string, string>>({});
  const [eMember, setEMember] = useState("");          // contribution / payout: which member; settlement: who is paying
  const [eTo, setETo] = useState("");                  // settlement: who is being paid

  // -- manage --
  const [newMemberName, setNewMemberName] = useState("");
  const [mergeFor, setMergeFor] = useState<string | null>(null); // placeholder member id being merged
  const [renameText, setRenameText] = useState("");

  const reset = useCallback(() => {
    setView("list"); setGroups([]); setDetail(null); openId.current = null; setComposerOpen(false);
    setGroupsError(""); setDetailError("");
  }, []);

  // ---------- list ----------
  const loadGroups = useCallback(async () => {
    if (!userId) return;
    const requestId = ++listRequest.current;
    setGroupsLoading(true); setGroupsError("");
    try { const next = await apiGroupsList(); if (requestId === listRequest.current) setGroups(next); }
    catch (e: any) { if (requestId === listRequest.current) setGroupsError(e?.message || "Could not load your groups."); }
    finally { if (requestId === listRequest.current) setGroupsLoading(false); }
  }, [userId]);

  useEffect(() => { if (!userId) reset(); }, [userId, reset]);
  useEffect(() => { if (userId && active && view === "list") loadGroups(); }, [userId, active, view, loadGroups]);

  // ---------- opening / leaving a group ----------
  const showDetail = (d: GroupDetail) => {
    openId.current = d.group.id;
    setDetail(d); setRenameText(d.group.name); setView("detail");
  };

  const openGroup = useCallback(async (id: string) => {
    const requestId = ++detailRequest.current;
    openId.current = id; setDetail(null); setDetailError(""); setComposerOpen(false); setMergeFor(null);
    setView("detail"); setDetailLoading(true);
    try { const d = await apiGroupGet(id); if (requestId === detailRequest.current && openId.current === id) { setDetail(d); setRenameText(d.group.name); } }
    catch (e: any) { if (requestId === detailRequest.current && openId.current === id) setDetailError(e?.message || "Could not load this group."); }
    finally { if (requestId === detailRequest.current && openId.current === id) setDetailLoading(false); }
  }, []);

  const refreshDetail = useCallback(async () => {
    const id = openId.current;
    if (!id) return;
    const requestId = ++detailRequest.current;
    setDetailError("");
    try { const d = await apiGroupGet(id); if (requestId === detailRequest.current && openId.current === id) setDetail(d); }
    catch (e: any) { if (requestId === detailRequest.current && openId.current === id) setDetailError(e?.message || "Could not refresh."); }
  }, []);

  useEffect(() => { if (!userId || !active) return; return subscribeNexaAutoRefresh(() => { if (view === "list") void loadGroups(); else void refreshDetail(); }); }, [userId, active, view, loadGroups, refreshDetail]);

  const backToList = useCallback(() => {
    openId.current = null; setDetail(null); setComposerOpen(false); setMergeFor(null); setDetailError(""); setView("list");
  }, []);

  // Runs a server call that returns the updated group, shows any error inline.
  const run = useCallback(async (fn: () => Promise<GroupDetail | { ok: true }>, onOk?: () => void): Promise<boolean> => {
    setBusy(true); setDetailError("");
    try {
      const r = await fn();
      if ("group" in r) { setDetail(r); setRenameText(r.group.name); }
      onOk?.();
      return true;
    } catch (e: any) { setDetailError(e?.message || "Something went wrong."); return false; }
    finally { setBusy(false); }
  }, []);

  // ---------- create / join ----------
  const startNew = () => {
    setGKind("split"); setGName(""); setGCurrency("NGN"); setGNames(""); setGContribution("");
    setGCycleDays(7); setGStart(todayStr()); setFormError(""); setView("new");
  };
  const startJoin = () => { setJoinCode(""); setFormError(""); setView("join"); };

  const submitNewGroup = async () => {
    setFormError("");
    if (!gName.trim()) { setFormError("Give the group a name."); return; }
    const names = gNames.split(",").map((n) => n.trim()).filter(Boolean);
    let body: Parameters<typeof apiGroupCreate>[0] = { name: gName.trim(), kind: gKind, currency: gCurrency.trim() || "NGN", memberNames: names };
    if (gKind === "ajo") {
      const amt = parseNum(gContribution);
      if (!Number.isFinite(amt) || amt <= 0) { setFormError("Enter how much each person pays per round."); return; }
      body = { ...body, contributionAmount: amt, cycleDays: gCycleDays, startDate: gStart.trim() };
    }
    setBusy(true);
    try { showDetail(await apiGroupCreate(body)); }
    catch (e: any) { setFormError(e?.message || "Could not create the group."); }
    finally { setBusy(false); }
  };

  const submitJoin = async () => {
    setFormError("");
    if (joinCode.trim().length < 8) { setFormError("Codes are 8 characters."); return; }
    setBusy(true);
    try { showDetail(await apiGroupJoin(joinCode.trim())); }
    catch (e: any) { setFormError(e?.message || "Could not join that group."); }
    finally { setBusy(false); }
  };

  // ---------- entry composer ----------
  const resetComposerFields = () => {
    setEAmount(""); setENote(""); setEDate(todayStr()); setEUneven(false); setEShares({}); setEMember(""); setETo("");
  };

  // Opens the composer with sensible defaults for this kind of group. `preset` lets a button
  // (e.g. "Record 1,000 NGN from Sade") arrive with the form already filled.
  const openComposer = (type?: EntryType, preset?: { memberId?: string; amount?: number; note?: string; toMemberId?: string }) => {
    if (!detail) return;
    const d = detail;
    const me = d.members.find((m) => m.isYou);
    resetComposerFields();
    const t: EntryType = type || (d.group.kind === "split" ? "expense" : "contribution");
    setEType(t);
    setEPaidBy(me ? me.id : "");
    setESplitAmong(d.members.map((m) => m.id));
    if (preset?.memberId) setEMember(preset.memberId);
    if (preset?.toMemberId) setETo(preset.toMemberId);
    if (preset?.amount != null) setEAmount(String(preset.amount));
    if (preset?.note) setENote(preset.note);
    if (t === "payout" && d.group.kind === "ajo" && d.ajo?.recipientMemberId && !preset?.memberId) setEMember(d.ajo.recipientMemberId);
    setComposerOpen(true); setDetailError("");
  };
  const closeComposer = () => { setComposerOpen(false); setDetailError(""); };

  // Switching between Expense / Payment / Contribution... keeps the amount and note; only who-is-involved resets.
  const switchType = (t: EntryType) => {
    setEType(t); setEMember(""); setETo(""); setDetailError("");
    if (t === "payout" && detail?.group.kind === "ajo" && detail.ajo?.recipientMemberId) setEMember(detail.ajo.recipientMemberId);
  };

  const toggleSplitMember = (id: string) =>
    setESplitAmong((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  // How much of an uneven expense is still unassigned (negative = over-assigned).
  const unassigned = (): number => {
    const total = parseNum(eAmount) || 0;
    const sum = eSplitAmong.reduce((a, id) => a + (parseNum(eShares[id] || "") || 0), 0);
    return Math.round((total - sum) * 100) / 100;
  };

  const submitEntry = async () => {
    if (!detail) return;
    const d = detail;
    const amount = parseNum(eAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setDetailError("Enter an amount."); return; }
    const common = { amount, note: eNote.trim() || undefined, date: eDate.trim() || undefined };
    let entry: NewEntry;
    if (eType === "expense" && d.group.kind === "split") {
      if (!ePaidBy) { setDetailError("Pick who paid."); return; }
      if (!eSplitAmong.length) { setDetailError("Pick who shared this."); return; }
      if (eUneven) {
        const shares: Record<string, number> = {};
        for (const id of eSplitAmong) {
          const v = parseNum(eShares[id] || "");
          if (Number.isFinite(v) && v > 0) shares[id] = v;
        }
        entry = { type: "expense", ...common, paidByMemberId: ePaidBy, shares };
      } else {
        entry = { type: "expense", ...common, paidByMemberId: ePaidBy, splitAmong: eSplitAmong };
      }
    } else if (eType === "expense") {
      entry = { type: "expense", ...common };
    } else if (eType === "settlement") {
      if (!eMember || !eTo) { setDetailError("Pick who paid and who was paid."); return; }
      entry = { type: "settlement", ...common, fromMemberId: eMember, toMemberId: eTo };
    } else {
      if (!eMember) { setDetailError(eType === "payout" ? "Pick who is being paid out." : "Pick who contributed."); return; }
      entry = { type: eType, ...common, memberId: eMember };
    }
    await run(() => apiGroupAddEntry(d.group.id, entry), () => { setComposerOpen(false); resetComposerFields(); });
  };

  const voidEntry = (entryId: string) => {
    if (!detail) return;
    const id = detail.group.id;
    Alert.alert("Void this entry?", "It stays in the history, crossed out, but stops counting toward balances.", [
      { text: "Cancel", style: "cancel" },
      { text: "Void it", style: "destructive", onPress: () => { run(() => apiGroupVoidEntry(id, entryId)); } },
    ]);
  };

  // Split groups: record one of the suggested settle-up payments.
  const recordSettlement = (fromMemberId: string, toMemberId: string, amount: number, fromName: string, toName: string) => {
    if (!detail) return;
    const d = detail;
    Alert.alert("Record this payment?", `${fromName} paid ${toName} ${money(d.group.currency, amount)}.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Record", onPress: () => { run(() => apiGroupAddEntry(d.group.id, { type: "settlement", amount, fromMemberId, toMemberId, note: "Settle up" })); } },
    ]);
  };

  // ---------- members ----------
  const addMember = async () => {
    if (!detail || !newMemberName.trim()) return;
    const d = detail;
    await run(() => apiGroupAddMember(d.group.id, newMemberName.trim()), () => setNewMemberName(""));
  };

  const removeMember = (memberId: string, name: string) => {
    if (!detail) return;
    const id = detail.group.id;
    Alert.alert(`Remove ${name}?`, "Only possible while they're not in any entry.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => { run(() => apiGroupRemoveMember(id, memberId)); } },
    ]);
  };

  const leaveGroup = () => {
    if (!detail) return;
    const id = detail.group.id;
    Alert.alert("Leave this group?", "Only possible if you're not in any entry yet.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave", style: "destructive",
        onPress: () => {
          const me = detail.members.find((m) => m.isYou);
          if (me) run(() => apiGroupRemoveMember(id, me.id), backToList);
        },
      },
    ]);
  };

  const moveMember = (memberId: string, dir: -1 | 1) => {
    if (!detail) return;
    const ids = detail.members.map((m) => m.id);
    const i = ids.indexOf(memberId), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => apiGroupSetOrder(detail.group.id, ids));
  };

  const inviteMember = (memberId: string, regenerate = false) => {
    if (!detail) return;
    return run(() => apiGroupInviteMember(detail.group.id, memberId, regenerate));
  };

  const mergeMember = (fromId: string, intoId: string, fromName: string, intoName: string) => {
    if (!detail) return;
    const id = detail.group.id;
    Alert.alert(`Merge ${fromName} into ${intoName}?`, `Everything recorded for ${fromName} moves to ${intoName}. This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Merge", style: "destructive", onPress: () => { run(() => apiGroupMergeMember(id, fromId, intoId), () => setMergeFor(null)); } },
    ]);
  };

  // ---------- group settings ----------
  const saveRename = () => {
    if (!detail || !renameText.trim() || renameText.trim() === detail.group.name) return;
    const id = detail.group.id;
    run(() => apiGroupUpdate(id, { name: renameText.trim() }));
  };
  const toggleClosed = () => {
    if (!detail) return;
    const g = detail.group;
    run(() => apiGroupUpdate(g.id, { closed: !g.closed }));
  };
  const deleteGroup = () => {
    if (!detail) return;
    const id = detail.group.id;
    Alert.alert("Delete this group?", "Only possible while nothing has been recorded.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { run(() => apiGroupDelete(id), backToList); } },
    ]);
  };

  const shareCode = (code: string, forName?: string) => {
    const g = detail?.group.name || "my group";
    const msg = forName
      ? `${forName}, join “${g}” on NEXA with this code to see your share: ${code}`
      : `Join “${g}” on NEXA with this code: ${code}`;
    Share.share({ message: msg }).catch(() => {});
  };

  return {
    view, setView, groups, groupsLoading, groupsError, loadGroups,
    detail, detailLoading, detailError, busy, openGroup, refreshDetail, backToList,
    gKind, setGKind, gName, setGName, gCurrency, setGCurrency, gNames, setGNames, gContribution, setGContribution,
    gCycleDays, setGCycleDays, gStart, setGStart, formError, startNew, startJoin, submitNewGroup,
    joinCode, setJoinCode, submitJoin,
    composerOpen, openComposer, closeComposer, switchType, eType, setEType, eAmount, setEAmount, eNote, setENote, eDate, setEDate,
    ePaidBy, setEPaidBy, eSplitAmong, toggleSplitMember, eUneven, setEUneven, eShares, setEShares,
    eMember, setEMember, eTo, setETo, unassigned, submitEntry, voidEntry, recordSettlement,
    newMemberName, setNewMemberName, addMember, removeMember, leaveGroup, moveMember, inviteMember,
    mergeFor, setMergeFor, mergeMember, renameText, setRenameText, saveRename, toggleClosed, deleteGroup, shareCode,
  };
}

export type Groups = ReturnType<typeof useGroups>;

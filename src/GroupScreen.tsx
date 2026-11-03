import { NexaPressable } from './motion';
import React, { useState } from "react";
import { View, Text, TextInput,  ScrollView, ActivityIndicator, RefreshControl } from "react-native";

import { s } from "./styles";
import { gs } from "./groupStyles";
import { GROUP_KIND_LABELS } from "./groups";
import type { EntryType, GroupDetail, GroupEntry, GroupMember } from "./groups";
import { money } from "./useGroups";
import type { Groups } from "./useGroups";
import { theme, tc, ds } from './theme';

const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString();
const label = (m: GroupMember) => (m.isYou ? "You" : m.name);
const EPS = 0.004;

function Chip({ text, on, onPress }: { text: string; on: boolean; onPress: () => void }) {
  return (
    <NexaPressable accessibilityRole="radio" accessibilityLabel={`Filter group by ${text}`} accessibilityState={{selected:on}} style={[gs.chip, on && gs.chipOn]} onPress={onPress}>
      <Text style={[gs.chipText, on && gs.chipTextOn]}>{text}</Text>
    </NexaPressable>
  );
}

function Badge({ text, tone }: { text: string; tone?: "mint" | "amber" }) {
  return (
    <View style={[gs.badge, tone === "mint" && gs.badgeMint, tone === "amber" && gs.badgeAmber]}>
      <Text style={[gs.badgeText, tone === "mint" && gs.badgeMintText, tone === "amber" && gs.badgeAmberText]}>{text}</Text>
    </View>
  );
}

function entryTitle(e: GroupEntry): string {
  const note = e.note ? ` · ${e.note}` : "";
  switch (e.type) {
    case "expense": return e.memberName ? `${e.memberName} paid${note}` : `Spent from the pot${note}`;
    case "settlement": return `${e.memberName} paid ${e.toMemberName}`;
    case "contribution": return `${e.memberName} contributed`;
    default: return `${e.memberName} received a payout`;
  }
}

function entrySub(e: GroupEntry): string {
  const parts = [fmtDate(e.date), `by ${e.recordedByName}`];
  if (e.round) parts.push(`round ${e.round}`);
  if (e.type !== "expense" && e.note) parts.push(e.note);
  if (e.type === "expense" && e.shares.length) parts.push(`for ${e.shares.map((x) => x.name).join(", ")}`);
  return parts.join(" · ");
}

/* ---------------- summary cards, one per kind ---------------- */

function SplitSummary({ g, d }: { g: Groups; d: GroupDetail }) {
  const cur = d.group.currency;
  const me = d.members.find((m) => m.isYou);
  const net = me ? me.net : 0;
  const nameOf = (id: string) => { const m = d.members.find((x) => x.id === id); return m ? label(m) : "Member"; };
  const settle = d.suggestedSettlements || [];
  return (
    <>
      <View style={s.dashCard}>
        <Text style={gs.bigLabel}>Your balance</Text>
        <Text style={[gs.bigNumber, net > EPS ? gs.owed : net < -EPS ? gs.owe : null]}>
          {net > EPS ? `You're owed ${money(cur, net)}` : net < -EPS ? `You owe ${money(cur, -net)}` : "All settled"}
        </Text>
      </View>
      {settle.length > 0 && (
        <>
          <Text style={gs.sectionTitle}>Settle up</Text>
          <View style={s.dashCard}>
            {settle.map((x, i) => (
              <View key={`${x.fromMemberId}-${x.toMemberId}`} style={[gs.personRow, i === 0 && { borderTopWidth: 0 }]}>
                <View style={ds({ flex: 1 })}>
                  <Text style={gs.personName}>{nameOf(x.fromMemberId)} → {nameOf(x.toMemberId)}</Text>
                </View>
                <Text style={[gs.personAmt, { color: theme.colors.text }]}>{money(cur, x.amount)}</Text>
                {!d.group.closed && (
                  <NexaPressable accessibilityRole="button" accessibilityLabel={`Record ${nameOf(x.fromMemberId)} paying ${nameOf(x.toMemberId)}`} accessibilityState={{disabled:g.busy}} style={gs.smallBtn} disabled={g.busy} onPress={() => g.recordSettlement(x.fromMemberId, x.toMemberId, x.amount, nameOf(x.fromMemberId), nameOf(x.toMemberId))}>
                    <Text style={gs.smallBtnText}>Paid</Text>
                  </NexaPressable>
                )}
              </View>
            ))}
            <Text style={[s.muted, { marginTop: 8 }]}>The fewest payments that clear everyone. NEXA only records them; you pay each other directly.</Text>
          </View>
        </>
      )}
    </>
  );
}

function PotSummary({ d }: { d: GroupDetail }) {
  const cur = d.group.currency;
  const p = d.pot!;
  return (
    <View style={s.dashCard}>
      <Text style={gs.bigLabel}>In the pot</Text>
      <Text style={gs.bigNumber}>{money(cur, p.balance)}</Text>
      <View style={gs.statRow}>
        <View style={gs.stat}><Text style={gs.statLabel}>Contributed</Text><Text style={gs.statValue}>{money(cur, p.contributed)}</Text></View>
        <View style={gs.stat}><Text style={gs.statLabel}>Spent</Text><Text style={gs.statValue}>{money(cur, p.spent)}</Text></View>
        <View style={gs.stat}><Text style={gs.statLabel}>Paid out</Text><Text style={gs.statValue}>{money(cur, p.paidOut)}</Text></View>
      </View>
    </View>
  );
}

function AjoSummary({ g, d }: { g: Groups; d: GroupDetail }) {
  const cur = d.group.currency;
  const a = d.ajo!;
  const canRecord = d.group.isOwner && !d.group.closed && !a.complete;
  const recipient = d.members.find((m) => m.id === a.recipientMemberId);
  const pct = a.expected > 0 ? Math.min(1, a.collected / a.expected) : 0;
  return (
    <View style={s.dashCard}>
      {a.complete ? (
        <Text style={gs.bigNumber}>All rounds complete</Text>
      ) : (
        <>
          <Text style={gs.bigLabel}>Round {a.round} of {a.totalRounds}</Text>
          <Text style={gs.bigNumber}>{recipient ? `${label(recipient)} collect${recipient.isYou ? "" : "s"}` : "—"}</Text>
          {a.dueDate && <Text style={s.muted}>Due {fmtDate(a.dueDate)} · {money(cur, a.dueEach)} each</Text>}
          <View style={gs.track}><View style={[gs.fill, { width: `${Math.round(pct * 100)}%` }]} /></View>
          <Text style={[s.muted, { marginTop: 6 }]}>{money(cur, a.collected)} of {money(cur, a.expected)} collected</Text>
        </>
      )}

      {!a.complete && a.members.map((r) => {
        const m = d.members.find((x) => x.id === r.memberId);
        if (!m) return null;
        const paid = r.owing <= EPS;
        return (
          <View key={r.memberId} style={gs.personRow}>
            <View style={ds({ flex: 1 })}>
              <Text style={gs.personName}>{label(m)}</Text>
              <Text style={[gs.personSub, paid ? gs.owed : gs.owe]}>{paid ? "Paid ✓" : `Owes ${money(cur, r.owing)}`}</Text>
            </View>
            {canRecord && !paid && (
              <NexaPressable accessibilityRole="button" accessibilityLabel={`Record contribution for ${label(m)}`} style={gs.smallBtn} onPress={() => g.openComposer("contribution", { memberId: r.memberId, amount: r.owing })}>
                <Text style={gs.smallBtnText}>Record</Text>
              </NexaPressable>
            )}
          </View>
        );
      })}

      {canRecord && recipient && a.collected > 0 && (
        <NexaPressable accessibilityRole="button" accessibilityLabel={`Record payout to ${recipient.name || recipient.id}`} style={[s.btn, { marginTop: 12 }]} onPress={() => g.openComposer("payout", { memberId: recipient.id, amount: a.collected })}>
          <Text style={s.btnText}>Pay out {money(cur, a.collected)} to {label(recipient)}</Text>
        </NexaPressable>
      )}
    </View>
  );
}

/* ---------------- composer ---------------- */

function Composer({ g, d }: { g: Groups; d: GroupDetail }) {
  const kind = d.group.kind;
  const cur = d.group.currency;
  const types: { id: EntryType; text: string }[] =
    kind === "split" ? [{ id: "expense", text: "Expense" }, { id: "settlement", text: "Payment" }]
    : kind === "pot" ? [{ id: "contribution", text: "Contribution" }, { id: "expense", text: "Spending" }, { id: "payout", text: "Payout" }]
    : [{ id: "contribution", text: "Contribution" }, { id: "payout", text: "Payout" }];
  const pickList = kind === "ajo" && g.eType === "payout" && d.ajo?.recipientMemberId
    ? d.members.filter((m) => m.id === d.ajo!.recipientMemberId)
    : d.members;
  const left = g.unassigned();

  const single = (val: string, set: (v: string) => void) => (
    <View style={gs.chipWrap}>
      {pickList.map((m) => <Chip key={m.id} text={label(m)} on={val === m.id} onPress={() => set(m.id)} />)}
    </View>
  );

  return (
    <View style={gs.composer}>
      {types.length > 1 && (
        <View style={gs.chipWrap}>
          {types.map((t) => <Chip key={t.id} text={t.text} on={g.eType === t.id} onPress={() => g.switchType(t.id)} />)}
        </View>
      )}

      <TextInput accessibilityLabel={`Entry amount in ${cur}`} style={s.authInput} placeholder={`Amount (${cur})`} placeholderTextColor={tc("#666")} keyboardType="decimal-pad" value={g.eAmount} onChangeText={g.setEAmount} />

      {g.eType === "expense" && kind === "split" && (
        <>
          <Text style={gs.label}>Paid by</Text>
          {single(g.ePaidBy, g.setEPaidBy)}
          <Text style={gs.label}>Split between</Text>
          <View style={gs.chipWrap}>
            {d.members.map((m) => <Chip key={m.id} text={label(m)} on={g.eSplitAmong.includes(m.id)} onPress={() => g.toggleSplitMember(m.id)} />)}
          </View>
          <View style={gs.chipWrap}>
            <Chip text="Split unevenly" on={g.eUneven} onPress={() => g.setEUneven(!g.eUneven)} />
          </View>
          {g.eUneven && (
            <>
              {d.members.filter((m) => g.eSplitAmong.includes(m.id)).map((m) => (
                <View key={m.id} style={gs.composerRow}>
                  <Text style={[gs.personName, { flex: 1 }]}>{label(m)}</Text>
                  <TextInput accessibilityLabel={`Share amount for ${label(m)}`} style={gs.shareInput} placeholder="0" placeholderTextColor={tc("#666")} keyboardType="decimal-pad"
                    value={g.eShares[m.id] || ""} onChangeText={(v) => g.setEShares({ ...g.eShares, [m.id]: v })} />
                </View>
              ))}
              <Text style={[s.muted, Math.abs(left) > EPS && gs.owe]}>
                {Math.abs(left) <= EPS ? "Shares add up ✓" : left > 0 ? `${money(cur, left)} still to assign` : `${money(cur, -left)} over`}
              </Text>
            </>
          )}
        </>
      )}

      {g.eType === "settlement" && (
        <>
          <Text style={gs.label}>Who paid</Text>
          {single(g.eMember, g.setEMember)}
          <Text style={gs.label}>Who received it</Text>
          {single(g.eTo, g.setETo)}
        </>
      )}

      {(g.eType === "contribution" || g.eType === "payout") && (
        <>
          <Text style={gs.label}>{g.eType === "payout" ? "Paid out to" : "Contributed by"}</Text>
          {single(g.eMember, g.setEMember)}
        </>
      )}

      <TextInput accessibilityLabel={g.eType === "expense" ? "Expense description" : "Entry note"} style={s.authInput} placeholder={g.eType === "expense" ? "What was it for?" : "Note (optional)"} placeholderTextColor={tc("#666")} value={g.eNote} onChangeText={g.setENote} maxLength={120} />
      <TextInput accessibilityLabel="Entry date" style={s.authInput} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={tc("#666")} value={g.eDate} onChangeText={g.setEDate} autoCapitalize="none" maxLength={10} />

      <NexaPressable accessibilityRole="button" accessibilityLabel={g.busy ? "Saving group entry" : "Save group entry"} accessibilityState={{disabled:g.busy}} style={[s.btn, g.busy && { opacity: 0.5 }]} disabled={g.busy} onPress={g.submitEntry}>
        {g.busy ? <ActivityIndicator color={tc("#050403")} /> : <Text style={s.btnText}>Save</Text>}
      </NexaPressable>
      <NexaPressable accessibilityRole="button" accessibilityLabel="Cancel group entry" style={s.saveBtn} onPress={g.closeComposer}><Text style={s.saveText}>Cancel</Text></NexaPressable>
    </View>
  );
}

/* ---------------- members ---------------- */

function MemberRow({ g, d, m, first }: { g: Groups; d: GroupDetail; m: GroupMember; first: boolean }) {
  const grp = d.group;
  const cur = grp.currency;
  const ajoLocked = grp.kind === "ajo" && grp.started;
  const canManage = grp.isOwner && !grp.closed;
  const realMembers = d.members.filter((x) => x.hasAccount && x.id !== m.id);
  const right =
    grp.kind === "split" ? { text: m.net > EPS ? `+${money(cur, m.net)}` : m.net < -EPS ? `−${money(cur, -m.net)}` : "settled", style: m.net > EPS ? gs.owed : m.net < -EPS ? gs.owe : gs.neutral }
    : grp.kind === "pot" ? { text: money(cur, m.contributed), style: gs.neutral }
    : { text: m.received > 0 ? `got ${money(cur, m.received)}` : "", style: gs.neutral };

  return (
    <View style={[gs.personRow, first && { borderTopWidth: 0, paddingTop: 0 }]}>
      <View style={ds({ flex: 1 })}>
        <View style={ds({ flexDirection: "row", alignItems: "center" })}>
          {grp.kind === "ajo" && m.payoutPosition != null && <View style={gs.posBubble}><Text style={gs.posText}>{m.payoutPosition}</Text></View>}
          <View style={ds({ flex: 1 })}>
            <Text style={gs.personName}>{m.name}{m.isYou ? " (you)" : ""}</Text>
            <View style={gs.badgeRow}>
              {m.role === "owner" && <Badge text="Owner" tone="mint" />}
              {!m.hasAccount && <Badge text="Not on NEXA" tone="amber" />}
            </View>
          </View>
          {grp.kind === "ajo" && canManage && !grp.started && (
            <>
              <NexaPressable accessibilityRole="button" accessibilityLabel={`Move ${m.name} up`} style={gs.arrowBtn} onPress={() => g.moveMember(m.id, -1)}><Text style={gs.arrowText}>▲</Text></NexaPressable>
              <NexaPressable accessibilityRole="button" accessibilityLabel={`Move ${m.name} down`} style={gs.arrowBtn} onPress={() => g.moveMember(m.id, 1)}><Text style={gs.arrowText}>▼</Text></NexaPressable>
            </>
          )}
        </View>

        {canManage && m.role !== "owner" && (
          <View style={[gs.chipWrap, { marginTop: 8 }]}>
            {!m.hasAccount && (
              <NexaPressable accessibilityRole="button" accessibilityLabel={`Invite ${m.name} to the group`} style={[gs.smallBtn, { marginLeft: 0, marginRight: 8 }]} onPress={() => g.inviteMember(m.id)}>
                <Text style={gs.smallBtnText}>{m.claimCode ? "Show invite" : "Invite"}</Text>
              </NexaPressable>
            )}
            {!m.hasAccount && !ajoLocked && realMembers.length > 0 && (
              <NexaPressable accessibilityRole="button" accessibilityLabel={`${g.mergeFor === m.id ? "Close" : "Open"} merge options for ${m.name}`} style={[gs.smallBtn, { marginLeft: 0, marginRight: 8 }]} onPress={() => g.setMergeFor(g.mergeFor === m.id ? null : m.id)}>
                <Text style={gs.smallBtnText}>Merge…</Text>
              </NexaPressable>
            )}
            {!ajoLocked && (
              <NexaPressable accessibilityRole="button" accessibilityLabel={`Remove ${m.name} from group`} style={[gs.smallBtn, gs.smallBtnDanger, { marginLeft: 0 }]} onPress={() => g.removeMember(m.id, m.name)}>
                <Text style={[gs.smallBtnText, gs.smallBtnDangerText]}>Remove</Text>
              </NexaPressable>
            )}
          </View>
        )}

        {canManage && !m.hasAccount && m.claimCode && (
          <View style={gs.inviteBox}>
            <Text style={s.muted}>Give {m.name} this code. When they enter it they become {m.name}, with everything recorded so far.</Text>
            <Text style={[gs.code, { marginTop: 6 }]}>{m.claimCode}</Text>
            <View style={ds({ flexDirection: "row", marginTop: 8 })}>
              <NexaPressable accessibilityRole="button" accessibilityLabel={`Share invite code for ${m.name}`} style={[gs.smallBtn, { marginLeft: 0 }]} onPress={() => g.shareCode(m.claimCode!, m.name)}><Text style={gs.smallBtnText}>Share</Text></NexaPressable>
              <NexaPressable accessibilityRole="button" accessibilityLabel={`Generate a new invite code for ${m.name}`} style={gs.smallBtn} onPress={() => g.inviteMember(m.id, true)}><Text style={gs.smallBtnText}>New code</Text></NexaPressable>
            </View>
          </View>
        )}

        {g.mergeFor === m.id && (
          <View style={gs.inviteBox}>
            <Text style={s.muted}>Already joined separately? Merge {m.name} into:</Text>
            <View style={[gs.chipWrap, { marginTop: 8 }]}>
              {realMembers.map((x) => <Chip key={x.id} text={label(x)} on={false} onPress={() => g.mergeMember(m.id, x.id, m.name, x.name)} />)}
            </View>
          </View>
        )}
      </View>
      {right.text ? <Text style={[gs.personAmt, right.style]}>{right.text}</Text> : null}
    </View>
  );
}

/* ---------------- the screen ---------------- */

export function GroupScreen({ groups: g }: { groups: Groups }) {
  const [refreshing, setRefreshing] = useState(false);
  const d = g.detail;

  const header = (
    <View style={s.detailTop}>
      <NexaPressable accessibilityRole="button" accessibilityLabel="Back to Groups" onPress={g.backToList}><Text style={s.back}>‹ Groups</Text></NexaPressable>
    </View>
  );

  if (!d) {
    return (
      <ScrollView contentContainerStyle={s.scrollWrap}>
        {header}
        {g.detailLoading && <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading group details" color={tc("#D4AF37")} style={ds({ marginTop: 30 })} />}
        {g.detailError ? <Text style={gs.errorText}>{g.detailError}</Text> : null}
      </ScrollView>
    );
  }

  const grp = d.group;
  const canRecord = !grp.closed && (grp.kind === "split" || grp.isOwner);
  const ownerName = d.members.find((m) => m.role === "owner")?.name || "the owner";

  return (
    <ScrollView
      contentContainerStyle={s.scrollWrap}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={tc("#D4AF37")} onRefresh={async () => { setRefreshing(true); await g.refreshDetail(); setRefreshing(false); }} />}
    >
      {header}
      <Text style={s.detailTitle}>{grp.name}</Text>
      <View style={gs.badgeRow}>
        <Badge text={GROUP_KIND_LABELS[grp.kind]} />
        {grp.isOwner && <Badge text="You own this" tone="mint" />}
        {grp.closed && <Badge text="Closed" tone="amber" />}
      </View>
      {g.detailError ? <Text style={gs.errorText}>{g.detailError}</Text> : null}

      <View style={ds({ marginTop: 14 })}>
        {grp.kind === "split" && <SplitSummary g={g} d={d} />}
        {grp.kind === "pot" && <PotSummary d={d} />}
        {grp.kind === "ajo" && <AjoSummary g={g} d={d} />}
      </View>

      {canRecord && !g.composerOpen && (
        <NexaPressable accessibilityRole="button" accessibilityLabel="Add group entry" style={s.btn} onPress={() => g.openComposer()}>
          <Text style={s.btnText}>+ Add {grp.kind === "split" ? "an expense" : "an entry"}</Text>
        </NexaPressable>
      )}
      {!canRecord && !grp.closed && <Text style={[s.muted, { marginTop: 12 }]}>Only {ownerName} records entries here, since they hold the money. Everything they record shows below.</Text>}
      {grp.closed && <Text style={[s.muted, { marginTop: 12 }]}>This group is closed. {grp.isOwner ? "Reopen it below to add more." : ""}</Text>}
      {g.composerOpen && <Composer g={g} d={d} />}

      <Text style={gs.sectionTitle}>People · {d.members.length}</Text>
      <View style={s.dashCard}>
        {d.members.map((m, i) => <MemberRow key={m.id} g={g} d={d} m={m} first={i === 0} />)}
        {grp.isOwner && !grp.closed && !(grp.kind === "ajo" && grp.started) && (
          <View style={[s.targetRow, { marginTop: 10 }]}>
            <TextInput accessibilityLabel="New group member name" style={s.targetInput} placeholder="Add someone who isn't on NEXA" placeholderTextColor={tc("#666")} value={g.newMemberName} onChangeText={g.setNewMemberName} onSubmitEditing={g.addMember} maxLength={40} />
            <NexaPressable accessibilityRole="button" accessibilityLabel="Add group member" accessibilityState={{disabled:g.busy}} style={s.targetBtn} onPress={g.addMember} disabled={g.busy}><Text style={s.targetBtnText}>Add</Text></NexaPressable>
          </View>
        )}
        {grp.kind === "ajo" && grp.started && <Text style={[s.muted, { marginTop: 8 }]}>People and payout order are locked once a Sky Savings cycle has started.</Text>}
      </View>

      <Text style={gs.sectionTitle}>Activity</Text>
      <View style={s.dashCard}>
        {d.entries.length === 0 && <Text style={s.muted}>Nothing recorded yet.</Text>}
        {d.entries.map((e, i) => (
          <View key={e.id} style={[gs.entry, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
            <View style={ds({ flexDirection: "row", alignItems: "center" })}>
              <View style={ds({ flex: 1 })}>
                <Text style={[gs.entryTitle, e.voided && gs.voided]}>{entryTitle(e)}</Text>
                <Text style={[gs.entrySub, e.voided && gs.voided]}>{entrySub(e)}</Text>
              </View>
              <Text style={[gs.entryAmt, e.voided && gs.voided]}>{money(e.currency, e.amount)}</Text>
            </View>
            {e.voided ? <Text style={[gs.personSub, gs.owe]}>Voided</Text> : e.canVoid ? (
              <NexaPressable accessibilityRole="button" accessibilityLabel="Void this group entry" onPress={() => g.voidEntry(e.id)} style={ds({ alignSelf: "flex-start", marginTop: 4 })}>
                <Text style={[gs.personSub, { color: tc("#D8CDB4") }]}>Void</Text>
              </NexaPressable>
            ) : null}
          </View>
        ))}
      </View>

      <Text style={gs.sectionTitle}>Group</Text>
      <View style={s.dashCard}>
        {grp.isOwner && grp.inviteCode && (
          <>
            <Text style={gs.bigLabel}>Invite code · anyone with it can join</Text>
            <Text style={gs.code}>{grp.inviteCode}</Text>
            <NexaPressable accessibilityRole="button" accessibilityLabel="Share group invite code" style={[gs.smallBtn, { marginLeft: 0, marginTop: 8, alignSelf: "flex-start" }]} onPress={() => g.shareCode(grp.inviteCode!)}><Text style={gs.smallBtnText}>Share code</Text></NexaPressable>
            {grp.kind === "ajo" && grp.started && <Text style={[s.muted, { marginTop: 8 }]}>New people can't join a running Sky Savings cycle, but you can still invite a placeholder with their own code.</Text>}
          </>
        )}
        {grp.isOwner && (
          <>
            <Text style={gs.label}>Name</Text>
            <View style={s.targetRow}>
              <TextInput accessibilityLabel="Group name" style={s.targetInput} value={g.renameText} onChangeText={g.setRenameText} maxLength={60} />
              <NexaPressable accessibilityRole="button" accessibilityLabel="Save group name" accessibilityState={{disabled:g.busy}} disabled={g.busy} style={s.targetBtn} onPress={g.saveRename}><Text style={s.targetBtnText}>Save</Text></NexaPressable>
            </View>
            <NexaPressable accessibilityRole="button" accessibilityLabel={grp.closed ? "Reopen group" : "Close group"} accessibilityState={{selected:grp.closed,disabled:g.busy}} disabled={g.busy} style={s.saveBtn} onPress={g.toggleClosed}><Text style={s.saveText}>{grp.closed ? "Reopen group" : "Close group"}</Text></NexaPressable>
            {d.entries.length === 0 && (
              <NexaPressable accessibilityRole="button" accessibilityLabel="Delete group" accessibilityState={{disabled:g.busy}} disabled={g.busy} style={[s.saveBtn, { borderColor: tc("#5b2a2a") }]} onPress={g.deleteGroup}><Text style={[s.saveText, gs.danger]}>Delete group</Text></NexaPressable>
            )}
          </>
        )}
        {!grp.isOwner && (
          <NexaPressable accessibilityRole="button" accessibilityLabel="Leave group" accessibilityState={{disabled:g.busy}} disabled={g.busy} style={[s.saveBtn, { marginTop: 0 }]} onPress={g.leaveGroup}><Text style={s.saveText}>Leave group</Text></NexaPressable>
        )}
        <Text style={[s.muted, { marginTop: 12 }]}>NEXA keeps this record but never holds or moves money. Pay each other directly.</Text>
      </View>
    </ScrollView>
  );
}

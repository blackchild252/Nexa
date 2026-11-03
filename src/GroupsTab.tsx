import React from "react";
import { View, Text, TextInput, ScrollView, ActivityIndicator, RefreshControl } from "react-native";

import { s } from "./styles";
import { gs } from "./groupStyles";
import { GROUP_KIND_LABELS, GROUP_KIND_HINTS } from "./groups";
import type { GroupKind, MoneyGroupListItem } from "./groups";
import { money } from "./useGroups";
import type { Groups } from "./useGroups";
import { GroupScreen } from "./GroupScreen";

import { theme, tc, ds } from './theme';
import {NexaPressable} from './motion';
import { fieldA11y, errorA11y, formSubmitA11y } from './formAccessibility';
const EPS = 0.004;
const KINDS: GroupKind[] = ["split", "pot", "ajo"];
const CYCLES = [{ days: 7, text: "Weekly" }, { days: 14, text: "Every 2 weeks" }, { days: 30, text: "Monthly" }];

// One line under a group's name: the thing you most want to know at a glance.
function summaryLine(g: MoneyGroupListItem): { text: string; style: any } {
  const sm: any = g.summary;
  if (g.kind === "split") {
    if (sm.myNet > EPS) return { text: `You're owed ${money(g.currency, sm.myNet)}`, style: gs.owed };
    if (sm.myNet < -EPS) return { text: `You owe ${money(g.currency, -sm.myNet)}`, style: gs.owe };
    return { text: "All settled", style: gs.neutral };
  }
  if (g.kind === "pot") return { text: `In the pot: ${money(g.currency, sm.balance)}`, style: gs.neutral };
  if (sm.complete) return { text: "All rounds complete", style: gs.neutral };
  const round = `Round ${sm.round} of ${sm.totalRounds}`;
  if (sm.iAmRecipient) return { text: `${round} · you collect this round`, style: gs.owed };
  if (sm.myOwing > EPS) return { text: `${round} · you owe ${money(g.currency, sm.myOwing)}`, style: gs.owe };
  return { text: `${round} · you're paid up`, style: gs.neutral };
}

function GroupList({ g }: { g: Groups }) {
  return (
    <ScrollView
      contentContainerStyle={s.scrollWrap}
      refreshControl={<RefreshControl refreshing={g.groupsLoading && g.groups.length > 0} tintColor={theme.colors.goldBright} onRefresh={g.loadGroups} />}
    >
      <Text style={s.heading}>Sky Group Savings</Text>
      <Text style={[s.muted,{marginTop:4,marginBottom:12}]}>Manage shared Split, Pot, Sky Savings and Sky Group Savings inside Sky Money.</Text>
      <View style={ds({flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:14})} accessibilityRole="radiogroup" accessibilityLabel="Sky Group area choices">
        {([["split","Split"],["pot","Pot"],["ajo","Sky Savings"],["groups","Sky Group Savings"]] as const).map(([kind,label]) => (
          <NexaPressable
            key={kind}
            accessibilityRole="radio" accessibilityLabel={`Open ${label} group area`} accessibilityState={{selected:kind === "groups"}}
            style={[gs.chip, {paddingHorizontal:14}, kind === "groups" && gs.chipOn]}
            onPress={() => {
              if (kind === "groups") return;
              g.startNew();
              g.setGKind(kind);
            }}
          >
            <Text style={[gs.chipText, kind === "groups" && gs.chipTextOn]}>{label}</Text>
          </NexaPressable>
        ))}
      </View>
      <View style={gs.topRow}>
        <NexaPressable accessibilityRole="button" accessibilityLabel="Create new group" style={[gs.topBtn, gs.topBtnPrimary]} onPress={g.startNew}><Text style={[gs.topBtnText, gs.topBtnTextPrimary]}>+ New group</Text></NexaPressable>
        <NexaPressable accessibilityRole="button" accessibilityLabel="Join group with code" style={gs.topBtn} onPress={g.startJoin}><Text style={gs.topBtnText}>Join with code</Text></NexaPressable>
      </View>

      {g.groupsLoading && g.groups.length === 0 && <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading groups" color={theme.colors.goldBright} style={ds({ marginTop: 20 })} />}
      {g.groupsError ? <Text style={[s.muted, gs.danger]}>{g.groupsError}</Text> : null}
      {!g.groupsLoading && !g.groupsError && g.groups.length === 0 && (
        <Text style={s.muted}>
          No groups yet. Split costs with friends, run a shared pot, or keep a Sky Savings cycle record, all in one place. Start one, or join with a code someone sent you.
        </Text>
      )}

      {g.groups.map((x) => {
        const line = summaryLine(x);
        return (
          <NexaPressable accessibilityRole="button" accessibilityLabel={`Open group ${x.name}`} key={x.id} style={gs.groupCard} onPress={() => g.openGroup(x.id)}>
            <Text style={gs.groupName}>{x.name}</Text>
            <Text style={gs.groupMeta}>{GROUP_KIND_LABELS[x.kind]} · {x.memberCount} {x.memberCount === 1 ? "person" : "people"}{x.closed ? " · Closed" : ""}</Text>
            <Text style={[gs.groupLine, line.style]}>{line.text}</Text>
          </NexaPressable>
        );
      })}
    </ScrollView>
  );
}

function NewGroup({ g }: { g: Groups }) {
  return (
    <ScrollView contentContainerStyle={s.scrollWrap} keyboardShouldPersistTaps="handled">
      <View style={s.detailTop}><NexaPressable accessibilityRole="button" accessibilityLabel="Cancel creating group" onPress={() => g.setView("list")}><Text style={s.back}>‹ Cancel</Text></NexaPressable></View>
      <Text style={s.detailTitle}>New group</Text>

      <Text style={gs.label}>What is it for?</Text>
      {KINDS.map((k) => (
        <NexaPressable accessibilityRole="radio" accessibilityState={{selected:g.gKind===k}} accessibilityLabel={`Choose group type ${k}`} key={k} style={[gs.kindCard, g.gKind === k && gs.kindCardOn]} onPress={() => g.setGKind(k)}>
          <Text style={gs.kindTitle}>{GROUP_KIND_LABELS[k]}</Text>
          <Text style={s.muted}>{GROUP_KIND_HINTS[k]}</Text>
        </NexaPressable>
      ))}

      <Text style={gs.label}>Name</Text>
      <TextInput {...fieldA11y("Group name", g.formError)} style={s.authInput} placeholder={g.gKind === "ajo" ? "e.g. Market women savings cycle" : g.gKind === "pot" ? "e.g. Wedding fund" : "e.g. Flat 4 bills"} placeholderTextColor={tc("#666")} value={g.gName} onChangeText={g.setGName} maxLength={60} />

      {g.gKind === "ajo" && (
        <>
          <Text style={gs.label}>Each person pays, per round</Text>
          <View style={ds({ flexDirection: "row" })}>
            <TextInput {...fieldA11y("Contribution amount", g.formError)} style={[s.authInput, { flex: 1 }]} placeholder="Amount" placeholderTextColor={tc("#666")} keyboardType="decimal-pad" value={g.gContribution} onChangeText={g.setGContribution} />
            <TextInput {...fieldA11y("Currency", g.formError)} style={[s.authInput, { width: 80, marginLeft: 8, textAlign: "center" }]} value={g.gCurrency} onChangeText={(v) => g.setGCurrency(v.toUpperCase())} maxLength={3} autoCapitalize="characters" />
          </View>
          <Text style={gs.label}>How often</Text>
          <View style={gs.chipWrap}>
            {CYCLES.map((c) => (
              <NexaPressable accessibilityRole="radio" accessibilityState={{selected:g.gCycleDays===c.days}} accessibilityLabel={`Set group cycle to ${c.days} days`} key={c.days} style={[gs.chip, g.gCycleDays === c.days && gs.chipOn]} onPress={() => g.setGCycleDays(c.days)}>
                <Text style={[gs.chipText, g.gCycleDays === c.days && gs.chipTextOn]}>{c.text}</Text>
              </NexaPressable>
            ))}
          </View>
          <Text style={gs.label}>First round due</Text>
          <TextInput {...fieldA11y("First round due date", g.formError)} style={s.authInput} placeholder="YYYY-MM-DD" placeholderTextColor={tc("#666")} value={g.gStart} onChangeText={g.setGStart} autoCapitalize="none" maxLength={10} />
        </>
      )}

      {g.gKind !== "ajo" && (
        <>
          <Text style={gs.label}>Currency</Text>
          <TextInput {...fieldA11y("Currency", g.formError)} style={[s.authInput, { width: 100 }]} value={g.gCurrency} onChangeText={(v) => g.setGCurrency(v.toUpperCase())} maxLength={3} autoCapitalize="characters" />
        </>
      )}

      <Text style={gs.label}>People not on NEXA yet (optional)</Text>
      <TextInput {...fieldA11y("Additional member names", g.formError)} style={s.authInput} placeholder="Names, separated by commas" placeholderTextColor={tc("#666")} value={g.gNames} onChangeText={g.setGNames} />
      <Text style={s.muted}>
        You're added automatically. {g.gKind === "ajo" ? "For Sky Savings, list everyone now: the members and the order they collect are locked once the first payment is recorded. " : ""}You can give each person their own code later so they take over their spot when they join.
      </Text>

      {g.formError ? <Text {...errorA11y("Group form", g.formError)} style={gs.errorText}>{g.formError}</Text> : null}
      <NexaPressable {...formSubmitA11y("Create group",g.busy)} accessibilityState={{disabled:g.busy}} style={[s.btn, g.busy && { opacity: 0.5 }]} disabled={g.busy} onPress={g.submitNewGroup}>
        {g.busy ? <ActivityIndicator color={theme.colors.background} /> : <Text style={s.btnText}>Create group</Text>}
      </NexaPressable>
    </ScrollView>
  );
}

function JoinGroup({ g }: { g: Groups }) {
  return (
    <ScrollView contentContainerStyle={s.scrollWrap} keyboardShouldPersistTaps="handled">
      <View style={s.detailTop}><NexaPressable accessibilityRole="button" accessibilityLabel="Cancel joining group" onPress={() => g.setView("list")}><Text style={s.back}>‹ Cancel</Text></NexaPressable></View>
      <Text style={s.detailTitle}>Join a group</Text>
      <Text style={[s.muted, { marginTop: 6 }]}>Enter the 8-character code you were sent. If the organiser made a code just for you, this takes you straight to your own spot.</Text>
      <TextInput
        style={[s.authInput, { marginTop: 16, fontSize: 24, letterSpacing: 4, textAlign: "center", fontWeight: "800" }]}
        accessibilityLabel="Group invite code" accessibilityHint="Enter the 8-character invite code" placeholder="ABCD2345" placeholderTextColor={tc("#444")} value={g.joinCode}
        onChangeText={(v) => g.setJoinCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        autoCapitalize="characters" autoCorrect={false} maxLength={8}
      />
      {g.formError ? <Text {...errorA11y("Join group form", g.formError)} style={gs.errorText}>{g.formError}</Text> : null}
      <NexaPressable {...formSubmitA11y("Join group",g.busy)} accessibilityState={{disabled:g.busy}} style={[s.btn, g.busy && { opacity: 0.5 }]} disabled={g.busy} onPress={g.submitJoin}>
        {g.busy ? <ActivityIndicator color={theme.colors.background} /> : <Text style={s.btnText}>Join</Text>}
      </NexaPressable>
    </ScrollView>
  );
}

// Drop this wherever a tab's content renders: <GroupsTab groups={groups} /> with groups = useGroups({ userId, active }).
// It manages its own list -> detail navigation, so no router changes are needed.
export function GroupsTab({ groups }: { groups: Groups }) {
  if (groups.view === "new") return <NewGroup g={groups} />;
  if (groups.view === "join") return <JoinGroup g={groups} />;
  if (groups.view === "detail") return <GroupScreen groups={groups} />;
  return <GroupList g={groups} />;
}

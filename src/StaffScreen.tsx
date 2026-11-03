import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, ActivityIndicator, RefreshControl } from "react-native";

import { s } from "./styles";
import { theme, tc, ds } from './theme';
import {NexaPressable} from './motion';
import { gs } from "./groupStyles"; // shared card/badge/button tokens — nothing here is groups-specific
import type { StaffMember, StaffRole } from "./staff";
import { apiStaffCreateAccount } from "./staff";
import type { Staff } from "./useStaff";

// Vendor staff accounts (V3.15, manager tier in V3.16).
//   - Owners AND managers see this from the vendor dashboard (add a "Staff" entry next to
//     Products/Orders/Summary), gated on `staff.canManageStaff` rather than ownership alone:
//       <StaffScreen staff={staff} isVendorOwner={!!vendor} shopName={vendor?.shopName} />
//     `isVendorOwner` here is still just "do I own this shop" — pass the same value as before.
//     The screen itself reads `staff.canManageStaff` (owner or manager) to decide whether to render.
//   - Where a signed-out-of-owning user manages their account (or right on the vendor dashboard, gated
//     by `!isVendorOwner`), drop in <JoinStaffBox staff={staff} /> so they can redeem a code someone sent
//     them, and show `staff.myShop` wherever you'd otherwise show "you don't have a shop".
//
// Reduced dashboard: wherever your existing vendor screen renders Summary/Incomes tabs, the profile-edit
// form, or the product delete button, gate those on `isVendorOwner` (or `staff.myShop === null`, i.e.
// "I own my own shop" — a user can't be staff at their own shop). A manager gets the SAME reduced
// dashboard as plain staff outside of this screen — 'manager' only widens what's possible in here.
// Products/Orders screens need no change: the server already returns 200 for an owner, a manager, and
// active staff on those endpoints.

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function RoleBadge({ role }: { role: StaffRole }) {
  if (role !== "manager") return null;
  return (
    <View style={[gs.badge, gs.badgeMint]}>
      <Text style={[gs.badgeText, gs.badgeMintText]}>Manager</Text>
    </View>
  );
}

function StaffRow({ member, isVendorOwner, onRemove }: { member: StaffMember; isVendorOwner: boolean; onRemove: () => void }) {
  const invited = member.status === "invited";
  // A manager (viewer) can't remove a fellow manager — only the owner can. The server enforces
  // this too; hiding/disabling the button here just avoids a round-trip to find that out.
  const canRemove = isVendorOwner || member.role !== "manager";
  const expiryText = invited && member.expiresAt
    ? (() => {
        const d = daysUntil(member.expiresAt!);
        if (d <= 0) return "Expired";
        if (d === 1) return "Expires today";
        return `Expires in ${d} days`;
      })()
    : null;
  return (
    <View style={gs.personRow}>
      <View style={ds({ flex: 1 })}>
        <Text style={gs.personName}>{member.name || "Invite not yet claimed"}</Text>
        <View style={gs.badgeRow}>
          <View style={[gs.badge, invited ? undefined : gs.badgeMint]}>
            <Text style={[gs.badgeText, invited ? undefined : gs.badgeMintText]}>{invited ? "Invited" : "Active"}</Text>
          </View>
          <RoleBadge role={member.role} />
          {expiryText && (
            <View style={gs.badge}>
              <Text style={gs.badgeText}>{expiryText}</Text>
            </View>
          )}
        </View>
      </View>
      {canRemove && (
        <NexaPressable accessibilityRole="button" accessibilityLabel={`${invited ? "Revoke" : "Remove"} staff member ${member.name || "invite"}`} style={[gs.smallBtn, gs.smallBtnDanger]} onPress={onRemove}>
          <Text style={[gs.smallBtnText, gs.smallBtnDangerText]}>{invited ? "Revoke" : "Remove"}</Text>
        </NexaPressable>
      )}
    </View>
  );
}

// -- Owner or manager: manage staff --
export function StaffScreen({ staff, isVendorOwner, shopName }: { staff: Staff; isVendorOwner: boolean; shopName?: string }) {
  const [refreshing, setRefreshing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [roleInput, setRoleInput] = useState<StaffRole>("staff");
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  if (!staff.canManageStaff) return null;

  return (
    <ScrollView
      contentContainerStyle={s.scrollWrap}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={theme.colors.royalGold} onRefresh={async () => { setRefreshing(true); await staff.loadStaff(); setRefreshing(false); }} />}
    >
      <Text style={s.heading}>Staff</Text>
      <Text style={s.muted}>
        {isVendorOwner ? "Create permanent staff accounts with credentials. " : "Manage staff invited to the shop. "}
        Staff manage products and orders with you, but can't see your business summary, log income, or edit the shop profile.
        {isVendorOwner ? " You can deactivate/remove their shop access at any time." : ""}
      </Text>

      {!showForm ? (
        <NexaPressable accessibilityRole="button" accessibilityLabel={isVendorOwner ? "Create vendor staff account" : "Invite someone to the shop"} style={[gs.topBtn, gs.topBtnPrimary, { marginTop: 14 }]} onPress={() => setShowForm(true)}>
          <Text style={[gs.topBtnText, gs.topBtnTextPrimary]}>{isVendorOwner ? "+ Create staff account" : "+ Invite someone"}</Text>
        </NexaPressable>
      ) : (
        <View style={gs.composer}>
          <Text style={gs.label}>Full name</Text>
          <View style={s.targetRow}>
            <TextInput style={s.targetInput} value={nameInput} onChangeText={setNameInput} accessibilityLabel="Vendor staff full name" placeholder="e.g. Amaka Okafor" placeholderTextColor={tc("#666")} maxLength={80} autoCapitalize="words" />
          </View>
          {isVendorOwner && (
            <>
              <Text style={[gs.label, { marginTop: 10 }]}>Email</Text>
              <TextInput style={s.targetInput} value={emailInput} onChangeText={setEmailInput} accessibilityLabel="Vendor staff email" placeholder="staff@example.com" placeholderTextColor={tc("#666")} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
              <Text style={[gs.label, { marginTop: 10 }]}>Password</Text>
              <TextInput style={s.targetInput} value={passwordInput} onChangeText={setPasswordInput} accessibilityLabel="Vendor staff password" placeholder="8–128 characters" placeholderTextColor={tc("#666")} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="new-password" />
              <TextInput style={[s.targetInput, { marginTop: 8 }]} value={confirmPasswordInput} onChangeText={setConfirmPasswordInput} accessibilityLabel="Confirm vendor staff password" placeholder="Confirm password" placeholderTextColor={tc("#666")} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="new-password" />
              <NexaPressable accessibilityRole="button" accessibilityLabel={showPassword ? "Hide staff password" : "Show staff password"} onPress={() => setShowPassword(v => !v)} style={[gs.smallBtn, { marginTop: 8 }]}>
                <Text style={gs.smallBtnText}>{showPassword ? "Hide password" : "Show password"}</Text>
              </NexaPressable>
            </>
          )}
          {isVendorOwner && (
            <>
              <Text style={[gs.label, { marginTop: 10 }]}>Role</Text>
              <View style={ds({ flexDirection: "row" })}>
                {(["staff", "manager"] as StaffRole[]).map((r) => (
                  <NexaPressable
                    key={r}
                    accessibilityRole="radio" accessibilityState={{selected:roleInput===r}} accessibilityLabel={`Set invite role to ${r}`}
                    style={[gs.smallBtn, { marginLeft: r === "staff" ? 0 : 8 }, roleInput === r ? gs.topBtnPrimary : undefined]}
                    onPress={() => setRoleInput(r)}
                  >
                    <Text style={[gs.smallBtnText, roleInput === r ? gs.topBtnTextPrimary : undefined]}>
                      {r === "staff" ? "Staff" : "Manager"}
                    </Text>
                  </NexaPressable>
                ))}
              </View>
            </>
          )}
          <View style={ds({ flexDirection: "row", marginTop: 10 })}>
            <NexaPressable
              accessibilityRole="button" accessibilityLabel={isVendorOwner ? "Create vendor staff account" : "Send staff invitation"} accessibilityState={{disabled:creatingAccount || staff.inviting}}
              style={[gs.topBtn, gs.topBtnPrimary, { flex: 0, paddingHorizontal: 18 }]}
              disabled={creatingAccount || staff.inviting}
              onPress={async () => {
                if (!nameInput.trim()) return Alert.alert("Staff account", "Enter the staff member's name.");
                if (isVendorOwner) {
                  if (!/^\S+@\S+\.\S+$/.test(emailInput.trim())) return Alert.alert("Staff account", "Enter a valid email.");
                  if (passwordInput.length < 8 || passwordInput.length > 128) return Alert.alert("Staff account", "Password must be 8–128 characters.");
                  if (passwordInput !== confirmPasswordInput) return Alert.alert("Staff account", "Passwords do not match.");
                  setCreatingAccount(true);
                  try { await apiStaffCreateAccount(nameInput.trim(), emailInput.trim(), passwordInput, roleInput); await staff.loadStaff(); setNameInput(""); setEmailInput(""); setPasswordInput(""); setConfirmPasswordInput(""); setRoleInput("staff"); setShowForm(false); setShowPassword(false); Alert.alert("Staff account created", "The vendor staff account can now sign in with the credentials you created."); }
                  catch (e:any) { Alert.alert("Could not create staff account", e?.message || "Please try again."); }
                  finally { setCreatingAccount(false); }
                } else {
                  await staff.invite(nameInput.trim() || undefined, undefined);
                  setNameInput(""); setRoleInput("staff"); setShowForm(false);
                }
              }}
            >
              {creatingAccount || staff.inviting ? <ActivityIndicator color={theme.colors.deepBlack} /> : <Text style={[gs.topBtnText, gs.topBtnTextPrimary]}>{isVendorOwner ? "Create account" : "Create invite"}</Text>}
            </NexaPressable>
            <NexaPressable style={[gs.smallBtn, { marginLeft: 10 }]} accessibilityRole="button" accessibilityLabel="Cancel staff invitation" onPress={() => setShowForm(false)}><Text style={gs.smallBtnText}>Cancel</Text></NexaPressable>
          </View>
        </View>
      )}

      {staff.lastInvite?.inviteCode && (
        <View style={gs.inviteBox}>
          <Text style={s.muted}>Give {staff.lastInvite.name || "them"} this code. It works once, on their own NEXA account.</Text>
          <Text style={[gs.code, { marginTop: 6 }]}>{staff.lastInvite.inviteCode}</Text>
          {staff.lastInvite.expiresAt && (
            <Text style={[s.muted, { marginTop: 4 }]}>
              Valid for {Math.max(1, daysUntil(staff.lastInvite.expiresAt))} days — invite again if it lapses.
            </Text>
          )}
          <NexaPressable style={[gs.smallBtn, { marginLeft: 0, marginTop: 8 }]} accessibilityRole="button" accessibilityLabel="Share staff invite code" onPress={() => staff.shareCode(staff.lastInvite!.inviteCode!, shopName)}>
            <Text style={gs.smallBtnText}>Share</Text>
          </NexaPressable>
        </View>
      )}

      <Text style={gs.sectionTitle}>Team</Text>
      {staff.staffLoading && staff.staff.length === 0 && <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Loading staff records" color={theme.colors.royalGold} style={ds({ marginTop: 10 })} />}
      {staff.staffError ? <Text style={[s.muted, gs.danger]}>{staff.staffError}</Text> : null}
      {!staff.staffLoading && !staff.staffError && staff.staff.length === 0 && (
        <Text style={s.muted}>No one yet — invite someone above.</Text>
      )}
      <View style={s.dashCard}>
        {staff.staff.map((m: StaffMember) => (
          <StaffRow key={m.id} member={m} isVendorOwner={isVendorOwner} onRemove={() => staff.remove(m)} />
        ))}
      </View>
    </ScrollView>
  );
}

// -- Anyone: redeem an invite code, and see which shop (if any) I'm staff at --
export function JoinStaffBox({ staff }: { staff: Staff }) {
  const [code, setCode] = useState("");

  if (staff.myShop) {
    return (
      <View style={s.dashCard}>
        <Text style={gs.groupMeta}>You're on staff at</Text>
        <Text style={gs.groupName}>{staff.myShop.vendor.shopName}</Text>
      </View>
    );
  }

  return (
    <View style={gs.composer}>
      <Text style={gs.label}>Join a shop's team</Text>
      <Text style={s.muted}>Got an invite code from a shop owner? Enter it here.</Text>
      <View style={[s.targetRow, { marginTop: 8 }]}>
        <TextInput
          style={s.targetInput} value={code} onChangeText={(t: string) => setCode(t.toUpperCase())} accessibilityLabel="Shop staff invite code"
          placeholder="8-character code" placeholderTextColor={theme.colors.muted} autoCapitalize="characters" maxLength={8}
        />
        <NexaPressable
          accessibilityRole="button" accessibilityLabel="Join shop with staff invite code"
          style={[gs.smallBtn, { marginLeft: 8 }]} accessibilityState={{disabled:staff.joinBusy || code.length !== 8}} disabled={staff.joinBusy || code.length !== 8}
          onPress={async () => { if (await staff.join(code)) setCode(""); }}
        >
          {staff.joinBusy ? <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="Joining shop staff team" color={theme.colors.royalGold} /> : <Text style={gs.smallBtnText}>Join</Text>}
        </NexaPressable>
      </View>
    </View>
  );
}

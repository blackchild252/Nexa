import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, Share } from "react-native";
import { StaffMember, StaffRole, MyStaffShop, apiStaffList, apiStaffInvite, apiStaffRemove, apiStaffJoin, apiStaffMe } from "./staff";

import { subscribeNexaAutoRefresh } from "./nexaAutoRefresh";
// All state for vendor staff accounts (V3.15, manager tier in V3.16): staff-management
// (list/invite/remove — owner OR manager) and my-side status (am I staff somewhere, so the
// vendor dashboard can show the reduced view).
//
// `isVendorOwner` tells the hook whether the signed-in user owns the shop — pass whatever your
// vendor dashboard already uses for that (e.g. `!!vendor` from your existing `useMall`-style
// hook). `myShop?.role === "manager"` (below) tells you the *other* case that should also see
// this screen: a manager working at someone else's shop. Pass `canManageStaff` as
// `isVendorOwner || myShop?.role === "manager"` once you've loaded `myShop` once, or just gate
// on `isVendorOwner` for a first pass — see StaffScreen.tsx. `active` is the same "this tab is
// on screen" gate `useGroups` takes.

export function useStaff({ isVendorOwner, active }: { isVendorOwner: boolean; active: boolean }) {
  // -- me: am I on someone's staff? (drives the reduced dashboard, and whether a *manager*
  // viewing their own shop's staff list should also load it — loaded first so `canManageStaff`
  // below is available before `loadStaff` needs it) --
  const [myShop, setMyShop] = useState<MyStaffShop | null>(null);
  const [myShopLoading, setMyShopLoading] = useState(false);
  const myShopRequest = useRef(0);

  const loadMyShop = useCallback(async () => {
    const requestId = ++myShopRequest.current;
    setMyShopLoading(true);
    try { const next = await apiStaffMe(); if (requestId === myShopRequest.current) setMyShop(next); }
    catch { /* silent — this is a background check, not a user-facing load */ }
    finally { if (requestId === myShopRequest.current) setMyShopLoading(false); }
  }, []);

  useEffect(() => { loadMyShop(); }, [loadMyShop]);

  // A manager can reach the same staff-management screen as the owner, just with less power on
  // it (see StaffScreen.tsx: no summary/profile access, can't touch a fellow manager).
  const canManageStaff = isVendorOwner || myShop?.role === "manager";

  // -- owner or manager: staff list --
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [lastInvite, setLastInvite] = useState<StaffMember | null>(null);
  const staffRequest = useRef(0); // shown right after creating one, so the code is easy to copy

  const loadStaff = useCallback(async () => {
    if (!canManageStaff) return;
    const requestId = ++staffRequest.current;
    setStaffLoading(true); setStaffError("");
    try { const next = await apiStaffList(); if (requestId === staffRequest.current) setStaff(next); }
    catch (e: any) { if (requestId === staffRequest.current) setStaffError(e?.message || "Could not load your staff."); }
    finally { if (requestId === staffRequest.current) setStaffLoading(false); }
  }, [canManageStaff]);

  useEffect(() => { if (canManageStaff && active) loadStaff(); }, [canManageStaff, active, loadStaff]);
  useEffect(() => { if (!active) return; return subscribeNexaAutoRefresh(() => { void loadMyShop(); if (canManageStaff) void loadStaff(); }); }, [active, canManageStaff, loadMyShop, loadStaff]);

  const invite = useCallback(async (name?: string, role?: StaffRole) => {
    setInviting(true);
    try {
      const { staff: created } = await apiStaffInvite(name, role);
      setLastInvite(created);
      await loadStaff();
    } catch (e: any) {
      Alert.alert("Could not create an invite", e?.message || "Please try again.");
    } finally {
      setInviting(false);
    }
  }, [loadStaff]);

  const remove = useCallback((member: StaffMember) => {
    const verb = member.status === "invited" ? "Revoke this invite" : "Remove this person from staff";
    Alert.alert(verb + "?", member.name ? `${member.name} will lose access right away.` : "This code will stop working.", [
      { text: "Cancel", style: "cancel" },
      {
        text: member.status === "invited" ? "Revoke" : "Remove", style: "destructive",
        onPress: async () => {
          try {
            await apiStaffRemove(member.id);
            if (lastInvite?.id === member.id) setLastInvite(null);
            await loadStaff();
          } catch (e: any) {
            Alert.alert("Could not do that", e?.message || "Please try again.");
          }
        },
      },
    ]);
  }, [loadStaff, lastInvite]);

  // -- join (redeem a code someone sent me) --
  const [joinBusy, setJoinBusy] = useState(false);
  const join = useCallback(async (code: string): Promise<boolean> => {
    setJoinBusy(true);
    try {
      const { vendor } = await apiStaffJoin(code);
      await loadMyShop();
      Alert.alert("You're in", `You now have staff access to ${vendor.shopName}.`);
      return true;
    } catch (e: any) {
      Alert.alert("Could not join", e?.message || "Check the code and try again.");
      return false;
    } finally {
      setJoinBusy(false);
    }
  }, [loadMyShop]);

  const shareCode = (code: string, shopName?: string) => {
    const msg = shopName
      ? `Join the ${shopName} team on NEXA with this code: ${code}`
      : `Join our team on NEXA with this code: ${code}`;
    Share.share({ message: msg }).catch(() => {});
  };

  return {
    staff, staffLoading, staffError, loadStaff, invite, inviting, lastInvite, remove, shareCode, canManageStaff,
    myShop, myShopLoading, loadMyShop, join, joinBusy,
  };
}

export type Staff = ReturnType<typeof useStaff>;

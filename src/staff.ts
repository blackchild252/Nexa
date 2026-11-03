import { authedFetch } from "./api";

// Vendor staff accounts (V3.15): a vendor owner invites people already on NEXA to help run the
// shop. An invite is an 8-character code, redeemed on the invited person's own account — same
// idiom as a money group's claimCode. No shared logins, no separate credentials.

export type StaffStatus = "invited" | "active";
// V3.16: second staff role tier. 'manager' gets everything 'staff' gets, plus can list/invite/
// remove plain staff from the same StaffScreen — but still can't see summary/incomes, edit the
// shop profile, or create/remove a fellow manager (owner-only).
export type StaffRole = "staff" | "manager";

export type StaffMember = {
  id: string;
  name: string | null;          // null while status is "invited" and no label was given
  role: StaffRole;
  status: StaffStatus;
  inviteCode?: string;          // present only while status is "invited" — owner shares this with the person
  expiresAt?: string | null;    // present only while status is "invited"; null = never expires (pre-expiry invite)
  createdAt: string;
  joinedAt: string | null;
};

export type MyStaffShop = {
  id: string;
  name: string | null;
  role: StaffRole;
  status: "active";
  createdAt: string;
  joinedAt: string | null;
  vendor: { id: string; shopName: string; bio: string | null };
};

async function send<T>(path: string, method: string, body: unknown, fallback: string): Promise<T> {
  try { return await authedFetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }) as T; }
  catch (e: any) { throw new Error(e?.message || fallback); }
}

// -- Owner or manager: manage staff --
export const apiStaffList = async (): Promise<StaffMember[]> =>
  (await send<{ staff: StaffMember[] }>("/api/mall/vendor/staff", "GET", undefined, "Could not load your staff.")).staff;
export const apiStaffCreateAccount = (name: string, email: string, password: string, role: StaffRole = "staff") =>
  send<{ staff: StaffMember }>(
    "/api/mall/vendor/staff/accounts", "POST", { name, email, password, role }, "Could not create the vendor staff account."
  );

export const apiStaffInvite = (name?: string, role?: StaffRole) => {
  const body: { name?: string; role?: StaffRole } = {};
  if (name) body.name = name;
  if (role) body.role = role;
  return send<{ staff: StaffMember }>(
    "/api/mall/vendor/staff/invite", "POST", Object.keys(body).length ? body : undefined, "Could not create an invite."
  );
};
export const apiStaffRemove = (id: string) =>
  send<{ ok: true }>(`/api/mall/vendor/staff/${id}`, "DELETE", undefined, "Could not remove that person.");

// -- Anyone: redeem an invite code on my own account --
export const apiStaffJoin = (code: string) =>
  send<{ staff: StaffMember; vendor: { id: string; shopName: string; bio: string | null } }>(
    "/api/mall/vendor/staff/join", "POST", { code }, "Could not join that shop."
  );

// -- Me: am I staff anywhere? (drives the reduced dashboard) --
export const apiStaffMe = async (): Promise<MyStaffShop | null> =>
  (await send<{ staff: MyStaffShop | null }>("/api/mall/staff/me", "GET", undefined, "Could not check your staff status.")).staff;

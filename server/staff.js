// Vendor staff accounts (V3.15, manager tier added in V3.16). A vendor owner invites someone
// already on NEXA to help run the shop, with a reduced version of the vendor dashboard: staff
// can manage products and fulfil orders, but can't see the business summary/financials, log
// manual income, or edit the shop profile. A 'manager' gets everything 'staff' gets, plus can
// list/invite/remove plain staff — but still can't touch the owner-only stuff above, and can't
// create or remove a fellow manager (only the owner can). No shared logins — an invite code adds
// staff access to the person's own account, same idiom as a money group's claimCode.
"use strict";

const crypto = require("crypto");
const { assignSignupUsername } = require("./signupUsername");

class StaffError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const MAX_STAFF = 20; // active + invited, per vendor
const INVITE_EXPIRY_DAYS = 7; // unclaimed invite codes stop working after this long
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0, 1: easy to read out loud

// V3.16 — second staff role tier. 'staff' is unchanged (products + orders only). 'manager' gets
// everything 'staff' gets, PLUS can list/invite/remove staff (so an owner doesn't have to be the
// only one growing the team) — but still can't see the business summary, log income, or edit the
// shop profile, and can't create or remove a fellow manager; only the owner can do that.
const ROLES = ["staff", "manager"];

function createStaff({ db, auth, sendPush, genRowId, joinLimiter, isVendorActive }) {
  const now = () => new Date().toISOString();

  // First name + last initial — never an email, never a full name. Same rule the rest of the
  // app (reviews, group members) uses when one person's identity is shown to another.
  function shortName(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length || parts[0].includes("@")) return "Staff";
    const first = parts[0].slice(0, 20);
    return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
  }

  function userShortName(userId) {
    const u = db.prepare("SELECT name FROM users WHERE id = ?").get(userId);
    return shortName(u && u.name);
  }

  function newInviteCode() {
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = "";
      for (let i = 0; i < 8; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
      if (!db.prepare("SELECT 1 FROM vendor_staff WHERE inviteCode = ?").get(code)) return code;
    }
    throw new StaffError(500, "Could not create an invite code. Try again.");
  }

  function expiryDate() {
    return new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  }

  // Flips any invite past its expiresAt to 'removed' so it frees the seat (same as a manual
  // revoke) and can't be joined. NULL expiresAt (rows created before this column existed) never
  // expires this way. Called at the top of routes that read or consume the invite list so an
  // owner never sees a stale "Invited" row and a claim attempt against an expired code fails.
  function expireStaleInvites(vendorId) {
    db.prepare(
      "UPDATE vendor_staff SET status = 'removed', removedAt = ? WHERE vendorId = ? AND status = 'invited' AND expiresAt IS NOT NULL AND expiresAt < ?"
    ).run(now(), vendorId, now());
  }

  function staffOut(row) {
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      status: row.status,
      inviteCode: row.status === "invited" ? row.inviteCode : undefined,
      expiresAt: row.status === "invited" ? row.expiresAt || null : undefined,
      createdAt: row.createdAt,
      joinedAt: row.joinedAt,
    };
  }

  // ---------- vendor-access resolution ----------
  // Anywhere in index.js that today does `getVendorForUser(req.user.id)` for an owner-only
  // action should keep doing that (or use requireVendor, unchanged). Routes a staff member
  // should also reach use requireVendorAccess below instead: it sets req.vendor the same way,
  // plus req.vendorRole so a route can tell the two apart if it needs to.

  function getVendorForUser(userId) {
    return db.prepare("SELECT * FROM vendors WHERE userId = ?").get(userId);
  }

  // Returns the vendor row plus the caller's staff role (staffRole: 'staff' | 'manager'), so
  // callers can tell a manager from a plain staffer without a second query.
  function getStaffVendorForUser(userId) {
    const row = db.prepare(
      "SELECT v.*, s.role AS staffRole FROM vendor_staff s JOIN vendors v ON v.id = s.vendorId WHERE s.userId = ? AND s.status = 'active'"
    ).get(userId);
    return row || null;
  }

  function requireVendorAccess(req, res, next) {
    const owned = getVendorForUser(req.user.id);
    if (owned) {
      if (typeof isVendorActive === "function" && !isVendorActive(owned.id)) return res.status(403).json({ error: "This vendor subscription is not active. Renew to continue managing the shop." });
      req.vendor = owned; req.vendorRole = "owner"; return next(); }
    const staffVendor = getStaffVendorForUser(req.user.id);
    if (staffVendor) {
      const { staffRole, ...vendor } = staffVendor;
      if (typeof isVendorActive === "function" && !isVendorActive(vendor.id)) return res.status(403).json({ error: "This vendor subscription is not active. Ask the shop owner to renew before managing the shop." });
      req.vendor = vendor; req.vendorRole = staffRole; // 'staff' or 'manager' — both get product/order access
      return next();
    }
    return res.status(403).json({ error: "No vendor profile for this account yet." });
  }

  // Staff-management routes (list/invite/remove): the owner always has access; a 'manager' does
  // too, but stays unable to touch the owner-only stuff (summary, incomes, profile) that never
  // routes through here in the first place.
  function requireVendorManage(req, res, next) {
    const owned = getVendorForUser(req.user.id);
    if (owned) {
      if (typeof isVendorActive === "function" && !isVendorActive(owned.id)) return res.status(403).json({ error: "This vendor subscription is not active. Renew before managing vendor staff." });
      req.vendor = owned; req.vendorRole = "owner"; return next();
    }
    const staffVendor = getStaffVendorForUser(req.user.id);
    if (staffVendor && staffVendor.staffRole === "manager") {
      const { staffRole, ...vendor } = staffVendor;
      if (typeof isVendorActive === "function" && !isVendorActive(vendor.id)) return res.status(403).json({ error: "This vendor subscription is not active. Ask the shop owner to renew before managing staff." });
      req.vendor = vendor; req.vendorRole = "manager";
      return next();
    }
    return res.status(403).json({ error: "No vendor profile for this account yet." });
  }

  // ---------- routes ----------

  const handle = (fn) => (req, res) => {
    try { fn(req, res); }
    catch (e) {
      if (e instanceof StaffError) return res.status(e.status).json({ error: e.message });
      console.error("[NEXA staff]", e);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };
  const A = auth.authMiddleware;

  function register(app) {
    // -- Owner or manager: list staff (invited + active + recently removed, most relevant first) --
    app.get("/api/mall/vendor/staff", A, requireVendorManage, handle((req, res) => {
      expireStaleInvites(req.vendor.id);
      const rows = db.prepare(
        "SELECT * FROM vendor_staff WHERE vendorId = ? AND status != 'removed' ORDER BY status ASC, createdAt DESC LIMIT 100"
      ).all(req.vendor.id);
      res.json({ staff: rows.map(staffOut), viewerRole: req.vendorRole });
    }));

    // -- Owner: create a permanent Vendor Staff account with credentials. Credentials are
    // hashed server-side and never returned after creation. The account is a normal NEXA user
    // linked to this vendor with a scoped staff role; removing the staff relationship does not
    // delete the user's NEXA account. --
    app.post("/api/mall/vendor/staff/accounts", A, handle((req, res) => {
      const vendor = getVendorForUser(req.user.id);
      if (!vendor) throw new StaffError(403, "Only the shop owner can create vendor staff accounts.");
      if (typeof isVendorActive === "function" && !isVendorActive(vendor.id)) {
        return res.status(403).json({ error: "This vendor subscription is not active. Renew before creating vendor staff." });
      }

      const name = String(req.body?.name || "").trim().slice(0, 80);
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      const role = req.body?.role ? String(req.body.role) : "staff";
      if (!name) throw new StaffError(400, "Enter the staff member's name.");
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new StaffError(400, "Enter a valid staff email.");
      if (password.length < 8 || password.length > 128) throw new StaffError(400, "Password must be 8–128 characters.");
      if (!ROLES.includes(role)) throw new StaffError(400, "That's not a valid staff role.");

      const seats = db.prepare("SELECT COUNT(*) AS n FROM vendor_staff WHERE vendorId = ? AND status != 'removed'").get(vendor.id).n;
      if (seats >= MAX_STAFF) throw new StaffError(409, `You can have up to ${MAX_STAFF} staff.`);
      if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
        throw new StaffError(409, "That email already belongs to a NEXA account. Use the existing account's invite flow instead.");
      }

      const userId = "u_" + crypto.randomBytes(12).toString("hex");
      const staffId = genRowId("st");
      const createdAt = now();
      const passwordHash = auth.hashPasswordSync(password);
      try {
        db.transaction(() => {
          db.prepare("INSERT INTO users(id,email,passwordHash,name,createdAt,adultConfirmedAt) VALUES(?,?,?,?,?,?)")
            .run(userId, email, passwordHash, name, createdAt, createdAt);
          assignSignupUsername(db, userId, name);
          db.prepare("INSERT INTO vendor_staff (id, vendorId, userId, name, role, status, inviteCode, expiresAt, createdAt, joinedAt) VALUES (?,?,?,?,?,?,?,?,?,?)")
            .run(staffId, vendor.id, userId, name, role, "active", null, null, createdAt, createdAt);
        })();
      } catch (e) {
        if (String(e?.message || "").toLowerCase().includes("unique")) throw new StaffError(409, "That email or staff account already exists.");
        throw e;
      }
      const created = db.prepare("SELECT * FROM vendor_staff WHERE id = ?").get(staffId);
      if (sendPush) sendPush(vendor.userId, vendor.shopName, `${name} was added as vendor staff`, { screen: "vendor_staff" });
      res.status(201).json({ staff: staffOut(created) });
    }));

    // -- Owner or manager: invite someone by generating a code they redeem on their own account.
    // A manager can only invite plain 'staff' — only the owner can hand out the 'manager' tier. --
    app.post("/api/mall/vendor/staff/invite", A, requireVendorManage, handle((req, res) => {
      const label = req.body?.name ? String(req.body.name).trim().slice(0, 40) : null;

      let role = req.body?.role ? String(req.body.role) : "staff";
      if (!ROLES.includes(role)) throw new StaffError(400, "That's not a valid role.");
      if (role === "manager" && req.vendorRole !== "owner") {
        throw new StaffError(403, "Only the shop owner can invite a manager.");
      }

      const id = genRowId("st");
      const created = db.transaction(() => {
        expireStaleInvites(req.vendor.id);
        const seats = db.prepare("SELECT COUNT(*) AS n FROM vendor_staff WHERE vendorId = ? AND status != 'removed'").get(req.vendor.id).n;
        if (seats >= MAX_STAFF) throw new StaffError(409, `You can have up to ${MAX_STAFF} staff.`);
        const code = newInviteCode();
        db.prepare(
          "INSERT INTO vendor_staff (id, vendorId, name, role, status, inviteCode, expiresAt, createdAt) VALUES (?,?,?,?,?,?,?,?)"
        ).run(id, req.vendor.id, label, role, "invited", code, expiryDate(), now());
        return db.prepare("SELECT * FROM vendor_staff WHERE id = ?").get(id);
      })();
      res.json({ staff: staffOut(created) });
    }));

    // -- Redeem an invite code on my own account (registered before /staff/:id on purpose) --
    app.post("/api/mall/vendor/staff/join", A, ...(joinLimiter ? [joinLimiter] : []), handle((req, res) => {
      const code = String((req.body || {}).code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const invite = code.length === 8
        ? db.prepare("SELECT * FROM vendor_staff WHERE inviteCode = ? AND status = 'invited'").get(code)
        : null;
      if (!invite) throw new StaffError(404, "That invite code isn't valid.");
      if (invite.expiresAt && invite.expiresAt < now()) {
        db.prepare("UPDATE vendor_staff SET status = 'removed', removedAt = ? WHERE id = ?").run(now(), invite.id);
        throw new StaffError(410, "That invite code has expired. Ask the shop owner to send a new one.");
      }

      const vendor = db.prepare("SELECT * FROM vendors WHERE id = ?").get(invite.vendorId);
      if (!vendor) throw new StaffError(404, "That invite code isn't valid.");
      if (vendor.userId === req.user.id) throw new StaffError(409, "You already own this shop.");

      const already = db.prepare(
        "SELECT 1 FROM vendor_staff WHERE vendorId = ? AND userId = ? AND status = 'active'"
      ).get(invite.vendorId, req.user.id);
      if (already) throw new StaffError(409, "You're already on staff for this shop.");

      const name = userShortName(req.user.id);
      const r = db.prepare(
        "UPDATE vendor_staff SET userId = ?, name = ?, status = 'active', inviteCode = NULL, joinedAt = ? WHERE id = ? AND status = 'invited'"
      ).run(req.user.id, name, now(), invite.id);
      if (!r.changes) throw new StaffError(409, "That invite has already been used.");

      if (sendPush) sendPush(vendor.userId, vendor.shopName, `${name} joined your staff`, { screen: "vendor_staff" });
      res.json({ staff: staffOut(db.prepare("SELECT * FROM vendor_staff WHERE id = ?").get(invite.id)), vendor });
    }));

    // -- Owner or manager: revoke an unclaimed invite, or remove an active staffer. A manager
    // can't remove a fellow manager (or promote/demote one) — only the owner can. --
    app.delete("/api/mall/vendor/staff/:id", A, requireVendorManage, handle((req, res) => {
      const row = db.prepare("SELECT * FROM vendor_staff WHERE id = ? AND vendorId = ? AND status != 'removed'").get(req.params.id, req.vendor.id);
      if (!row) return res.status(404).json({ error: "Staff entry not found." });
      if (row.role === "manager" && req.vendorRole !== "owner") {
        throw new StaffError(403, "Only the shop owner can remove a manager.");
      }
      db.prepare("UPDATE vendor_staff SET status = 'removed', removedAt = ?, inviteCode = NULL WHERE id = ?").run(now(), row.id);
      if (row.userId && sendPush) sendPush(row.userId, req.vendor.shopName, "You've been removed from staff.", { screen: "vendor_staff" });
      res.json({ ok: true });
    }));

    // -- Me: which shop (if any) am I staff for, and with what role --
    app.get("/api/mall/staff/me", A, handle((req, res) => {
      const row = db.prepare(
        "SELECT s.*, v.shopName, v.bio FROM vendor_staff s JOIN vendors v ON v.id = s.vendorId WHERE s.userId = ? AND s.status = 'active'"
      ).get(req.user.id);
      if (!row) return res.json({ staff: null });
      res.json({ staff: { ...staffOut(row), vendor: { id: row.vendorId, shopName: row.shopName, bio: row.bio } } });
    }));
  }

  return { register, requireVendorAccess, requireVendorManage, getVendorForUser, getStaffVendorForUser };
}

module.exports = { createStaff };

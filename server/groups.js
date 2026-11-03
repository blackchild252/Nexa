// Shared money ledgers (V3.14). One ledger, three kinds of group:
//   split  friends sharing costs: any member logs expenses/settlements, balances show who owes whom
//   pot    a shared pool: owner logs contributions, spending and payouts
//   ajo    rotating savings: fixed contribution per round, one member collected per round, in a set order
// NEXA never holds or moves money here. It is a record everyone in the group can see.
"use strict";

const crypto = require("crypto");

class GroupError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const KINDS = ["split", "pot", "ajo"];
const ALLOWED_TYPES = {
  split: ["expense", "settlement"],
  pot: ["contribution", "expense", "payout"],
  ajo: ["contribution", "payout"],
};
const MAX_MEMBERS = 50;
const MAX_OWNED_GROUPS = 30;
const MAX_AMOUNT = 1e9;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0, 1: easy to read out loud
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const settleUp = (perMember) => {
  const creditors = perMember.filter((p) => p.net > 0).map((p) => ({ id: p.memberId, amt: p.net })).sort((a, b) => b.amt - a.amt);
  const debtors = perMember.filter((p) => p.net < 0).map((p) => ({ id: p.memberId, amt: -p.net })).sort((a, b) => b.amt - a.amt);
  const out = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    out.push({ fromMemberId: debtors[i].id, toMemberId: creditors[j].id, amount: pay / 100 });
    debtors[i].amt -= pay; creditors[j].amt -= pay;
    if (!debtors[i].amt) i++;
    if (!creditors[j].amt) j++;
  }
  return out;
};

function createGroups({ db, auth, sendPush, genRowId, joinLimiter }) {
  const now = () => new Date().toISOString();
  const today = () => new Date().toISOString().slice(0, 10);
  const major = (minor) => minor / 100;
  const money = (cur, minor) => `${cur === "NGN" ? "₦" : cur + " "}${major(minor).toLocaleString("en-US")}`;

  // ---------- validation helpers ----------

  function cleanText(v, what, max, { required = false } = {}) {
    const c = String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
    if (required && !c) throw new GroupError(400, `Enter a ${what}.`);
    if (c.length > max) throw new GroupError(400, `Keep the ${what} under ${max} characters.`);
    return c;
  }

  function parseAmount(v, what = "amount") {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) throw new GroupError(400, `Enter a valid ${what}.`);
    const minor = Math.round(n * 100);
    if (minor < 1) throw new GroupError(400, `Enter a valid ${what}.`);
    return minor;
  }

  function parseDate(v) {
    if (v == null || v === "") return today();
    const d = String(v);
    if (!DATE_RE.test(d) || Number.isNaN(Date.parse(d))) throw new GroupError(400, "Date must look like 2026-09-24.");
    return d;
  }

  const parseCurrency = (v) => {
    const c = String(v || "NGN").toUpperCase();
    if (!/^[A-Z]{3}$/.test(c)) throw new GroupError(400, "Currency must be a 3-letter code like NGN.");
    return c;
  };

  // First name + last initial, same rule as reviews: never an email, never a full name.
  function shortName(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length || parts[0].includes("@")) return "Member";
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
      const taken = db.prepare("SELECT 1 FROM money_groups WHERE inviteCode = ?").get(code)
        || db.prepare("SELECT 1 FROM money_group_members WHERE claimCode = ?").get(code);
      if (!taken) return code;
    }
    throw new GroupError(500, "Could not create an invite code. Try again.");
  }

  function addDays(dateStr, days) {
    const d = new Date(dateStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  const notify = (userIds, title, body, groupId) => {
    for (const uid of new Set(userIds.filter(Boolean))) {
      Promise.resolve(sendPush(uid, title, body.slice(0, 140), { screen: "money_group", groupId })).catch(() => {});
    }
  };

  // ---------- loading ----------

  const loadGroup = (id) => db.prepare("SELECT * FROM money_groups WHERE id = ?").get(String(id).slice(0, 80));

  const membersOf = (groupId) =>
    db.prepare("SELECT * FROM money_group_members WHERE groupId = ? ORDER BY COALESCE(payoutPosition, 1000000), rowid").all(groupId);

  // Anyone who isn't a member gets the same 404 as a group that doesn't exist.
  function access(req, groupId) {
    const group = loadGroup(groupId);
    const me = group && db.prepare("SELECT * FROM money_group_members WHERE groupId = ? AND userId = ?").get(group.id, req.user.id);
    if (!group || !me) throw new GroupError(404, "Group not found.");
    return { group, me };
  }

  const requireOwner = (me) => { if (me.role !== "owner") throw new GroupError(403, "Only the group owner can do that."); };
  const requireOpen = (group) => { if (group.closedAt) throw new GroupError(409, "This group is closed. Reopen it to make changes."); };

  const hasLiveEntries = (groupId) =>
    !!db.prepare("SELECT 1 FROM money_group_entries WHERE groupId = ? AND voidedAt IS NULL LIMIT 1").get(groupId);

  // ajo order is fixed once money has moved, so joining, leaving and reordering lock at that point.
  function requireAjoNotStarted(group) {
    if (group.kind === "ajo" && hasLiveEntries(group.id)) {
      throw new GroupError(409, "This ajo has already started, so the members and payout order are locked.");
    }
  }

  function renumberAjo(groupId) {
    const rows = membersOf(groupId);
    const upd = db.prepare("UPDATE money_group_members SET payoutPosition = ? WHERE id = ?");
    rows.forEach((m, i) => upd.run(i + 1, m.id));
  }

  // Fold a placeholder into a real member: every entry and share that pointed at the placeholder now
  // points at the real member, so balances carry over exactly. Runs inside the caller's transaction.
  function mergeMembers(group, from, into) {
    const upd = (col) => db.prepare(`UPDATE money_group_entries SET ${col} = ? WHERE groupId = ? AND ${col} = ?`).run(into.id, group.id, from.id);
    upd("memberId");
    upd("toMemberId");
    const shares = db.prepare(
      `SELECT s.entryId, s.shareMinor FROM money_group_entry_shares s
       JOIN money_group_entries e ON e.id = s.entryId WHERE e.groupId = ? AND s.memberId = ?`
    ).all(group.id, from.id);
    for (const sh of shares) {
      const dup = db.prepare("SELECT 1 FROM money_group_entry_shares WHERE entryId = ? AND memberId = ?").get(sh.entryId, into.id);
      if (dup) { // the same expense listed both of them: one person, one combined share
        db.prepare("UPDATE money_group_entry_shares SET shareMinor = shareMinor + ? WHERE entryId = ? AND memberId = ?").run(sh.shareMinor, sh.entryId, into.id);
        db.prepare("DELETE FROM money_group_entry_shares WHERE entryId = ? AND memberId = ?").run(sh.entryId, from.id);
      } else {
        db.prepare("UPDATE money_group_entry_shares SET memberId = ? WHERE entryId = ? AND memberId = ?").run(into.id, sh.entryId, from.id);
      }
    }
    db.prepare("DELETE FROM money_group_members WHERE id = ?").run(from.id);
    if (group.kind === "ajo") { // the merged person keeps the spot the owner gave the placeholder
      db.prepare("UPDATE money_group_members SET payoutPosition = ? WHERE id = ?").run(from.payoutPosition, into.id);
      renumberAjo(group.id);
    }
    db.prepare("UPDATE money_groups SET updatedAt = ? WHERE id = ?").run(now(), group.id);
  }

  function insertMember(group, { userId, name, role }) {
    const count = db.prepare("SELECT COUNT(*) AS n FROM money_group_members WHERE groupId = ?").get(group.id).n;
    if (count >= MAX_MEMBERS) throw new GroupError(409, `A group can have up to ${MAX_MEMBERS} people.`);
    const position = group.kind === "ajo"
      ? (db.prepare("SELECT COALESCE(MAX(payoutPosition), 0) AS m FROM money_group_members WHERE groupId = ?").get(group.id).m + 1)
      : null;
    const id = genRowId("gm");
    db.prepare("INSERT INTO money_group_members (id, groupId, userId, name, role, payoutPosition, createdAt) VALUES (?,?,?,?,?,?,?)")
      .run(id, group.id, userId || null, name, role || "member", position, now());
    return id;
  }

  // ---------- the ledger maths ----------

  // Everything is derived from the live (non-voided) entries; nothing is stored as a running balance,
  // so a void can never leave a total out of step.
  function computeState(group, members) {
    const live = db.prepare("SELECT * FROM money_group_entries WHERE groupId = ? AND voidedAt IS NULL").all(group.id);
    const shareRows = db.prepare(
      `SELECT s.memberId, s.shareMinor FROM money_group_entry_shares s
       JOIN money_group_entries e ON e.id = s.entryId WHERE e.groupId = ? AND e.voidedAt IS NULL`
    ).all(group.id);

    const stats = new Map(members.map((m) => [m.id, { paid: 0, share: 0, sent: 0, got: 0, contributed: 0, received: 0 }]));
    const bump = (id, k, n) => { const s = stats.get(id); if (s) s[k] += n; };
    const contribByRound = new Map(); // round -> Map(memberId -> minor)
    let contributedAll = 0, paidOut = 0, potSpent = 0, payoutCount = 0;

    for (const e of live) {
      if (e.type === "expense") {
        if (e.memberId) bump(e.memberId, "paid", e.amountMinor); else potSpent += e.amountMinor;
      } else if (e.type === "contribution") {
        bump(e.memberId, "contributed", e.amountMinor);
        contributedAll += e.amountMinor;
        if (e.round) {
          if (!contribByRound.has(e.round)) contribByRound.set(e.round, new Map());
          const m = contribByRound.get(e.round);
          m.set(e.memberId, (m.get(e.memberId) || 0) + e.amountMinor);
        }
      } else if (e.type === "payout") {
        bump(e.memberId, "received", e.amountMinor);
        paidOut += e.amountMinor;
        payoutCount += 1;
      } else if (e.type === "settlement") {
        bump(e.memberId, "sent", e.amountMinor);
        bump(e.toMemberId, "got", e.amountMinor);
      }
    }
    for (const s of shareRows) bump(s.memberId, "share", s.shareMinor);

    const perMember = members.map((m) => {
      const s = stats.get(m.id);
      return { memberId: m.id, ...s, net: s.paid - s.share + s.sent - s.got }; // net > 0: the group owes them
    });
    return { started: live.length > 0, perMember, contributedAll, paidOut, potSpent, payoutCount, contribByRound, pool: contributedAll - paidOut - potSpent };
  }


  function ajoRound(group, members, state) {
    const n = members.length;
    const round = state.payoutCount + 1;
    const complete = n > 0 && state.payoutCount >= n;
    const recipient = complete ? null : members.find((m) => m.payoutPosition === round) || null;
    const dueEach = group.contributionMinor || 0;
    const paid = state.contribByRound.get(round) || new Map();
    const roster = members.map((m) => {
      const c = paid.get(m.id) || 0;
      return { memberId: m.id, contributed: major(c), owing: major(complete ? 0 : Math.max(0, dueEach - c)) };
    });
    let collected = 0;
    for (const v of paid.values()) collected += v;
    return {
      round, totalRounds: n, complete,
      recipientMemberId: recipient ? recipient.id : null,
      dueDate: group.startDate && group.cycleDays ? addDays(group.startDate, (round - 1) * group.cycleDays) : null,
      dueEach: major(dueEach), expected: major(dueEach * n), collected: major(collected),
      members: roster,
    };
  }

  // ---------- output shaping ----------

  function summaryFor(group, members, state, me) {
    const mine = state.perMember.find((p) => p.memberId === me.id);
    if (group.kind === "split") return { myNet: major(mine ? mine.net : 0) };
    if (group.kind === "pot") return { balance: major(state.pool), myContributed: major(mine ? mine.contributed : 0) };
    const a = ajoRound(group, members, state);
    const my = a.members.find((m) => m.memberId === me.id);
    return { round: a.round, totalRounds: a.totalRounds, complete: a.complete, myOwing: my ? my.owing : 0, iAmRecipient: a.recipientMemberId === me.id };
  }

  function groupOut(group, members, me, started) {
    const isOwner = me.role === "owner";
    return {
      id: group.id, name: group.name, kind: group.kind, currency: group.currency,
      isOwner, closed: !!group.closedAt, started, memberCount: members.length,
      inviteCode: isOwner ? group.inviteCode : null,
      contributionAmount: group.contributionMinor != null ? major(group.contributionMinor) : null,
      cycleDays: group.cycleDays, startDate: group.startDate, createdAt: group.createdAt,
    };
  }

  function entriesOut(group, members, me, limit) {
    const rows = db.prepare(
      "SELECT * FROM money_group_entries WHERE groupId = ? ORDER BY date DESC, createdAt DESC, rowid DESC LIMIT ?"
    ).all(group.id, limit);
    const name = new Map(members.map((m) => [m.id, m.name]));
    const byUser = new Map(members.filter((m) => m.userId).map((m) => [m.userId, m]));
    const shares = new Map();
    if (rows.length) {
      const q = db.prepare(`SELECT * FROM money_group_entry_shares WHERE entryId IN (${rows.map(() => "?").join(",")})`).all(...rows.map((r) => r.id));
      for (const s of q) {
        if (!shares.has(s.entryId)) shares.set(s.entryId, []);
        shares.get(s.entryId).push({ memberId: s.memberId, name: name.get(s.memberId) || "Member", amount: major(s.shareMinor) });
      }
    }
    return rows.map((e) => {
      const recorder = byUser.get(e.recordedBy);
      return {
        id: e.id, type: e.type, amount: major(e.amountMinor), currency: group.currency,
        memberId: e.memberId, memberName: e.memberId ? name.get(e.memberId) || "Member" : null,
        toMemberId: e.toMemberId, toMemberName: e.toMemberId ? name.get(e.toMemberId) || "Member" : null,
        round: e.round, note: e.note || "", date: e.date,
        recordedByName: recorder ? recorder.name : "Member",
        shares: shares.get(e.id) || [],
        voided: !!e.voidedAt,
        canVoid: !e.voidedAt && !group.closedAt && (me.role === "owner" || e.recordedBy === me.userId),
        createdAt: e.createdAt,
      };
    });
  }

  function detail(group, me, limit = 100) {
    const members = membersOf(group.id);
    const state = computeState(group, members);
    const out = {
      group: groupOut(group, members, me, state.started),
      members: state.perMember.map((p) => {
        const m = members.find((x) => x.id === p.memberId);
        return {
          id: m.id, name: m.name, role: m.role, isYou: m.id === me.id, hasAccount: !!m.userId,
          payoutPosition: m.payoutPosition,
          claimCode: me.role === "owner" && !m.userId ? m.claimCode || null : null,
          paid: major(p.paid), share: major(p.share), net: major(p.net),
          contributed: major(p.contributed), received: major(p.received),
        };
      }),
      entries: entriesOut(group, members, me, limit),
    };
    if (group.kind === "split") out.suggestedSettlements = settleUp(state.perMember);
    if (group.kind === "pot") out.pot = { balance: major(state.pool), contributed: major(state.contributedAll), spent: major(state.potSpent), paidOut: major(state.paidOut) };
    if (group.kind === "ajo") out.ajo = ajoRound(group, members, state);
    return out;
  }

  // ---------- entries ----------

  function buildShares(total, body, currency, mem) {
    if (body.shares && typeof body.shares === "object" && !Array.isArray(body.shares)) {
      const pairs = Object.entries(body.shares);
      if (!pairs.length || pairs.length > MAX_MEMBERS) throw new GroupError(400, "Choose who shared this expense.");
      const out = pairs.map(([id, v]) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) throw new GroupError(400, "Each share must be more than zero. Leave out anyone who owes nothing.");
        return { memberId: mem(id, "person in the split"), shareMinor: Math.round(n * 100) };
      });
      const sum = out.reduce((a, s) => a + s.shareMinor, 0);
      if (sum !== total) throw new GroupError(400, `The shares add up to ${money(currency, sum)} but the expense is ${money(currency, total)}.`);
      return out;
    }
    const ids = Array.isArray(body.splitAmong) ? [...new Set(body.splitAmong.map(String))] : [];
    if (!ids.length || ids.length > MAX_MEMBERS) throw new GroupError(400, "Choose who shared this expense.");
    const base = Math.floor(total / ids.length);
    const rem = total - base * ids.length; // the odd kobo go to the first few people, deterministically
    return ids.map((id, i) => ({ memberId: mem(id, "person in the split"), shareMinor: base + (i < rem ? 1 : 0) }));
  }

  function createEntry(req, group, me, body) {
    const requestKey = String(body.requestKey || "").trim();
    if (requestKey && !/^[A-Za-z0-9._:-]{8,120}$/.test(requestKey)) throw new GroupError(400, "requestKey must be 8 to 120 safe characters.");
    if (requestKey) {
      const prior = db.prepare("SELECT id FROM money_group_entries WHERE groupId=? AND recordedBy=? AND requestKey=?").get(group.id, req.user.id, requestKey);
      if (prior) return prior.id;
    }
    const type = String(body.type || "");
    if (!ALLOWED_TYPES[group.kind].includes(type)) {
      throw new GroupError(400, `A ${group.kind} group can't record a ${type || "blank"} entry.`);
    }
    if (group.kind !== "split" && me.role !== "owner") {
      throw new GroupError(403, "Only the group owner records entries here, since they hold the money.");
    }
    const amount = parseAmount(body.amount);
    const date = parseDate(body.date);
    const note = cleanText(body.note, "note", 120);
    const entry = { id: genRowId("ge"), type, amount, memberId: null, toMemberId: null, round: null, shares: [] };
    let committedMembers = null;
    const notifyPlan = [];
    const write = db.transaction(() => {
      const currentGroup = loadGroup(group.id);
      if (!currentGroup) throw new GroupError(404, "Group not found.");
      requireOpen(currentGroup);
      const currentMe = db.prepare("SELECT * FROM money_group_members WHERE groupId = ? AND userId = ?").get(currentGroup.id, req.user.id);
      if (!currentMe) throw new GroupError(404, "Group not found.");
      if (currentGroup.kind !== "split" && currentMe.role !== "owner") {
        throw new GroupError(403, "Only the group owner records entries here, since they hold the money.");
      }
      const members = membersOf(currentGroup.id);
      const ids = new Set(members.map((m) => m.id));
      const mem = (v, what) => {
        const id = String(v == null ? "" : v);
        if (!ids.has(id)) throw new GroupError(400, `Pick a valid ${what}.`);
        return id;
      };
      if (type === "expense") {
        if (currentGroup.kind === "split") {
          entry.memberId = mem(body.paidByMemberId, "person who paid");
          entry.shares = buildShares(amount, body, currentGroup.currency, mem);
        }
      } else if (type === "settlement") {
        entry.memberId = mem(body.fromMemberId, "person paying");
        entry.toMemberId = mem(body.toMemberId, "person being paid");
        if (entry.memberId === entry.toMemberId) throw new GroupError(400, "Someone can't pay themselves.");
      } else {
        entry.memberId = mem(body.memberId, type === "payout" ? "person being paid out" : "member");
      }
      const state = computeState(currentGroup, members);
      if (currentGroup.kind === "ajo") {
        const a = ajoRound(currentGroup, members, state);
        if (a.complete) throw new GroupError(409, "Every round of this ajo is complete.");
        entry.round = a.round;
        if (type === "payout" && entry.memberId !== a.recipientMemberId) {
          const who = members.find((m) => m.id === a.recipientMemberId);
          throw new GroupError(409, `Round ${a.round} pays ${who ? who.name : "the next member"}.`);
        }
      }
      if ((type === "payout" || (type === "expense" && currentGroup.kind === "pot")) && amount > state.pool) {
        throw new GroupError(409, `Only ${money(currentGroup.currency, state.pool)} is in the pot.`);
      }
      db.prepare(
        `INSERT INTO money_group_entries (id, groupId, type, amountMinor, memberId, toMemberId, round, note, date, recordedBy, createdAt, requestKey)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(entry.id, currentGroup.id, type, amount, entry.memberId, entry.toMemberId, entry.round, note, date, req.user.id, now(), requestKey || null);
      const insShare = db.prepare("INSERT INTO money_group_entry_shares (entryId, memberId, shareMinor) VALUES (?,?,?)");
      for (const s of entry.shares) insShare.run(entry.id, s.memberId, s.shareMinor);
      committedMembers = members;
    });
    write();

    // Tell the people affected (skipping whoever just recorded it).
    const members = committedMembers || membersOf(group.id);
    const userOf = (mid) => (members.find((m) => m.id === mid) || {}).userId;
    const who = me.name;
    if (type === "expense" && group.kind === "split") {
      for (const s of entry.shares) notifyPlan.push([userOf(s.memberId), `${group.name}`, `${who} added ${note || "an expense"}: your share is ${money(group.currency, s.shareMinor)}`]);
    } else if (type === "settlement") {
      notifyPlan.push([userOf(entry.toMemberId), group.name, `${who} recorded a payment of ${money(group.currency, amount)} to you`]);
    } else if (type === "contribution") {
      notifyPlan.push([userOf(entry.memberId), group.name, `Your ${money(group.currency, amount)} contribution was recorded${entry.round ? ` for round ${entry.round}` : ""}`]);
    } else if (type === "payout") {
      notifyPlan.push([userOf(entry.memberId), group.name, `A payout of ${money(group.currency, amount)} to you was recorded`]);
    }
    for (const [uid, title, text] of notifyPlan) if (uid && uid !== req.user.id) notify([uid], title, text, group.id);
    return entry.id;
  }

  // ---------- routes ----------

  const handle = (fn) => (req, res) => {
    try { fn(req, res); }
    catch (e) {
      if (e instanceof GroupError) return res.status(e.status).json({ error: e.message });
      console.error("[NEXA groups]", e);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };
  const A = auth.authMiddleware;

  function register(app) {
    // -- List my groups, each with a one-line summary --
    app.get("/api/groups", A, handle((req, res) => {
      const rows = db.prepare(
        `SELECT g.* FROM money_groups g JOIN money_group_members m ON m.groupId = g.id
         WHERE m.userId = ? ORDER BY g.updatedAt DESC LIMIT 100`
      ).all(req.user.id);
      const groups = rows.map((g) => {
        const members = membersOf(g.id);
        const me = members.find((m) => m.userId === req.user.id);
        const state = computeState(g, members);
        return { ...groupOut(g, members, me, state.started), summary: summaryFor(g, members, state, me) };
      });
      res.json({ groups });
    }));

    // -- Create --
    app.post("/api/groups", A, handle((req, res) => {
      const b = req.body || {};
      const name = cleanText(b.name, "group name", 60, { required: true });
      const kind = String(b.kind || "");
      if (!KINDS.includes(kind)) throw new GroupError(400, "Choose split, pot or ajo.");
      const currency = parseCurrency(b.currency);
      let contributionMinor = null, cycleDays = null, startDate = null;
      if (kind === "ajo") {
        contributionMinor = parseAmount(b.contributionAmount, "contribution amount");
        cycleDays = Math.round(Number(b.cycleDays));
        if (!Number.isFinite(cycleDays) || cycleDays < 1 || cycleDays > 366) throw new GroupError(400, "Rounds must be 1 to 366 days long.");
        startDate = parseDate(b.startDate);
      }
      const extra = Array.isArray(b.memberNames) ? b.memberNames.map((n) => cleanText(n, "member name", 40)).filter(Boolean) : [];
      if (extra.length > MAX_MEMBERS - 1) throw new GroupError(400, `A group can have up to ${MAX_MEMBERS} people.`);

      const id = genRowId("g");
      const ownerName = userShortName(req.user.id);
      db.transaction(() => {
        const owned = db.prepare("SELECT COUNT(*) AS n FROM money_groups WHERE ownerId = ?").get(req.user.id).n;
        if (owned >= MAX_OWNED_GROUPS) throw new GroupError(409, `You can own up to ${MAX_OWNED_GROUPS} groups.`);
        const t = now();
        db.prepare(
          `INSERT INTO money_groups (id, name, kind, currency, ownerId, inviteCode, contributionMinor, cycleDays, startDate, createdAt, updatedAt)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`
        ).run(id, name, kind, currency, req.user.id, newInviteCode(), contributionMinor, cycleDays, startDate, t, t);
        const g = loadGroup(id);
        insertMember(g, { userId: req.user.id, name: ownerName, role: "owner" });
        for (const n of extra) insertMember(g, { userId: null, name: n });
      })();
      const group = loadGroup(id);
      const me = db.prepare("SELECT * FROM money_group_members WHERE groupId = ? AND userId = ?").get(id, req.user.id);
      res.json(detail(group, me));
    }));

    // -- Join with an invite code (registered before /:id routes on purpose) --
    app.post("/api/groups/join", A, ...(joinLimiter ? [joinLimiter] : []), handle((req, res) => {
      const code = String((req.body || {}).code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      let group = null, claim = null;
      if (code.length === 8) {
        group = db.prepare("SELECT * FROM money_groups WHERE inviteCode = ?").get(code);
        if (!group) { // not a group code: is it a code the owner made for one specific person?
          claim = db.prepare("SELECT * FROM money_group_members WHERE claimCode = ? AND userId IS NULL").get(code);
          group = claim ? loadGroup(claim.groupId) : null;
        }
      }
      if (!group) throw new GroupError(404, "That invite code isn't valid.");
      const existing = db.prepare("SELECT * FROM money_group_members WHERE groupId = ? AND userId = ?").get(group.id, req.user.id);
      const name = userShortName(req.user.id);

      if (claim) {
        // Taking over a placeholder keeps their whole history. Allowed even after an ajo has started or the
        // group is closed, since no money moves and the member count and payout order don't change.
        let claimed = false;
        try {
          claimed = db.transaction(() => {
            const currentExisting = db.prepare("SELECT * FROM money_group_members WHERE groupId = ? AND userId = ?").get(group.id, req.user.id);
            if (currentExisting) throw new GroupError(409, `You're already in this group as “${currentExisting.name}”. Ask the owner to merge you into “${claim.name}”.`);
            const r = db.prepare("UPDATE money_group_members SET userId = ?, name = ?, claimCode = NULL WHERE id = ? AND userId IS NULL")
              .run(req.user.id, name === "Member" ? claim.name : name, claim.id);
            if (!r.changes) throw new GroupError(409, "That invite has already been used.");
            return true;
          })();
        } catch (e) {
          if (e instanceof GroupError) throw e;
          if (String(e?.message || e).toLowerCase().includes("unique")) throw new GroupError(409, "You're already in this group.");
          throw e;
        }
        if (!claimed) throw new GroupError(409, "That invite has already been used.");
        db.prepare("UPDATE money_groups SET updatedAt = ? WHERE id = ?").run(now(), group.id);
        notify([group.ownerId], group.name, `${name} joined as ${claim.name}`, group.id);
        const me = db.prepare("SELECT * FROM money_group_members WHERE id = ?").get(claim.id);
        return res.json(detail(group, me));
      }

      if (existing) return res.json(detail(group, existing)); // joining twice is harmless
      let memberId = null;
      try {
        memberId = db.transaction(() => {
          const currentGroup = loadGroup(group.id);
          if (!currentGroup) throw new GroupError(404, "Group not found.");
          const currentExisting = db.prepare("SELECT * FROM money_group_members WHERE groupId = ? AND userId = ?").get(currentGroup.id, req.user.id);
          if (currentExisting) return currentExisting.id;
          requireOpen(currentGroup);
          requireAjoNotStarted(currentGroup);
          return insertMember(currentGroup, { userId: req.user.id, name });
        })();
      } catch (e) {
        if (e instanceof GroupError) throw e;
        if (String(e?.message || e).toLowerCase().includes("unique")) return res.status(409).json({ error: "You're already in this group." });
        throw e;
      }
      const joined = db.prepare("SELECT * FROM money_group_members WHERE id = ?").get(memberId);
      db.prepare("UPDATE money_groups SET updatedAt = ? WHERE id = ?").run(now(), group.id);
      notify([group.ownerId], group.name, `${name} joined the group`, group.id);
      res.json(detail(loadGroup(group.id), joined));
    }));

    // -- One group in full --
    app.get("/api/groups/:id", A, handle((req, res) => {
      const { group, me } = access(req, req.params.id);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 300);
      res.json(detail(group, me, limit));
    }));

    // -- Rename, close/reopen, and (ajo, before it starts) change the terms --
    app.patch("/api/groups/:id", A, handle((req, res) => {
      const { group, me } = access(req, req.params.id);
      requireOwner(me);
      const b = req.body || {};
      const sets = [], vals = [];
      if (b.name !== undefined) { sets.push("name = ?"); vals.push(cleanText(b.name, "group name", 60, { required: true })); }
      if (b.closed !== undefined) { sets.push("closedAt = ?"); vals.push(b.closed ? now() : null); }
      const terms = b.contributionAmount !== undefined || b.cycleDays !== undefined || b.startDate !== undefined;
      if (terms) {
        if (group.kind !== "ajo") throw new GroupError(400, "Only an ajo has contribution terms.");
        requireAjoNotStarted(group);
        if (b.contributionAmount !== undefined) { sets.push("contributionMinor = ?"); vals.push(parseAmount(b.contributionAmount, "contribution amount")); }
        if (b.cycleDays !== undefined) {
          const d = Math.round(Number(b.cycleDays));
          if (!Number.isFinite(d) || d < 1 || d > 366) throw new GroupError(400, "Rounds must be 1 to 366 days long.");
          sets.push("cycleDays = ?"); vals.push(d);
        }
        if (b.startDate !== undefined) { sets.push("startDate = ?"); vals.push(parseDate(b.startDate)); }
      }
      if (!sets.length) throw new GroupError(400, "Nothing to change.");
      sets.push("updatedAt = ?"); vals.push(now());
      db.prepare(`UPDATE money_groups SET ${sets.join(", ")} WHERE id = ?`).run(...vals, group.id);
      res.json(detail(loadGroup(group.id), me));
    }));

    // -- Delete: only while nothing has ever been recorded (otherwise close it) --
    app.delete("/api/groups/:id", A, handle((req, res) => {
      const { group, me } = access(req, req.params.id);
      requireOwner(me);
      if (db.prepare("SELECT 1 FROM money_group_entries WHERE groupId = ? LIMIT 1").get(group.id)) {
        throw new GroupError(409, "This group has a history, so it can be closed but not deleted.");
      }
      db.transaction(() => {
        db.prepare("DELETE FROM money_group_members WHERE groupId = ?").run(group.id);
        db.prepare("DELETE FROM money_groups WHERE id = ?").run(group.id);
      })();
      res.json({ ok: true });
    }));

    // -- Members --
    app.post("/api/groups/:id/members", A, handle((req, res) => {
      const { group, me } = access(req, req.params.id);
      requireOwner(me);
      requireOpen(group);
      requireAjoNotStarted(group);
      const name = cleanText((req.body || {}).name, "name", 40, { required: true });
      db.transaction(() => insertMember(group, { userId: null, name }))();
      db.prepare("UPDATE money_groups SET updatedAt = ? WHERE id = ?").run(now(), group.id);
      res.json(detail(group, me));
    }));

    // Ajo payout order: send every member id, in the order they should collect.
    app.patch("/api/groups/:id/members/order", A, handle((req, res) => {
      const { group, me } = access(req, req.params.id);
      requireOwner(me);
      if (group.kind !== "ajo") throw new GroupError(400, "Only an ajo has a payout order.");
      requireOpen(group);
      requireAjoNotStarted(group);
      const order = Array.isArray((req.body || {}).order) ? req.body.order.map(String) : [];
      const current = membersOf(group.id).map((m) => m.id);
      if (order.length !== current.length || new Set(order).size !== order.length || !order.every((id) => current.includes(id))) {
        throw new GroupError(400, "The order must list every member exactly once.");
      }
      const upd = db.prepare("UPDATE money_group_members SET payoutPosition = ? WHERE id = ? AND groupId = ?");
      db.transaction(() => order.forEach((id, i) => upd.run(i + 1, id, group.id)))();
      res.json(detail(group, me));
    }));

    // Make (or fetch, or with { regenerate: true } replace) the code for one placeholder. Give it to that
    // person: joining with it makes them that member, history and all, instead of a second "Tunde".
    app.post("/api/groups/:id/members/:mid/invite", A, handle((req, res) => {
      const { group, me } = access(req, req.params.id);
      requireOwner(me);
      const target = db.prepare("SELECT * FROM money_group_members WHERE id = ? AND groupId = ?").get(String(req.params.mid).slice(0, 80), group.id);
      if (!target) throw new GroupError(404, "Member not found.");
      if (target.userId) throw new GroupError(409, `${target.name} already has an account in this group.`);
      if (!target.claimCode || (req.body || {}).regenerate) {
        db.prepare("UPDATE money_group_members SET claimCode = ? WHERE id = ?").run(newInviteCode(), target.id);
      }
      res.json(detail(group, me));
    }));

    // Someone already joined with the group code and now shows up twice (the placeholder and themselves):
    // fold the placeholder into them. Owner only, and not once an ajo has started (the member count would change).
    app.post("/api/groups/:id/members/:mid/merge", A, handle((req, res) => {
      const { group, me } = access(req, req.params.id);
      requireOwner(me);
      requireOpen(group);
      requireAjoNotStarted(group);
      const find = (id) => db.prepare("SELECT * FROM money_group_members WHERE id = ? AND groupId = ?").get(String(id == null ? "" : id).slice(0, 80), group.id);
      const from = find(req.params.mid);
      if (!from) throw new GroupError(404, "Member not found.");
      if (from.userId) throw new GroupError(409, `${from.name} has an account, so they can't be merged into someone else.`);
      const into = find((req.body || {}).intoMemberId);
      if (!into) throw new GroupError(400, "Pick who they should be merged into.");
      if (!into.userId) throw new GroupError(409, "Merge into someone who has joined with their own account.");
      db.transaction(() => mergeMembers(group, from, into))();
      res.json(detail(group, me));
    }));

    // Remove a member (owner) or leave (yourself). Only possible while they appear in no entry at all,
    // because deleting them would blank names in the history.
    app.delete("/api/groups/:id/members/:mid", A, handle((req, res) => {
      const { group, me } = access(req, req.params.id);
      const target = db.prepare("SELECT * FROM money_group_members WHERE id = ? AND groupId = ?").get(String(req.params.mid).slice(0, 80), group.id);
      if (!target) throw new GroupError(404, "Member not found.");
      const leavingSelf = target.id === me.id;
      if (!leavingSelf) requireOwner(me);
      const removed = db.transaction(() => {
        const currentGroup = loadGroup(group.id);
        if (!currentGroup) throw new GroupError(404, "Group not found.");
        const currentMe = db.prepare("SELECT * FROM money_group_members WHERE groupId = ? AND userId = ?").get(currentGroup.id, req.user.id);
        if (!currentMe) throw new GroupError(404, "Group not found.");
        const currentTarget = db.prepare("SELECT * FROM money_group_members WHERE id = ? AND groupId = ?").get(target.id, currentGroup.id);
        if (!currentTarget) throw new GroupError(404, "Member not found.");
        if (currentTarget.role === "owner") throw new GroupError(409, "The owner can't be removed. Close the group instead.");
        if (!leavingSelf && currentMe.role !== "owner") throw new GroupError(403, "Only the group owner can remove another member.");
        requireOpen(currentGroup);
        requireAjoNotStarted(currentGroup);
        const used = db.prepare(
          `SELECT 1 FROM money_group_entries WHERE groupId = ? AND (memberId = ? OR toMemberId = ?)
           UNION SELECT 1 FROM money_group_entry_shares s JOIN money_group_entries e ON e.id = s.entryId WHERE e.groupId = ? AND s.memberId = ? LIMIT 1`
        ).get(currentGroup.id, currentTarget.id, currentTarget.id, currentGroup.id, currentTarget.id);
        if (used) throw new GroupError(409, `${currentTarget.name} appears in the group's history, so they can't be removed.`);
        const result = db.prepare("DELETE FROM money_group_members WHERE id = ? AND groupId = ?").run(currentTarget.id, currentGroup.id);
        if (!result.changes) throw new GroupError(409, "This member changed before removal completed. Please refresh and try again.");
        if (currentGroup.kind === "ajo") renumberAjo(currentGroup.id);
        return { group: currentGroup, me: currentMe };
      })();
      if (leavingSelf) return res.json({ ok: true });
      res.json(detail(loadGroup(removed.group.id), removed.me));
    }));

    // -- Entries --
    app.post("/api/groups/:id/entries", A, handle((req, res) => {
      const { group, me } = access(req, req.params.id);
      createEntry(req, group, me, req.body || {});
      db.prepare("UPDATE money_groups SET updatedAt = ? WHERE id = ?").run(now(), group.id);
      res.json(detail(group, me));
    }));

    // Entries are never deleted. Void one to take it out of the balances; it stays visible, struck through.
    app.post("/api/groups/:id/entries/:eid/void", A, handle((req, res) => {
      const { group, me } = access(req, req.params.id);
      const entryId = String(req.params.eid).slice(0, 80);
      db.transaction(() => {
        const currentGroup = loadGroup(group.id);
        if (!currentGroup) throw new GroupError(404, "Group not found.");
        const currentMe = db.prepare("SELECT * FROM money_group_members WHERE groupId = ? AND userId = ?").get(currentGroup.id, req.user.id);
        if (!currentMe) throw new GroupError(404, "Group not found.");
        requireOpen(currentGroup);
        const e = db.prepare("SELECT * FROM money_group_entries WHERE id = ? AND groupId = ?").get(entryId, currentGroup.id);
        if (!e) throw new GroupError(404, "Entry not found.");
        if (e.voidedAt) throw new GroupError(409, "That entry is already voided.");
        if (currentMe.role !== "owner" && e.recordedBy !== req.user.id) throw new GroupError(403, "Only the person who recorded it, or the owner, can void an entry.");
        if (e.type === "payout" && currentGroup.kind === "ajo") {
          const later = db.prepare("SELECT 1 FROM money_group_entries WHERE groupId = ? AND type = 'payout' AND voidedAt IS NULL AND round > ?").get(currentGroup.id, e.round || 0);
          if (later) throw new GroupError(409, "Void the most recent payout first.");
        }
        const result = db.prepare("UPDATE money_group_entries SET voidedAt = ?, voidedBy = ? WHERE id = ? AND groupId = ? AND voidedAt IS NULL").run(now(), req.user.id, e.id, currentGroup.id);
        if (!result.changes) throw new GroupError(409, "That entry changed before it could be voided. Please refresh and try again.");
        if (currentGroup.kind !== "split") {
          const state = computeState(currentGroup, membersOf(currentGroup.id));
          if (state.pool < 0) throw new GroupError(409, "Void the later payouts or spending first, or the pot would go negative.");
        }
      })();
      db.prepare("UPDATE money_groups SET updatedAt = ? WHERE id = ?").run(now(), group.id);
      res.json(detail(loadGroup(group.id), db.prepare("SELECT * FROM money_group_members WHERE id = ?").get(me.id)));
    }));
  }

  return { register };
}

module.exports = { createGroups, GroupError, settleUp };

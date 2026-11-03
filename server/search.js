"use strict";

const TYPES = ["people", "friends", "groups", "marketplace", "yaayz", "money", "ai", "dami", "help"];
const SEARCH_TYPES = [...TYPES, "social", "section"];

// App sections are not user data, so every signed-in user may find them. The id is a
// sidebar directory id or an L.A. activity id; the app resolves it to the screen.
const SECTIONS = [
  { id: "dami", title: "Dami", subtitle: "Your AI assistant", words: "ai assistant voice chat" },
  { id: "zeeza", title: "Zeeza", subtitle: "Friends, inbox and rooms", words: "friends chat messages inbox social calls" },
  { id: "money", title: "Sky Money", subtitle: "Wallet, savings, groups and budgets", words: "wallet savings budget expenses debts ajo groups" },
  { id: "marketplace", title: "Dream Marketplace", subtitle: "Shop from NEXA vendors", words: "shop mall store products orders cart" },
  { id: "vendor", title: "Business Hub", subtitle: "Run your shop", words: "vendor seller shop products orders" },
  { id: "yaayz", title: "Yaayz", subtitle: "Events, travel and tickets", words: "events tickets travel concerts stadium offers" },
  { id: "leisure", title: "L.A.", subtitle: "Kitchen, Ball House, Game House and Fitness", words: "leisure arena activities" },
  { id: "kitchen", title: "Kitchen", subtitle: "L.A. · Order food", words: "food order meals restaurant eat referral" },
  { id: "ball", title: "Ball House", subtitle: "L.A. · Football", words: "football soccer matches tickets" },
  { id: "game", title: "Game House", subtitle: "L.A. · Gaming", words: "games gaming perks leaderboards" },
  { id: "fitness", title: "Fitness", subtitle: "L.A. · Workouts and training", words: "workout gym training exercise health" },
  { id: "notifications", title: "Notifications", subtitle: "Alerts and updates", words: "alerts updates" },
  { id: "subscription", title: "NEXA Membership", subtitle: "Plans and benefits", words: "subscription plan vip premium" },
  { id: "profile", title: "Profile", subtitle: "Your account and settings", words: "account settings theme" },
  { id: "extensions", title: "Extensions", subtitle: "Add-ons for NEXA", words: "addons plugins apps" },
  { id: "developer", title: "Developer Console", subtitle: "Build on NEXA", words: "api developer keys" },
  { id: "help", title: "NEXA Help", subtitle: "Help centre and customer care", words: "help support contact customer care account orders payments security privacy password" },
];

const HELP_TOPICS = [
  { id: "account-access", title: "Account access and security", subtitle: "Help · Account", words: "login sign in password account security passkey" },
  { id: "marketplace-orders", title: "Marketplace orders and returns", subtitle: "Help · Marketplace", words: "marketplace shop order delivery return refund vendor" },
  { id: "money-and-payments", title: "Money and payment support", subtitle: "Help · Money", words: "money wallet payment transfer transaction savings" },
  { id: "privacy-controls", title: "Privacy and data controls", subtitle: "Help · Privacy", words: "privacy data export delete block visibility" },
  { id: "contact-care", title: "Contact Customer Care", subtitle: "Help · Customer Care", words: "staff agent support complaint contact human" },
];

function searchSections(query) {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const out = [];
  for (const sec of SECTIONS) {
    const hay = `${sec.title} ${sec.words}`.toLowerCase();
    const titleScore = score(sec.title, query);
    const hit = hay.includes(q) || tokens.every((t) => hay.includes(t));
    if (!hit && titleScore === 0) continue;
    out.push({ type: "section", id: sec.id, title: sec.title, subtitle: sec.subtitle, score: Math.max(titleScore, hit ? 40 : 0) });
  }
  return out;
}
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;
const MAX_QUERY_TOKENS = 8;
const MAX_CANDIDATES = 200;

function normalizeQuery(value) {
  const normalized = String(value == null ? "" : value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return normalized.split(/\s+/).filter(Boolean).slice(0, MAX_QUERY_TOKENS).join(" ");
}

function normalizeTypes(value) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  const out = [...new Set(raw.map((x) => String(x).trim().toLowerCase()).filter((x) => SEARCH_TYPES.includes(x)))];
  return out.length ? out : SEARCH_TYPES.slice();
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function score(text, query) {
  const t = String(text || "").toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 50;
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.reduce((n, token) => n + (t.includes(token) ? 10 : 0), 0);
}

function relevanceScore(result, query) {
  const fields = [result.title, result.subtitle, result.snippet];
  return Math.max(0, ...fields.map((value) => score(value, query)));
}

function decodeCursor(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(raw), "base64url").toString("utf8"));
    if (!Number.isFinite(Number(parsed.score)) || typeof parsed.title !== "string" || typeof parsed.type !== "string" || typeof parsed.id !== "string") return null;
    return { score: Number(parsed.score), title: parsed.title, type: parsed.type, id: parsed.id };
  } catch (_) { return null; }
}

function encodeCursor(result) {
  return Buffer.from(JSON.stringify({ score: Number(result.score || 0), title: String(result.title || ""), type: String(result.type || ""), id: String(result.id || "") })).toString("base64url");
}

function snippet(value, max = 140) {
  const s = String(value || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function searchAll(db, userId, rawQuery, rawTypes, rawLimit, rawCursor = null) {
  const query = normalizeQuery(rawQuery);
  const types = normalizeTypes(rawTypes);
  const limit = Math.max(1, Math.min(MAX_LIMIT, Number(rawLimit) || DEFAULT_LIMIT));
  if (query.length < 2) return { query, types, results: [] };

  const like = `%${escapeLike(query)}%`;
  const prefix = `${escapeLike(query)}%`;
  const results = [];

  if (types.includes("people")) {
    // People search follows the existing social privacy model: username is the public
    // discovery key, email is never returned, and either-side blocks hide the person.
    const rows = db.prepare(`
      SELECT u.id, u.name, u.username
      FROM users u
      WHERE u.id != ?
        AND COALESCE(u.accountStatus,'active') = 'active'
        AND u.username IS NOT NULL
        AND u.username LIKE ? ESCAPE '\\'
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blockerId = ? AND b.blockedId = u.id)
             OR (b.blockerId = u.id AND b.blockedId = ?)
        )
      ORDER BY CASE WHEN u.username LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END, u.username
      LIMIT 20`).all(userId, like, userId, userId, prefix);
    for (const r of rows) {
      results.push({ type: "people", id: r.id, title: r.username, subtitle: String(r.name || "NEXA user").split(/\s+/)[0], score: score(r.username, query) });
    }
  }

  if (types.includes("friends")) {
    // Only accepted friendship edges are discoverable here. Both-side block checks
    // remain explicit and the result never contains private contact information.
    const rows = db.prepare(`
      SELECT DISTINCT u.id, u.name, u.username
      FROM friendships f JOIN users u ON u.id = f.friendId
      WHERE f.userId = ? AND u.id != ?
        AND COALESCE(u.accountStatus,'active') = 'active'
        AND u.username IS NOT NULL
        AND (u.username LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\')
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blockerId = ? AND b.blockedId = u.id)
             OR (b.blockerId = u.id AND b.blockedId = ?)
        )
      ORDER BY CASE WHEN u.username LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END, u.username
      LIMIT 30`).all(userId, userId, like, like, userId, userId, prefix);
    for (const r of rows) results.push({ type: "friends", id: r.id, title: r.username, subtitle: String(r.name || "NEXA friend").split(/\s+/)[0], score: Math.max(score(r.username, query), score(r.name, query)) });
  }

  if (types.includes("groups")) {
    const rows = db.prepare(`
      SELECT DISTINCT g.id, g.name, g.kind, g.currency
      FROM money_groups g
      JOIN money_group_members m ON m.groupId = g.id AND m.userId = ?
      WHERE g.name LIKE ? ESCAPE '\\'
      ORDER BY g.updatedAt DESC LIMIT 20`).all(userId, like);
    for (const r of rows) {
      results.push({ type: "groups", id: r.id, title: r.name, subtitle: `${r.kind.toUpperCase()} · ${r.currency}`, score: score(r.name, query) });
    }
  }

  if (types.includes("marketplace")) {
    const rows = db.prepare(`
      SELECT p.id, p.name, p.description, p.price, p.currency, p.category, v.shopName AS vendorName
      FROM mall_products p JOIN vendors v ON v.id = p.vendorId
      WHERE p.active = 1 AND (p.name LIKE ? ESCAPE '\\' OR COALESCE(p.description,'') LIKE ? ESCAPE '\\' OR p.category LIKE ? ESCAPE '\\' OR v.shopName LIKE ? ESCAPE '\\')
      ORDER BY p.updatedAt DESC LIMIT 30`).all(like, like, like, like);
    for (const r of rows) {
      results.push({ type: "marketplace", id: r.id, title: r.name, subtitle: `${r.vendorName} · ${r.currency} ${Number(r.price).toLocaleString()} · ${r.category}`, snippet: snippet(r.description), score: Math.max(score(r.name, query), score(r.vendorName, query) - 5) });
    }
  }

  if (types.includes("yaayz")) {
    const tickets = db.prepare(`SELECT id,title,description,type,providerName,venue,origin,destination,startsAt,price,currency FROM yaayz_ticket_listings
      WHERE active = 1 AND quantity > 0 AND (title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR type LIKE ? ESCAPE '\\' OR COALESCE(providerName,'') LIKE ? ESCAPE '\\' OR COALESCE(venue,'') LIKE ? ESCAPE '\\' OR COALESCE(origin,'') LIKE ? ESCAPE '\\' OR COALESCE(destination,'') LIKE ? ESCAPE '\\')
      ORDER BY CASE WHEN startsAt IS NULL THEN 1 ELSE 0 END, startsAt ASC, createdAt DESC LIMIT 30`).all(like, like, like, like, like, like, like);
    for (const r of tickets) results.push({ type: "yaayz", id: r.id, title: r.title, subtitle: `${String(r.type).toUpperCase()} · ${r.currency} ${Number(r.price).toLocaleString()}${r.providerName ? ` · ${r.providerName}` : ""}`, snippet: snippet(r.description || r.venue || `${r.origin || ""} ${r.destination || ""}`), score: Math.max(score(r.title, query), score(r.providerName, query), score(r.venue, query)) });
    const kitchen = db.prepare(`SELECT id,items,total,currency,status FROM kitchen_orders WHERE userId = ? AND items LIKE ? ESCAPE '\\' ORDER BY createdAt DESC LIMIT 15`).all(userId, like);
    for (const r of kitchen) results.push({ type: "yaayz", id: r.id, title: "Leisure Arena · Kitchen", subtitle: `${r.currency} ${Number(r.total).toLocaleString()} · ${r.status}`, snippet: snippet(r.items), score: Math.max(score("Leisure Arena Kitchen", query), score(r.items, query)) });
    const ads = db.prepare(`SELECT id,advertiserName,title,body FROM yaayz_ads WHERE active = 1 AND (title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\' OR advertiserName LIKE ? ESCAPE '\\') ORDER BY createdAt DESC LIMIT 20`).all(like, like, like);
    for (const r of ads) results.push({ type: "yaayz", id: r.id, title: r.title, subtitle: r.advertiserName, snippet: snippet(r.body), score: Math.max(score(r.title, query), score(r.advertiserName, query)) });
  }

  if (types.includes("money")) {
    const expenses = db.prepare(`SELECT id, category, note, amount, currency, date FROM expenses WHERE userId = ? AND (category LIKE ? ESCAPE '\\' OR COALESCE(note,'') LIKE ? ESCAPE '\\' OR date LIKE ? ESCAPE '\\') ORDER BY date DESC LIMIT 15`).all(userId, like, like, like);
    for (const r of expenses) {
      results.push({ type: "money", id: r.id, title: r.category || "Expense", subtitle: `${r.currency} ${Number(r.amount).toLocaleString()} · ${r.date}`, snippet: snippet(r.note), score: Math.max(score(r.category, query), score(r.note, query)) });
    }
    const debts = db.prepare(`SELECT id, person, direction, amount, currency, note, dueDate FROM debts WHERE userId = ? AND (person LIKE ? ESCAPE '\\' OR COALESCE(note,'') LIKE ? ESCAPE '\\' OR COALESCE(dueDate,'') LIKE ? ESCAPE '\\') ORDER BY createdAt DESC LIMIT 15`).all(userId, like, like, like);
    for (const r of debts) {
      results.push({ type: "money", id: r.id, title: `Debt · ${r.person}`, subtitle: `${r.direction === "i_owe" ? "You owe" : "Owed to you"} · ${r.currency} ${Number(r.amount).toLocaleString()}`, snippet: snippet(r.note), score: Math.max(score(r.person, query), score(r.note, query)) });
    }
    const budgets = db.prepare(`SELECT id, name, category, amount, currency, periodStart, periodEnd FROM financial_budgets WHERE userId = ? AND (name LIKE ? ESCAPE '\\' OR COALESCE(category,'') LIKE ? ESCAPE '\\') ORDER BY updatedAt DESC LIMIT 10`).all(userId, like, like);
    for (const r of budgets) {
      results.push({ type: "money", id: r.id, title: `Budget · ${r.name}`, subtitle: `${r.currency} ${Number(r.amount).toLocaleString()} · ${r.periodStart} → ${r.periodEnd}`, score: Math.max(score(r.name, query), score(r.category, query)) });
    }
    const goals = db.prepare(`SELECT id, name, targetAmount, currentAmount, targetDate FROM financial_goals WHERE userId = ? AND name LIKE ? ESCAPE '\\' ORDER BY updatedAt DESC LIMIT 10`).all(userId, like);
    for (const r of goals) {
      results.push({ type: "money", id: r.id, title: `Goal · ${r.name}`, subtitle: `₦${Number(r.currentAmount).toLocaleString()} / ₦${Number(r.targetAmount).toLocaleString()}${r.targetDate ? ` · ${r.targetDate}` : ""}`, score: score(r.name, query) });
    }
  }

  if (types.includes("section")) results.push(...searchSections(query));
  if (types.includes("help")) {
    for (const topic of HELP_TOPICS) {
      const hay = `${topic.title} ${topic.words}`.toLowerCase();
      if (hay.includes(query.toLowerCase()) || query.toLowerCase().split(/\s+/).every((token) => hay.includes(token))) {
        results.push({ type: "help", id: topic.id, title: topic.title, subtitle: topic.subtitle, score: score(topic.title, query) || 20 });
      }
    }
  }

  if (types.includes("social")) {
    const threads = db.prepare(`SELECT t.id, t.userAId, t.userBId, u.name, u.username, (SELECT body FROM dm_messages m WHERE m.threadId=t.id ORDER BY m.createdAt DESC LIMIT 1) AS lastBody FROM dm_threads t JOIN users u ON u.id=CASE WHEN t.userAId=? THEN t.userBId ELSE t.userAId END WHERE (t.userAId=? OR t.userBId=?) AND COALESCE(u.accountStatus,'active') = 'active' AND (u.username LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\' OR COALESCE((SELECT body FROM dm_messages m WHERE m.threadId=t.id ORDER BY m.createdAt DESC LIMIT 1),'') LIKE ? ESCAPE '\\') ORDER BY COALESCE(t.lastMessageAt,t.createdAt) DESC LIMIT 20`).all(userId,userId,userId,like,like,like);
    for (const r of threads) results.push({type:"social",id:r.id,title:r.username?`Inbox · @${r.username}`:"Inbox conversation",subtitle:String(r.name||"NEXA friend"),snippet:snippet(r.lastBody),score:Math.max(score(r.username,query),score(r.name,query),score(r.lastBody,query))});
    const rooms = db.prepare(`SELECT r.id,r.name,r.updatedAt FROM chat_rooms r JOIN chat_room_members m ON m.roomId=r.id AND m.userId=? WHERE r.name LIKE ? ESCAPE '\\' ORDER BY r.updatedAt DESC LIMIT 20`).all(userId,like);
    for (const r of rooms) results.push({type:"social",id:r.id,title:`Room · ${r.name}`,subtitle:"Zeeza Room",score:score(r.name,query)});
  }

  if (types.includes("ai") || types.includes("dami")) {
    const plans = db.prepare(`SELECT id, title, goal, status, updatedAt FROM ai_plans WHERE userId = ? AND (title LIKE ? ESCAPE '\\' OR goal LIKE ? ESCAPE '\\') ORDER BY updatedAt DESC LIMIT 15`).all(userId, like, like);
    for (const r of plans) results.push({ type: "ai", id: r.id, title: `Plan · ${r.title}`, subtitle: `Dami plan · ${r.status}`, snippet: snippet(r.goal), score: Math.max(score(r.title, query), score(r.goal, query)) });
    const notes = db.prepare(`SELECT id, content, createdAt FROM ai_notes WHERE userId = ? AND content LIKE ? ESCAPE '\\' ORDER BY createdAt DESC LIMIT 15`).all(userId, like);
    for (const r of notes) results.push({ type: "ai", id: r.id, title: "Dami note", subtitle: r.createdAt, snippet: snippet(r.content), score: score(r.content, query) });
    const knowledge = db.prepare(`SELECT id, title, content, updatedAt FROM ai_knowledge WHERE userId = ? AND (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\') ORDER BY updatedAt DESC LIMIT 15`).all(userId, like, like);
    for (const r of knowledge) results.push({ type: "ai", id: r.id, title: `Knowledge · ${r.title}`, subtitle: r.updatedAt, snippet: snippet(r.content), score: Math.max(score(r.title, query), score(r.content, query)) });
  }

  results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title) || a.type.localeCompare(b.type) || String(a.id).localeCompare(String(b.id)));
  const candidates = results.slice(0, MAX_CANDIDATES);
  const cursor = decodeCursor(rawCursor);
  const afterCursor = (r) => {
    if (!cursor) return true;
    if (r.score !== cursor.score) return r.score < cursor.score;
    const titleCmp = r.title.localeCompare(cursor.title);
    if (titleCmp !== 0) return titleCmp > 0;
    const typeCmp = r.type.localeCompare(cursor.type);
    if (typeCmp !== 0) return typeCmp > 0;
    return String(r.id).localeCompare(String(cursor.id)) > 0;
  };
  const filtered = candidates.filter(afterCursor);
  const page = filtered.slice(0, limit);
  const nextCursor = filtered.length > limit && page.length ? encodeCursor(page[page.length - 1]) : null;
  return { query, types, results: page.map(({ score: _score, ...result }) => result), nextCursor };
}

module.exports = { TYPES, SEARCH_TYPES, HELP_TOPICS, DEFAULT_LIMIT, MAX_LIMIT, MAX_QUERY_TOKENS, MAX_CANDIDATES, normalizeQuery, normalizeTypes, score, relevanceScore, encodeCursor, decodeCursor, searchAll };

"use strict";

const { isSupportedDamiLanguage } = require("./damiLanguage");

// Allowed option ids for the Dami avatar. Kept in step with src/nexaAvatar.ts by a contract test.
const OPTIONS = Object.freeze({
  gender: ["female", "male"],
  skin: ["s1", "s2", "s3", "s4"],
  face: ["smile", "grin", "calm", "wow"],
  hair: ["short", "curly", "long", "bun", "bald"],
  hairColor: ["h1", "h2", "h3", "h4", "h5"],
  glasses: ["none", "round", "square", "shades"],
  mustache: ["none", "classic", "thick"],
  top: ["tee", "hoodie", "shirt", "gold", "green"],
  bottom: ["trousers", "shorts", "skirt", "jeans"],
  shoes: ["sneakers", "boots", "sandals"],
  bag: ["none", "back", "side"],
  pose: ["stand", "move", "sit", "lie", "computer"],
  scene: ["plain", "neighborhood", "office", "kitchen", "livingroom"],
});
const FIELDS = Object.freeze([...Object.keys(OPTIONS), "lang"]);

/** Returns { ok: true, config } with only known fields, or { ok: false, error }. Every field must be present and valid. */
function normalizeAvatarConfig(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "avatar must be an object." };
  const config = {};
  for (const key of Object.keys(OPTIONS)) {
    const value = body[key];
    if (typeof value !== "string" || !OPTIONS[key].includes(value)) return { ok: false, error: `avatar.${key} is not a supported option.` };
    config[key] = value;
  }
  const lang = typeof body.lang === "string" ? body.lang.trim().toLowerCase() : "";
  if (!lang || lang === "auto" || !isSupportedDamiLanguage(lang)) return { ok: false, error: "avatar.lang must be a supported Dami language." };
  config.lang = lang;
  return { ok: true, config };
}

// Poses need a plan. Kept in step with POSES in src/nexaAvatar.ts by a contract test.
const POSE_MIN_TIER = Object.freeze({ stand: "free", move: "regular", computer: "premium", sit: "vip", lie: "vip" });
const TIER_RANK = Object.freeze({ free: 0, regular: 1, premium: 2, vip: 3 });

function poseAllowed(pose, tier) {
  const min = POSE_MIN_TIER[pose];
  return min !== undefined && (TIER_RANK[tier] ?? 0) >= TIER_RANK[min];
}

/** A pose the plan does not include becomes "stand". The stored value is what the server keeps, so a client cannot bypass the plan. */
function applyPoseTier(config, tier, { unlockAll = false } = {}) {
  if (unlockAll || poseAllowed(config.pose, tier)) return { config, clamped: false };
  return { config: { ...config, pose: "stand" }, clamped: true };
}

/** The user's plan id, from their active subscription only; anything else is free. Read-only (never renews or charges). */
function tierForUser(subscriptions, db, userId) {
  try {
    const sub = subscriptions.currentSubscription(db, userId);
    return sub && sub.status === "active" && TIER_RANK[sub.planId] !== undefined ? sub.planId : "free";
  } catch (_) { return "free"; }
}

/** Owner preview on a development server only: NEXA_AVATAR_PREVIEW_UNLOCK=1 lets every pose be saved. Ignored in production. */
function previewUnlockAll(env) {
  return String(env?.NEXA_AVATAR_PREVIEW_UNLOCK || "") === "1" && String(env?.NODE_ENV || "") !== "production";
}

/** The plan the app should show: the server-confirmed plan, or "vip" while the development preview unlock is on. */
function reportedTier(tier, { unlockAll = false } = {}) {
  return unlockAll ? "vip" : (TIER_RANK[tier] !== undefined ? tier : "free");
}

function parseStoredAvatar(json) {
  try { const r = normalizeAvatarConfig(JSON.parse(json)); return r.ok ? r.config : null; } catch (_) { return null; }
}

module.exports = { OPTIONS, FIELDS, POSE_MIN_TIER, normalizeAvatarConfig, parseStoredAvatar, poseAllowed, applyPoseTier, tierForUser, previewUnlockAll, reportedTier };

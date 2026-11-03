"use strict";

const DEFAULTS = Object.freeze({ pushEnabled: 1, money: 1, marketplace: 1, social: 1, chat: 1, system: 1, extension: 1, digestEnabled: 0, digestFrequency: "off", quietStart: null, quietEnd: null });
const FIELDS = Object.keys(DEFAULTS);
const { normalizeDigest } = require("./notificationControls");

function get(db, userId) {
  const row = db.prepare(`SELECT ${FIELDS.join(",")} FROM notification_preferences WHERE userId=?`).get(userId);
  return row ? { ...row } : { ...DEFAULTS };
}

function update(db, userId, body = {}) {
  const current = get(db, userId);
  const next = { ...current };
  for (const field of ["pushEnabled","money","marketplace","social","chat","system","extension"]) if (typeof body[field] === "boolean") next[field] = body[field] ? 1 : 0;
  if (body.digestEnabled !== undefined || body.digestFrequency !== undefined || body.quietStart !== undefined || body.quietEnd !== undefined) {
    const digest = normalizeDigest({ digestEnabled: body.digestEnabled === undefined ? next.digestEnabled : body.digestEnabled, digestFrequency: body.digestFrequency === undefined ? next.digestFrequency : body.digestFrequency, quietStart: body.quietStart === undefined ? next.quietStart : body.quietStart, quietEnd: body.quietEnd === undefined ? next.quietEnd : body.quietEnd });
    next.digestEnabled = digest.enabled ? 1 : 0; next.digestFrequency = digest.frequency; next.quietStart = digest.quietStart; next.quietEnd = digest.quietEnd;
  }
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO notification_preferences(userId,${FIELDS.join(",")},updatedAt)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(userId) DO UPDATE SET ${FIELDS.map(f => `${f}=excluded.${f}`).join(",")},updatedAt=excluded.updatedAt`)
    .run(userId, ...FIELDS.map(f => next[f]), now);
  return { ...next, updatedAt: now };
}

function allows(db, userId, type) {
  const prefs = get(db, userId);
  return !!prefs.pushEnabled && prefs[type] !== 0;
}

module.exports = { DEFAULTS, FIELDS, get, update, allows };

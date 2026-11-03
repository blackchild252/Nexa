"use strict";
const VISIBILITY = new Set(["public", "friends", "private"]);
const DATA_AVATAR_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i;
const MAX_DATA_AVATAR_CHARS = 1100000;
const MAX_BIO_WORDS = 200;
function countWords(value) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
function validateProfile(input = {}) {
  const bio = String(input.bio ?? "").trim();
  const avatarUrl = String(input.avatarUrl ?? "").trim();
  const visibility = String(input.visibility ?? "friends");
  const safety = require("./contentSafety").checkText(bio);
  if (!safety.allowed) return { error: safety.reason };
  if (countWords(bio) > MAX_BIO_WORDS) return { error: `Bio must be ${MAX_BIO_WORDS} words or fewer.` };
  if (!VISIBILITY.has(visibility)) return { error: "Visibility must be public, friends, or private." };
  if (avatarUrl) {
    const dataMatch = DATA_AVATAR_RE.exec(avatarUrl);
    if (dataMatch) {
      if (avatarUrl.length > MAX_DATA_AVATAR_CHARS) return { error: "Profile photo is too large." };
    } else {
      if (avatarUrl.length > 500) return { error: "Avatar URL is too long." };
      try {
        const u = new URL(avatarUrl);
        if (u.protocol !== "https:") return { error: "Avatar URL must use HTTPS." };
      } catch { return { error: "Enter a valid HTTPS avatar URL." }; }
    }
  }
  return { value: { bio, avatarUrl: avatarUrl || null, visibility } };
}
module.exports = { validateProfile, VISIBILITY, MAX_BIO_WORDS, countWords };

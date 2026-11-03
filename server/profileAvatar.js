"use strict";

const MAX_AVATAR_BYTES = 800 * 1024;
const MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function normalizeMime(value) {
  const mime = String(value || "").trim().toLowerCase();
  return mime === "image/jpg" ? "image/jpeg" : mime;
}

function hasMagic(buffer, mime) {
  if (mime === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (mime === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}

function validateAvatarPayload(input = {}) {
  const mime = normalizeMime(input.mimeType);
  const base64 = String(input.imageBase64 || "").replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
  if (!MIME.has(mime)) return { error: "Profile photos must be JPEG, PNG, or WebP." };
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return { error: "That profile photo could not be read." };
  if (base64.length > Math.ceil(MAX_AVATAR_BYTES / 3) * 4 + 8) return { error: "Profile photo must be 800 KB or smaller." };
  let buffer;
  try { buffer = Buffer.from(base64, "base64"); } catch (_) { return { error: "That profile photo could not be read." }; }
  if (!buffer.length || buffer.length > MAX_AVATAR_BYTES) return { error: "Profile photo must be 800 KB or smaller." };
  if (!hasMagic(buffer, mime)) return { error: "The selected file is not a valid image of the selected type." };
  return { value: { mimeType: mime, avatarUrl: `data:${mime};base64,${base64}`, bytes: buffer.length } };
}

module.exports = { MAX_AVATAR_BYTES, normalizeMime, hasMagic, validateAvatarPayload };

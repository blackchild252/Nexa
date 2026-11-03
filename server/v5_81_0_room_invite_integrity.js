'use strict';
const crypto = require('node:crypto');

const CODE_LENGTH = 8;
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const JOIN_RATE_LIMIT = { windowMs: 60_000, max: 20 };

function normalizeCode(value) {
  const code = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return CODE_RE.test(code) ? code : null;
}
function newCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) out += alphabet[crypto.randomInt(alphabet.length)];
  return out;
}
function expiryFrom(nowMs = Date.now(), ttlMs = DEFAULT_TTL_MS) {
  const ttl = Math.max(60_000, Math.min(MAX_TTL_MS, Number(ttlMs) || DEFAULT_TTL_MS));
  return new Date(nowMs + ttl).toISOString();
}
function isExpired(value, nowMs = Date.now()) {
  if (!value) return false;
  const t = Date.parse(value);
  return !Number.isFinite(t) || t <= nowMs;
}
function inviteContract() {
  return { codeLength: CODE_LENGTH, bounded: true, cryptographicGeneration: true, expiring: true, rotatable: true, revocable: true, ownerOnlyReveal: true, joinRateLimited: true, noImplicitExtension: true };
}
module.exports = { CODE_LENGTH, CODE_RE, DEFAULT_TTL_MS, MAX_TTL_MS, JOIN_RATE_LIMIT, normalizeCode, newCode, expiryFrom, isExpired, inviteContract };

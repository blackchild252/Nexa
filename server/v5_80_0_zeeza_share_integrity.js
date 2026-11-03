'use strict';
const crypto = require('node:crypto');

const TOKEN_LENGTH = 32;
const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
const SHARE_CACHE_CONTROL = 'no-store';
const SHARE_RATE_LIMIT = { windowMs: 60_000, max: 60 };

function normalizeToken(value) {
  const token = String(value || '').trim();
  return TOKEN_RE.test(token) ? token : null;
}

function newToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function shareableUserQuery() {
  return `SELECT id, name, username, profileBio, avatarUrl, profileVisibility, accountStatus, zeezaShareToken FROM users WHERE zeezaShareToken = ? AND COALESCE(accountStatus, 'active') = 'active' AND COALESCE(profileVisibility, 'friends') != 'private'`;
}

function shareableProfileQuery() {
  return `SELECT id, name, username, profileBio, avatarUrl, profileVisibility, accountStatus, zeezaShareToken FROM users WHERE id = ? AND COALESCE(accountStatus, 'active') = 'active' AND COALESCE(profileVisibility, 'friends') != 'private'`;
}

function visibilityContract() {
  return {
    tokenBytes: 24,
    tokenLength: TOKEN_LENGTH,
    activeAccountRequired: true,
    privateProfilesBlocked: true,
    revocable: true,
    rotatable: true,
    noStore: true,
    bounded: true,
    rateLimited: true,
  };
}

module.exports = {
  TOKEN_LENGTH,
  TOKEN_RE,
  SHARE_CACHE_CONTROL,
  SHARE_RATE_LIMIT,
  normalizeToken,
  newToken,
  shareableUserQuery,
  shareableProfileQuery,
  visibilityContract,
};

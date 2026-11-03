'use strict';
// Runtime release identity (V<major>.<minor>.<patch> B<batch>, build code).
// The file is written ONLY by `node scripts/release-identity.mjs bump` and verified by `... check`.
// Missing/corrupt data never stops the server: identity then reports null and the check fails in CI.
const fs = require('node:fs');
const path = require('node:path');

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'releaseIdentity.json'), 'utf8'));
    const ok = /^\d+\.\d+\.\d+$/.test(raw.version) && /^B\d+$/.test(raw.batch) && Number.isInteger(raw.buildCode);
    return ok ? { version: raw.version, batch: raw.batch, buildCode: raw.buildCode } : null;
  } catch (_) { return null; }
}

const identity = load();

/** Public, non-secret fields for health probes so a running server can be matched to its build. */
function publicIdentity() {
  return identity ? { batch: identity.batch, build: identity.buildCode } : {};
}
function label() {
  return identity ? `V${identity.version} ${identity.batch} (build ${identity.buildCode})` : 'identity unavailable';
}
module.exports = { identity, publicIdentity, label };

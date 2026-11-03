'use strict';
// Shared helper for historical release-pin tests: a batch test asserts the
// project is AT LEAST the version it shipped, so later releases don't break it.
const parse = (v) => String(v).replace(/^V/i, '').split('.').map((n) => parseInt(n, 10) || 0);

function atLeast(actual, min) {
  if (actual === null || actual === undefined) return false;
  const a = parse(actual);
  const b = parse(min);
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return true;
}

function currentVersionMd(text) {
  const m = /\*\*Current Version:\*\*\s*V(\d+\.\d+\.\d+)/.exec(String(text));
  return m ? m[1] : null;
}

module.exports = { atLeast, currentVersionMd };

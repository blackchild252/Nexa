"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { purgeExpiredSessions } = require("./sessionMaintenance");

test("expired session cleanup is bounded to expiry timestamp", () => {
  const calls=[];
  const db={prepare(sql){calls.push(sql);return{run(...args){calls.push(args);return{changes:3};}};}};
  const result=purgeExpiredSessions(db,new Date("2026-09-26T00:00:00.000Z"));
  assert.equal(result.deleted,3);
  assert.match(calls[0],/DELETE FROM sessions WHERE expiresAt <= \?/);
  assert.equal(calls[1][0],"2026-09-26T00:00:00.000Z");
});

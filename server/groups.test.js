"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { settleUp } = require("./groups");

test("group split settle-up produces the minimum clearing payments", () => {
  const payments = settleUp([
    { memberId: "a", net: 10000 },
    { memberId: "b", net: -6000 },
    { memberId: "c", net: -4000 },
  ]);
  assert.deepEqual(payments, [
    { fromMemberId: "b", toMemberId: "a", amount: 60 },
    { fromMemberId: "c", toMemberId: "a", amount: 40 },
  ]);
});

test("group split settle-up handles multiple creditors and debtors", () => {
  const payments = settleUp([
    { memberId: "a", net: 7000 },
    { memberId: "b", net: 3000 },
    { memberId: "c", net: -8000 },
    { memberId: "d", net: -2000 },
  ]);
  assert.deepEqual(payments, [
    { fromMemberId: "c", toMemberId: "a", amount: 70 },
    { fromMemberId: "c", toMemberId: "b", amount: 10 },
    { fromMemberId: "d", toMemberId: "b", amount: 20 },
  ]);
});

test("group split settle-up ignores already-cleared members", () => {
  assert.deepEqual(settleUp([
    { memberId: "a", net: 0 },
    { memberId: "b", net: 0 },
  ]), []);
});

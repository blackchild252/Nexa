"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { isConfiguredAdmin } = require("./mallAdmin");

test("admin access accepts configured email and rejects non-admin email", () => {
  const env = { NEXA_ADMIN_EMAILS: "admin@nexa.test, owner@nexa.test", NEXA_ADMIN_USER_IDS: "" };
  assert.equal(isConfiguredAdmin({ id: "u1", email: "ADMIN@NEXA.TEST" }, env), true);
  assert.equal(isConfiguredAdmin({ id: "u2", email: "user@nexa.test" }, env), false);
});

test("admin access accepts configured user id", () => {
  const env = { NEXA_ADMIN_EMAILS: "", NEXA_ADMIN_USER_IDS: "u_admin,u_ops" };
  assert.equal(isConfiguredAdmin({ id: "u_ops", email: "ops@nexa.test" }, env), true);
  assert.equal(isConfiguredAdmin({ id: "u_other", email: "ops@nexa.test" }, env), false);
});

"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const security = fs.readFileSync(path.join(__dirname, "adminSecurityCenter.js"), "utf8");
const access = fs.readFileSync(path.join(__dirname, "adminAccess.js"), "utf8");
test("M7125 sensitive administrator mutations map to explicit action-bound confirmation", () => {
  for (const action of ["admin_account_create", "admin_role_change", "verification_decision", "financial_action", "account_deactivation", "moderation_decision", "privileged_staff_action"]) assert.ok(security.includes(action), `missing privileged action class ${action}`);
  assert.match(access, /STEP_UP_REQUIRED/);
  assert.match(security, /req\.session\.sessionId, action/);
  assert.match(security, /UPDATE admin_security_step_up SET consumedAt/);
});
test("M7125 read-only requests do not trigger privileged-action confirmation", () => {
  const start = security.indexOf("function stepUpAction(req)");
  const end = security.indexOf("function requiresMfa", start);
  const fn = security.slice(start, end);
  assert.ok(fn.includes('if (method === "GET" || method === "HEAD") return null;'));
  assert.ok(fn.includes('return "verification_decision"'));
  assert.ok(fn.includes('return "financial_action"'));
});

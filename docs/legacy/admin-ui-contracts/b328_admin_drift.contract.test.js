"use strict";
// B328: two drift tests for the admin side.
//  M4598: every page permission in admin-web exists on the server and matches the guide.
//  M4603: every admin route the server registers is in the guide, or is listed here as not for the admin app (with the reason).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PERMISSIONS } = require("./adminAccess");

const root = path.join(__dirname, "..");
const guide = fs.readFileSync(path.join(root, "docs", "ADMIN_ROUTES_GUIDE.md"), "utf8");
const norm = (p) => p.replace(/:[A-Za-z]+/g, ":p");

// Routes the server has that the admin app does not use yet. Each needs a reason. When a screen is built, move it to the guide and delete the line.
const NOT_FOR_ADMIN_APP = {
  "GET /api/admin/staff/me": "Staff self-service route; not part of the owner Admin web surface.",
  "POST /api/admin/staff/work/:p/submit": "Staff self-service work submission; not part of the owner Admin web surface.",
};

test("B328 M4598 every page permission in admin-web exists on the server, matches the guide, and no role has a stray name", () => {
  const app = fs.readFileSync(path.join(root, "admin-web", "src", "app.js"), "utf8");
  const used = new Set([...app.matchAll(/permission: "([a-z_]+)"/g)].map((m) => m[1]));
  assert.ok(used.size >= 10, `found only ${used.size} page permissions`);
  const owner = PERMISSIONS.owner;
  for (const p of used) assert.ok(owner.has(p), `admin-web page uses "${p}" but the server has no such permission`);
  const line = guide.split("\n").find((l) => l.startsWith("Permission names:"));
  assert.ok(line, "the guide lists the permission names");
  const documented = new Set([...line.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]));
  assert.deepEqual([...owner].sort(), [...documented].sort(), "the guide's permission names match the server's owner role");
  for (const role of ["reviewer", "support"]) for (const p of PERMISSIONS[role]) assert.ok(owner.has(p), `${role} has "${p}" which the owner does not`);
  // Every permission the server checks with admin.require("...") exists.
  for (const f of fs.readdirSync(__dirname).filter((n) => n.endsWith(".js") && !/\.test\.js$/.test(n))) {
    const src = fs.readFileSync(path.join(__dirname, f), "utf8");
    for (const m of src.matchAll(/\badmin\.require\(\s*"([a-z_]+)"\s*\)/g)) assert.ok(owner.has(m[1]), `${f} requires unknown permission "${m[1]}"`);
  }
});

test("B328 M4603 every admin route the server registers is in the guide or listed as not for the admin app", () => {
  const listed = new Set([...guide.matchAll(/`(GET|POST|PUT|PATCH|DELETE) (\/api\/[^`\s(]+)`/g)].map((m) => `${m[1]} ${norm(m[2])}`));
  const registered = new Set();
  for (const f of fs.readdirSync(__dirname).filter((n) => n.endsWith(".js") && !/\.test\.js$/.test(n))) {
    const src = fs.readFileSync(path.join(__dirname, f), "utf8");
    for (const m of src.matchAll(/\bapp\.(get|post|put|patch|delete)\(\s*["\'](\/api\/[^"\']+)["\']/g)) if (/\/admin(\/|$)/.test(m[2])) registered.add(`${m[1].toUpperCase()} ${norm(m[2])}`);
  }
  assert.ok(registered.size >= 30, `found only ${registered.size} admin routes`);
  const unknown = [...registered].filter((r) => !listed.has(r) && !NOT_FOR_ADMIN_APP[r]);
  assert.deepEqual(unknown, [], `admin routes with no guide entry and no reason: ${unknown.join(", ")}`);
  const stale = Object.keys(NOT_FOR_ADMIN_APP).filter((r) => !registered.has(r) || listed.has(r));
  assert.deepEqual(stale, [], `remove these from NOT_FOR_ADMIN_APP (gone from the server, or now in the guide): ${stale.join(", ")}`);
  const dead = [...listed].filter((r) => /\/admin(\/|$)/.test(r) && !registered.has(r));
  assert.deepEqual(dead, [], `the guide lists admin routes the server does not register: ${dead.join(", ")}`);
});

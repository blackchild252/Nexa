"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const L = require("./staffLinks");

const file = path.join(__dirname, "..", "src", "staffLinkStates.ts");
const src = fs.readFileSync(file, "utf8");

// Reads the same data the client uses, by running the TypeScript file with Node's own type stripping.
const canRun = process.features && process.features.typescript ? {} : { skip: "This Node cannot run TypeScript files directly; client wording NOT TESTED here." };
async function load() { return import(require("node:url").pathToFileURL(file).href); }

test("M7787: every server link status has client wording, and only 'approved' can work", canRun, async () => {
  const M = await load();
  for (const s of L.STATUSES) {
    const v = M.staffLinkStateView(s);
    assert.ok(v.label && v.detail && v.accessibilityLabel, `${s} needs label, detail and spoken label`);
    assert.equal(v.canWork, s === "approved", `${s} canWork`);
    assert.notEqual(v.label, "Unavailable", `${s} must be a known state`);
  }
});

test("M7787: an unknown or hostile state fails closed", canRun, async () => {
  const M = await load();
  for (const bad of ["", "ACTIVE", "__proto__", "constructor", null, undefined, 7, {}]) {
    const v = M.staffLinkStateView(bad);
    assert.equal(v.canWork, false);
    assert.equal(v.label, "Unavailable");
  }
});

test("M7787: the door wording never says who the boss is or whether the account is staff, and has one refusal", canRun, async () => {
  const M = await load();
  assert.equal(typeof M.STAFF_DOOR_REFUSAL, "string");
  assert.equal(/not staff|no link|boss|vendor|suspend|paused|locked|too many|exist/i.test(M.STAFF_DOOR_REFUSAL), false);
  assert.ok(M.STAFF_DOOR_COPY.buttonAccessibilityLabel.length > M.STAFF_DOOR_COPY.buttonLabel.length - 1);
  assert.equal(/\bpassword\b/i.test(JSON.stringify(M.STAFF_DOOR_COPY)), false, "staff use their NEXA sign-in; the door never asks for a separate password");
});

test("M7787: the client module is plain data (no React, no network, no storage)", () => {
  assert.equal(/from\s+["']react|require\(|fetch\(|AsyncStorage|SecureStore/.test(src), false);
});

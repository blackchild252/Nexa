"use strict";
// B328: guards for the phone-app items of set C1. These read the code; none of this was seen on a phone.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("B328 M4594 a suspended account: the app keeps the server's code, signs out mid-session, and the sign-in screen says why", () => {
  const api = read("src/api.ts");
  assert.match(api, /serverCode === 'ACCOUNT_SUSPENDED'\) \? 'ACCOUNT_SUSPENDED'/, "the code is kept");
  assert.match(api, /res\.status === 403 && error\.code === 'ACCOUNT_SUSPENDED'\) \{ authNotice = error\.message; if \(authFailureHandler\) await authFailureHandler\(\)/, "signed out with the reason");
  assert.match(api, /export function takeAuthNotice\(\)/);
  const login = read("src/app/auth/login.tsx");
  assert.match(login, /takeAuthNotice\(\)/); assert.match(login, /Alert\.alert\('Account suspended',n\)/);
  assert.match(login, /Alert\.alert\('Sign in',validation\.message\)/, "ordinary sign-in errors are untouched");
  // The server code the app now relies on is still sent.
  assert.match(read("server/auth.js"), /code:"ACCOUNT_SUSPENDED"/);
});

test("B328 M4600 raw animation durations only remain in the world-ambient artwork files", () => {
  const world = /^(NexaEarth|NexaDark|NexaCosmos|NexaModuleAtmosphere|NexaSceneAccent|NexaDepthLayer|NexaCinematicFrame)/;
  const offenders = [];
  const walk = (dir) => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) { walk(rel); continue; }
    if (!/\.(ts|tsx)$/.test(e.name) || e.name === "motionTiming.ts" || world.test(e.name)) continue;
    if (/duration:\s*[0-9]{2,5}\b/.test(read(rel))) offenders.push(rel);
  } };
  walk("src");
  assert.deepEqual(offenders, [], `use a step from src/motionTiming.ts instead of a raw number: ${offenders.join(", ")}`);
});

test("B328 M4601 the nav bar title can wrap to two lines instead of being cut off, labels stay 14, keys stay 44", () => {
  const nav = read("src/NexaNavKeys.tsx");
  assert.match(nav, /style=\{st\.title\} numberOfLines=\{2\}/);
  assert.match(nav, /rowLabel: \{ flex: 1, color: theme\.colors\.ivoryText, fontSize: 16,/);
});

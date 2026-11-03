"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("source smoke: unauthenticated login surface remains reachable and actionable", () => {
  const login = read("src/app/auth/login.tsx");
  assert.match(login, /export default function Login/);
  assert.match(login, /Welcome back/);
  assert.match(login, /Sign in/);
  assert.match(login, /Create a NEXA account/);
  assert.match(login, /signIn\(normalizedEmail,password,true\)/);
});

test("source smoke: signup surface remains reachable and actionable", () => {
  const signup = read("src/app/auth/signup.tsx");
  assert.match(signup, /export default function Signup/);
  assert.match(signup, /Create your NEXA account/);
  assert.match(signup, /Create account/);
  assert.match(signup, /Already have an account\? Sign in/);
  assert.match(signup, /signUp\(normalizedEmail,password,name,true\)/);
});

test("source smoke: current primary navigation remains wired", () => {
  const nav = read("src/homeDesign.ts");
  for (const id of ["home","dami","zeeza","money","marketplace","vendor","yaayz","leisure","notifications","search","profile","extensions","developer"]) assert.match(nav, new RegExp(`\\['${id}',`), id);
});

test("source smoke: core auth API routes remain server-side", () => {
  const server = read("server/index.js");
  assert.match(server, /app\.post\("\/api\/auth\/login"/);
  assert.match(server, /app\.post\("\/api\/auth\/signup"/);
  assert.match(server, /app\.post\("\/api\/auth\/logout"/);
  assert.match(server, /app\.get\("\/api\/auth\/me"/);
});

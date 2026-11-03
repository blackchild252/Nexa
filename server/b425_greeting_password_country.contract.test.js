"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");

test("M6392 Main Home has personalized greeting", () => {
  const src = read("src/HomeCommandCenter.tsx");
  assert.match(src, /Hello, \{greetingName\} 👋/);
  assert.match(src, /const \{ user \} = useAuth\(\)/);
});

test("M6395/M6396 new password policy has five requirements", () => {
  const src = read("src/authValidation.ts");
  for (const pattern of [/lowercase:/, /uppercase:/, /special:/, /number:/, /length:/, /validateNewPassword/]) assert.match(src, pattern);
});

test("M6397 signup exposes the live password checklist", () => {
  const src = read("src/app/auth/signup.tsx");
  assert.match(src, /Your password should contain:/);
  assert.match(src, /A lowercase letter \(a\)/);
  assert.match(src, /An Uppercase letter \(A\)/);
  assert.match(src, /A special character \(@#\$%!\)/);
  assert.match(src, /A number \(1\)/);
  assert.match(src, /8 characters minimum/);
});

test("M6399 server signup enforces the same strong password policy", () => {
  const src = read("server/auth.js");
  assert.match(src, /function cleanSignupPassword/);
  assert.match(src, /\[a-z\]/);
  assert.match(src, /\[A-Z\]/);
  assert.match(src, /\[0-9\]/);
  assert.match(src, /\[\^A-Za-z0-9\]/);
  assert.match(src, /password=cleanSignupPassword\(password\)/);
});

test("M6402 Main country dataset contains all 249 ISO entries", () => {
  const src = read("src/countries.ts");
  assert.equal((src.match(/\"code\":/g) || []).length, 249);
});

test("M6403-M6407 country picker has search and radio selection", () => {
  const src = read("src/CountryPicker.tsx");
  assert.match(src, /Search country/);
  assert.match(src, /accessibilityRole=\"radio\"/);
  assert.match(src, /textTransform: 'uppercase'/);
  assert.match(src, /NEXA_COUNTRIES/);
});

test("M6408-M6410 existing country fields use the picker", () => {
  const zeeza = read("src/ZeezaProfile.tsx");
  const kitchen = read("src/KitchenHub.tsx");
  assert.match(zeeza, /<CountryPicker label=\"Neighbouring country\"/);
  assert.match(kitchen, /<CountryPicker label=\"Country\"/);
  assert.match(kitchen, /<CountryPicker label=\"Delivery country\"/);
});


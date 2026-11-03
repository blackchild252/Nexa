"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { DAMI_LANGUAGES, getDamiLanguage, normalizeDamiLanguage, isSupportedDamiLanguage } = require("./damiLanguage");
const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "index.js"), "utf8");

test("Dami language catalog is unique, explicit, and includes Nigerian languages", () => {
  const codes = DAMI_LANGUAGES.map((x) => x.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const code of ["auto", "en", "pcm", "yo", "ig", "ha", "fr", "es", "pt", "de", "it", "ar", "hi", "zh", "ja", "ko"]) assert.equal(isSupportedDamiLanguage(code), true);
  assert.equal(getDamiLanguage("yo").label, "Yorùbá");
});

test("legacy language preferences normalize without changing voice selection", () => {
  assert.equal(normalizeDamiLanguage(null, "pidgin"), "pcm");
  assert.equal(normalizeDamiLanguage(null, "nigerian"), "en");
  assert.equal(normalizeDamiLanguage("yo", "pidgin"), "yo");
  assert.equal(normalizeDamiLanguage("unknown", "unknown"), "auto");
});

test("selected language is propagated into Dami chat and realtime voice instructions", () => {
  assert.match(source, /pref\.language\.instruction/);
  assert.match(source, /The user selected \$\{voicePref\.language\.label\}/);
  assert.match(source, /languageCode/);
  assert.match(source, /DAMI_LANGUAGES/);
});

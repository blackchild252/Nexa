const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const dbSource = fs.readFileSync(require.resolve("./db"), "utf8");
const serverSource = fs.readFileSync(require.resolve("./index"), "utf8");
const languageSource = fs.readFileSync(require.resolve("./damiLanguage"), "utf8");
const aiSurface = fs.readFileSync(require.resolve("../src/NexaAI.tsx"), "utf8");


test("Dami voice preferences are user-scoped and expose a selectable language catalog", () => {
  assert.match(dbSource, /CREATE TABLE IF NOT EXISTS ai_voice_preferences/);
  assert.match(dbSource, /languageCode TEXT NOT NULL DEFAULT 'auto'/);
  assert.match(serverSource, /voiceStyle.*female.*male/);
  assert.match(serverSource, /DAMI_LANGUAGES/);
  assert.match(serverSource, /WHERE userId = \?/);
  assert.match(languageSource, /code: "auto"/);
  assert.match(languageSource, /code: "pcm"/);
  assert.match(languageSource, /code: "yo"/);
  assert.match(languageSource, /code: "ig"/);
  assert.match(languageSource, /code: "ha"/);
  assert.match(aiSurface, /DAMI_LANGUAGES/);
  assert.match(aiSurface, /Naija Pidgin/);
  assert.match(aiSurface, /Yorùbá/);
  assert.match(aiSurface, /日本語/);
});

test("Dami realtime voice is explicitly unavailable in local-only mode", () => {
  assert.match(serverSource, /Realtime voice is disabled in local-only mode/);
  assert.doesNotMatch(serverSource, /OPENAI_REALTIME_MALE_VOICE/);
  assert.doesNotMatch(serverSource, /OPENAI_REALTIME_FEMALE_VOICE/);
});

test("Dami chat honors the selected language without exposing credentials", () => {
  assert.match(serverSource, /User Dami language preference/);
  assert.match(serverSource, /languageCode/);
  assert.doesNotMatch(serverSource, /OPENAI_API_KEY.*res\.json/);
});

test("legacy Naija language preferences normalize safely to the new language codes", () => {
  const { normalizeDamiLanguage, isSupportedDamiLanguage } = require("./damiLanguage");
  assert.equal(normalizeDamiLanguage(null, "nigerian"), "en");
  assert.equal(normalizeDamiLanguage(null, "pidgin"), "pcm");
  assert.equal(normalizeDamiLanguage("yo", "auto"), "yo");
  assert.equal(normalizeDamiLanguage("not-a-language", "auto"), "auto");
  assert.equal(isSupportedDamiLanguage("ja"), true);
  assert.equal(isSupportedDamiLanguage("xx"), false);
});

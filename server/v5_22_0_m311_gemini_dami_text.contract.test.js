"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const textProvider = fs.readFileSync(path.join(__dirname, "damiTextProvider.js"), "utf8");

test("M311 keeps Gemini routing scoped to Dami core text, not specialist tool paths", () => {
  assert.match(index, /require\('\.\/damiTextProvider'\)/);
  assert.match(index, /damiResponsesCreate\(\{\n      model: MODEL,\n      input,\n    \}, \{ providerAware: true \}\)/);
  assert.match(index, /damiResponsesCreate\(\{ model: MODEL, input: followup \}, \{ providerAware: true \}\)/);
  assert.match(index, /if \(providerAware\) \{/);
  assert.match(textProvider, /resolveProvider\(env\.DAMI_AI_PROVIDER \|\| env\.NEXA_AI_PROVIDER, env\)/);
});

test("M311 leaves specialist calls on the legacy OpenAI client boundary", () => {
  const specialistSection = index.slice(index.indexOf("async function runSpecialist"), index.indexOf("function runNexaReadTool"));
  assert.ok(specialistSection.length > 1000);
  assert.doesNotMatch(specialistSection, /providerAware:\s*true/);
  assert.match(specialistSection, /damiResponsesCreate\(\{/);
});

test("M311 Gemini path is additive and does not expose credentials", () => {
  assert.doesNotMatch(textProvider, /API_KEY/);
  assert.match(index, /const { generateDamiText } = require\('\.\/damiTextProvider'\)/);
});

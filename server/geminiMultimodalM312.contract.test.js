"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function read(name) { return fs.readFileSync(require("node:path").join(__dirname, "..", name), "utf8"); }

test("M312 wires the existing ScamCheck image route to the provider gateway", () => {
  const s = read("server/index.js");
  assert.match(s, /analyzeImage: analyzeAIImage/);
  assert.match(s, /resolveProvider\(process\.env\.DAMI_AI_PROVIDER/);
  assert.match(s, /selectedProvider === PROVIDERS\.GEMINI/);
});

test("M312 preserves the existing OpenAI vision request as the default branch", () => {
  const s = read("server/index.js");
  assert.match(s, /type: "input_image"/);
  assert.match(s, /image_url: dataUrl/);
  assert.match(s, /damiResponsesCreate\(\{\n\s+model: MODEL/);
});

test("M312 keeps Gemini multimodal server-side and configurable", () => {
  const s = read("server/geminiProvider.js");
  assert.match(s, /await import\("@google\/genai"\)/);
  assert.match(s, /GEMINI_VISION_MODEL/);
  assert.doesNotMatch(s, /EXPO_PUBLIC_GEMINI|process\.env\.EXPO_PUBLIC/);
});

test("M312 documents the 20MB inline-image boundary and uses a stricter NEXA image cap", () => {
  const s = read("server/geminiProvider.js");
  assert.match(s, /12 \* 1024 \* 1024/);
  const docs = read("docs/GEMINI_MULTIMODAL_M312.md");
  assert.match(docs, /20 MB/i);
  assert.match(docs, /12 MB/i);
});

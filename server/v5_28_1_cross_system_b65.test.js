"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");

test("B65 visual layer keeps shared environment and decorative depth non-interactive", () => {
  const bg = read("src/NexaWorldBackground.tsx");
  const atmosphere = read("src/NexaModuleAtmosphere.tsx");
  assert.match(bg, /edgeVignette/);
  assert.match(bg, /pointerEvents=\"none\"/);
  assert.match(atmosphere, /NexaGlossyOrb/);
  assert.match(atmosphere, /pointerEvents=\"none\"/);
});

test("B65 realtime voice is disabled in local-only mode without external provider calls", () => {
  const server = read("server/index.js");
  const client = read("src/realtimeVoice.ts");
  assert.match(server, /app\.post\("\/api\/realtime\/client-secret", auth\.authMiddleware/);
  assert.match(server, /Realtime voice is disabled in local-only mode/);
  assert.match(client, /Realtime voice is disabled in local-only mode/);
  assert.doesNotMatch(client, /api\.openai\.com/);
});

test("B65 Gemini remains server-only and provider gated", () => {
  const gemini = read("server/geminiProvider.js");
  const gateway = read("server/aiProviderGateway.js");
  assert.match(gemini, /import\("@google\/genai"\)/);
  assert.match(gemini, /Gemini provider is disabled/);
  assert.match(gateway, /resolveProviderWithFailover/);
});

test("B65 telemetry never stores raw AI payloads", () => {
  const telemetry = read("server/aiObservability.js");
  assert.match(telemetry, /SENSITIVE_KEYS/);
  assert.match(telemetry, /\[redacted\]/);
  assert.doesNotMatch(telemetry, /console\.log\(.*prompt/);
});

test("B65 realtime client fails closed without opening a network connection", () => {
  const client = read("src/realtimeVoice.ts");
  assert.match(client, /Realtime voice is disabled in local-only mode/);
  assert.doesNotMatch(client, /fetch\(/);
});

test("NEXA release identity is synchronized without an in-app roadmap", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const memory = JSON.parse(fs.readFileSync(path.join(root, "PROJECT_MEMORY.json"), "utf8"));
  assert.equal(pkg.version, memory.currentVersion);
  assert.match(read("VERSION.md"), new RegExp(`V${pkg.version.replace(/\./g, "\\.")}`));
  assert.equal(fs.existsSync(path.join(root, "MASTER_ROADMAP.md")), true);
});

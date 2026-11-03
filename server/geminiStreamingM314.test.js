"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { generateTextStream, getGeminiStatus } = require("./geminiProvider");
const { streamText, PROVIDERS } = require("./aiProviderGateway");
const { streamDamiText } = require("./damiTextProvider");

function env() {
  return { GEMINI_ENABLED: "true", GEMINI_API_KEY: "secret", GEMINI_MODEL: "test-stream-model", DAMI_AI_PROVIDER: "google-gemini" };
}

function mockClient() {
  return {
    models: {
      async *generateContentStream() {
        yield { text: "Hello " };
        yield { text: "from Gemini." };
      },
    },
  };
}

test("Gemini streaming yields ordered text deltas without exposing credentials", async () => {
  const chunks = [];
  for await (const chunk of generateTextStream({ input: "hello", env: env(), dependencies: { loadClient: async () => mockClient() } })) {
    chunks.push(chunk);
  }
  assert.deepEqual(chunks.map((x) => x.text), ["Hello ", "from Gemini."]);
  assert.equal(chunks.every((x) => x.provider === PROVIDERS.GEMINI), true);
  assert.equal(JSON.stringify(chunks).includes("secret"), false);
});

test("Gemini streaming rejects disabled providers before loading the SDK", async () => {
  let loaded = false;
  await assert.rejects(
    async () => {
      for await (const _ of generateTextStream({ input: "hello", env: { GEMINI_ENABLED: "false", GEMINI_API_KEY: "secret" }, dependencies: { loadClient: async () => { loaded = true; return mockClient(); } } })) {}
    },
    /Gemini provider is disabled/
  );
  assert.equal(loaded, false);
});

test("gateway exposes Gemini streaming while preserving OpenAI as default", async () => {
  const chunks = [];
  for await (const chunk of streamText({ provider: PROVIDERS.GEMINI, input: "hello" }, { env: env(), dependencies: { loadClient: async () => mockClient() } })) chunks.push(chunk);
  assert.equal(chunks.map((x) => x.text).join(""), "Hello from Gemini.");
});

test("Dami streaming normalizes system and conversation messages", async () => {
  const chunks = [];
  for await (const chunk of streamDamiText({
    input: [
      { role: "system", content: "Be concise." },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
    ],
    env: env(),
    dependencies: { loadClient: async () => mockClient() },
  })) chunks.push(chunk);
  assert.equal(chunks.map((x) => x.text).join(""), "Hello from Gemini.");
});

test("Gemini status remains secret-free", () => {
  const status = getGeminiStatus(env());
  assert.equal(status.available, true);
  assert.equal(JSON.stringify(status).includes("secret"), false);
});

test("Gemini tool declarations are bounded and function calls are returned without executing them", async () => {
  const calls = [];
  const result = await require("./geminiProvider").generateWithTools({
    input: "show my money summary",
    tools: [{ name: "money_summary", description: "Read the user's money summary.", parametersJsonSchema: { type: "object", properties: {} } }],
    env: env(),
    dependencies: {
      loadClient: async () => ({ models: { async generateContent(request) {
        calls.push(request);
        return { text: "", functionCalls: [{ name: "money_summary", args: {} }, { name: "unknown", args: {} }] };
      } } }),
    },
  });
  assert.equal(result.functionCalls.length, 2);
  assert.equal(calls[0].config.tools[0].functionDeclarations[0].name, "money_summary");
  assert.equal(calls[0].config.tools[0].functionDeclarations.length, 1);
});

"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { PROVIDERS, normalizeDamiInput, generateDamiText } = require("./damiTextProvider");

test("Dami provider input keeps system instructions separate from conversation", () => {
  const out = normalizeDamiInput([
    { role: "system", content: "You are Dami." },
    { role: "system", content: "Speak concisely." },
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there." },
  ]);
  assert.equal(out.systemInstruction, "You are Dami.\n\nSpeak concisely.");
  assert.equal(out.input, "User: Hello\n\nDami: Hi there.");
});

test("Dami provider rejects an empty normalized conversation", async () => {
  await assert.rejects(
    () => generateDamiText({ input: [{ role: "system", content: "Only instructions" }], env: {} }),
    /Dami input is required/
  );
});

test("Dami text can use an injected Grok adapter through the gateway", async () => {
  const result = await generateDamiText(
    {
      input: [{ role: "system", content: "You are Dami." }, { role: "user", content: "Hello" }],
      model: "test-model",
      env: { XAI_API_KEY: "secret" },
      dependencies: {
        grokAdapter: {
          async generateText(options) {
            assert.equal(options.input, "User: Hello");
            assert.equal(options.systemInstruction, "You are Dami.");
            return { text: "Hello from Dami", provider: PROVIDERS.GROK, model: options.model };
          },
        },
      },
    }
  );
  assert.deepEqual(result, { text: "Hello from Dami", provider: PROVIDERS.GROK, model: "test-model" });
});

test("Dami text fails closed when Gemini is explicitly selected but unavailable", async () => {
  await assert.rejects(
    () => generateDamiText({ input: [{ role: "user", content: "Hello" }], env: { DAMI_AI_PROVIDER: "gemini", GEMINI_ENABLED: "false", GEMINI_API_KEY: "secret" } }),
    /Google Gemini provider is unavailable/
  );
});

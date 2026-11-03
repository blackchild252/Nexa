"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PROVIDERS,
  DEFAULT_PROVIDER,
  normalizeProvider,
  getProviderStatus,
  resolveProvider,
  generateText,
  analyzeImage,
} = require("./aiProviderGateway");

test("provider gateway defaults to the Grok path", () => {
  assert.equal(DEFAULT_PROVIDER, PROVIDERS.GROK);
  assert.equal(normalizeProvider(""), PROVIDERS.GROK);
  assert.equal(normalizeProvider("unknown-provider"), PROVIDERS.GROK);
});

test("provider aliases normalize to Google Gemini", () => {
  assert.equal(normalizeProvider("gemini"), PROVIDERS.GEMINI);
  assert.equal(normalizeProvider("google"), PROVIDERS.GEMINI);
  assert.equal(normalizeProvider("google-gemini"), PROVIDERS.GEMINI);
});

test("provider status exposes configuration but never provider secrets", () => {
  const status = getProviderStatus({
    XAI_API_KEY: "openai-secret",
    GEMINI_ENABLED: "true",
    GEMINI_API_KEY: "gemini-secret",
  });
  assert.equal(status.defaultProvider, PROVIDERS.GROK);
  assert.equal(status.providers[PROVIDERS.GROK].configured, true);
  assert.equal(status.providers[PROVIDERS.GEMINI].available, true);
  assert.equal(JSON.stringify(status).includes("openai-secret"), false);
  assert.equal(JSON.stringify(status).includes("gemini-secret"), false);
});

test("Gemini cannot be selected while it is unavailable", () => {
  assert.throws(
    () => resolveProvider(PROVIDERS.GEMINI, { GEMINI_ENABLED: "false", GEMINI_API_KEY: "secret" }),
    /Google Gemini provider is unavailable/
  );
});

test("gateway can execute an injected Grok adapter without changing the legacy client path", async () => {
  const result = await generateText(
    { input: "hello", model: "test-model" },
    {
      env: { XAI_API_KEY: "secret", XAI_MODEL: "test-model" },
      dependencies: {
        grokAdapter: {
          async generateText(options) {
            return { text: "legacy-grok-response", provider: PROVIDERS.GROK, model: options.model };
          },
        },
      },
    }
  );
  assert.deepEqual(result, { text: "legacy-grok-response", provider: PROVIDERS.GROK, model: "test-model" });
});


test("gateway routes Gemini image analysis through the multimodal adapter", async () => {
  // Environment-independent: inject a fake Gemini client instead of depending on whether the SDK is installed.
  let seenKey = null;
  const loadClient = async (key) => { seenKey = key; return { models: { generateContent: async () => ({ text: "gemini-image-result" }) } }; };
  const result = await analyzeImage(
    { provider: PROVIDERS.GEMINI, imageBase64: "aGVsbG8=", mimeType: "image/jpeg", prompt: "analyse" },
    { env: { GEMINI_ENABLED: "true", GEMINI_API_KEY: "secret" }, dependencies: { loadClient } }
  );
  assert.equal(seenKey, "secret");
  assert.equal(result.text, "gemini-image-result");
  assert.equal(result.provider, "google-gemini");
});

test("gateway keeps Grok multimodal on the direct path when no adapter is injected", async () => {
  let seen = null;
  const fetch = async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ output_text: "grok-image-result" }) }; };
  const result = await analyzeImage({ provider: PROVIDERS.GROK, imageBase64: "aGVsbG8=", mimeType: "image/jpeg", prompt: "analyse" }, { env: { XAI_API_KEY: "secret" }, dependencies: { fetch } });
  assert.equal(result.text, "grok-image-result");
  assert.equal(result.provider, "xai-grok");
  assert.match(seen.url, /\/responses$/);
  assert.match(seen.init.body, /input_image/);
});

test("legacy openai provider values resolve to Grok", () => {
  assert.equal(normalizeProvider("openai"), PROVIDERS.GROK);
  assert.equal(normalizeProvider("grok"), PROVIDERS.GROK);
});

test("provider failover is opt-in and only falls back to configured Grok", () => {
  const { resolveProviderWithFailover } = require("./aiProviderGateway");
  const env = { GEMINI_ENABLED:"false", GEMINI_API_KEY:"secret", XAI_API_KEY:"openai-secret", NEXA_AI_ALLOW_PROVIDER_FAILOVER:"true" };
  assert.equal(resolveProviderWithFailover(PROVIDERS.GEMINI, env, { allowFailover:true }), PROVIDERS.GROK);
  assert.throws(() => resolveProviderWithFailover(PROVIDERS.GEMINI, { ...env, NEXA_AI_ALLOW_PROVIDER_FAILOVER:"false" }, { allowFailover:true }), /unavailable/);
});

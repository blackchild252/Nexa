"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { DEFAULTS, getGeminiConfig, getGeminiStatus, generateText, normalizeImagePayload, analyzeImage } = require("./geminiProvider");

test("Gemini foundation defaults to a disabled, server-side provider", () => {
  const cfg = getGeminiConfig({});
  assert.equal(cfg.enabled, false);
  assert.equal(cfg.configured, false);
  assert.equal(cfg.model, DEFAULTS.model);
  assert.equal(cfg.timeoutMs, DEFAULTS.timeoutMs);
});

test("Gemini status never exposes the API key", () => {
  const status = getGeminiStatus({ GEMINI_ENABLED: "true", GEMINI_API_KEY: "secret-value" });
  assert.equal(status.available, true);
  assert.equal(Object.prototype.hasOwnProperty.call(status, "apiKey"), false);
});

test("Gemini accepts GOOGLE_API_KEY as a compatible server environment fallback", () => {
  const cfg = getGeminiConfig({ GEMINI_ENABLED: "true", GOOGLE_API_KEY: "secret-value" });
  assert.equal(cfg.configured, true);
  assert.equal(cfg.apiKey, "secret-value");
});

test("Gemini refuses disabled or unconfigured generation before loading the SDK", async () => {
  await assert.rejects(() => generateText({ input: "hello", env: {} }), /disabled/);
  await assert.rejects(() => generateText({ input: "hello", env: { GEMINI_ENABLED: "true" } }), /not configured/);
});

test("Gemini rejects blank input", async () => {
  await assert.rejects(() => generateText({ input: " ", env: { GEMINI_ENABLED: "true", GEMINI_API_KEY: "secret" } }), /input is required/);
});


test("Gemini vision configuration exposes a separate model without secrets", () => {
  const cfg = getGeminiConfig({ GEMINI_ENABLED: "true", GEMINI_API_KEY: "secret", GEMINI_MODEL: "text-model", GEMINI_VISION_MODEL: "vision-model" });
  assert.equal(cfg.model, "text-model");
  assert.equal(cfg.visionModel, "vision-model");
  const status = getGeminiStatus({ GEMINI_ENABLED: "true", GEMINI_API_KEY: "secret", GEMINI_VISION_MODEL: "vision-model" });
  assert.equal(status.visionModel, "vision-model");
  assert.equal(JSON.stringify(status).includes("secret"), false);
});

test("Gemini image payload validates supported MIME types and base64", () => {
  assert.deepEqual(normalizeImagePayload({ imageBase64: "aGVsbG8=", mimeType: "image/jpeg" }), { mimeType: "image/jpeg", data: "aGVsbG8=" });
  assert.throws(() => normalizeImagePayload({ imageBase64: "aGVsbG8=", mimeType: "image/gif" }), /JPEG, PNG or WebP/);
  assert.throws(() => normalizeImagePayload({ imageBase64: "not-base64!", mimeType: "image/png" }), /invalid/);
});

test("Gemini image analysis refuses disabled or unconfigured calls before SDK load", async () => {
  await assert.rejects(() => analyzeImage({ imageBase64: "aGVsbG8=", mimeType: "image/jpeg", prompt: "analyse", env: {} }), /disabled/);
  await assert.rejects(() => analyzeImage({ imageBase64: "aGVsbG8=", mimeType: "image/jpeg", prompt: "analyse", env: { GEMINI_ENABLED: "true" } }), /not configured/);
});

"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { safeAiEvent, createAiTelemetry } = require("./aiObservability");

test("AI observability strips secrets and personal payloads", () => {
  const event = safeAiEvent({ event:"ai.request", provider:"google-gemini", model:"gemini-flash-latest", apiKey:"secret", email:"user@example.com", prompt:"private text", success:true });
  assert.equal(event.apiKey, undefined);
  assert.equal(event.email, undefined);
  assert.equal(event.prompt, undefined);
  assert.equal(event.provider, "google-gemini");
});

test("AI telemetry records bounded operational counters", () => {
  const sent = [];
  const telemetry = createAiTelemetry({ captureMessage: (message, level) => sent.push({ message, level }) });
  telemetry.record({ event:"ai.request", provider:"openai", model:"test", success:true, latencyMs:42 });
  telemetry.record({ event:"ai.request", provider:"openai", model:"test", success:false, reason:"timeout" });
  const snapshot = telemetry.snapshot();
  assert.equal(snapshot["ai.request:openai:ok"], 1);
  assert.equal(snapshot["ai.request:openai:error"], 1);
  assert.equal(sent.length, 2);
  assert.doesNotMatch(sent[0].message, /private|secret/);
});

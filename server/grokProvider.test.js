"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const g = require("./grokProvider");
const ENV = { XAI_API_KEY: "k" };
function fake(reply) { const calls = []; const fetch = async (url, init) => { calls.push({ url, init }); return reply; }; return { fetch, calls }; }
const okJson = (data) => ({ ok: true, json: async () => data, text: async () => JSON.stringify(data) });

test("no key: every capability says Grok is not set up and never calls the network", async () => {
  const { fetch, calls } = fake(okJson({}));
  for (const fn of [() => g.respond({ input: "x" }, { env: {}, dependencies: { fetch } }), () => g.textToSpeech({ text: "x" }, { env: {}, dependencies: { fetch } }), () => g.generateImage({ prompt: "x" }, { env: {}, dependencies: { fetch } })])
    await assert.rejects(fn, /Grok is not set up yet/);
  assert.equal(calls.length, 0);
  assert.equal(g.isConfigured({ XAI_API_KEY: "your_key_here" }), false);
});
test("text: Responses request carries model, input, store:false and bearer key", async () => {
  const { fetch, calls } = fake(okJson({ output_text: " hi " }));
  const r = await g.generateText({ input: "yo", maxOutputTokens: 50 }, { env: ENV, dependencies: { fetch } });
  const b = JSON.parse(calls[0].init.body);
  assert.equal(r.text, "hi"); assert.equal(r.provider, "xai-grok");
  assert.match(calls[0].url, /api\.x\.ai\/v1\/responses$/);
  assert.equal(b.model, "grok-4.7"); assert.equal(b.store, false); assert.equal(b.max_output_tokens, 50);
  assert.equal(calls[0].init.headers.Authorization, "Bearer k");
});
test("search: tools are passed through; output parsed from message parts", async () => {
  const { fetch, calls } = fake(okJson({ output: [{ type: "message", content: [{ type: "output_text", text: "found" }] }] }));
  const r = await g.respond({ input: "q", tools: [{ type: "web_search" }] }, { env: ENV, dependencies: { fetch } });
  assert.equal(r.output_text, "found");
  assert.deepEqual(JSON.parse(calls[0].init.body).tools, [{ type: "web_search" }]);
});
test("vision: image is sent as input_image data URL", async () => {
  const { fetch, calls } = fake(okJson({ output_text: "seen" }));
  await g.analyzeImage({ imageBase64: "QUJD", mimeType: "image/png", prompt: "p" }, { env: ENV, dependencies: { fetch } });
  assert.match(calls[0].init.body, /data:image\/png;base64,QUJD/);
});
test("voice out: /tts with voice_id, returns audio bytes; default voices ara/rex", async () => {
  const { fetch, calls } = fake({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
  const buf = await g.textToSpeech({ text: "hello", voice: g.voices({}).male }, { env: ENV, dependencies: { fetch } });
  assert.equal(buf.length, 3);
  assert.deepEqual(JSON.parse(calls[0].init.body), { text: "hello", voice_id: "rex" });
  assert.equal(g.voices({}).female, "ara");
});
test("voice in: /stt multipart, file appended last", async () => {
  const { fetch, calls } = fake(okJson({ text: " words " }));
  const r = await g.speechToText({ fileBuffer: Buffer.from("a"), language: "en" }, { env: ENV, dependencies: { fetch } });
  assert.equal(r.text, "words");
  assert.match(calls[0].url, /\/stt$/);
  assert.equal([...calls[0].init.body.keys()].pop(), "file");
});
test("image generate and edit use b64_json", async () => {
  let f = fake(okJson({ data: [{ b64_json: "QQ==" }] }));
  assert.equal((await g.generateImage({ prompt: "p" }, { env: ENV, dependencies: { fetch: f.fetch } })).b64, "QQ==");
  assert.match(f.calls[0].url, /\/images\/generations$/);
  f = fake(okJson({ data: [{ b64_json: "RQ==" }] }));
  assert.equal((await g.editImage({ prompt: "p", imageDataUrl: "data:image/png;base64,AA" }, { env: ENV, dependencies: { fetch: f.fetch } })).b64, "RQ==");
  assert.match(f.calls[0].url, /\/images\/edits$/);
});
test("HTTP errors keep status and never leak the key", async () => {
  const { fetch } = fake({ ok: false, status: 401, text: async () => "bad" });
  await assert.rejects(() => g.respond({ input: "x" }, { env: ENV, dependencies: { fetch } }), (e) => e.statusCode === 401 && !e.message.includes("Bearer") && !e.message.includes("k1"));
});

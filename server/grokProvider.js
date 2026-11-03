"use strict";
// Grok (xAI) provider: plain fetch, no SDK. Endpoints ASSUMED from xAI docs (not tested against a live key).
const BASE_URL = "https://api.x.ai/v1";
const PLACEHOLDERS = new Set(["", "your_key_here"]);
function getKey(env = process.env) { const k = String(env.XAI_API_KEY || "").trim(); return PLACEHOLDERS.has(k) ? "" : k; }
function isConfigured(env = process.env) { return Boolean(getKey(env)); }
function notSetUp() { const e = new Error("Grok is not set up yet. Add XAI_API_KEY to server/.env."); e.statusCode = 503; return e; }
function models(env = process.env) {
  return Object.freeze({
    text: String(env.XAI_MODEL || "grok-4.7"),
    image: String(env.XAI_IMAGE_MODEL || "grok-imagine-image-2.0"),
    stt: String(env.XAI_STT_MODEL || "grok-voice-transcribe-2.0"),
  });
}
function voices(env = process.env) { return Object.freeze({ female: String(env.XAI_TTS_FEMALE_VOICE || "ara"), male: String(env.XAI_TTS_MALE_VOICE || "rex") }); }
function baseUrl(env) { return String(env.XAI_BASE_URL || BASE_URL).replace(/\/+$/, ""); }
async function call(path, init, { env = process.env, dependencies = {}, timeoutMs } = {}) {
  const key = getKey(env);
  if (!key) throw notSetUp();
  const f = dependencies.fetch || globalThis.fetch;
  const ms = Number(timeoutMs || env.XAI_TIMEOUT_MS || 30000);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await f(baseUrl(env) + path, { ...init, headers: { Authorization: `Bearer ${key}`, ...(init.headers || {}) }, signal: ctl.signal });
    if (!res.ok) {
      let detail = ""; try { detail = (await res.text()).slice(0, 300); } catch (_) {}
      const e = new Error(`Grok request failed (${res.status}) ${detail}`.trim()); e.statusCode = res.status; throw e;
    }
    return res;
  } catch (err) {
    if (err?.name === "AbortError") { const e = new Error("Grok request timeout"); e.statusCode = 504; throw e; }
    throw err;
  } finally { clearTimeout(timer); }
}
const json = (body) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
function outputText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  const parts = [];
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type !== "message") continue;
    for (const c of Array.isArray(item.content) ? item.content : []) if (typeof c?.text === "string") parts.push(c.text);
  }
  return parts.join("").trim();
}
// Text, web search (tools:[{type:"web_search"}]) and vision (input_image parts) all use the Responses API.
async function respond(options = {}, ctx = {}) {
  const env = ctx.env || process.env;
  const model = String(options.model || models(env).text);
  const body = { model, input: options.input, store: false };
  if (options.max_output_tokens || options.maxOutputTokens) body.max_output_tokens = Number(options.max_output_tokens || options.maxOutputTokens);
  if (Array.isArray(options.tools) && options.tools.length) body.tools = options.tools;
  const res = await call("/responses", json(body), { ...ctx, env });
  const data = await res.json();
  return { output_text: outputText(data), text: outputText(data), provider: "xai-grok", model, raw: data };
}
async function generateText(options = {}, ctx = {}) { const r = await respond({ ...options, model: options.model }, ctx); return { text: r.text.trim(), provider: "xai-grok", model: r.model, raw: r.raw }; }
async function analyzeImage({ imageBase64, mimeType = "image/jpeg", prompt = "", systemInstruction = "", model, maxOutputTokens } = {}, ctx = {}) {
  const input = [];
  if (systemInstruction) input.push({ role: "system", content: systemInstruction });
  input.push({ role: "user", content: [{ type: "input_text", text: String(prompt) }, { type: "input_image", image_url: `data:${mimeType};base64,${imageBase64}`, detail: "high" }] });
  return generateText({ input, model, maxOutputTokens }, ctx);
}
async function textToSpeech({ text, voice, language, instructions } = {}, ctx = {}) {
  const env = ctx.env || process.env;
  const body = { text: String(text), voice_id: String(voice || voices(env).female) };
  if (language) body.language = language;
  const res = await call("/tts", json(body), { ...ctx, env });
  return Buffer.from(await res.arrayBuffer());
}
async function speechToText({ fileBuffer, filename = "audio.webm", mimeType = "application/octet-stream", language } = {}, ctx = {}) {
  const env = ctx.env || process.env;
  const form = new FormData();
  form.append("model", models(env).stt);
  if (language) form.append("language", language);
  form.append("file", new Blob([fileBuffer], { type: mimeType }), filename); // file last, per xAI multipart rule
  const res = await call("/stt", { method: "POST", body: form }, { ...ctx, env, timeoutMs: ctx.timeoutMs || 60000 });
  const data = await res.json();
  return { text: String(data?.text || "").trim() };
}
async function generateImage({ prompt, model } = {}, ctx = {}) {
  const env = ctx.env || process.env;
  const res = await call("/images/generations", json({ model: String(model || models(env).image), prompt, n: 1, response_format: "b64_json" }), { ...ctx, env, timeoutMs: ctx.timeoutMs || 90000 });
  const data = await res.json();
  return { b64: data?.data?.[0]?.b64_json || null };
}
async function editImage({ prompt, imageDataUrl, model } = {}, ctx = {}) {
  const env = ctx.env || process.env;
  const res = await call("/images/edits", json({ model: String(model || models(env).image), prompt, image: { url: imageDataUrl, type: "image_url" }, n: 1, response_format: "b64_json" }), { ...ctx, env, timeoutMs: ctx.timeoutMs || 90000 });
  const data = await res.json();
  return { b64: data?.data?.[0]?.b64_json || null };
}
module.exports = { BASE_URL, getKey, isConfigured, models, voices, respond, generateText, analyzeImage, textToSpeech, speechToText, generateImage, editImage, outputText };

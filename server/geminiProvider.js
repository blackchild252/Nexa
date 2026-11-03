"use strict";

const DEFAULTS = Object.freeze({
  model: "gemini-flash-latest",
  visionModel: "gemini-flash-latest",
  timeoutMs: 30000,
  maxOutputTokens: 1200,
});

function envFlag(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function boundedInt(value, min, max, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

function getGeminiConfig(env = process.env) {
  const apiKey = String(env.GEMINI_API_KEY || env.GOOGLE_API_KEY || "").trim();
  const enabled = envFlag(env.GEMINI_ENABLED);
  return Object.freeze({
    enabled,
    configured: Boolean(apiKey && apiKey !== "your_key_here"),
    apiKey,
    model: String(env.GEMINI_MODEL || DEFAULTS.model).trim() || DEFAULTS.model,
    visionModel: String(env.GEMINI_VISION_MODEL || env.GEMINI_MODEL || DEFAULTS.visionModel).trim() || DEFAULTS.visionModel,
    timeoutMs: boundedInt(env.GEMINI_TIMEOUT_MS, 5000, 60000, DEFAULTS.timeoutMs),
    maxOutputTokens: boundedInt(env.GEMINI_MAX_OUTPUT_TOKENS, 256, 4000, DEFAULTS.maxOutputTokens),
  });
}

function getGeminiStatus(env = process.env) {
  const config = getGeminiConfig(env);
  return Object.freeze({
    enabled: config.enabled,
    configured: config.configured,
    available: config.enabled && config.configured,
    model: config.model,
    visionModel: config.visionModel,
    timeoutMs: config.timeoutMs,
    maxOutputTokens: config.maxOutputTokens,
  });
}

async function loadClient(apiKey) {
  if (!apiKey || apiKey === "your_key_here") throw new Error("Gemini API key is not configured.");
  const sdk = await import("@google/genai");
  return new sdk.GoogleGenAI({ apiKey });
}

async function generateText({ input, systemInstruction, model, maxOutputTokens, env = process.env } = {}) {
  const config = getGeminiConfig(env);
  if (!config.enabled) throw new Error("Gemini provider is disabled.");
  if (!config.configured) throw new Error("Gemini provider is not configured.");
  const prompt = String(input || "").trim();
  if (!prompt) throw new Error("Gemini input is required.");

  const ai = await loadClient(config.apiKey);
  const request = {
    model: String(model || config.model).trim() || config.model,
    contents: prompt,
    config: {
      ...(systemInstruction ? { systemInstruction: String(systemInstruction).slice(0, 8000) } : {}),
      maxOutputTokens: Number(maxOutputTokens || config.maxOutputTokens),
    },
  };

  let timer;
  let result;
  try {
    result = await Promise.race([
      ai.models.generateContent(request),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Gemini provider timed out.")), config.timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }

  const output = String(result?.text || "").trim();
  if (!output) throw new Error("Gemini returned an empty response.");
  return { text: output, model: request.model, provider: "google-gemini" };
}



function normalizeToolDeclarations(tools) {
  if (!Array.isArray(tools)) return [];
  return tools
    .map((tool) => ({
      name: String(tool?.name || "").trim(),
      description: String(tool?.description || "").trim().slice(0, 2000),
      parametersJsonSchema: tool?.parametersJsonSchema && typeof tool.parametersJsonSchema === "object" ? tool.parametersJsonSchema : { type: "object", properties: {} },
    }))
    .filter((tool) => /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(tool.name))
    .slice(0, 16);
}

async function generateWithTools({ input, systemInstruction, model, maxOutputTokens, tools, env = process.env, dependencies = {} } = {}) {
  const config = getGeminiConfig(env);
  if (!config.enabled) throw new Error("Gemini provider is disabled.");
  if (!config.configured) throw new Error("Gemini provider is not configured.");
  const prompt = String(input || "").trim();
  if (!prompt) throw new Error("Gemini input is required.");
  const declarations = normalizeToolDeclarations(tools);
  if (!declarations.length) throw new Error("Gemini tool declarations are required.");

  const load = dependencies.loadClient || loadClient;
  const ai = await load(config.apiKey);
  const request = {
    model: String(model || config.model).trim() || config.model,
    contents: prompt,
    config: {
      ...(systemInstruction ? { systemInstruction: String(systemInstruction).slice(0, 8000) } : {}),
      maxOutputTokens: Number(maxOutputTokens || config.maxOutputTokens),
      tools: [{ functionDeclarations: declarations }],
    },
  };
  let timer;
  try {
    const result = await Promise.race([
      ai.models.generateContent(request),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Gemini provider timed out.")), config.timeoutMs); }),
    ]);
    return {
      text: String(result?.text || "").trim(),
      functionCalls: Array.isArray(result?.functionCalls) ? result.functionCalls.slice(0, 8) : [],
      provider: "google-gemini",
      model: request.model,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function* generateTextStream({ input, systemInstruction, model, maxOutputTokens, env = process.env, dependencies = {} } = {}) {
  const config = getGeminiConfig(env);
  if (!config.enabled) throw new Error("Gemini provider is disabled.");
  if (!config.configured) throw new Error("Gemini provider is not configured.");
  const prompt = String(input || "").trim();
  if (!prompt) throw new Error("Gemini input is required.");

  const load = dependencies.loadClient || loadClient;
  const ai = await load(config.apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const request = {
    model: String(model || config.model).trim() || config.model,
    contents: prompt,
    config: {
      ...(systemInstruction ? { systemInstruction: String(systemInstruction).slice(0, 8000) } : {}),
      maxOutputTokens: Number(maxOutputTokens || config.maxOutputTokens),
      abortSignal: controller.signal,
    },
  };

  try {
    const stream = await ai.models.generateContentStream(request);
    let emitted = false;
    for await (const chunk of stream) {
      if (controller.signal.aborted) throw new Error("Gemini provider timed out.");
      const text = String(chunk?.text || "");
      if (!text) continue;
      emitted = true;
      yield { text, provider: "google-gemini", model: request.model };
    }
    if (!emitted) throw new Error("Gemini returned an empty stream.");
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Gemini provider timed out.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeImagePayload({ imageBase64, mimeType } = {}) {
  const raw = String(imageBase64 || "").trim();
  const mime = String(mimeType || "image/jpeg").trim().toLowerCase();
  if (!raw) throw new Error("Gemini image data is required.");
  if (!/^image\/(?:jpeg|png|webp)$/.test(mime)) throw new Error("Gemini supports JPEG, PNG or WebP images only.");
  const base64 = raw.startsWith("data:") ? raw.replace(/^data:image\/(?:jpeg|png|webp);base64,/i, "") : raw;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error("Gemini image data is invalid.");
  const bytes = Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  if (bytes <= 0 || bytes > 12 * 1024 * 1024) throw new Error("Gemini image is too large.");
  return { mimeType: mime, data: base64 };
}

async function analyzeImage({ imageBase64, mimeType, prompt, systemInstruction, model, maxOutputTokens, env = process.env, dependencies = {} } = {}) {
  const config = getGeminiConfig(env);
  if (!config.enabled) throw new Error("Gemini provider is disabled.");
  if (!config.configured) throw new Error("Gemini provider is not configured.");
  const image = normalizeImagePayload({ imageBase64, mimeType });
  const textPrompt = String(prompt || "").trim();
  if (!textPrompt) throw new Error("Gemini image prompt is required.");

  const load = dependencies.loadClient || loadClient;
  const ai = await load(config.apiKey);
  const request = {
    model: String(model || config.visionModel).trim() || config.visionModel,
    contents: [
      { inlineData: image },
      { text: textPrompt },
    ],
    config: {
      ...(systemInstruction ? { systemInstruction: String(systemInstruction).slice(0, 12000) } : {}),
      maxOutputTokens: Number(maxOutputTokens || config.maxOutputTokens),
    },
  };
  let timer;
  let result;
  try {
    result = await Promise.race([
      ai.models.generateContent(request),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Gemini provider timed out.")), config.timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
  const output = String(result?.text || "").trim();
  if (!output) throw new Error("Gemini returned an empty response.");
  return { text: output, model: request.model, provider: "google-gemini" };
}

module.exports = { DEFAULTS, getGeminiConfig, getGeminiStatus, generateText, generateTextStream, generateWithTools, normalizeToolDeclarations, normalizeImagePayload, analyzeImage };

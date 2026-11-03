"use strict";

const grok = require("./grokProvider");
const { getGeminiConfig, getGeminiStatus, generateText: generateGeminiText, generateTextStream: generateGeminiTextStream, generateWithTools: generateGeminiWithTools, analyzeImage: analyzeGeminiImage } = require("./geminiProvider");

const PROVIDERS = Object.freeze({
  GROK: "xai-grok",
  GEMINI: "google-gemini",
});

const DEFAULT_PROVIDER = PROVIDERS.GROK;

function normalizeProvider(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === PROVIDERS.GEMINI || normalized === "gemini" || normalized === "google") return PROVIDERS.GEMINI;
  return DEFAULT_PROVIDER; // grok, xai, and legacy "openai" settings all resolve to Grok
}

function getProviderConfig(env = process.env) {
  const configured = normalizeProvider(env.DAMI_AI_PROVIDER || env.NEXA_AI_PROVIDER || DEFAULT_PROVIDER);
  return Object.freeze({
    defaultProvider: configured,
    grokConfigured: grok.isConfigured(env),
    gemini: getGeminiStatus(env),
  });
}

function getProviderStatus(env = process.env) {
  const config = getProviderConfig(env);
  return Object.freeze({
    defaultProvider: config.defaultProvider,
    providers: {
      [PROVIDERS.GROK]: { configured: config.grokConfigured },
      [PROVIDERS.GEMINI]: { ...config.gemini },
    },
  });
}

function resolveProviderWithFailover(requested, env = process.env, { allowFailover = false } = {}) {
  const requestedProvider = normalizeProvider(requested || env.DAMI_AI_PROVIDER || env.NEXA_AI_PROVIDER || DEFAULT_PROVIDER);
  try {
    return resolveProvider(requestedProvider, env);
  } catch (error) {
    const enabled = String(env.NEXA_AI_ALLOW_PROVIDER_FAILOVER || "false").toLowerCase() === "true";
    if (!allowFailover || !enabled || requestedProvider === DEFAULT_PROVIDER) throw error;
    if (!grok.isConfigured(env)) throw error;
    return DEFAULT_PROVIDER;
  }
}

function resolveProvider(requested, env = process.env) {
  const provider = normalizeProvider(requested || env.DAMI_AI_PROVIDER || env.NEXA_AI_PROVIDER || DEFAULT_PROVIDER);
  if (provider === PROVIDERS.GEMINI) {
    const status = getGeminiStatus(env);
    if (!status.available) {
      throw new Error("Google Gemini provider is unavailable.");
    }
  }
  return provider;
}

function createGrokAdapter(env = process.env, dependencies = {}) {
  return {
    async generateText(options = {}) {
      return grok.generateText({ input: options.input, model: options.model, maxOutputTokens: Number(options.maxOutputTokens || env.DAMI_MAX_OUTPUT_TOKENS || 1200) }, { env, dependencies });
    },
  };
}

async function generateWithTools(options = {}, { env = process.env, dependencies = {} } = {}) {
  const provider = resolveProvider(options.provider, env);
  if (provider === PROVIDERS.GEMINI) {
    return generateGeminiWithTools({
      input: options.input,
      systemInstruction: options.systemInstruction,
      model: options.model,
      maxOutputTokens: options.maxOutputTokens,
      tools: options.tools,
      env,
      dependencies,
    });
  }
  if (dependencies.grokAdapter?.generateWithTools) return dependencies.grokAdapter.generateWithTools(options);
  throw new Error("Grok tool-calling adapter is not configured.");
}

async function* streamText(options = {}, { env = process.env, dependencies = {} } = {}) {
  const provider = resolveProvider(options.provider, env);
  if (provider === PROVIDERS.GEMINI) {
    yield* generateGeminiTextStream({
      input: options.input,
      systemInstruction: options.systemInstruction,
      model: options.model,
      maxOutputTokens: options.maxOutputTokens,
      env,
      dependencies,
    });
    return;
  }
  if (dependencies.grokStreamAdapter?.streamText) {
    yield* dependencies.grokStreamAdapter.streamText(options);
    return;
  }
  throw new Error("Grok streaming adapter is not configured.");
}

async function analyzeImage(options = {}, { env = process.env, dependencies = {} } = {}) {
  const provider = resolveProvider(options.provider, env);
  if (provider === PROVIDERS.GEMINI) {
    return analyzeGeminiImage({
      imageBase64: options.imageBase64,
      mimeType: options.mimeType,
      prompt: options.prompt,
      systemInstruction: options.systemInstruction,
      model: options.model,
      maxOutputTokens: options.maxOutputTokens,
      env,
      dependencies,
    });
  }
  if (dependencies.grokVisionAdapter) return dependencies.grokVisionAdapter.analyzeImage(options);
  return grok.analyzeImage({ imageBase64: options.imageBase64, mimeType: options.mimeType, prompt: options.prompt, systemInstruction: options.systemInstruction, model: options.model, maxOutputTokens: options.maxOutputTokens }, { env, dependencies });
}

async function generateText(options = {}, { env = process.env, dependencies = {} } = {}) {
  const provider = resolveProvider(options.provider, env);
  if (provider === PROVIDERS.GEMINI) {
    const result = await generateGeminiText({
      input: options.input,
      systemInstruction: options.systemInstruction,
      env,
    });
    return { ...result, provider };
  }
  const adapter = dependencies.grokAdapter || createGrokAdapter(env, dependencies);
  return adapter.generateText(options);
}

module.exports = {
  PROVIDERS,
  DEFAULT_PROVIDER,
  normalizeProvider,
  getProviderConfig,
  getProviderStatus,
  resolveProvider,
  resolveProviderWithFailover,
  createGrokAdapter,
  generateText,
  generateWithTools,
  streamText,
  analyzeImage,
};

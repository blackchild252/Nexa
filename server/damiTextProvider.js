"use strict";

const { generateText, streamText, PROVIDERS, resolveProvider } = require("./aiProviderGateway");
const { resolveAiModel } = require("./aiProfileRegistry");
let db = null; try { db = require("./db"); } catch (_) { db = null; }

function normalizeDamiInput(input) {
  if (typeof input === "string") return { systemInstruction: "", input: input.trim() };
  const messages = Array.isArray(input) ? input : [];
  const system = [];
  const conversation = [];
  for (const item of messages) {
    const role = String(item?.role || "user").toLowerCase();
    const content = typeof item?.content === "string" ? item.content.trim() : String(item?.content || "").trim();
    if (!content) continue;
    if (role === "system") system.push(content);
    else conversation.push(`${role === "assistant" ? "Dami" : "User"}: ${content}`);
  }
  return {
    systemInstruction: system.join("\n\n").slice(0, 16000),
    input: conversation.join("\n\n").slice(-24000),
  };
}

async function generateDamiText({ input, model, maxOutputTokens, env = process.env, dependencies = {} } = {}) {
  const provider = resolveProvider(env.DAMI_AI_PROVIDER || env.NEXA_AI_PROVIDER, env);
  const normalized = normalizeDamiInput(input);
  if (!normalized.input) throw new Error("Dami input is required.");
  return generateText(
    {
      provider,
      profileId: "consumer_dami",
      input: normalized.input,
      systemInstruction: normalized.systemInstruction || undefined,
      model: model || resolveAiModel("consumer_dami", env, { db }),
      maxOutputTokens,
    },
    { env, dependencies }
  );
}


async function* streamDamiText({ input, model, maxOutputTokens, env = process.env, dependencies = {} } = {}) {
  const provider = resolveProvider(env.DAMI_AI_PROVIDER || env.NEXA_AI_PROVIDER, env);
  const normalized = normalizeDamiInput(input);
  if (!normalized.input) throw new Error("Dami input is required.");
  yield* streamText(
    {
      provider,
      profileId: "consumer_dami",
      input: normalized.input,
      systemInstruction: normalized.systemInstruction || undefined,
      model: model || resolveAiModel("consumer_dami", env, { db }),
      maxOutputTokens,
    },
    { env, dependencies }
  );
}

module.exports = { PROVIDERS, normalizeDamiInput, generateDamiText, streamDamiText };

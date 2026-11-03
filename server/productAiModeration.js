"use strict";

const { analyzeImage, generateText } = require("./aiProviderGateway");

function parseDecision(text) {
  const raw = String(text || "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI moderation returned an invalid decision.");
  let data;
  try { data = JSON.parse(match[0]); } catch (_) { throw new Error("AI moderation returned an invalid decision."); }
  const decision = String(data.decision || "").toLowerCase();
  if (!["approved", "rejected"].includes(decision)) throw new Error("AI moderation returned an unknown decision.");
  return { decision, reason: String(data.reason || "").trim().slice(0, 500), flags: Array.isArray(data.flags) ? data.flags.map(String).slice(0, 20) : [] };
}

const SYSTEM = "You are NEXA's automated marketplace safety moderator. Be conservative. Reject illegal, explicit sexual, graphic violent, hateful, clearly fraudulent, weapon-focused, counterfeit, or materially deceptive product content. Ordinary commercial products are allowed. Do not reject merely because a product is unusual. Return JSON only.";
const IMAGE_PROMPT = ({ name, description, category }) => `Moderate this marketplace product image and its accompanying listing metadata. Product name: ${String(name || "").slice(0,200)}. Category: ${String(category || "other")}. Description: ${String(description || "").slice(0,1000)}. Check the image for prohibited or materially deceptive content and whether it plausibly represents the described product. Return exactly JSON: {"decision":"approved|rejected","reason":"short reason","flags":["flag"]}.`;
const TEXT_PROMPT = ({ name, description, category }) => `Moderate this NEXA marketplace listing. Name: ${String(name || "").slice(0,200)}. Category: ${String(category || "other")}. Description: ${String(description || "").slice(0,1500)}. Reject illegal, explicit sexual, graphic violent, hateful, clearly fraudulent, weapon-focused, counterfeit, or materially deceptive content. Return exactly JSON: {"decision":"approved|rejected","reason":"short reason","flags":["flag"]}.`;

async function moderateProduct({ name, description, category, imageUrl, env = process.env, dependencies = {} } = {}) {
  if (typeof dependencies.analyzeImage === "function" || imageUrl) {
    if (!imageUrl) {
      const textResult = dependencies.generateText ? await dependencies.generateText({ input: TEXT_PROMPT({name,description,category}), systemInstruction: SYSTEM, env }) : await generateText({ input: TEXT_PROMPT({name,description,category}), systemInstruction: SYSTEM, env, dependencies });
      return parseDecision(textResult.text || textResult);
    }
    const raw = String(imageUrl);
    const m = raw.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);
    if (!m) throw new Error("Product image is not a supported AI moderation format.");
    const imageResult = dependencies.analyzeImage ? await dependencies.analyzeImage({ imageBase64: m[2], mimeType: m[1], prompt: IMAGE_PROMPT({name,description,category}), systemInstruction: SYSTEM, env }) : await analyzeImage({ imageBase64: m[2], mimeType: m[1], prompt: IMAGE_PROMPT({name,description,category}), systemInstruction: SYSTEM, env, dependencies });
    return parseDecision(imageResult.text || imageResult);
  }
  const textResult = dependencies.generateText ? await dependencies.generateText({ input: TEXT_PROMPT({name,description,category}), systemInstruction: SYSTEM, env }) : await generateText({ input: TEXT_PROMPT({name,description,category}), systemInstruction: SYSTEM, env, dependencies });
  return parseDecision(textResult.text || textResult);
}

module.exports = { parseDecision, moderateProduct, SYSTEM };

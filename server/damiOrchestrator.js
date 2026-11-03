"use strict";

// V3.61.0: capability-oriented Dami orchestration helpers. These validate and
// normalize model-produced plans; they do not replace the model's open-ended
// natural-language understanding with a phrase list.
const INTENTS = new Set(["general","shopping","price_watch","scamcheck","money","iou","content","split","mall"]);
const NAVIGATION = new Set(["none","home","money","zeeza","inbox","marketplace","vendor","dami"]);
const MAX_STEPS = 4;
const MAX_ENTITY_KEYS = 24;
const MAX_CONSTRAINT_KEYS = 24;

function cleanText(value, max = 500) { return String(value || "").trim().slice(0, max); }
function normalizeObject(value, maxKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(0, maxKeys).map(([k,v]) => [cleanText(k,80), typeof v === "string" ? cleanText(v,300) : (Array.isArray(v) ? v.slice(0,12) : v)]));
}
function normalizeStep(step) {
  if (!step || typeof step !== "object") return null;
  const intent = String(step.intent || "").trim();
  if (!INTENTS.has(intent)) return null;
  return {
    intent,
    specialistPayload: step.specialistPayload && typeof step.specialistPayload === "object" ? step.specialistPayload : {},
    purpose: cleanText(step.purpose, 180),
    dependsOn: Array.isArray(step.dependsOn) ? step.dependsOn.map(v => Number(v)).filter(v => Number.isInteger(v) && v >= 0 && v < MAX_STEPS).slice(0, 3) : [],
  };
}
function normalizePlan(raw) {
  const steps = Array.isArray(raw?.steps) ? raw.steps.map(normalizeStep).filter(Boolean).slice(0, MAX_STEPS) : [];
  const primary = INTENTS.has(String(raw?.intent || "")) ? String(raw.intent) : (steps[0]?.intent || "general");
  const navigation = NAVIGATION.has(String(raw?.navigation || "")) ? String(raw.navigation) : "none";
  const entities = normalizeObject(raw?.entities, MAX_ENTITY_KEYS);
  const constraints = normalizeObject(raw?.constraints, MAX_CONSTRAINT_KEYS);
  const clarification = raw?.clarification && typeof raw.clarification === "object" ? raw.clarification : null;
  return {
    intent: primary,
    confidence: Math.max(0, Math.min(1, Number(raw?.confidence ?? 0.8) || 0)),
    navigation,
    needsSpecialist: raw?.needsSpecialist !== false,
    specialistPayload: raw?.specialistPayload && typeof raw.specialistPayload === "object" ? raw.specialistPayload : {},
    entities,
    constraints,
    chain: steps.length > 1,
    steps,
    clarification: clarification ? { needed: clarification.needed === true, question: cleanText(clarification.question, 300), missing: Array.isArray(clarification.missing) ? clarification.missing.map(v => cleanText(v,80)).slice(0,8) : [] } : null,
    followUpContext: cleanText(raw?.followUpContext, 1000),
  };
}

function normalizeSpecialistResult(specialist={}) {
  if (!specialist || typeof specialist !== "object" || Array.isArray(specialist)) return { type:"unknown", result:{} };
  const type=cleanText(specialist.type||"specialist",80);
  if (type === "mall" || Array.isArray(specialist.products)) {
    const products=(Array.isArray(specialist.products)?specialist.products:[]).slice(0,5).map(p=>{const out={id:cleanText(p?.id,80),name:cleanText(p?.name,160)};if(p?.price!==undefined) out.price=p.price;if(p?.currency) out.currency=cleanText(p.currency,12);return out;});
    return {type:"mall",products};
  }
  const safe=Object.fromEntries(Object.entries(specialist).slice(0,24).map(([k,v])=>[cleanText(k,80),typeof v==="string"?cleanText(v,500):(Array.isArray(v)?v.slice(0,12):v)]));
  return {type,result:safe};
}

function summarizeSpecialist(intent, specialist) {
  if (!specialist) return "";
  if (intent === "mall" || intent === "shopping") {
    const products = Array.isArray(specialist.products || specialist.mallMatches) ? (specialist.products || specialist.mallMatches) : [];
    return JSON.stringify({ type: specialist.type, count: products.length, products: products.slice(0, 5).map(p => ({ id:p.id, name:p.name, price:p.price, currency:p.currency, vendorName:p.vendorName, category:p.category })) });
  }
  return JSON.stringify(normalizeSpecialistResult({...specialist, type:specialist.type || intent}));
}

module.exports = { INTENTS, NAVIGATION, MAX_STEPS, normalizePlan, normalizeSpecialistResult, summarizeSpecialist };

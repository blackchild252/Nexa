"use strict";

// V3.61.0: natural-language Mall discovery normalizer. It extracts generic
// shopping constraints while preserving the user's actual query. It is not a
// canned-command matcher; the model may provide structured constraints and the
// server only validates/normalizes them.
const PRICE_WORDS = /\b(cheapest|cheaper|lowest|least\s+expensive|most\s+affordable|affordable|cheap)\b/i;
const MAX_PRICE = /(?:under|below|up\s*to|max(?:imum)?|less\s+than)\s*(?:₦|ngn)?\s*([0-9][0-9,]*(?:\.\d+)?)(?:\s*[kK])?/i;
const MIN_PRICE = /(?:over|above|from|at\s+least|min(?:imum)?)\s*(?:₦|ngn)?\s*([0-9][0-9,]*(?:\.\d+)?)(?:\s*[kK])?/i;
const TOP_WORD = /\b(top|tops|t-shirt|tee|shirt)\b/i;
const SORT_WORDS = { price_desc: /\b(most expensive|highest price|priciest)\b/i, price_asc: /\b(cheapest|cheaper|lowest|least expensive|most affordable|affordable|cheap)\b/i };
const SIMILAR_WORDS = /\b(similar|like this|alternative|alternatives|another like|something like)\b/i;

function parseAmount(match) {
  if (!match) return null;
  const raw = String(match[1]).replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n * (/[kK]\s*$/i.test(match[0]) ? 1000 : 1) : null;
}
function normalizeMallQuery(query, category, constraints = {}) {
  const raw = String(query || "").trim();
  let normalized = raw;
  let normalizedCategory = category || constraints.category || null;
  let sort = ["price_asc","price_desc","relevance"].includes(constraints.sort) ? constraints.sort : "relevance";
  let maxPrice = Number.isFinite(Number(constraints.maxPrice)) && Number(constraints.maxPrice) > 0 ? Number(constraints.maxPrice) : null;
  let minPrice = Number.isFinite(Number(constraints.minPrice)) && Number(constraints.minPrice) > 0 ? Number(constraints.minPrice) : null;
  if (SORT_WORDS.price_asc.test(raw)) sort = "price_asc";
  if (SORT_WORDS.price_desc.test(raw)) sort = "price_desc";
  if (!normalizedCategory && TOP_WORD.test(raw)) normalizedCategory = "fashion";
  if (!maxPrice) maxPrice = parseAmount(raw.match(MAX_PRICE));
  if (!minPrice) minPrice = parseAmount(raw.match(MIN_PRICE));
  if (maxPrice != null) normalized = normalized.replace(MAX_PRICE, " ");
  if (minPrice != null) normalized = normalized.replace(MIN_PRICE, " ");
  normalized = normalized.replace(PRICE_WORDS, " ").replace(/\s+/g, " ").trim();
  return { query: normalized, category: normalizedCategory, sort, minPrice, maxPrice, similar: SIMILAR_WORDS.test(raw) };
}

function buildDiscoveryRequest(input = {}) {
  const normalized = normalizeMallQuery(input.query, input.category, input.constraints || {});
  return {
    query: normalized.query,
    category: normalized.category,
    sort: normalized.sort,
    minPrice: normalized.minPrice,
    maxPrice: normalized.maxPrice,
    similar: normalized.similar,
    limit: Math.max(1, Math.min(Number(input.limit) || 6, 10)),
  };
}
module.exports = { normalizeMallQuery, buildDiscoveryRequest };

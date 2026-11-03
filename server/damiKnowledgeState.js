"use strict";

const MAX_SOURCES = 12;
const MAX_SOURCE_TEXT = 400;
const MAX_SOURCE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const TRUST = { system:3, user:2, module:1 };

function normalizeKnowledgeSource(input = {}) {
  const kind = ["user", "system", "module"].includes(String(input.kind)) ? String(input.kind) : "user";
  const updatedAt = input.updatedAt || null;
  const timestamp = updatedAt ? Date.parse(updatedAt) : NaN;
  const stale = Number.isFinite(timestamp) ? Date.now() - timestamp > MAX_SOURCE_AGE_MS : false;
  return {
    id: String(input.id || "").slice(0, 120), kind,
    title: String(input.title || "").trim().slice(0, 160),
    text: String(input.text || "").trim().slice(0, MAX_SOURCE_TEXT),
    updatedAt, trust: TRUST[kind], stale,
  };
}

function buildKnowledgeContext(sources = []) {
  const seen = new Set(); const out = [];
  for (const item of Array.isArray(sources) ? sources : []) {
    const source = normalizeKnowledgeSource(item); if (!source.text) continue;
    const key = `${source.kind}:${source.title.toLowerCase()}:${source.text.toLowerCase()}`;
    if (seen.has(key)) continue; seen.add(key);
    const conflictGroup = `knowledge:${source.title.toLowerCase()}`;
    out.push({ ...source, provenance:{ id:source.id, kind:source.kind, updatedAt:source.updatedAt }, conflictGroup });
    if (out.length >= MAX_SOURCES) break;
  }
  return out;
}

module.exports = { MAX_SOURCES, MAX_SOURCE_TEXT, normalizeKnowledgeSource, buildKnowledgeContext };

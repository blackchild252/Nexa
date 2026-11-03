"use strict";

// Dami language catalog. Codes are intentionally explicit and user-selectable;
// "auto" remains available for language matching. Nigerian Pidgin is exposed
// as pcm for interoperability while retaining a clear product label.
const DAMI_LANGUAGES = Object.freeze([
  { code: "auto", label: "Auto", instruction: "Match the user's language and register." },
  { code: "en", label: "English", instruction: "Respond in clear, natural English." },
  { code: "pcm", label: "Nigerian Pidgin", instruction: "Respond in natural Nigerian Pidgin (Naija), while keeping prices, names, and safety-critical instructions clear." },
  { code: "yo", label: "Yorùbá", instruction: "Respond in natural Yorùbá when practical, while keeping names, prices, and safety-critical instructions clear." },
  { code: "ig", label: "Igbo", instruction: "Respond in natural Igbo when practical, while keeping names, prices, and safety-critical instructions clear." },
  { code: "ha", label: "Hausa", instruction: "Respond in natural Hausa when practical, while keeping names, prices, and safety-critical instructions clear." },
  { code: "fr", label: "Français", instruction: "Respond in natural French." },
  { code: "es", label: "Español", instruction: "Respond in natural Spanish." },
  { code: "pt", label: "Português", instruction: "Respond in natural Portuguese." },
  { code: "de", label: "Deutsch", instruction: "Respond in natural German." },
  { code: "it", label: "Italiano", instruction: "Respond in natural Italian." },
  { code: "ar", label: "العربية", instruction: "Respond in natural Arabic." },
  { code: "hi", label: "हिन्दी", instruction: "Respond in natural Hindi." },
  { code: "zh", label: "中文", instruction: "Respond in natural Simplified Chinese." },
  { code: "ja", label: "日本語", instruction: "Respond in natural Japanese." },
  { code: "ko", label: "한국어", instruction: "Respond in natural Korean." },
]);

const BY_CODE = new Map(DAMI_LANGUAGES.map((item) => [item.code, item]));
function isSupportedDamiLanguage(code) { return BY_CODE.has(String(code || "")); }
function getDamiLanguage(code) { return BY_CODE.get(String(code || "auto")) || BY_CODE.get("auto"); }
function normalizeDamiLanguage(code, legacyMode) {
  const raw = String(code || "").trim().toLowerCase();
  if (isSupportedDamiLanguage(raw)) return raw;
  const legacy = String(legacyMode || "").trim().toLowerCase();
  if (legacy === "nigerian") return "en";
  if (legacy === "pidgin") return "pcm";
  return "auto";
}

module.exports = { DAMI_LANGUAGES, isSupportedDamiLanguage, getDamiLanguage, normalizeDamiLanguage };

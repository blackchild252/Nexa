"use strict";
// V5.98.76 / B224: server-hosted legal pages so EXPO_PUBLIC_PRIVACY_POLICY_URL and
// EXPO_PUBLIC_TERMS_URL can be <PUBLIC_URL>/privacy and <PUBLIC_URL>/terms.
// Fail-closed in production: pages are served only after contacts are configured AND
// the owner confirms legal review with NEXA_LEGAL_REVIEWED=1.
const fs = require("fs");
const path = require("path");

const LEGAL_DIR = path.join(__dirname, "..", "docs", "legal");
const DOCS = Object.freeze({
  privacy: { file: "PRIVACY_POLICY.md", title: "Privacy Policy", contactEnv: "NEXA_PRIVACY_CONTACT" },
  terms: { file: "TERMS_OF_SERVICE.md", title: "Terms of Service", contactEnv: "NEXA_LEGAL_CONTACT" },
});
const PLACEHOLDER = /\[REPLACE WITH[^\]]*\]/;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

function markdownToHtml(md) {
  const out = [];
  let list = false;
  const closeList = () => { if (list) { out.push("</ul>"); list = false; } };
  for (const raw of String(md).split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) { closeList(); continue; }
    let m;
    if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) { closeList(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); }
    else if ((m = /^[-*]\s+(.*)$/.exec(line))) { if (!list) { out.push("<ul>"); list = true; } out.push(`<li>${inline(m[1])}</li>`); }
    else { closeList(); out.push(`<p>${inline(line)}</p>`); }
  }
  closeList();
  return out.join("\n");
}

function page(title, body, banner = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>${esc(title)} · NEXA</title><style>body{margin:0;background:#0b0d10;color:#e9e6dc;font:16px/1.6 -apple-system,Segoe UI,Roboto,sans-serif}main{max-width:760px;margin:0 auto;padding:24px 18px 64px}h1{color:#d4af37}h2{color:#d4af37;margin-top:28px}.banner{background:#3a2d00;border:1px solid #d4af37;padding:10px 14px;border-radius:10px;margin-bottom:18px}a{color:#d4af37}</style></head><body><main>${banner}${body}</main></body></html>`;
}

function readDoc(id, readFile = (p) => fs.readFileSync(p, "utf8")) {
  return readFile(path.join(LEGAL_DIR, DOCS[id].file));
}

// Pure and testable: returns { status, html, published }.
function renderLegalPage(id, { env = process.env, readFile } = {}) {
  const doc = DOCS[id];
  if (!doc) return { status: 404, html: page("Not found", "<h1>Not found</h1>"), published: false };
  let body;
  try { body = readDoc(id, readFile); }
  catch { return { status: 503, html: page(doc.title, `<h1>${esc(doc.title)}</h1><p>This document is temporarily unavailable.</p>`), published: false }; }
  const contact = String(env[doc.contactEnv] || "").trim();
  if (contact) body = body.replace(PLACEHOLDER, contact);
  const unresolved = PLACEHOLDER.test(body);
  const reviewed = String(env.NEXA_LEGAL_REVIEWED || "") === "1";
  const production = String(env.NODE_ENV || "").toLowerCase() === "production";
  if (production && (unresolved || !reviewed)) {
    return { status: 503, html: page(doc.title, `<h1>${esc(doc.title)}</h1><p>This document has not been published yet.</p>`), published: false };
  }
  const banner = unresolved || !reviewed ? `<div class="banner"><strong>Draft — not yet published.</strong> Development preview only.</div>` : "";
  return { status: 200, html: page(doc.title, markdownToHtml(body), banner), published: !unresolved && reviewed };
}

function legalPageHandler(id, opts = {}) {
  return (req, res) => {
    const r = renderLegalPage(id, opts);
    res.status(r.status).set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": r.published ? "public, max-age=300" : "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
    }).send(r.html);
  };
}

module.exports = { DOCS, PLACEHOLDER, markdownToHtml, renderLegalPage, legalPageHandler };

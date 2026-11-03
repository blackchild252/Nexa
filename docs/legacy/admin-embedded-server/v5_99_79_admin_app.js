"use strict";
// B325 / M4572: serve the admin web app (admin-web/) from the NEXA server at /admin-app, same address, no extra setup.
// Set ADMIN_APP_ENABLED=false (or 0, off, no) to switch it off; then /admin-app answers 404.
// Only the app's own files are served (index.html, config.js, style.css and src/*.js). Its README, tests and package.json never are.
const fs = require("node:fs");
const path = require("node:path");

const MOUNT = "/admin-app";
const ROOT = path.join(__dirname, "..", "admin-web");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
// Strict: scripts and styles only from the app's own address, no inline code, no framing, calls only to the same address.
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function enabled(env = process.env) {
  return !/^(false|0|off|no)$/i.test(String(env.ADMIN_APP_ENABLED == null ? "" : env.ADMIN_APP_ENABLED).trim());
}

// Which file a request path (after /admin-app) may read. Returns a path inside ROOT, or null.
function resolveFile(rel, root = ROOT) {
  let p;
  try { p = decodeURIComponent(String(rel || "/")); } catch (_) { return null; }
  if (p.includes("\0") || p.includes("\\")) return null;
  p = p.replace(/^\/+/, "") || "index.html";
  const allowed = p === "index.html" || p === "config.js" || p === "style.css" || /^src\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\.js$/.test(p);
  if (!allowed) return null;
  const full = path.resolve(root, p);
  return full.startsWith(path.resolve(root) + path.sep) ? full : null;
}

function handler({ env = process.env, root = ROOT } = {}) {
  return (req, res, next) => {
    if (!enabled(env)) return res.status(404).type("text/plain").send("Not found");
    if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).set("Allow", "GET, HEAD").type("text/plain").send("Method not allowed");
    const original = String(req.originalUrl || req.url || "");
    const pathOnly = original.split("?")[0];
    if (pathOnly === MOUNT) return res.redirect(301, MOUNT + "/"); // relative links in index.html need the trailing slash
    const file = resolveFile(req.path || req.url, root);
    if (!file) return res.status(404).type("text/plain").send("Not found");
    let body;
    try { body = fs.readFileSync(file); } catch (_) { return res.status(404).type("text/plain").send("Not found"); }
    res.status(200).set({
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Security-Policy": CSP,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    });
    return req.method === "HEAD" ? res.end() : res.send(body);
  };
}

// A browser sends an Origin header on same-address POST and DELETE calls (and on module scripts). The admin app's own address must
// not be refused by CORS, so an Origin whose host is this server's own Host is accepted while the admin app is switched on.
function isOwnOrigin(origin, host, env = process.env) {
  if (!enabled(env) || !origin || !host) return false;
  try { return new URL(origin).host.toLowerCase() === String(host).toLowerCase(); } catch (_) { return false; }
}

module.exports = { MOUNT, ROOT, CSP, enabled, resolveFile, handler, isOwnOrigin };

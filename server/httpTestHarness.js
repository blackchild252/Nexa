"use strict";
// B144 / M1830-34 — HTTP test harness.
// Boots the real server (index.js) as a child process on a throwaway database and a free port,
// so tests exercise the actual routes, middleware and authorization. No app code is changed.
const { spawn } = require("node:child_process");
const net = require("node:net");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const PASSWORD = "Str0ng!Passw0rd#B144";
const WEBHOOK_SECRET = "sk_test_b144_harness_secret";

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  });
}

async function startServer(extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nexa-http-"));
  const dbPath = path.join(dir, "nexa.db");
  const port = await freePort();
  const env = {
    ...process.env,
    NODE_ENV: "test", PORT: String(port), DB_PATH: dbPath,
    PAYSTACK_SECRET_KEY: WEBHOOK_SECRET, PAYMENT_MODE: "live",
    ...extraEnv,
  };
  const child = spawn(process.execPath, ["index.js"], { cwd: __dirname, env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server did not start in 30s\n${log}`)), 30000);
    const onData = (d) => { log += d; if (/server listening on/.test(log)) { clearTimeout(timer); resolve(); } };
    child.stdout.on("data", onData); child.stderr.on("data", (d) => { log += d; });
    child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`server exited early (${code})\n${log}`)); });
  });
  const base = `http://127.0.0.1:${port}`;

  async function request(method, route, { token, body, headers = {}, rawBody } = {}) {
    const h = { ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    let payload;
    if (rawBody !== undefined) payload = rawBody;
    else if (body !== undefined) payload = JSON.stringify(body);
    if (payload !== undefined) h["Content-Type"] = "application/json";
    const res = await fetch(base + route, { method, headers: h, body: payload });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch (_) {}
    return { status: res.status, json, text };
  }

  let counter = 0;
  async function signup(label = "user") {
    const email = `${label}.${Date.now()}.${++counter}@example.test`;
    const r = await request("POST", "/api/auth/signup", { body: { email, password: PASSWORD, name: `${label} ${counter}` } });
    if (r.status !== 200 || !r.json?.token) throw new Error(`signup failed (${r.status}): ${r.text}`);
    return { token: r.json.token, userId: r.json.userId, email };
  }

  // Direct DB access for seeding/inspection (the server uses WAL, so a second connection is safe).
  function openDb() { const Database = require("better-sqlite3"); const db = new Database(dbPath); db.pragma("busy_timeout = 5000"); return db; }

  function signWebhook(rawBody, secret = WEBHOOK_SECRET) { return crypto.createHmac("sha512", secret).update(rawBody).digest("hex"); }
  function postWebhook(event, { signature, secret } = {}) {
    const rawBody = JSON.stringify(event);
    return request("POST", "/api/payments/paystack/webhook", { rawBody, headers: { "x-paystack-signature": signature === undefined ? signWebhook(rawBody, secret) : signature } });
  }

  async function stop() {
    await new Promise((resolve) => { child.once("exit", resolve); child.kill("SIGTERM"); setTimeout(() => child.kill("SIGKILL"), 5000).unref(); });
    fs.rmSync(dir, { recursive: true, force: true });
  }

  return { base, port, dbPath, request, signup, openDb, postWebhook, signWebhook, stop, get log() { return log; } };
}

module.exports = { startServer, PASSWORD, WEBHOOK_SECRET };

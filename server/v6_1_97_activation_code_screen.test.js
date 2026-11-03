"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
// Node 22 does not execute this TypeScript module through native dynamic import.
// Transpile the pure helper in-memory so these behavior tests need no Expo runtime.
const load = () => {
  const filename = path.join(root, "src/centralActivationCode.test-loader.cjs");
  const compiled = ts.transpileModule(read("src/centralActivationCode.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(root);
  loaded._compile(compiled, filename);
  return loaded.exports;
};

test("a good reply says the code is in the Zeeza inbox, with no digits", async () => {
  const { readActivationCodeReply } = await load();
  const r = readActivationCodeReply({ issued: true, expiresInSeconds: 300, delivery: "local_secure_inbox" });
  assert.equal(r.ok, true); assert.equal(r.openInbox, true);
  assert.match(r.message, /Zeeza inbox/); assert.match(r.message, /5 minutes/);
  assert.equal(/\d{6}/.test(r.message), false);
});

test("odd replies never claim success", async () => {
  const { readActivationCodeReply } = await load();
  for (const bad of [null, undefined, {}, { issued: false }, { issued: "true" }, "ok"]) assert.equal(readActivationCodeReply(bad).ok, false);
  assert.match(readActivationCodeReply({ issued: true, expiresInSeconds: 99999 }).message, /5 minutes/);
});

test("errors map to plain messages by status and do not echo server text", async () => {
  const { describeActivationCodeError } = await load();
  assert.match(describeActivationCodeError({ status: 403, message: "secret detail" }).message, /no pending activation/);
  assert.match(describeActivationCodeError({ status: 429 }).message, /Wait a minute/);
  assert.match(describeActivationCodeError({ status: 401 }).message, /sign in again/i);
  assert.match(describeActivationCodeError({ status: 500, message: "secret detail" }).message, /Try again later/);
  assert.equal(describeActivationCodeError({ status: 403, message: "secret detail" }).message.includes("secret detail"), false);
  assert.equal(describeActivationCodeError(null).ok, false);
});

test("the screen calls the challenge route, shows no code, and the inbox links to it", () => {
  const api = read("src/api.ts");
  assert.match(api, /requestCentralActivationCode/); assert.match(api, /\/api\/zeeza\/central-activation\/challenge/);
  const screen = read("src/app/zeeza/activation-code.tsx");
  assert.match(screen, /requestCentralActivationCode\(\)/);
  assert.doesNotMatch(screen, /TextInput/);
  assert.doesNotMatch(screen, /\.code\b|console\./);
  assert.match(read("src/app/zeeza/inbox.tsx"), /\/zeeza\/activation-code/);
});

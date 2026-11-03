"use strict";
// Guards for the repairs in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("Admin Disputes button stays behind the isAdmin check and calls onAdmin", () => {
  assert.match(read("src/MarketplaceScreen.tsx"), /isAdmin&&<(?:NexaPressable|TouchableOpacity)[^>]*accessibilityLabel="Open Administrative Director disputes"[^>]*onPress=\{\(\)=>onAdmin\?\.\(\)\}/);
});
test("theme or text-size change re-keys the navigation provider", () => {
  assert.match(read("src/app/_layout.tsx"), /<NexaNavProvider key=\{appearance\}>/);
});
test("vendor AI approval saves only a server-held, hash-checked preview", () => {
  const idx = read("server/index.js");
  assert.match(idx, /previewToken/);
  assert.match(idx, /decodeImageDataUrl\(preview\.previewData\)/);
  assert.match(idx, /sourceHash!==preview\.sourceHash/);
  assert.match(idx, /previewHash!==preview\.previewHash/);
});
test("this guard file is registered in the release gate", () => {
  assert.match(read("scripts/release-gate.mjs"), /v5_99_27_b273_block_guards\.contract\.test\.js/);
});

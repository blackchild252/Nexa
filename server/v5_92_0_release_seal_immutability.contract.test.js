import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const script = fs.readFileSync(path.join(root, "scripts/release-seal.mjs"), "utf8");
const contract = fs.readFileSync(path.join(root, "docs/builder/RELEASE_SEAL_CONTRACT.md"), "utf8");

test("V5.92.0 permanent release seal is one-way", () => {
  assert.match(script, /fs\.existsSync\(sealPath\)/);
  assert.match(script, /Permanent release seal already exists/);
  assert.match(script, /sealed release cannot be overwritten/);
  assert.match(contract, /`release-seal\.mjs create` is one-way/);
});

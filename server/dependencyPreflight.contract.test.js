"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../scripts/dependency-preflight.mjs"), "utf8");
test("dependency preflight verifies actual package manifests, not just node_modules directory presence", () => {
  assert.match(source, /missingRootDependencies/);
  assert.match(source, /missingServerDependencies/);
  assert.match(source, /all declared root and server dependencies have installed package manifests/);
  assert.doesNotMatch(source, /workspaceDependenciesInstalled = fs\.existsSync\(path\.join\(root, 'node_modules'\)\)/);
});

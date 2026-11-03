"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../scripts/release-gate.mjs"), "utf8");

test("release gate distinguishes source evidence from unrun runtime, browser, device and native acceptance", () => {
  assert.match(source, /evidenceScope/);
  assert.match(source, /runtimeServerSuite: 'NOT RUN BY THIS GATE'/);
  assert.match(source, /dependencyBackedTypecheck: 'NOT RUN BY THIS GATE'/);
  assert.match(source, /browserAcceptance: 'NOT RUN BY THIS GATE'/);
  assert.match(source, /deviceAcceptance: 'NOT RUN BY THIS GATE'/);
  assert.match(source, /androidNativeBuild: 'NOT RUN BY THIS GATE'/);
  assert.match(source, /iosNativeBuild: 'NOT RUN BY THIS GATE'/);
});

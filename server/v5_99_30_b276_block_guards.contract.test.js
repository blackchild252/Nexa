"use strict";
// Guards for the repairs in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("GroupCallScreen no longer keeps an unread status state (M4233)", () => {
  assert.doesNotMatch(read("src/GroupCallScreen.tsx"), /\[status,setStatus\]|setStatus\(/);
});
test("YaayzScreen no longer keeps an unread feePreview state or an unused tile helper (M4234, M4236), and the fee preview still gates the purchase", () => {
  const s = read("src/YaayzScreen.tsx");
  assert.doesNotMatch(s, /setFeePreview|\[feePreview|const tile=/);
  assert.match(s, /feePreviewId:preview\?\.previewId/);
  assert.match(s, /Before you confirm/);
});
test("VendorPhotos keeps only the server preview token, not an unused source index or hash (M4235)", () => {
  const s = read("src/VendorPhotos.tsx");
  assert.doesNotMatch(s, /previewSourceIndex|previewSourceHash|PreviewSourceIndex|PreviewSourceHash/);
  assert.match(s, /approveBeautifiedVendorProductImage\(product\.id,previewToken\)/);
});
test("this guard file is registered in the release gate", () => {
  assert.match(read("scripts/release-gate.mjs"), /v5_99_30_b276_block_guards\.contract\.test\.js/);
});

const test = require("node:test");
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

test("Deep audit: GroupCallScreen polling effect has a closed callback before dependencies", () => {
  const source = fs.readFileSync(path.join(root,"src/GroupCallScreen.tsx"), "utf8");
  assert.ok(source.includes("return()=>{pollRequest.current++;clearInterval(timer)}},[call,callId,connectPeer]);"));
});

test("Deep audit: current release remains current", () => {
  const version = fs.readFileSync(path.join(root,"VERSION.md"), "utf8");
  assert.ok(atLeast(currentVersionMd(version), "5.8.0"));
});

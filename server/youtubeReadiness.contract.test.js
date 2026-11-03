"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const src = fs.readFileSync(path.join(__dirname, "youtubeContent.js"), "utf8");

test("YouTube readiness has one explicit credential boundary", () => {
  assert.match(src, /function youtubeIntegrationState\(env = process\.env\)/);
  assert.match(src, /requiredSecrets:\["YOUTUBE_API_KEY"\]/);
  assert.match(src, /source:configured\?"youtube_data_api":"credential_required"/);
  assert.doesNotMatch(src, /fetchRss\(channelId\)/);
});

test("Narrativia auto-sync never fabricates a fallback when the API credential is absent", () => {
  assert.match(src, /if\(!youtubeApiConfigured\(\)\) return \{skipped:true,reason:"YOUTUBE_API_KEY not configured\."\};/);
});

test("manual YouTube sync reports a credential blocker instead of calling a missing fallback", () => {
  assert.match(src, /YOUTUBE_API_KEY is required for live YouTube sync\./);
  assert.match(src, /status:503/);
});

test("Yaayz feed exposes integration readiness without exposing the secret", () => {
  assert.match(src, /integration:youtubeIntegrationState\(\)/);
  assert.doesNotMatch(src, /res\.json\(.*YOUTUBE_API_KEY/);
});

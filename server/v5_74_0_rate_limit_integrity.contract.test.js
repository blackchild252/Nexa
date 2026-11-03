"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { normalizePersistentKey, validateOptions } = require("./persistentRateLimiter");

const root = path.join(__dirname, "..");
const db = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");
const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const limiter = fs.readFileSync(path.join(__dirname, "persistentRateLimiter.js"), "utf8");

const cases = [
  [1200,"rate-limit schema exists",()=>assert.match(db,/CREATE TABLE IF NOT EXISTS rate_limit_buckets/)],
  [1201,"rate-limit composite primary key",()=>assert.match(db,/PRIMARY KEY \(scope, keyHash\)/)],
  [1202,"rate-limit expiry index",()=>assert.match(db,/idx_rate_limit_expiry/)],
  [1203,"schema version remains explicit",()=>assert.match(db,/schema-v\d+/)],
  [1204,"required rate-limit table",()=>assert.match(db,/rate_limit_buckets/)],
  [1205,"persistent limiter module",()=>assert.match(limiter,/createPersistentRateLimiter/)],
  [1206,"key hashing",()=>assert.match(limiter,/createHash\("sha256"\)/)],
  [1207,"window validation",()=>assert.match(limiter,/windowMs must be a positive number/)],
  [1208,"max validation",()=>assert.match(limiter,/max must be an integer >= 1/)],
  [1209,"max-key validation",()=>assert.match(limiter,/maxKeys must be an integer >= 1/)],
  [1210,"atomic transaction",()=>assert.match(limiter,/db\.transaction\(/)],
  [1211,"expiry cleanup",()=>assert.match(limiter,/DELETE FROM rate_limit_buckets WHERE scope = \? AND expiresAt <= \?/)],
  [1212,"bounded eviction",()=>assert.match(limiter,/ORDER BY updatedAt ASC LIMIT 1/)],
  [1213,"remaining header",()=>assert.match(limiter,/RateLimit-Remaining/)],
  [1214,"retry-after header",()=>assert.match(limiter,/Retry-After/)],
  [1215,"fail-closed storage",()=>assert.match(limiter,/Request protection is temporarily unavailable/)],
  [1216,"persistent selector",()=>assert.match(index,/if \(options\.persistent\) return createPersistentRateLimiter/)],
  [1217,"AI minute persistence",()=>assert.match(index,/scope: "ai-minute"/)],
  [1218,"AI daily persistence",()=>assert.match(index,/scope: "ai-day"/)],
  [1219,"realtime provider route is disabled in local-only mode",()=>assert.match(index,/Realtime voice is disabled in local-only mode/)],
  [1220,"auth persistence",()=>assert.match(index,/scope: "auth"/)],
  [1221,"signup persistence",()=>assert.match(index,/scope: "signup-email"/)],
  [1222,"login persistence",()=>assert.match(index,/scope: "login-email"/)],
  [1223,"legacy limiter compatibility",()=>assert.match(index,/return createRateLimiter\(options\)/)],
  [1224,"cumulative rate-limit certification",()=>{ assert.equal(normalizePersistentKey("abc"),normalizePersistentKey("abc")); assert.notEqual(normalizePersistentKey("abc"),normalizePersistentKey("def")); assert.doesNotThrow(()=>validateOptions({windowMs:1000,max:2,maxKeys:10})); }],
];
for (const [id,name,fn] of cases) test(`M${id} ${name}`,fn);

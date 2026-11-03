"use strict";
// Guards for the changes in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("push registration creates the default and calls channels, asks permission, gets the token and registers it", () => {
  const s = read("src/pushRegistration.ts");
  assert.match(s, /setNotificationChannelAsync\('default'/);
  assert.match(s, /setNotificationChannelAsync\('calls'[\s\S]*?importance: Notifications\.AndroidImportance\.MAX/);
  assert.match(s, /getPermissionsAsync\(\)[\s\S]*?requestPermissionsAsync\(\)[\s\S]*?getExpoPushTokenAsync\(\)/);
  assert.match(s, /authedFetch\('\/api\/push\/register', \{ method: 'POST', body: JSON\.stringify\(\{ token: token\.data, platform: Platform\.OS \}\) \}\)/);
});
test("push registration never blocks the app: it skips web, stops after sign-out and swallows failures", () => {
  const s = read("src/pushRegistration.ts");
  assert.match(s, /Platform\.OS === 'web'\) return 'skipped'/);
  assert.match(s, /if \(!isCurrent\(\)\) return 'skipped'/);
  assert.match(s, /\} catch \{\s*return 'failed';/);
});
test("PushRegistration is mounted once in the live root layout, under AuthProvider, and re-runs per signed-in user", () => {
  const layout = read("src/app/_layout.tsx");
  assert.match(layout, /import \{ PushRegistration \} from '\.\.\/pushRegistration';/);
  assert.match(layout, /<AuthGate\/>\s*<PushRegistration\/>/);
  assert.match(layout, /<AuthProvider><NexaLocationProvider><MotionProvider><ThemedShell\/>/);
  const s = read("src/pushRegistration.ts");
  assert.match(s, /const \{ user \} = useAuth\(\);/);
  assert.match(s, /if \(!userId\) return;/);
  assert.match(s, /\}, \[userId\]\);/);
});
test("the server route the app registers against still exists and takes token and platform", () => {
  const server = read("server/index.js");
  assert.match(server, /app\.post\("\/api\/push\/register", auth\.authMiddleware/);
  assert.match(server, /registerPushToken\(db, \{ token, userId: req\.user\.id, platform \}\)/);
});
test("the retired root app/ folder stays gone and nothing imports from it", () => {
  assert.ok(!fs.existsSync(path.join(root, "app")));
  assert.equal(JSON.parse(read("package.json")).main, "expo-router/entry");
  const bad = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); } else if (/\.(ts|tsx)$/.test(e.name) && /from ['"](\.\.\/)+app\/|from ['"]\.\/app\//.test(fs.readFileSync(p, "utf8"))) bad.push(p); } };
  walk(path.join(root, "src"));
  assert.deepEqual(bad, []);
});
test("this guard file is registered in the release gate", () => {
  assert.match(read("scripts/release-gate.mjs"), /v5_99_34_b280_block_guards\.contract\.test\.js/);
});

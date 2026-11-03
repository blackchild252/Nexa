"use strict";
// B322: Lifestyle app half. Verified mark, report a comment and load more (M4548), the Get verified screen (M4549),
// and verification alerts opening the right screen (M4550). The app is React Native, so these read the real source files.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("M4548 the feed client asks for a page by cursor and never repeats a post", () => {
  const api = read("src/lifestyle.ts");
  assert.match(api, /apiLifestyleFeed = async \(before\?: string \| null\)/);
  assert.match(api, /\/api\/lifestyle\/feed\?before=\$\{encodeURIComponent\(before\)\}/);
  assert.match(api, /nextBefore: r\.nextBefore \|\| null/);
  assert.match(api, /\/api\/lifestyle\/comments\/\$\{encodeURIComponent\(commentId\)\}\/report`, "POST"/);
  assert.match(api, /verified\?: boolean/);
  // mergeFeedPage is plain logic: run it for real.
  const body = api.slice(api.indexOf("export function mergeFeedPage"));
  const fn = body.slice(0, body.indexOf("\n}\n") + 3).replace("export function", "function").replace(/: LifestylePost\[\]/g, "");
  const mergeFeedPage = new Function(`${fn}; return mergeFeedPage;`)();
  const out = mergeFeedPage([{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c" }]);
  assert.deepEqual(out.map((p) => p.id), ["a", "b", "c"]);
  assert.deepEqual(mergeFeedPage([], []).length, 0);
});

test("M4548 the screen has Load more, treats an empty page as the end, and shows the verified mark", () => {
  const s = read("src/LifestyleScreen.tsx");
  assert.match(s, /apiLifestyleFeed\(\)/); // first page (B316 contract)
  assert.match(s, /apiLifestyleFeed\(nextBefore\)/);
  assert.match(s, /setNextBefore\(page\.posts\.length \? page\.nextBefore : null\)/);
  assert.match(s, /accessibilityLabel="Load more posts"/);
  assert.match(s, /\{!nextBefore \? <View style=\{\[s\.card/); // "That is everything" only at the real end
  assert.match(s, /post\.author\.verified \? <VerifiedMark/);
  assert.match(s, /c\.author\.verified/);
  assert.match(s, /is verified`/);
});

test("M4548 a member can report someone else's comment, never their own, and it disappears for them", () => {
  const s = read("src/LifestyleScreen.tsx");
  assert.match(s, /apiLifestyleCommentReport\(c\.id, r\.key\)/);
  assert.match(s, /\{!c\.mine \? <NexaPressable[^>]*Report comment from/);
  assert.match(s, /setComments\(\(x\) => \(x \|\| \[\]\)\.filter\(\(y\) => y\.id !== c\.id\)\)/);
  assert.match(s, /LIFESTYLE_REPORT_REASONS\.map/);
});

test("M4549 the Get verified screen reaches the real routes and has its own route and a way in", () => {
  const api = read("src/verification.ts");
  assert.match(api, /\/api\/verification\/requests\/mine/);
  assert.match(api, /\/api\/verification\/requests", "POST", \{ kind, details \}/);
  const server = read("server/verification.js");
  assert.match(server, new RegExp(`MIN_DETAILS = ${/VERIFY_MIN_DETAILS = (\d+)/.exec(api)[1]};`));
  assert.match(server, new RegExp(`MAX_DETAILS = ${/VERIFY_MAX_DETAILS = (\d+)/.exec(api)[1]};`));
  const screen = read("src/GetVerifiedScreen.tsx");
  assert.match(screen, /Not approved\{status\.reason/);
  assert.match(screen, /waiting for review/);
  assert.match(screen, /You are verified/);
  assert.match(read("src/app/verification.tsx"), /GetVerifiedScreen/);
  assert.match(read("src/nexaRouteInventory.ts"), /'\/verification'/);
  assert.match(read("src/app/(tabs)/profile.tsx"), /router\.push\('\/verification' as any\)/);
});

test("M4549 the status logic shows verified, waiting, not approved with the reason, or nothing", () => {
  const src = read("src/verification.ts");
  const start = src.indexOf("export function verificationStatusFor");
  const rest = src.slice(start);
  const fn = "function verificationStatusFor(mine, kind) {" + rest.slice(rest.indexOf("\n"));
  const f = new Function(`${fn}; return verificationStatusFor;`)();
  assert.equal(f(null, "user").state, "none");
  assert.equal(f({ verified: { user: true, vendor: false }, requests: [] }, "user").state, "verified");
  assert.equal(f({ verified: { user: false, vendor: false }, requests: [{ kind: "user", status: "pending" }] }, "user").state, "pending");
  const r = f({ verified: { user: false, vendor: false }, requests: [{ kind: "user", status: "rejected", reason: "Add a photo" }] }, "user");
  assert.equal(r.state, "rejected"); assert.equal(r.reason, "Add a photo");
  assert.equal(f({ verified: { user: false, vendor: false }, requests: [{ kind: "vendor", status: "pending" }] }, "user").state, "none");
});

test("M4550 a verification alert is sent with its screen and every tap path opens the Get verified screen", () => {
  assert.match(read("server/verification.js"), /screen: "verification", action: "verification"/);
  assert.match(read("server/notifications.js"), /verification: "verification"/);
  assert.match(read("src/pushRouting.ts"), /case "verification":/);
  assert.match(read("src/pushTapRouting.ts"), /case 'verification': return '\/verification';/);
  assert.match(read("src/nexaNavigation.ts"), /case 'verification': return validateNavigationTarget\(\{ pathname: '\/verification' \}\)/);
  const notifications = require("./notifications");
  const ev = notifications.createEvent("u1", "You're verified", "ok", { type: "system", screen: "verification", action: "verification" });
  assert.equal(ev.data.action, "verification");
  assert.equal(ev.data.screen, "verification");
});

test("M4550 the existing alert routes are unchanged and an admin alert falls back to just opening the app", () => {
  const push = read("src/pushTapRouting.ts");
  assert.match(push, /case 'leisure_lifestyle': return '\/lifestyle';/);
  assert.match(push, /case 'friends': return withParams/);
  assert.doesNotMatch(read("src/pushRouting.ts"), /case "admin_verification"/);
});

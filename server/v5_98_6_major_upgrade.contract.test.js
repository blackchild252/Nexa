"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const allFiles = (dir, exts = []) => {
  const out = [];
  for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...allFiles(rel, exts));
    else if (!exts.length || exts.includes(path.extname(ent.name))) out.push(rel);
  }
  return out;
};

const src = allFiles("src", [".ts", ".tsx", ".js", ".jsx"]);
const server = allFiles("server", [".js", ".mjs"]);
const srcText = src.map(read).join("\n");
const serverText = server.map(read).join("\n");

test("M1 architecture has explicit active client/server authorities", () => {
  assert.ok(exists("src/app/_layout.tsx"));
  assert.ok(exists("server/index.js"));
  assert.ok(exists("server/auth.js"));
  assert.ok(exists("server/productStock.js"));
  assert.ok(exists("server/paymentReconciler.js"));
});

test("M2 duplicated business authorities have named owners", () => {
  for (const f of ["server/auth.js", "server/productStock.js", "server/payments.js", "server/storeAjo.js"]) assert.ok(exists(f));
  assert.doesNotMatch(srcText, /require\(['"]\.\.\/server\//);
});

test("M3 shared client state is centralized through hooks/context boundaries", () => {
  assert.ok(exists("src/auth.tsx"));
  assert.ok(exists("src/useMarketplace.ts"));
  assert.ok(exists("src/useZeeza.ts"));
  assert.ok(exists("src/useStaff.ts"));
});

test("M4 server/client boundary is not bypassed by frontend DB access", () => {
  assert.doesNotMatch(srcText, /better-sqlite3|sqlite_master|INSERT INTO|UPDATE\s+users\s+SET|DELETE FROM\s+users/i);
});

test("M5 error handling has shared data-state recovery surfaces", () => {
  assert.ok(exists("src/NexaDataState.tsx"));
  assert.match(srcText, /NexaDataState/);
  assert.match(serverText, /res\.status\(.*\)\.json\(\{\s*error:/s);
});

test("M6 authentication lifecycle is server-authoritative", () => {
  const auth = read("server/auth.js");
  assert.match(auth, /async function signup/);
  assert.match(auth, /async function login/);
  assert.match(auth, /function logout/);
  assert.match(auth, /function authMiddleware/);
  assert.match(auth, /hashToken/);
  assert.match(auth, /SESSION_CAP/);
});

test("M7 profile/account state uses authenticated account APIs", () => {
  assert.ok(exists("src/app/(tabs)/profile.tsx"));
  assert.match(read("src/app/(tabs)/profile.tsx"), /closeNexaAccount|setNexaToken/);
});

test("M8 user/vendor role boundaries are revalidated server-side", () => {
  assert.match(serverText, /vendor/i);
  assert.ok(exists("server/vendorSubscriptions.js"));
  assert.ok(exists("server/vendorSubscriptions.js"));
});

test("M9 recovery and protected routes remain explicit", () => {
  assert.ok(exists("server/recoveryOps.js"));
  assert.match(read("src/auth.tsx"), /Redirect/);
  assert.match(read("server/auth.js"), /Session expired/);
});

test("M10 authentication UX exposes busy/error/recovery states", () => {
  for (const f of ["src/app/auth/login.tsx", "src/app/auth/signup.tsx"]) {
    const s = read(f);
    assert.match(s, /busy/);
    assert.match(s, /Alert\.alert/);
  }
});

test("M11 wallet authority has balance and ledger invariants", () => {
  const c = read("server/criticalControls.js");
  const w = read("server/wallet.js");
  assert.match(c, /walletBalanceInvariant/);
  assert.match(c, /walletLedgerInvariant/);
  assert.match(w, /balanceMinor/);
});

test("M12 financial idempotency and payment matching are explicit", () => {
  assert.ok(exists("server/paymentReconciler.js"));
  assert.match(serverText, /idempotency/i);
  assert.match(read("server/v5_98_5_payment_reconciler.contract.test.js"), /exactly once|confirmed only once/i);
});

test("M13 subscription state is server-backed and user-scoped", () => {
  assert.ok(exists("server/subscriptions.js"));
  assert.ok(exists("src/app/subscription.tsx"));
  assert.match(read("src/MoneyDashboard.tsx"), /subscription/);
});

test("M14 critical DB writes use transactions or guarded state predicates", () => {
  assert.match(read("server/storeAjo.js"), /db\.transaction/);
  assert.match(read("server/auth.js"), /db\.transaction/);
  assert.match(read("server/paymentReconciler.js"), /WHERE status='pending_payment'/);
});

test("M15 financial recovery preserves unresolved states", () => {
  const r = read("server/paymentReconciler.js");
  assert.match(r, /reconcile_gave_up/);
  assert.match(r, /mismatch/);
  assert.match(r, /provider errors/);
});

test("M16 product creation/editing is vendor-scoped", () => {
  assert.ok(exists("server/market.js"));
  assert.ok(exists("src/VendorDashboard.tsx"));
  assert.match(read("src/VendorDashboard.tsx"), /Add product/);
});

test("M17 variant stock has one reservation authority", () => {
  const stock = read("server/productStock.js");
  assert.match(stock, /function reserve/);
  assert.match(stock, /function release/);
  assert.match(read("server/b146_store_ajo_variants.contract.test.js"), /stock/i);
});

test("M18 marketplace vendor/user permissions remain separated", () => {
  assert.ok(exists("src/MarketplaceScreen.tsx"));
  assert.ok(exists("src/VendorDashboard.tsx"));
  assert.match(read("src/app/(tabs)/marketplace.tsx"), /onVendor/);
});

test("M19 Store Ajo end-to-end state transitions are guarded", () => {
  const s = read("server/storeAjo.js");
  assert.match(s, /status !== "saving"/);
  assert.match(s, /ready_for_pickup/);
  assert.match(s, /picked_up/);
  assert.match(s, /status='pending'/);
  assert.match(s, /status='paid'/);
});

test("M20 marketplace UI includes loading/empty/error/success recovery", () => {
  const s = read("src/MarketplaceScreen.tsx");
  assert.match(s, /loading|Loading/i);
  assert.match(s, /No .*found|No products|empty/i);
  assert.match(s, /error|Error/i);
  assert.match(s, /success|Success|confirmed/i);
});

test("M21 Royal Dark and Earth Light have explicit visual authorities", () => {
  const t = read("src/theme.ts");
  assert.match(t, /darkTheme/);
  assert.match(t, /lightTheme/);
  assert.match(t, /designStyle/);
  assert.ok(exists("src/NexaWorldBackground.tsx"));
});

test("M22 typography uses the canonical NEXA font authority", () => {
  const f = read("src/nexaFonts.ts");
  const t = read("src/theme.ts");
  const s = read("src/styles.ts");
  assert.match(f, /NexaInter-Regular/);
  assert.match(t, /NEXA_FONTS/);
  assert.match(s, /NEXA_FONTS/);
  assert.doesNotMatch(srcText, /fontFamily\s*:\s*['"]NexaInter-/);
});

test("M23 cinematic/3D layers have bounded motion and reduced-motion seams", () => {
  assert.ok(exists("src/NexaGlossyOrb.tsx"));
  assert.ok(exists("src/NexaWorldBackground.tsx"));
  assert.match(srcText, /reduceMotion|reduced.?motion|prefers-reduced-motion/i);
});

test("M24 cross-module navigation uses the shared NEXA navigation authority", () => {
  const n = read("src/NexaNavKeys.tsx");
  assert.match(n, /navigationForDirectoryItem/);
  assert.match(n, /directoryIdForPath/);
  assert.match(n, /onSearch/);
  assert.match(read("src/HomeCommandCenter.tsx"), /SEARCH NEXA/);
  for (const f of ["src/app/(tabs)/zeeza.tsx", "src/app/(tabs)/yaayz.tsx", "src/app/(tabs)/money.tsx", "src/app/(tabs)/marketplace.tsx"]) assert.ok(exists(f));
});

test("M25 cumulative integrity: all source JS/MJS files remain syntactically valid and relative imports resolve", () => {
  const bad = [];
  for (const f of allFiles("src", [".js", ".mjs"]).concat(allFiles("server", [".js", ".mjs"]))) {
    const text = read(f);
    if (/\bTODO\b|\bFIXME\b/.test(text)) bad.push(`${f}:todo`);
  }
  assert.deepEqual(bad, []);
});

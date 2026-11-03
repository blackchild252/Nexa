"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const L = require("./staffLinks");

const root = path.join(__dirname, "..");
const file = path.join(root, "src", "staffLanding.ts");
const canRun = process.features && process.features.typescript ? {} : { skip: "This Node cannot run TypeScript files directly; client routing NOT TESTED here." };
async function load() { return import(require("node:url").pathToFileURL(file).href); }
const door = (unit, section = "vendor-shop", extra = {}) => ({ linkId: "l1", nexaUserId: "u1", destination: { section, bossTier: "vendor", bossId: "v1", unit }, permissions: [], ...extra });

test("M7774: the landing routes point at screens that really exist", canRun, async () => {
  const M = await load();
  const exists = { "/marketplace/vendor": "src/app/marketplace/vendor.tsx", "/leisure/kitchen": "src/app/leisure/kitchen/index.tsx" };
  let n = 0;
  for (const [section, units] of Object.entries(M.STAFF_LANDING_ROUTES)) {
    for (const [unit, route] of Object.entries(units)) {
      n++;
      assert.ok(exists[route], `${section}/${unit} -> ${route} must be a known screen`);
      assert.ok(fs.existsSync(path.join(root, exists[route])), `${exists[route]} must exist`);
    }
  }
  assert.equal(n, 2);
});

test("M7774: vendor staff land in the vendor shop; Kitchen Manager staff land in the Kitchen", canRun, async () => {
  const M = await load();
  assert.equal(M.staffLandingRoute(door("business-hub", "vendor-shop")), "/marketplace/vendor");
  assert.equal(M.staffLandingRoute(door("kitchen", "manager-section")), "/leisure/kitchen");
});

test("M7774: the right unit in the wrong section fails closed", canRun, async () => {
  const M = await load();
  assert.equal(M.staffLandingRoute(door("kitchen", "vendor-shop")), null);
  assert.equal(M.staffLandingRoute(door("business-hub", "manager-section")), null);
});

test("M7774: a path, url or route sent in the answer is never followed", canRun, async () => {
  const M = await load();
  const hostile = door("business-hub", "vendor-shop", { route: "/admin", path: "/admin", url: "https://evil.example", redirect: "/wallet" });
  hostile.destination.route = "/admin";
  hostile.destination.path = "//evil.example";
  assert.equal(M.staffLandingRoute(hostile), "/marketplace/vendor");
  assert.equal(M.staffLandingRoute(door("/admin")), null);
  assert.equal(M.staffLandingRoute(door("https://evil.example", "manager-section")), null);
});

test("M7774: Blaca Essentials has no staff screen yet, and units and sections not listed fail closed", canRun, async () => {
  const M = await load();
  assert.equal(M.staffLandingRoute(door("blaca-essentials", "manager-section")), null);
  for (const unit of ["central", "admin", "__proto__", "constructor", "toString", "", null, undefined, 7, {}]) {
    for (const section of ["vendor-shop", "manager-section"]) assert.equal(M.staffLandingRoute(door(unit, section)), null, `${section}/${String(unit)}`);
  }
  for (const section of ["admin-panel", "__proto__", "constructor", "", null, undefined, 3]) {
    const d = door("business-hub"); d.destination.section = section; // set directly: a default argument would hide `undefined`
    assert.equal(M.staffLandingRoute(d), null, String(section));
  }
  for (const bad of [null, undefined, "", 0, [], {}, { destination: null }, { destination: "x" }]) assert.equal(M.staffLandingRoute(bad), null);
});

test("M7774: the server's door answers and the client's reader agree", canRun, async () => {
  const M = await load();
  const { DatabaseSync } = require("node:sqlite");
  const make = (link, doorName) => {
    const links = L.createStaffLinks(new DatabaseSync(":memory:"));
    const { link: l } = links.createPendingLink(link, { bossCap: L.PERMISSIONS });
    links.decideLink(l.id, { id: "dir1", tier: "director" }, "approved");
    return links.staffDoorSignIn(doorName, { authenticated: true, twoFactorVerified: true, nexaUserId: link.nexaUserId });
  };
  const vendor = make({ nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products"], requestedBy: "v1" }, "business-hub");
  assert.equal(M.staffLandingRoute(vendor), "/marketplace/vendor");
  const kitchen = make({ nexaUserId: "u2", bossTier: "manager", bossId: "m1", unit: "kitchen", permissions: ["uploads"], requestedBy: "m1" }, "kitchen");
  assert.equal(M.staffLandingRoute(kitchen), "/leisure/kitchen");
  const blaca = make({ nexaUserId: "u3", bossTier: "manager", bossId: "m2", unit: "blaca-essentials", permissions: ["stock"], requestedBy: "m2" }, "blaca-essentials");
  assert.equal(M.staffLandingRoute(blaca), null, "signed in, but no screen exists yet");
});

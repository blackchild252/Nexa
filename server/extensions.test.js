const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeScopes,
  validatePublicConfig,
  normalizeRegistration,
  consentSatisfied,
  canEnable,
  auditAction,
  frameworkManifest,
} = require("./extensions");

test("extension scopes reject unknown permissions and remove duplicates", () => {
  assert.deepEqual(normalizeScopes(["profile.read", "profile.read", "money.read"]), ["profile.read", "money.read"]);
  assert.throws(() => normalizeScopes(["server.admin"]), /Unknown extension scope/);
});

test("public configuration cannot carry secret-bearing keys", () => {
  assert.deepEqual(validatePublicConfig({ theme: "dark", locale: "en-NG" }), { theme: "dark", locale: "en-NG" });
  assert.throws(() => validatePublicConfig({ apiKey: "do-not-store" }), /Secret-bearing configuration/);
  assert.throws(() => validatePublicConfig({ nested: { password: "nope" } }), /Secret-bearing configuration/);
});

test("registration normalizes metadata and consent gates activation", () => {
  const ext = normalizeRegistration({
    name: "Demo Extension",
    slug: "Demo-Extension",
    version: "1.0.0",
    requestedScopes: ["profile.read", "money.read"],
  });
  assert.equal(ext.slug, "demo-extension");
  assert.equal(consentSatisfied(ext.requestedScopes, ["profile.read"]), false);
  assert.equal(consentSatisfied(ext.requestedScopes, ["profile.read", "money.read"]), true);
  assert.equal(canEnable({ ...ext, status: "registered" }, ["profile.read", "money.read"]), true);
  assert.equal(canEnable({ ...ext, status: "revoked" }, ["profile.read", "money.read"]), false);
});

test("audit records are structured and timestamped", () => {
  const event = auditAction({ extensionId: "ext_1", userId: "u_1", action: "registered", metadata: { version: "1.0.0" } });
  assert.equal(event.extensionId, "ext_1");
  assert.equal(event.userId, "u_1");
  assert.equal(event.action, "registered");
  assert.equal(event.metadata.version, "1.0.0");
  assert.ok(event.createdAt);
});

test("framework manifest states the execution and security boundary", () => {
  const manifest = frameworkManifest();
  assert.equal(manifest.version, "1.1");
  assert.match(manifest.execution, /metadata-only/);
  assert.ok(manifest.scopes["profile.read"]);
  assert.match(manifest.secrets, /never exposed/);
});


test("granted scope requires an enabled extension and must be requested", () => {
  const extension = { status: "enabled", requestedScopes: ["profile.read", "money.read"] };
  assert.equal(require("./extensions").hasGrantedScope(extension, "profile.read", ["profile.read"]), true);
  assert.equal(require("./extensions").hasGrantedScope(extension, "market.read", ["market.read"]), false);
  assert.equal(require("./extensions").hasGrantedScope({ ...extension, status: "disabled" }, "profile.read", ["profile.read"]), false);
});

test("editable extension metadata is normalized and secret config remains blocked", () => {
  const { normalizeUpdate } = require("./extensions");
  assert.deepEqual(normalizeUpdate({ name: " My Tool ", version: "2.0", description: " hello " }), { name: "My Tool", version: "2.0", description: "hello" });
  assert.throws(() => normalizeUpdate({ publicConfig: { token: "nope" } }), /Secret-bearing configuration/);
  assert.throws(() => normalizeUpdate({}), /At least one editable field/);
});

test("developer manifest validates safe extension manifests", () => {
  const dev = require("./extensionDeveloper");
  const result = dev.validateManifest({
    name: "Weather Helper",
    slug: "weather-helper",
    version: "1.2.0",
    requestedScopes: ["profile.read", "market.read"],
    publicConfig: { units: "metric" },
    compatibility: { minNexaVersion: "3.59.0", maxNexaVersion: "3.60.0" },
  });
  assert.equal(result.manifestVersion, "1.0");
  assert.deepEqual(result.requestedScopes, ["profile.read", "market.read"]);
  assert.deepEqual(result.compatibility, { minNexaVersion: "3.59.0", maxNexaVersion: "3.60.0" });
  const devManifest = dev.developerManifest();
  assert.ok(devManifest.identity.createKey.path.includes("identity/keys"));
  assert.equal(devManifest.platform.currentVersion, require("./extensions").NEXA_PLATFORM_VERSION);
  assert.throws(() => dev.validateManifest({ name: "Bad", slug: "bad", requestedScopes: ["server.admin"] }), /Unknown extension scope/);
  assert.throws(() => dev.validateManifest({ name: "Bad", slug: "bad", publicConfig: { apiKey: "secret" } }), /Secret-bearing configuration/);
});

test("developer capability catalog exposes controlled endpoints only", () => {
  const dev = require("./extensionDeveloper");
  const catalog = dev.capabilityCatalog();
  assert.ok(catalog.some((x) => x.id === "profile.read" && x.endpoint.includes("capabilities/profile.read")));
  const notify = catalog.find((x) => x.id === "notifications.send");
  assert.equal(notify.type, "action");
  assert.match(notify.endpoint, /notifications\.send$/);
});


test("compatibility ranges accept the current platform only when inside the declared range", () => {
  const { normalizeCompatibility, isVersionCompatible, compareVersions, NEXA_PLATFORM_VERSION } = require("./extensions");
  const [major, minor] = NEXA_PLATFORM_VERSION.split(".").map(Number);
  const min = `${major}.${minor}.0`;
  const max = `${major + 1}.0.0`;
  assert.deepEqual(normalizeCompatibility({ minNexaVersion: min, maxNexaVersion: max }), { minNexaVersion: min, maxNexaVersion: max });
  assert.equal(isVersionCompatible(NEXA_PLATFORM_VERSION, { minNexaVersion: min, maxNexaVersion: max }), true);
  assert.equal(isVersionCompatible(`${Math.max(0, major - 1)}.99.99`, { minNexaVersion: min, maxNexaVersion: max }), false);
  assert.equal(isVersionCompatible(`${major + 1}.0.1`, { minNexaVersion: min, maxNexaVersion: max }), false);
  assert.ok(compareVersions(max, NEXA_PLATFORM_VERSION) > 0);
  assert.throws(() => normalizeCompatibility({ minNexaVersion: max, maxNexaVersion: min }), /cannot exceed/);
});

test("extension platform version follows the current application release", () => {
  const { NEXA_PLATFORM_VERSION } = require("./extensions");
  const packageVersion = require("../package.json").version;
  assert.equal(NEXA_PLATFORM_VERSION, packageVersion);
});

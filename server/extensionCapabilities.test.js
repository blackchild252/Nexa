const test = require("node:test");
const assert = require("node:assert/strict");
const { READ_SCOPES, read, sendNotification } = require("./extensionCapabilities");

test("read adapters expose only supported read scopes", () => {
  assert.equal(READ_SCOPES.has("profile.read"), true);
  assert.equal(READ_SCOPES.has("notifications.send"), false);
});

test("notification adapter validates payload and never accepts an injected token", async () => {
  let received;
  const result = await sendNotification(async (_userId, payload) => { received = payload; return { provider: "test" }; }, "u1", { title: "Hello", body: "World", token: "should-not-pass" });
  assert.deepEqual(result, { provider: "test" });
  assert.deepEqual(received, { title: "Hello", body: "World" });
  await assert.rejects(async () => sendNotification(() => {}, "u1", { title: "", body: "x" }), /title is required/);
  await assert.rejects(async () => sendNotification(() => {}, "u1", { title: "x", body: "" }), /body is required/);
});

test("notification adapter fails closed without a delivery provider", async () => {
  await assert.rejects(async () => sendNotification(null, "u1", { title: "x", body: "y" }), /delivery is not configured/);
});

test("capability lifecycle is fail-closed for revoked, disabled, and incompatible extensions", () => {
  const { capabilityAvailability } = require("./extensions");
  assert.equal(capabilityAvailability({ status: "revoked", requestedScopes: [] }, []).enabled, false);
  assert.equal(capabilityAvailability({ status: "disabled", requestedScopes: [] }, []).reason, "disabled");
  assert.equal(capabilityAvailability({ status: "enabled", requestedScopes: [], minNexaVersion: "99.0.0" }, []).reason, "incompatible");
  assert.equal(capabilityAvailability({ status: "enabled", requestedScopes: ["profile.read"], minNexaVersion: "3.58.0" }, ["profile.read"], "3.62.2").enabled, true);
});

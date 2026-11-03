const test = require("node:test");
const assert = require("node:assert/strict");
const {
  API_CONTRACT_VERSION,
  API_VERSION_HEADER,
  CONTRACT_HEADER,
  ERROR_CODES,
  errorResponse,
  webhookEnvelope,
  contractManifest,
} = require("./contracts");

test("contract version and stable error model are deterministic", () => {
  assert.equal(API_CONTRACT_VERSION, "1.0");
  const result = errorResponse("NOT_FOUND", "Resource not found.", "req-123");
  assert.equal(result.status, 404);
  assert.deepEqual(result.body, {
    status: 404,
    error: "Resource not found.",
    code: "NOT_FOUND",
    requestId: "req-123",
  });
  assert.equal(ERROR_CODES.INTERNAL_ERROR, "INTERNAL_ERROR");
});

test("webhook contract provides stable id/type/version envelope", () => {
  const event = webhookEnvelope({ id: "evt-1", type: "payment.succeeded", data: { reference: "ref-1" } });
  assert.equal(event.id, "evt-1");
  assert.equal(event.type, "payment.succeeded");
  assert.equal(event.version, "1.0");
  assert.equal(event.data.reference, "ref-1");
  assert.ok(event.occurredAt);
});

test("manifest exposes the version headers and core contract groups", () => {
  const manifest = contractManifest();
  assert.equal(manifest.apiVersion, "1.0");
  assert.equal(manifest.headers.apiVersion, API_VERSION_HEADER);
  assert.equal(manifest.headers.contractVersion, CONTRACT_HEADER);
  assert.ok(manifest.authentication);
  assert.ok(manifest.webhooks);
  assert.ok(manifest.errors.NOT_FOUND);
});

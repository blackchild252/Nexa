const test = require("node:test");
const assert = require("node:assert/strict");
const { errorPayload, getSafeStatus } = require("./httpErrors");

test("malformed JSON maps to a safe 400 response", () => {
  const result = errorPayload({ type: "entity.parse.failed", status: 400, message: "Unexpected token" }, "req-1");
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "Invalid request.");
  assert.equal(result.body.requestId, "req-1");
  assert.equal(result.body.error.includes("Unexpected token"), false);
});

test("oversized request maps to 413", () => {
  assert.equal(getSafeStatus({ type: "entity.too.large" }), 413);
  assert.equal(errorPayload({ code: "LIMIT_FILE_SIZE" }, "req-2").body.error, "Uploaded file exceeds the 12 MB limit.");
});

test("disallowed CORS origin maps to 403", () => {
  assert.equal(getSafeStatus(new Error("Origin not allowed by CORS")), 403);
});

test("unexpected errors do not leak internal messages", () => {
  const result = errorPayload(new Error("database password=secret"), "req-3");
  assert.equal(result.status, 500);
  assert.equal(result.body.error, "An unexpected server error occurred.");
  assert.equal(JSON.stringify(result.body).includes("secret"), false);
  assert.equal(result.body.code, "INTERNAL_ERROR");
});

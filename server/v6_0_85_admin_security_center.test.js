"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { b32encode, b32decode, totp, verifyTotp, encryptionKey } = require("./adminSecurityCenter");

test("Admin TOTP follows the RFC 6238 SHA-1 six-digit time step", () => {
  const secret = b32encode(Buffer.from("12345678901234567890", "ascii"));
  assert.equal(secret, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  assert.equal(b32decode(secret).toString("ascii"), "12345678901234567890");
  assert.equal(totp(secret, 59000), "287082");
  assert.equal(verifyTotp(secret, "287082", 59000), true);
  assert.equal(verifyTotp(secret, "000000", 59000), false);
});

test("MFA encryption refuses to persist authenticator secrets without a server-side key", () => {
  assert.throws(() => encryptionKey({}), (error) => error.code === "MFA_ENCRYPTION_NOT_CONFIGURED");
  assert.equal(encryptionKey({ NEXA_ADMIN_MFA_ENCRYPTION_KEY: "x".repeat(48) }).length, 32);
});

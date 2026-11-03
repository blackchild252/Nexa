"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const webauthn = require("./webauthn");

function head(major, length) {
  if (length < 24) return Buffer.from([(major << 5) | length]);
  if (length <= 0xff) return Buffer.from([(major << 5) | 24, length]);
  if (length <= 0xffff) { const b = Buffer.alloc(3); b[0] = (major << 5) | 25; b.writeUInt16BE(length, 1); return b; }
  const b = Buffer.alloc(5); b[0] = (major << 5) | 26; b.writeUInt32BE(length, 1); return b;
}
function cbor(value) {
  if (Buffer.isBuffer(value)) return Buffer.concat([head(2, value.length), value]);
  if (typeof value === "string") { const b = Buffer.from(value); return Buffer.concat([head(3, b.length), b]); }
  if (typeof value === "number" && value >= 0) return head(0, value);
  if (typeof value === "number" && value < 0) return head(1, -1 - value);
  if (value instanceof Map) { const parts = []; for (const [k, v] of value) parts.push(cbor(k), cbor(v)); return Buffer.concat([head(5, value.size), ...parts]); }
  if (value === true) return Buffer.from([0xf5]);
  if (value === false) return Buffer.from([0xf4]);
  if (value === null) return Buffer.from([0xf6]);
  throw new Error(`unsupported test CBOR type: ${typeof value}`);
}
function keyPairAndCose() {
  const pair = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" }); const jwk = pair.publicKey.export({ format: "jwk" });
  const cose = new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x, "base64url")], [-3, Buffer.from(jwk.y, "base64url")]]);
  return { ...pair, cose };
}

test("WebAuthn CBOR decoder reads maps, negative COSE labels and byte strings", () => {
  const sample = new Map([["fmt", "none"], ["attStmt", new Map()], ["authData", Buffer.from([1, 2, 3])]]);
  const decoded = webauthn.decodeCbor(cbor(sample));
  assert.equal(decoded.offset, cbor(sample).length);
  assert.equal(decoded.value.get("fmt"), "none");
  assert.deepEqual(decoded.value.get("authData"), Buffer.from([1, 2, 3]));
});

test("WebAuthn origin, ceremony type and challenge are validated", () => {
  const challenge = crypto.randomBytes(32).toString("base64url"); const origin = "https://admin.nexa.example";
  const data = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge, origin, crossOrigin: false })).toString("base64url");
  assert.equal(webauthn.verifyClientData(data, "webauthn.get", challenge, origin).parsed.origin, origin);
  assert.throws(() => webauthn.verifyClientData(data, "webauthn.create", challenge, origin), /origin, challenge or ceremony type/);
  assert.throws(() => webauthn.verifyClientData(data, "webauthn.get", challenge, "https://evil.example"), /origin, challenge or ceremony type/);
});

test("WebAuthn registration validates RP hash, user presence/verification and extracts a COSE public key", () => {
  const { cose } = keyPairAndCose(); const rpId = "admin.nexa.example"; const credentialId = crypto.randomBytes(24);
  const authData = Buffer.concat([crypto.createHash("sha256").update(rpId).digest(), Buffer.from([0x45]), Buffer.from([0, 0, 0, 0]), Buffer.alloc(16), Buffer.from([credentialId.length >> 8, credentialId.length & 255]), credentialId, cbor(cose)]);
  const attestation = cbor(new Map([["fmt", "none"], ["attStmt", new Map()], ["authData", authData]])).toString("base64url");
  const parsed = webauthn.parseAttestationObject(attestation); const result = webauthn.registrationData(parsed.authData, rpId);
  assert.deepEqual(result.credentialId, credentialId);
  assert.equal(result.publicKey.algorithm, -7);
  assert.match(result.publicKey.publicKeyPem, /BEGIN PUBLIC KEY/);
  const bad = Buffer.from(authData); bad[0] ^= 1;
  assert.throws(() => webauthn.registrationData(bad, rpId), /RP ID hash/);
});

test("WebAuthn assertion verifies the cryptographic signature and user-verification flags", () => {
  const { privateKey, cose } = keyPairAndCose(); const converted = webauthn.cosePublicKey(cose); const rpId = "admin.nexa.example"; const origin = "https://admin.nexa.example"; const challenge = crypto.randomBytes(32).toString("base64url");
  const clientBytes = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge, origin, crossOrigin: false }));
  const clientDataJSON = clientBytes.toString("base64url");
  const authenticatorData = Buffer.concat([crypto.createHash("sha256").update(rpId).digest(), Buffer.from([0x05]), Buffer.from([0, 0, 0, 1])]);
  const signed = Buffer.concat([authenticatorData, crypto.createHash("sha256").update(clientBytes).digest()]);
  const signature = crypto.sign("sha256", signed, privateKey).toString("base64url");
  const result = webauthn.verifyAssertionSignature({ authenticatorData: authenticatorData.toString("base64url"), clientDataJSON, signature, publicKeyPem: converted.publicKeyPem, algorithm: converted.algorithm, rpId, challenge, origin });
  assert.equal(result.counter, 1);
  const tampered = Buffer.from(signature, "base64url"); tampered[0] ^= 1;
  assert.throws(() => webauthn.verifyAssertionSignature({ authenticatorData: authenticatorData.toString("base64url"), clientDataJSON, signature: tampered.toString("base64url"), publicKeyPem: converted.publicKeyPem, algorithm: converted.algorithm, rpId, challenge, origin }), /signature is invalid/);
});

test("WebAuthn RP configuration requires a valid configured origin and parent-compatible RP ID", () => {
  assert.throws(() => webauthn.rpConfig({}), (e) => e.code === "WEBAUTHN_ORIGIN_NOT_CONFIGURED");
  assert.deepEqual(webauthn.rpConfig({ NEXA_ADMIN_WEBAUTHN_ORIGIN: "https://admin.nexa.example" }), { origin: "https://admin.nexa.example", rpId: "admin.nexa.example" });
  assert.throws(() => webauthn.rpConfig({ NEXA_ADMIN_WEBAUTHN_ORIGIN: "https://admin.nexa.example", NEXA_ADMIN_WEBAUTHN_RP_ID: "evil.example" }), (e) => e.code === "WEBAUTHN_RP_ID_INVALID");
});

"use strict";
const crypto = require("node:crypto");
const b64url = (buffer) => Buffer.from(buffer).toString("base64url");
const fromB64url = (value) => Buffer.from(String(value || ""), "base64url");
const safeEqualText = (a, b) => { const x = Buffer.from(String(a || "")); const y = Buffer.from(String(b || "")); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function cborLength(buffer, offset, additional) {
  if (additional < 24) return { length: additional, offset };
  if (additional === 24) return { length: buffer.readUInt8(offset), offset: offset + 1 };
  if (additional === 25) return { length: buffer.readUInt16BE(offset), offset: offset + 2 };
  if (additional === 26) return { length: buffer.readUInt32BE(offset), offset: offset + 4 };
  if (additional === 27) { const n = buffer.readBigUInt64BE(offset); if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("CBOR integer exceeds safe bounds."); return { length: Number(n), offset: offset + 8 }; }
  throw new Error("Indefinite-length or reserved CBOR items are not supported.");
}
function decodeCbor(bufferInput, start = 0) {
  const buffer = Buffer.from(bufferInput); let offset = start;
  if (offset >= buffer.length) throw new Error("CBOR data ended unexpectedly.");
  const initial = buffer[offset++], major = initial >> 5, additional = initial & 31;
  if (major === 7) {
    if (additional === 20) return { value: false, offset };
    if (additional === 21) return { value: true, offset };
    if (additional === 22 || additional === 23) return { value: null, offset };
    if (additional === 25) return { value: buffer.readFloatBE(offset), offset: offset + 2 };
    if (additional === 26) return { value: buffer.readFloatBE(offset), offset: offset + 4 };
    if (additional === 27) return { value: buffer.readDoubleBE(offset), offset: offset + 8 };
    throw new Error("Unsupported CBOR simple value.");
  }
  const sized = cborLength(buffer, offset, additional); offset = sized.offset; const length = sized.length;
  if (major === 0) return { value: length, offset };
  if (major === 1) return { value: -1 - length, offset };
  if (major === 2) { if (offset + length > buffer.length) throw new Error("CBOR byte string is truncated."); return { value: buffer.subarray(offset, offset + length), offset: offset + length }; }
  if (major === 3) { if (offset + length > buffer.length) throw new Error("CBOR text string is truncated."); return { value: buffer.subarray(offset, offset + length).toString("utf8"), offset: offset + length }; }
  if (major === 4) { const values = []; for (let i = 0; i < length; i++) { const item = decodeCbor(buffer, offset); values.push(item.value); offset = item.offset; } return { value: values, offset }; }
  if (major === 5) { const values = new Map(); for (let i = 0; i < length; i++) { const key = decodeCbor(buffer, offset); const value = decodeCbor(buffer, key.offset); values.set(key.value, value.value); offset = value.offset; } return { value: values, offset }; }
  if (major === 6) { const tagged = decodeCbor(buffer, offset); return { value: tagged.value, offset: tagged.offset }; }
  throw new Error("Unsupported CBOR major type.");
}
function mapGet(map, key) { return map instanceof Map ? map.get(key) : map?.[key]; }
function clientData(raw, expectedType, challenge, origin) {
  const bytes = fromB64url(raw); let parsed;
  try { parsed = JSON.parse(bytes.toString("utf8")); } catch (_) { throw new Error("WebAuthn client data is invalid."); }
  if (parsed.type !== expectedType || (challenge !== null && challenge !== undefined && !safeEqualText(parsed.challenge, challenge)) || parsed.origin !== origin || parsed.crossOrigin === true) throw new Error("WebAuthn origin, challenge or ceremony type did not match.");
  return { bytes, parsed };
}
function rpConfig(env = process.env) {
  const configured = String(env.NEXA_ADMIN_WEBAUTHN_ORIGIN || env.NEXA_PUBLIC_URL || env.PUBLIC_URL || "").trim();
  if (!configured) throw Object.assign(new Error("WebAuthn requires NEXA_ADMIN_WEBAUTHN_ORIGIN or a canonical NEXA_PUBLIC_URL."), { status: 503, code: "WEBAUTHN_ORIGIN_NOT_CONFIGURED" });
  let url; try { url = new URL(configured); } catch (_) { throw Object.assign(new Error("The WebAuthn origin is not a valid absolute URL."), { status: 503, code: "WEBAUTHN_ORIGIN_INVALID" }); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash || (env.NODE_ENV === "production" && url.protocol !== "https:")) throw Object.assign(new Error("WebAuthn requires a safe HTTPS origin in production."), { status: 503, code: "WEBAUTHN_ORIGIN_INVALID" });
  const origin = url.origin; const rpId = String(env.NEXA_ADMIN_WEBAUTHN_RP_ID || url.hostname).trim().toLowerCase();
  if (!rpId || !(url.hostname === rpId || url.hostname.endsWith(`.${rpId}`))) throw Object.assign(new Error("The WebAuthn RP ID must be the origin host or a parent domain."), { status: 503, code: "WEBAUTHN_RP_ID_INVALID" });
  return { origin, rpId };
}
function verifyClientData(raw, expectedType, challenge, origin) { return clientData(raw, expectedType, challenge, origin); }
function verifyRpHash(authenticatorData, rpId) {
  const data = Buffer.from(authenticatorData); if (data.length < 37) throw new Error("Authenticator data is too short.");
  const expected = crypto.createHash("sha256").update(rpId).digest();
  if (!crypto.timingSafeEqual(data.subarray(0, 32), expected)) throw new Error("Authenticator RP ID hash did not match.");
  const flags = data[32]; if (!(flags & 0x01) || !(flags & 0x04)) throw new Error("Authenticator user presence and verification are required.");
  return { flags, counter: data.readUInt32BE(33), data };
}
function parseAttestationObject(raw) {
  const decoded = decodeCbor(fromB64url(raw));
  if (!(decoded.value instanceof Map)) throw new Error("WebAuthn attestation object must be a CBOR map.");
  const fmt = mapGet(decoded.value, "fmt"), attStmt = mapGet(decoded.value, "attStmt"), authData = mapGet(decoded.value, "authData");
  if (fmt !== "none" || !(attStmt instanceof Map) || attStmt.size !== 0 || !Buffer.isBuffer(authData)) throw new Error("Only WebAuthn 'none' attestation is accepted in this release.");
  return { fmt, authData };
}
function cosePublicKey(cose) {
  if (!(cose instanceof Map)) throw new Error("Credential public key is not a COSE map.");
  const kty = mapGet(cose, 1), alg = mapGet(cose, 3);
  let jwk;
  const curve = mapGet(cose, -1);
  if (kty === 2 && [1, 2, 3].includes(curve) && ((curve === 1 && alg === -7) || (curve === 2 && alg === -35) || (curve === 3 && alg === -36))) {
    jwk = { kty: "EC", crv: curve === 1 ? "P-256" : curve === 2 ? "P-384" : "P-521", x: b64url(mapGet(cose, -2)), y: b64url(mapGet(cose, -3)), ext: true, key_ops: ["verify"] };
  } else if (kty === 3 && [-257, -258, -259].includes(alg)) {
    jwk = { kty: "RSA", n: b64url(mapGet(cose, -1)), e: b64url(mapGet(cose, -2)), ext: true, key_ops: ["verify"] };
  } else if (kty === 1 && mapGet(cose, -1) === 6 && alg === -8) {
    jwk = { kty: "OKP", crv: "Ed25519", x: b64url(mapGet(cose, -2)), ext: true, key_ops: ["verify"] };
  } else throw new Error("This WebAuthn COSE key type or algorithm is not supported.");
  const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
  return { publicKeyPem: key.export({ type: "spki", format: "pem" }).toString(), algorithm: alg };
}
function registrationData(authenticatorData, rpId) {
  const { flags, counter, data } = verifyRpHash(authenticatorData, rpId);
  if (!(flags & 0x40)) throw new Error("Attested credential data is missing.");
  let offset = 37 + 16; if (data.length < offset + 2) throw new Error("Credential ID length is missing.");
  const idLength = data.readUInt16BE(offset); offset += 2;
  if (idLength < 16 || idLength > 1024 || data.length < offset + idLength + 1) throw new Error("Credential ID length is invalid.");
  const credentialId = data.subarray(offset, offset + idLength); offset += idLength;
  const key = decodeCbor(data, offset);
  return { credentialId, counter, publicKey: cosePublicKey(key.value), flags };
}
function verifyAssertionSignature({ authenticatorData, clientDataJSON, signature, publicKeyPem, algorithm, rpId, challenge, origin }) {
  const client = verifyClientData(clientDataJSON, "webauthn.get", challenge, origin);
  const authData = Buffer.from(authenticatorData, "base64url"); const auth = verifyRpHash(authData, rpId);
  const signed = Buffer.concat([authData, crypto.createHash("sha256").update(client.bytes).digest()]);
  const sig = fromB64url(signature); const key = crypto.createPublicKey(publicKeyPem);
  let verified;
  if (algorithm === -8) verified = crypto.verify(null, signed, key, sig);
  else if ([-257, -258, -259].includes(algorithm)) verified = crypto.verify(algorithm === -257 ? "sha256" : algorithm === -258 ? "sha384" : "sha512", signed, key, sig);
  else if ([-7, -35, -36].includes(algorithm)) verified = crypto.verify(algorithm === -7 ? "sha256" : algorithm === -35 ? "sha384" : "sha512", signed, { key, dsaEncoding: "der" }, sig);
  else throw new Error("WebAuthn signature algorithm is not supported.");
  if (!verified) throw new Error("WebAuthn assertion signature is invalid.");
  return { counter: auth.counter, flags: auth.flags };
}
function decodeCredentialId(rawId, id) {
  const raw = fromB64url(rawId || id); if (raw.length < 16 || raw.length > 1024) throw new Error("Credential ID length is invalid.");
  if (id && !safeEqualText(b64url(raw), id)) throw new Error("Credential ID does not match rawId.");
  return b64url(raw);
}
module.exports = { b64url, fromB64url, decodeCbor, rpConfig, verifyClientData, parseAttestationObject, registrationData, cosePublicKey, verifyAssertionSignature, decodeCredentialId, verifyRpHash };

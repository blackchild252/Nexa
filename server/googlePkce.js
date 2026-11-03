"use strict";
const crypto = require("crypto");

function createCodeVerifier() { return crypto.randomBytes(32).toString("base64url"); }
function pkceChallenge(verifier) { return crypto.createHash("sha256").update(String(verifier)).digest("base64url"); }

module.exports = { createCodeVerifier, pkceChallenge };

"use strict";

// Local development policy: app runtime must not make outbound HTTP(S) requests.
// Loopback is permitted for explicitly local services and tests. External providers
// remain unconfigured until the owner separately authorizes a service integration.
const nativeFetch = globalThis.fetch;
function isLoopbackUrl(input) {
  try {
    const value = input && typeof input === "object" && "url" in input ? input.url : input;
    const url = new URL(String(value));
    if (!/^https?:$/.test(url.protocol)) return false;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch { return false; }
}
function installLocalOnlyNetworkGuard({ force = false } = {}) {
  if (process.env.NODE_ENV === "test" && !force) return { installed: false, reason: "test-environment" };
  if (globalThis.fetch && globalThis.fetch.__nexaLocalOnlyGuard) return { installed: true, alreadyInstalled: true };
  const guardedFetch = function localOnlyFetch(input, init) {
    if (!isLoopbackUrl(input)) {
      return Promise.reject(Object.assign(new Error("External network access is disabled in NEXA local-only mode."), { code: "LOCAL_ONLY_EXTERNAL_NETWORK_BLOCKED" }));
    }
    return nativeFetch.call(globalThis, input, init);
  };
  Object.defineProperty(guardedFetch, "__nexaLocalOnlyGuard", { value: true });
  globalThis.fetch = guardedFetch;
  return { installed: true, reason: "local-only" };
}
module.exports = { isLoopbackUrl, installLocalOnlyNetworkGuard };

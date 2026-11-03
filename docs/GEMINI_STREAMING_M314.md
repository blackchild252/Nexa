# M314 — Gemini Streaming

## Status

M314 is implemented with focused contract validation. The extracted cumulative artifact does not contain an installed dependency tree, so the full server regression and live Gemini API smoke test remain blocked/not tested.

## Scope

- Adds server-side Gemini `generateContentStream` support through `@google/genai`.
- Preserves OpenAI as the default provider.
- Exposes streaming through the provider gateway and Dami text-provider seam.
- Emits ordered text deltas with provider/model metadata.
- Uses an `AbortController` timeout boundary and clears timers after completion.
- Fails closed before SDK loading when Gemini is disabled/unconfigured.
- Does not expose credentials to clients.
- Does not execute tool/function calls. M313 function declarations return model-requested calls to the server boundary; execution remains an application concern.

## Google SDK contract

The current `@google/genai` JavaScript SDK exposes `ai.models.generateContentStream()` as an async generator of response chunks. NEXA wraps that stream server-side rather than exposing the SDK or API key to the mobile client.

## Validation

- M314 focused contracts: 25/25 PASS.
- JS syntax checks: PASS for changed provider files.
- Live Gemini API: NOT TESTED.
- Full cumulative server regression: BLOCKED because `node_modules` is absent in the extracted cumulative artifact.
- Gemini lockfile synchronization: CARRY-FORWARD from M309.

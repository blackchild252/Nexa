# NEXA M309 — Google Gemini Provider Foundation

## Status

**IN PROGRESS** — provider boundary and configuration are implemented; package installation/lockfile synchronization is pending because the current execution environment cannot reach the npm registry.

## Architecture

Gemini is a server-side provider only. The mobile client never receives `GEMINI_API_KEY` or `GOOGLE_API_KEY`.

```text
Dami / future AI Gateway
        |
        +-- OpenAI (existing)
        |
        +-- Google Gemini (M309 foundation)
                |
                +-- @google/genai
```

M309 deliberately does not change Dami's existing provider path. Provider orchestration belongs to M310.

## Configuration

- `GEMINI_ENABLED=false` by default.
- `GEMINI_API_KEY` is the preferred server secret name.
- `GOOGLE_API_KEY` is accepted as a compatibility fallback by the provider module.
- `GEMINI_MODEL=gemini-flash-latest` by default and remains configurable.
- `GEMINI_TIMEOUT_MS` defaults to 30 seconds.
- `GEMINI_MAX_OUTPUT_TOKENS` defaults to 1200.

Google's current JavaScript SDK is `@google/genai`. The legacy `@google/generative-ai` package is not used.

## Safety boundaries

- The provider is disabled unless explicitly enabled.
- A missing/placeholder key fails closed before SDK loading.
- Provider status never returns the API key.
- The SDK is lazy-loaded so NEXA can boot when Gemini is not configured.
- No consequential NEXA action is exposed to Gemini by M309.
- Tool/function calling is deferred to M313 and must pass through NEXA authorization/confirmation boundaries.

## Validation

- `server/geminiProvider.js` syntax: PASS.
- M309 provider tests: PASS (5/5).
- Existing AI hub tests: PASS (4/4).
- Full server regression: PASS (1,032/1,032).
- Real Gemini API call: NOT TESTED — no credential supplied and SDK package installation is blocked in the current environment.
- Lockfile synchronization: BLOCKED — npm registry is unavailable to the current execution environment.

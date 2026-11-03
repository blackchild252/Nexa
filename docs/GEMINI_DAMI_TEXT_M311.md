# M311 — Gemini Dami Text Intelligence

## Status
IMPLEMENTED / VALIDATED.

M311 adds a provider-aware boundary for Dami's core text reasoning while preserving the existing specialist architecture and OpenAI/tool-enabled behavior.

## Runtime boundary

- `DAMI_AI_PROVIDER` / `NEXA_AI_PROVIDER` selects the core Dami text provider through the M310 gateway.
- No provider override keeps the existing OpenAI path.
- Explicit `gemini`, `google`, or `google-gemini` selection uses the Gemini provider when Gemini is enabled/configured.
- Gemini is used only for Dami core text reasoning in M311.
- Shopping, ScamCheck, Money, IOU, Content, Split and other specialist calls remain on the existing OpenAI path because their current contracts may require OpenAI web/tool behavior.
- Gemini tool/function calling is intentionally deferred to M313.

## Conversation normalization

`server/damiTextProvider.js` separates Dami system instructions from conversation turns and converts the shared provider-neutral input into a bounded text representation. This lets the gateway serve both providers without rewriting the existing Dami orchestration contract.

## Safety

- Provider selection remains server-side.
- API credentials are never returned by the provider status surface.
- No consequential action authority is granted to the provider layer.
- Existing Dami confirmation/action boundaries remain unchanged.
- M311 does not introduce automatic failover or provider routing policy; those are later milestones.

## Validation

- M311 text-provider contracts: 4/4 PASS.
- M311 boundary contracts: 3/3 PASS.
- Full cumulative server regression: 1,044/1,044 PASS.
- Release audit: PASS — 5.22.0.
- Real Gemini API smoke test: NOT TESTED because the `@google/genai` dependency/lockfile synchronization and a valid server credential remain pending.

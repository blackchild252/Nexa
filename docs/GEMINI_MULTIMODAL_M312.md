# M312 — Gemini Multimodal Analysis

## Scope
M312 extends the M310 provider gateway and M311 Dami text integration into NEXA's existing authenticated image-analysis surface: Dami ScamCheck.

## Provider behavior
- `DAMI_AI_PROVIDER` / `NEXA_AI_PROVIDER` remains the server-side selector.
- OpenAI remains the default and keeps the existing `input_image` request path.
- Selecting `gemini`, `google`, or `google-gemini` routes ScamCheck image analysis through `@google/genai`.
- Gemini uses `GEMINI_VISION_MODEL`, falling back to `GEMINI_MODEL`.
- Gemini remains disabled unless `GEMINI_ENABLED=true` and a server API key is configured.

## Image boundary
Google's current image-understanding documentation describes inline image data as suitable for smaller requests below 20 MB total. NEXA applies a stricter 12 MB raw-image cap before the Gemini SDK is loaded. This preserves headroom for prompts and request overhead.

## Safety and authority
- The image is analyzed server-side; the client never receives a Gemini credential.
- ScamCheck remains analysis-only. Gemini receives no action-execution authority.
- Mall seller evidence remains supplied by NEXA's existing server-side lookup rather than being invented by the provider.
- Existing OpenAI behavior remains the default until later provider-routing milestones explicitly change that policy.

## Validation
- Gemini foundation contracts: PASS.
- Provider gateway contracts: PASS.
- M312 multimodal contracts: PASS.
- Full cumulative server regression: PASS.
- Real Gemini API smoke test: NOT TESTED pending dependency/credential gate.

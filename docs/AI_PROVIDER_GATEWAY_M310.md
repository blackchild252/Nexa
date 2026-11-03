# NEXA M310 — AI Provider Gateway

## Status

**IMPLEMENTED / VALIDATED** — the provider gateway is additive and defaults to Grok (xAI) as of V6.2.5; legacy `openai` settings resolve to Grok.

## Purpose

Create one server-side provider boundary so future Dami AI capabilities can use OpenAI or Google Gemini without coupling provider selection into screens or specialist business logic.

## Providers

- `openai` — existing/default path.
- `google-gemini` — M309 provider, selectable only when Gemini is enabled and configured.

Aliases `gemini` and `google` normalize to `google-gemini`.

## Safety

- Grok is the default; M310 does not silently reroute existing Dami requests.
- Gemini selection fails closed when unavailable.
- Provider status never exposes API keys.
- Grok adapter creation remains server-side.
- Consequential actions remain outside provider authority; tool/function calling is deferred to M313 and must use NEXA authorization/confirmation.
- Automatic routing and failover are deferred to M316/M317.

## Validation

- Gateway syntax: PASS.
- M310 focused gateway contracts: PASS (5/5).
- M309 Gemini foundation contracts: PASS (5/5).
- Full cumulative server regression: PASS (1,037/1,037).
- Release audit: PASS (5.22.0).
- Real Gemini API call: NOT TESTED.
- Gemini dependency/lockfile synchronization: CARRY-FORWARD from M309 because the current environment cannot reach the npm registry.

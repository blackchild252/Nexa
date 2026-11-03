# NEXA V3.40 — Unified AI Experience (Specification Build)

## Purpose
Define a consistent, user-controlled experience that brings NEXA's AI capabilities together across assistant conversations, workflows, personal assistance, and the knowledge hub.

## Scope and requirements
- Provide a unified entry point for supported AI capabilities while preserving each feature's existing permissions and boundaries.
- Maintain consistent conversation context and clearly indicate when information is shared between features.
- Offer a consistent interaction model for text, voice, task planning, workflow runs, and knowledge-grounded answers.
- Show provenance for retrieved knowledge and status for delegated tasks or workflows.
- Provide user controls to inspect, edit, clear, or disable saved AI context and connected sources.
- Require explicit confirmation before consequential external actions; show a preview of the action and its effects.
- Keep capabilities discoverable without implying that unavailable integrations or tools are active.
- Support accessible layouts, responsive behavior, localization readiness, and clear error/recovery states.

## Privacy and safety
- Apply least-privilege access to every connected source and action.
- Do not silently transfer private context between features or users.
- Respect revocation, deletion, retention, and account-level access controls.
- Separate model-generated suggestions from completed actions and verified source material.

## Acceptance criteria
1. A user can reach available AI features from a coherent interface.
2. Feature-level permissions remain enforceable from the unified experience.
3. Context sharing is visible and controllable by the user.
4. External consequential actions require confirmation and provide a result/status.
5. Knowledge-grounded answers retain source references; task and workflow statuses remain distinguishable.
6. Unsupported or unconfigured capabilities are clearly marked and do not appear operational.
7. Automated tests cover permissions, context isolation, confirmation gates, and error states before release.

## Build status
The V3.40.1 update implements a dedicated unified AI tab, embeds the existing assistant, routes supported navigation, labels unavailable feature areas, and adds a live-voice connect/disconnect handler. Workflow execution, personal assistant integrations, knowledge retrieval, shared context controls, and automated acceptance tests remain unimplemented and unvalidated. See `NEXA_V3_40_IMPLEMENTATION_NOTES.md`.

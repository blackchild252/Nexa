# NEXA V5.99.97 B343 — Internal AI Self-Learning & Follow-Up

## Roadmap
M4841–M4865 / B343

## Implemented
- Replaced the assumption of an external trainer with an internal adaptive-learning layer.
- Added profile-scoped learning events for `consumer_dami` and `admin_operations`.
- Added owner-scoped adaptive memory for each user/Admin context.
- Added sanitized learning metadata and secret/PII filtering.
- Added explicit Consumer Dami teaching through `/api/ai/learning/learn`.
- Added explicit Admin Operations teaching through `/api/admin/ai/learning/learn`.
- Added confidence and confirmation reinforcement for repeated lessons.
- Added adaptive self-model state reporting without claiming consciousness.
- Added Dami adaptive lesson context as soft guidance only.
- Added pending follow-up context so Dami can remind without falsely claiming completion.
- Added owner-scoped follow-up scheduling and completion.
- Added Dami adaptive-learning and follow-up controls in the consumer AI settings surface.
- Added Admin adaptive-learning state and explicit teaching controls.
- Added Admin AI activity observation while preserving recommendation-only authority.
- Preserved server-side authorization, confirmation, receipts, financial truth and live business data outside adaptive memory.
- Preserved existing model candidate/evaluation/promotion/rollback infrastructure as optional lifecycle infrastructure rather than a prerequisite for learning.
- Added architecture decision, route-guide, roadmap and release documentation.

## Learning boundary
This is governed adaptive learning, not a claim that the model is conscious. NEXA does not autonomously rewrite provider model weights. It learns explicitly from approved lessons and verified activity signals through its own server-owned memory layer, then supplies that state as bounded soft context to the AI.

## Validation
- Focused self-learning/Admin AI/Dami contracts: **14/14 PASS**
- Admin-web: **61/61 PASS**
- Devil's Walk: **CLEAN** — JS 728/728, TS syntax 205 files, relative imports 649/649, route targets 43/43, 0 blockers
- Release identity: **PASS**

## Not tested
- Full dependency-backed server suite (the aggregate suite remains affected by historical/parked failures and is not certified green)
- Real TypeScript typecheck (node_modules is absent)
- Real browser/device/phone rendering
- Playwright
- Live external provider execution
- EAS/stores/external deployment
- Environment/device work (excluded)

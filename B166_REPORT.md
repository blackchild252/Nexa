# B166 — V5.98.18 Privacy, Legal, Consent & Data Rights Readiness

## Scope
M2025–M2049: Privacy Policy, Terms, consent, data rights, account lifecycle, advertising privacy and store privacy readiness.

## Implemented
- Technical Privacy Policy draft aligned to the current NEXA account/data architecture.
- Technical Terms of Service draft covering account, content, marketplace, payments, AI, termination and dispute topics.
- Legal publication checklist with explicit business/legal review gates.
- Privacy-policy version advanced to `2026-10-01.v2` and synchronized into account export lineage.
- Environment-driven Privacy Policy and Terms URLs remain validated through the existing safe external navigation boundary.
- Account export and closure controls preserved.
- AdMob/Google consent is now checked before Yaayz native ads initialize/load.
- Advertising privacy-options access is exposed from Profile when the Google consent SDK reports that the option is required.
- AdMob remains confined to Yaayz.

## Important launch dependency
The policy documents in this release are **technical drafts**, not final legal advice. Publication requires the real NEXA legal entity, privacy/legal contact, final jurisdiction/age/data-transfer language, final provider disclosures, legal review, public HTTPS URLs, and matching Google Play/App Store privacy declarations.

## Evidence
- Focused B166 privacy/legal contract: 25 roadmap checks plus cross-cutting consent/legal checks.
- Existing B134 account privacy/portability contract retained and re-run.
- Full static release, syntax, dependency and release-gate verification must be completed before Batch B166 can be certified.

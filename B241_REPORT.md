# NEXA V5.98.94 B241 Report

- Roadmap: M3900–M3924 / B241
- Focused contract: 25/25 PASS
- Active cumulative release contracts: PASS
- Release audit: PASS
- Store submission preflight: PASS
- Environment/deployment execution: EXCLUDED FROM RELEASE CERTIFICATION

## B241 change
B241 hardens the Subscription Centre presentation authority. The live presentation no longer resolves section metadata by numeric array position. Every section is resolved through a stable structural ID backed by a typed lookup derived from the canonical `SUBSCRIPTION_CENTRE_SECTIONS` authority.

This prevents future reordering of the seven Subscription Centre sections from silently assigning the wrong visible label or accessibility label to a content block. The canonical Sky Money subscription presentation, `/subscription` compatibility bridge, vendor-membership boundary, Aami/Sky Wallet separation, and centralized service-fee authority remain intact.

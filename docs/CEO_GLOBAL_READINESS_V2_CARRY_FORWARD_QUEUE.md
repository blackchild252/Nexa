# NEXA Main App — V2 Carry-Forward Feature Evidence Queue

**Purpose:** prioritize the 425 historical V1 rows that still require individual feature-source evidence audits. This queue is separate per product. It does not mark any feature implemented, and no V1 status transfers into V2.

- Total queue: 425/425 rows.
- Source-evidence audit status for every row: `EVIDENCE_AUDIT_REQUIRED`.
- First execution slice: ranks 001–025; each item must be CHECK → FIX if locally safe → TEST → VERIFY.
- A failed or unavailable external prerequisite is recorded as DEFERRED/BLOCKED; continue with the other rows.
- Main owns Main feature source, data and policies; Admin evidence is not inferred from Main.

## Priority summary

| Priority | Rows |
|---|---:|
| P0 — Security, privacy, safety, payments and integrations | 162 |
| P1 — Operational continuity and commerce | 37 |
| P2 — Platform quality and remaining domains | 226 |

## Ordered item-level queue

| Queue rank | Priority | V1 block/item | Historical requirement | Legacy execution candidate | Candidate V2 target | Candidate target requirement | Evidence boundary | Status |
|---:|---|---|---|---|---|---|---|---|
| 001 | P0 | 03/01 | Finish email verification. | M6466 | G2-032 | Verify email or phone verification state | Main-owned source/test evidence; external acceptance separate. | AUDITED_PARTIAL_FEATURE_OPEN |
| 002 | P0 | 03/03 | Add secure reset tokens. | M6468 | G2-031 | Verify password reset tokens expire and are single-use | Main-owned source/test evidence; external acceptance separate. | AUDITED_LOCAL_EVIDENCE_FEATURE_OPEN |
| 003 | P0 | 03/04 | Add token expiration. | M6469 | G2-035 | Verify refresh-token rotation where applicable | Main-owned source/test evidence; external acceptance separate. | AUDITED_LOCAL_EVIDENCE_FEATURE_OPEN |
| 004 | P0 | 03/06 | Revoke sessions after password reset. | M6471 | G2-031 | Verify password reset tokens expire and are single-use | Main-owned source/test evidence; external acceptance separate. | AUDITED_LOCAL_EVIDENCE_FEATURE_OPEN |
| 005 | P0 | 03/10 | Add password-change flow. | M6475 | G2-047 | Verify recovery flow accessibility | Main-owned source/test evidence; external acceptance separate. | AUDITED_TARGET_REVIEW_FEATURE_OPEN |
| 006 | P0 | 03/11 | Add current-password confirmation. | M6476 | G2-029 | Verify password hashing and credential handling | Main-owned source/test evidence; external acceptance separate. | AUDITED_TARGET_REVIEW_FEATURE_OPEN |
| 007 | P0 | 03/12 | Add session management. | M6477 | G2-034 | Verify session expiry and revocation | Main-owned source/test evidence; external acceptance separate. | AUDITED_LOCAL_EVIDENCE_FEATURE_OPEN |
| 008 | P0 | 03/13 | Add device/session visibility. | M6478 | G2-034 | Verify session expiry and revocation | Main-owned source/test evidence; external acceptance separate. | AUDITED_PARTIAL_FEATURE_OPEN |
| 009 | P0 | 03/14 | Add session revocation. | M6479 | G2-034 | Verify session expiry and revocation | Main-owned source/test evidence; external acceptance separate. | AUDITED_LOCAL_EVIDENCE_FEATURE_OPEN |
| 010 | P0 | 03/15 | Add account lock handling. | M6480 | G2-048 | Verify account merge and duplicate identity handling | Main-owned source/test evidence; external acceptance separate. | AUDITED_TARGET_REVIEW_FEATURE_OPEN |
| 011 | P0 | 03/16 | Add suspended-account handling. | M6481 | G2-048 | Verify account merge and duplicate identity handling | Main-owned source/test evidence; external acceptance separate. | AUDITED_TARGET_REVIEW_FEATURE_OPEN |
| 012 | P0 | 03/17 | Add closed-account handling. | M6482 | G2-048 | Verify account merge and duplicate identity handling | Main-owned source/test evidence; external acceptance separate. | AUDITED_TARGET_REVIEW_FEATURE_OPEN |
| 013 | P0 | 03/18 | Add identity-state synchronization. | M6483 | G2-048 | Verify account merge and duplicate identity handling | Main-owned source/test evidence; external acceptance separate. | AUDITED_TARGET_REVIEW_FEATURE_OPEN |
| 014 | P0 | 03/19 | Add authentication event history. | M6484 | G2-046 | Verify authentication failure observability | Main-owned source/test evidence; external acceptance separate. | AUDITED_LOCAL_EVIDENCE_FEATURE_OPEN |
| 015 | P0 | 03/20 | Add login anomaly foundations. | M6485 | G2-028 | Verify login and logout lifecycle | Main-owned source/test evidence; external acceptance separate. | AUDITED_TARGET_REVIEW_FEATURE_OPEN |
| 016 | P0 | 03/23 | Add authentication regression coverage. | M6488 | G2-046 | Verify authentication failure observability | Main-owned source/test evidence; external acceptance separate. | AUDITED_TARGET_REVIEW_FEATURE_OPEN |
| 017 | P0 | 04/05 | Add Admin session management. | M6495 | G2-034 | Verify session expiry and revocation | Main-owned source/test evidence; external acceptance separate. | AUDITED_LOCAL_EVIDENCE_FEATURE_OPEN |
| 018 | P0 | 04/06 | Add session revocation. | M6496 | G2-034 | Verify session expiry and revocation | Main-owned source/test evidence; external acceptance separate. | AUDITED_LOCAL_EVIDENCE_FEATURE_OPEN |
| 019 | P0 | 04/08 | Add login history. | M6498 | G2-028 | Verify login and logout lifecycle | Main-owned source/test evidence; external acceptance separate. | AUDITED_PARTIAL_FEATURE_OPEN |
| 020 | P0 | 04/10 | Add suspicious-login signals. | M6500 | G2-028 | Verify login and logout lifecycle | Main-owned source/test evidence; external acceptance separate. | AUDITED_TARGET_REVIEW_FEATURE_OPEN |
| 021 | P0 | 04/12 | Add sensitive-action reauthentication. | M6502 | G2-037 | Verify account enumeration resistance | Main-owned source/test evidence; external acceptance separate. | AUDITED_TARGET_REVIEW_FEATURE_OPEN |
| 022 | P0 | 04/22 | Audit verification decisions. | M6512 | G2-032 | Verify email or phone verification state | Main-owned source/test evidence; external acceptance separate. | AUDITED_PARTIAL_FEATURE_OPEN |
| 023 | P0 | 05/06 | Finalize account-verification adapter. | M6521 | G2-032 | Verify email or phone verification state | Main-owned source/test evidence; external acceptance separate. | AUDITED_PARTIAL_FEATURE_OPEN |
| 024 | P0 | 08/25 | Verify global identity/profile flows. | M6615 | G2-042 | Verify CSRF protections on state-changing web flows | Main-owned source/test evidence; external acceptance separate. | AUDITED_TARGET_REVIEW_FEATURE_OPEN |
| 025 | P0 | 09/03 | Define country-specific document rules. | M6618 | G2-028 | Verify login and logout lifecycle | Main-owned source/test evidence; external acceptance separate. | AUDITED_TARGET_REVIEW_FEATURE_OPEN |
| 026 | P0 | 09/04 | Define document-type rules. | M6619 | G2-029 | Verify password hashing and credential handling | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 027 | P0 | 09/21 | Prepare secure object-storage boundary. | M6636 | G2-044 | Verify secure cookie and transport settings | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 028 | P0 | 09/22 | Prevent sensitive evidence in SQLite. | M6637 | G2-047 | Verify recovery flow accessibility | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 029 | P0 | 09/23 | Add verification readiness diagnostics. | M6638 | G2-032 | Verify email or phone verification state | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 030 | P0 | 09/25 | Verify the complete verification architecture. | M6640 | G2-032 | Verify email or phone verification state | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 031 | P0 | 20/15 | Finish OAuth readiness. | M6905 | G2-040 | Verify deactivated accounts lose active access | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 032 | P0 | 04/01 | Add Admin MFA architecture. | M6491 | G2-051 | Inventory every privileged route and action | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 033 | P0 | 04/07 | Add emergency logout. | M6497 | G2-057 | Verify admin-only routes reject staff | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 034 | P0 | 04/09 | Add device metadata. | M6499 | G2-059 | Verify role changes require authorized actors | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 035 | P0 | 04/11 | Add privileged-action confirmation. | M6501 | G2-051 | Inventory every privileged route and action | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 036 | P0 | 04/13 | Add owner-only operations. | M6503 | G2-055 | Verify owner-only routes reject non-owners | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 037 | P0 | 04/14 | Harden role boundaries. | M6504 | G2-066 | Verify internal notes are role-filtered | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 038 | P0 | 04/15 | Harden permission boundaries. | M6505 | G2-073 | Verify permission matrix regression tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 039 | P0 | 04/16 | Prevent privilege escalation. | M6506 | G2-074 | Verify privilege-escalation negative tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 040 | P0 | 04/18 | Audit Admin role changes. | M6508 | G2-059 | Verify role changes require authorized actors | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 041 | P0 | 04/19 | Audit Admin account creation. | M6509 | G2-060 | Verify admin creation and removal controls | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 042 | P0 | 14/23 | Add action permissions. | M6763 | G2-051 | Inventory every privileged route and action | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 043 | P0 | 15/06 | Add source permissions. | M6771 | G2-065 | Verify file access permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 044 | P0 | 15/18 | Add external-action permissions. | M6783 | G2-051 | Inventory every privileged route and action | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 045 | P0 | 20/11 | Add permission-aware ranking. | M6901 | G2-073 | Verify permission matrix regression tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 046 | P0 | 20/21 | Finish extension permissions. | M6911 | G2-065 | Verify file access permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 047 | P0 | 14/22 | Add privacy boundaries. | M6762 | G2-085 | Verify deletion request boundaries | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 048 | P0 | 16/25 | Verify user-control completeness. | M6815 | G2-100 | Record legal review and external data-processors as deferred where needed | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 049 | P0 | 04/04 | Add trusted-device architecture. | M6494 | G2-104 | Verify source provenance is retained | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 050 | P0 | 04/23 | Audit moderation decisions. | M6513 | G2-105 | Verify moderation states and allowed transitions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 051 | P0 | 09/12 | Build appeals. | M6627 | G2-119 | Verify permanent restrictions and appeals | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 052 | P0 | 10/16 | Add marketplace moderation. | M6656 | G2-105 | Verify moderation states and allowed transitions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 053 | P0 | 18/18 | Add moderation analytics. | M6858 | G2-105 | Verify moderation states and allowed transitions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 054 | P0 | 02/08 | Inventory every payment-provider credential. | M6448 | G2-205 | Verify payment state transitions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 055 | P0 | 04/21 | Audit financial actions. | M6511 | G2-219 | Verify financial audit lineage | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 056 | P0 | 05/01 | Finalize payment-provider adapter contract. | M6516 | G2-205 | Verify payment state transitions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 057 | P0 | 05/02 | Finalize deposit adapter. | M6517 | G2-202 | Verify payment intent idempotency | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 058 | P0 | 05/03 | Finalize withdrawal adapter. | M6518 | G2-203 | Verify provider callback signature validation | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 059 | P0 | 05/04 | Finalize transfer adapter. | M6519 | G2-204 | Verify webhook replay protection | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 060 | P0 | 05/05 | Finalize beneficiary adapter. | M6520 | G2-205 | Verify payment state transitions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 061 | P0 | 05/13 | Finalize transaction reference strategy. | M6528 | G2-212 | Verify duplicate transaction detection | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 062 | P0 | 05/14 | Finalize settlement references. | M6529 | G2-210 | Verify settlement reconciliation inputs | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 063 | P0 | 05/15 | Finalize provider reconciliation interface. | M6530 | G2-210 | Verify settlement reconciliation inputs | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 064 | P0 | 05/21 | Add safe fallback behavior. | M6536 | G2-214 | Verify timeout and retry behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 065 | P0 | 05/22 | Remove fake-production assumptions. | M6537 | G2-222 | Verify reconciliation exceptions and resolution state | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 066 | P0 | 05/23 | Preserve sandbox capability for development. | M6538 | G2-224 | Verify sandbox tests separately from live provider tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 067 | P0 | 05/25 | Verify Sky Money is ready to accept real provider credentials. | M6540 | G2-225 | Record provider certification and live-money tests as external gates | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 068 | P0 | 06/01 | Build provider transaction reconciliation. | M6541 | G2-210 | Verify settlement reconciliation inputs | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 069 | P0 | 06/02 | Build ledger reconciliation. | M6542 | G2-211 | Verify ledger/source provenance | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 070 | P0 | 06/03 | Detect missing provider transactions. | M6543 | G2-203 | Verify provider callback signature validation | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 071 | P0 | 06/04 | Detect duplicate provider transactions. | M6544 | G2-212 | Verify duplicate transaction detection | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 072 | P0 | 06/05 | Detect amount mismatches. | M6545 | G2-205 | Verify payment state transitions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 073 | P0 | 06/06 | Detect currency mismatches. | M6546 | G2-206 | Verify currency and minor-unit precision | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 074 | P0 | 06/07 | Detect status mismatches. | M6547 | G2-207 | Verify quote/charge currency consistency | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 075 | P0 | 06/08 | Detect settlement mismatches. | M6548 | G2-210 | Verify settlement reconciliation inputs | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 076 | P0 | 06/09 | Create reconciliation exceptions. | M6549 | G2-222 | Verify reconciliation exceptions and resolution state | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 077 | P0 | 06/10 | Assign financial exceptions. | M6550 | G2-219 | Verify financial audit lineage | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 078 | P0 | 06/11 | Resolve financial exceptions. | M6551 | G2-219 | Verify financial audit lineage | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 079 | P0 | 06/12 | Audit reconciliation actions. | M6552 | G2-210 | Verify settlement reconciliation inputs | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 080 | P0 | 06/13 | Add transaction investigation. | M6553 | G2-212 | Verify duplicate transaction detection | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 081 | P0 | 06/14 | Add transaction timeline. | M6554 | G2-212 | Verify duplicate transaction detection | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 082 | P0 | 06/15 | Add financial reference search. | M6555 | G2-219 | Verify financial audit lineage | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 083 | P0 | 06/16 | Add failed-payment recovery. | M6556 | G2-205 | Verify payment state transitions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 084 | P0 | 06/18 | Add pending-payment handling. | M6558 | G2-205 | Verify payment state transitions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 085 | P0 | 06/19 | Add pending-withdrawal handling. | M6559 | G2-213 | Verify pending and unknown states are not treated as success | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 086 | P0 | 06/20 | Add refund handling. | M6560 | G2-208 | Verify refund authorization and idempotency | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 087 | P0 | 06/21 | Add chargeback handling. | M6561 | G2-221 | Verify exchange-rate source and timestamp | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 088 | P0 | 06/23 | Add financial reports. | M6563 | G2-219 | Verify financial audit lineage | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 089 | P0 | 06/24 | Add Admin financial command center. | M6564 | G2-219 | Verify financial audit lineage | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 090 | P0 | 06/25 | Verify end-to-end financial integrity. | M6565 | G2-219 | Verify financial audit lineage | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 091 | P0 | 07/02 | Audit all hard-coded currency symbols. | M6567 | G2-219 | Verify financial audit lineage | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 092 | P0 | 07/03 | Audit all currency defaults. | M6568 | G2-219 | Verify financial audit lineage | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 093 | P0 | 07/04 | Add ISO currency model. | M6569 | G2-206 | Verify currency and minor-unit precision | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 094 | P0 | 07/07 | Add marketplace currency rules. | M6572 | G2-206 | Verify currency and minor-unit precision | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 095 | P0 | 07/08 | Add wallet currency rules. | M6573 | G2-206 | Verify currency and minor-unit precision | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 096 | P0 | 07/09 | Add transaction currency persistence. | M6574 | G2-212 | Verify duplicate transaction detection | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 097 | P0 | 07/10 | Add settlement currency. | M6575 | G2-210 | Verify settlement reconciliation inputs | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 098 | P0 | 07/16 | Add cross-currency transfer rules. | M6581 | G2-206 | Verify currency and minor-unit precision | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 099 | P0 | 07/18 | Add fee-currency rules. | M6583 | G2-220 | Verify fee and commission rules have explicit ownership | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 100 | P0 | 07/19 | Add refund-currency rules. | M6584 | G2-208 | Verify refund authorization and idempotency | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 101 | P0 | 07/21 | Add currency-aware Admin reporting. | M6586 | G2-206 | Verify currency and minor-unit precision | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 102 | P0 | 07/22 | Add currency-aware reconciliation. | M6587 | G2-210 | Verify settlement reconciliation inputs | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 103 | P0 | 07/23 | Add currency regression coverage. | M6588 | G2-206 | Verify currency and minor-unit precision | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 104 | P0 | 07/25 | Verify multi-currency architecture. | M6590 | G2-206 | Verify currency and minor-unit precision | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 105 | P0 | 10/04 | Add payment-state machine. | M6644 | G2-205 | Verify payment state transitions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 106 | P0 | 10/10 | Add refund rules. | M6650 | G2-208 | Verify refund authorization and idempotency | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 107 | P0 | 10/11 | Add seller payout rules. | M6651 | G2-220 | Verify fee and commission rules have explicit ownership | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 108 | P0 | 10/12 | Add seller payout holds. | M6652 | G2-212 | Verify duplicate transaction detection | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 109 | P0 | 10/22 | Add marketplace reconciliation. | M6662 | G2-210 | Verify settlement reconciliation inputs | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 110 | P0 | 17/14 | Build financial notifications. | M6829 | G2-219 | Verify financial audit lineage | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 111 | P0 | 18/11 | Add refund analytics. | M6851 | G2-208 | Verify refund authorization and idempotency | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 112 | P0 | 18/13 | Add money analytics. | M6853 | G2-225 | Record provider certification and live-money tests as external gates | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 113 | P0 | 18/14 | Add failed-payment analytics. | M6854 | G2-205 | Verify payment state transitions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 114 | P0 | 18/15 | Add wallet analytics. | M6855 | G2-215 | Verify provider outage fail-closed behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 115 | P0 | 19/19 | Add Sky Money adoption. | M6884 | G2-225 | Record provider certification and live-money tests as external gates | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 116 | P0 | 20/08 | Search Money. | M6898 | G2-225 | Record provider certification and live-money tests as external gates | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 117 | P0 | 02/01 | Inventory every external integration. | M6441 | G2-376 | Inventory integration endpoints and owners | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 118 | P0 | 02/02 | Inventory every required credential. | M6442 | G2-392 | Verify credential rotation instructions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 119 | P0 | 02/03 | Inventory every API key. | M6443 | G2-399 | Verify secret scanning and accidental-key checks | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 120 | P0 | 02/04 | Inventory every signing secret. | M6444 | G2-379 | Verify secret redaction in readiness output | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 121 | P0 | 02/05 | Inventory every webhook secret. | M6445 | G2-379 | Verify secret redaction in readiness output | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 122 | P0 | 02/06 | Inventory every OAuth credential. | M6446 | G2-392 | Verify credential rotation instructions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 123 | P0 | 02/07 | Inventory every SMTP/email credential. | M6447 | G2-392 | Verify credential rotation instructions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 124 | P0 | 02/09 | Inventory every AI-provider credential. | M6449 | G2-382 | Verify provider timeout limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 125 | P0 | 02/10 | Inventory every storage credential. | M6450 | G2-392 | Verify credential rotation instructions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 126 | P0 | 02/12 | Inventory every maps/location credential. | M6452 | G2-392 | Verify credential rotation instructions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 127 | P0 | 02/14 | Inventory every identity-verification credential. | M6454 | G2-392 | Verify credential rotation instructions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 128 | P0 | 02/15 | Create typed environment configuration. | M6455 | G2-378 | Verify environment variable validation | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 129 | P0 | 02/16 | Create development configuration. | M6456 | G2-398 | Verify configuration documentation is synchronized | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 130 | P0 | 02/17 | Create staging configuration. | M6457 | G2-398 | Verify configuration documentation is synchronized | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 131 | P0 | 02/18 | Create production configuration. | M6458 | G2-398 | Verify configuration documentation is synchronized | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 132 | P0 | 02/19 | Add secret validation without exposing values. | M6459 | G2-378 | Verify environment variable validation | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 133 | P0 | 02/20 | Add startup configuration diagnostics. | M6460 | G2-398 | Verify configuration documentation is synchronized | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 134 | P0 | 02/22 | Prevent secrets from entering client bundles. | M6462 | G2-377 | Document required secrets by name only | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 135 | P0 | 02/23 | Prevent secrets from entering logs. | M6463 | G2-377 | Document required secrets by name only | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 136 | P0 | 02/24 | Document credential injection points. | M6464 | G2-392 | Verify credential rotation instructions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 137 | P0 | 02/25 | Verify the application runs cleanly with placeholders. | M6465 | G2-400 | Record all owner-supplied credential gates as DEFERRED | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 138 | P0 | 03/22 | Add secure credential rotation. | M6487 | G2-392 | Verify credential rotation instructions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 139 | P0 | 04/17 | Audit Admin credential changes. | M6507 | G2-392 | Verify credential rotation instructions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 140 | P0 | 05/07 | Finalize provider webhook adapter. | M6522 | G2-382 | Verify provider timeout limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 141 | P0 | 05/08 | Finalize provider error mapping. | M6523 | G2-394 | Verify provider error mapping | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 142 | P0 | 05/09 | Finalize provider status mapping. | M6524 | G2-394 | Verify provider error mapping | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 143 | P0 | 05/10 | Finalize provider timeout handling. | M6525 | G2-382 | Verify provider timeout limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 144 | P0 | 05/11 | Finalize provider retry rules. | M6526 | G2-388 | Verify provider retry and backoff | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 145 | P0 | 05/12 | Finalize provider idempotency. | M6527 | G2-382 | Verify provider timeout limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 146 | P0 | 05/16 | Add provider configuration validation. | M6531 | G2-390 | Verify provider health is distinct from configuration | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 147 | P0 | 05/17 | Add provider sandbox configuration. | M6532 | G2-390 | Verify provider health is distinct from configuration | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 148 | P0 | 05/18 | Add provider production configuration. | M6533 | G2-390 | Verify provider health is distinct from configuration | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 149 | P0 | 05/19 | Add provider health status. | M6534 | G2-390 | Verify provider health is distinct from configuration | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 150 | P0 | 05/20 | Add provider outage state. | M6535 | G2-382 | Verify provider timeout limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 151 | P0 | 05/24 | Build external-credential readiness tests. | M6539 | G2-392 | Verify credential rotation instructions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 152 | P0 | 06/22 | Add provider outage handling. | M6562 | G2-382 | Verify provider timeout limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 153 | P0 | 07/11 | Add FX-provider abstraction. | M6576 | G2-382 | Verify provider timeout limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 154 | P0 | 09/01 | Define verification-provider adapter. | M6616 | G2-382 | Verify provider timeout limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 155 | P0 | 09/14 | Build provider webhook handling. | M6629 | G2-382 | Verify provider timeout limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 156 | P0 | 09/15 | Build provider result normalization. | M6630 | G2-382 | Verify provider timeout limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 157 | P0 | 09/24 | Add provider credential injection. | M6639 | G2-382 | Verify provider timeout limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 158 | P0 | 14/18 | Finish learning integration. | M6758 | G2-376 | Inventory integration endpoints and owners | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 159 | P0 | 14/19 | Finish correction integration. | M6759 | G2-376 | Inventory integration endpoints and owners | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 160 | P0 | 14/20 | Finish forgetting integration. | M6760 | G2-376 | Inventory integration endpoints and owners | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 161 | P0 | 17/24 | Add provider credentials readiness. | M6839 | G2-382 | Verify provider timeout limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 162 | P0 | 20/17 | Finish webhooks. | M6907 | G2-392 | Verify credential rotation instructions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 163 | P1 | 04/02 | Add TOTP support. | M6492 | G2-149 | Verify support audit completeness and owner command center | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 164 | P1 | 04/03 | Prepare passkey/WebAuthn support. | M6493 | G2-149 | Verify support audit completeness and owner command center | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 165 | P1 | 08/14 | Add unsupported-country handling. | M6604 | G2-139 | Implement and verify related-order context | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 166 | P1 | 09/02 | Define supported identity types. | M6617 | G2-127 | Verify live conversation persistence and ownership | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 167 | P1 | 17/15 | Build Customer Care notifications. | M6830 | G2-149 | Verify support audit completeness and owner command center | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 168 | P1 | 18/19 | Add Customer Care analytics. | M6859 | G2-149 | Verify support audit completeness and owner command center | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 169 | P1 | 10/01 | Complete order lifecycle. | M6641 | G2-164 | Verify order ownership and visibility | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 170 | P1 | 10/02 | Complete seller lifecycle. | M6642 | G2-168 | Verify seller notification preferences | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 171 | P1 | 10/03 | Complete buyer lifecycle. | M6643 | G2-172 | Verify audit trail for vendor lifecycle changes | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 172 | P1 | 10/05 | Add order-state machine. | M6645 | G2-164 | Verify order ownership and visibility | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 173 | P1 | 10/06 | Add shipment-state machine. | M6646 | G2-156 | Verify vendor staff deactivation and session revocation | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 174 | P1 | 10/07 | Add delivery-state machine. | M6647 | G2-157 | Verify product creation and validation | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 175 | P1 | 10/08 | Add cancellation rules. | M6648 | G2-166 | Verify cancellation and refund boundaries | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 176 | P1 | 10/09 | Add return rules. | M6649 | G2-152 | Verify seller profile completeness rules | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 177 | P1 | 10/13 | Add seller suspension handling. | M6653 | G2-173 | Verify duplicate seller/product handling | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 178 | P1 | 10/14 | Add buyer dispute handling. | M6654 | G2-167 | Verify vendor dispute evidence | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 179 | P1 | 10/15 | Add seller dispute handling. | M6655 | G2-173 | Verify duplicate seller/product handling | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 180 | P1 | 10/17 | Add order investigation. | M6657 | G2-164 | Verify order ownership and visibility | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 181 | P1 | 10/18 | Add order timeline. | M6658 | G2-164 | Verify order ownership and visibility | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 182 | P1 | 10/19 | Add delivery tracking abstraction. | M6659 | G2-169 | Verify vendor metrics source provenance | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 183 | P1 | 10/20 | Add failed-delivery handling. | M6660 | G2-173 | Verify duplicate seller/product handling | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 184 | P1 | 10/21 | Add return-to-seller handling. | M6661 | G2-173 | Verify duplicate seller/product handling | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 185 | P1 | 10/23 | Add marketplace audit. | M6663 | G2-174 | Verify marketplace regression tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 186 | P1 | 10/25 | Verify end-to-end marketplace operations. | M6665 | G2-171 | Verify bulk operations authorization | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 187 | P1 | 18/09 | Add marketplace GMV. | M6849 | G2-174 | Verify marketplace regression tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 188 | P1 | 19/18 | Add Marketplace adoption. | M6883 | G2-174 | Verify marketplace regression tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 189 | P1 | 07/01 | Audit all NGN assumptions. | M6566 | G2-178 | Verify currency formatting without conversion assumptions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 190 | P1 | 07/05 | Add user currency preference. | M6570 | G2-187 | Verify tax and duty evidence and currency consistency | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 191 | P1 | 07/06 | Add country-to-currency mapping. | M6571 | G2-176 | Verify country and territory catalogue integrity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 192 | P1 | 07/12 | Add FX-rate persistence. | M6577 | G2-182 | Verify shipping-rate source and timestamp | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 193 | P1 | 07/13 | Add FX-rate freshness. | M6578 | G2-182 | Verify shipping-rate source and timestamp | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 194 | P1 | 07/15 | Add rounding rules. | M6580 | G2-192 | Verify phone and postal validation rules | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 195 | P1 | 07/17 | Add cross-currency display. | M6582 | G2-187 | Verify tax and duty evidence and currency consistency | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 196 | P1 | 07/20 | Add international receipt formatting. | M6585 | G2-178 | Verify currency formatting without conversion assumptions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 197 | P1 | 07/24 | Remove unsafe NGN assumptions. | M6589 | G2-178 | Verify currency formatting without conversion assumptions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 198 | P1 | 08/09 | Add country currency mapping. | M6599 | G2-176 | Verify country and territory catalogue integrity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 199 | P1 | 10/24 | Add Admin marketplace command center. | M6664 | G2-374 | Verify Admin workflow regression suite; and verify staff work contract and authorization tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 200 | P2 | 14/01 | Finish memory persistence. | M6741 | G2-244 | Verify memory write permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 201 | P2 | 14/02 | Finish memory retrieval. | M6742 | G2-244 | Verify memory write permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 202 | P2 | 14/03 | Finish memory controls. | M6743 | G2-244 | Verify memory write permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 203 | P2 | 14/04 | Finish memory deletion. | M6744 | G2-245 | Verify memory deletion and correction semantics | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 204 | P2 | 14/05 | Finish memory visibility. | M6745 | G2-244 | Verify memory write permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 205 | P2 | 14/06 | Finish memory provenance. | M6746 | G2-244 | Verify memory write permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 206 | P2 | 14/07 | Add memory confidence. | M6747 | G2-244 | Verify memory write permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 207 | P2 | 14/08 | Add memory expiration. | M6748 | G2-244 | Verify memory write permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 208 | P2 | 14/09 | Add memory correction. | M6749 | G2-245 | Verify memory deletion and correction semantics | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 209 | P2 | 14/10 | Finish personalized context. | M6750 | G2-247 | Verify admin AI is limited to admin-owned operations context | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 210 | P2 | 14/11 | Finish planning model. | M6751 | G2-226 | Inventory model and AI-provider integration points | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 211 | P2 | 14/12 | Finish task decomposition. | M6752 | G2-237 | Verify no privileged action runs from generated text alone | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 212 | P2 | 14/13 | Finish plan execution states. | M6753 | G2-246 | Verify recommendation and execution separation | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 213 | P2 | 14/14 | Finish plan approvals. | M6754 | G2-239 | Verify staff escalation path when Dami cannot resolve | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 214 | P2 | 14/15 | Finish plan cancellation. | M6755 | G2-240 | Verify AI output logging avoids unnecessary sensitive data | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 215 | P2 | 14/16 | Finish follow-up scheduling. | M6756 | G2-241 | Verify abuse and prompt-injection tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 216 | P2 | 14/17 | Finish recurring plans. | M6757 | G2-242 | Verify model timeout and provider outage behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 217 | P2 | 14/21 | Finish user-controlled personalization. | M6761 | G2-246 | Verify recommendation and execution separation | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 218 | P2 | 14/24 | Add confirmation boundaries. | M6764 | G2-249 | Verify AI evaluation datasets and failure review | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 219 | P2 | 14/25 | Verify Dami personal-intelligence core. | M6765 | G2-239 | Verify staff escalation path when Dami cannot resolve | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 220 | P2 | 15/01 | Finish Knowledge Hub architecture. | M6766 | G2-229 | Verify knowledge source ownership and permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 221 | P2 | 15/02 | Add document ingestion. | M6767 | G2-227 | Verify provider readiness is distinct from configured state | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 222 | P2 | 15/04 | Add retrieval. | M6769 | G2-231 | Verify retrieval isolation across users and tenants | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 223 | P2 | 15/05 | Add citations. | M6770 | G2-230 | Verify source citations and freshness metadata | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 224 | P2 | 15/07 | Add source deletion. | M6772 | G2-245 | Verify memory deletion and correction semantics | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 225 | P2 | 15/08 | Add retrieval provenance. | M6773 | G2-231 | Verify retrieval isolation across users and tenants | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 226 | P2 | 15/09 | Add prompt-injection defenses. | M6774 | G2-241 | Verify abuse and prompt-injection tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 227 | P2 | 15/10 | Finish workflow model. | M6775 | G2-226 | Inventory model and AI-provider integration points | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 228 | P2 | 15/11 | Add workflow creation. | M6776 | G2-236 | Verify action idempotency and replay protection | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 229 | P2 | 15/12 | Add workflow editing. | M6777 | G2-237 | Verify no privileged action runs from generated text alone | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 230 | P2 | 15/13 | Add workflow execution. | M6778 | G2-246 | Verify recommendation and execution separation | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 231 | P2 | 15/14 | Add workflow approval. | M6779 | G2-235 | Verify consequential actions require explicit approval | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 232 | P2 | 15/15 | Add workflow cancellation. | M6780 | G2-240 | Verify AI output logging avoids unnecessary sensitive data | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 233 | P2 | 15/16 | Add workflow logs. | M6781 | G2-241 | Verify abuse and prompt-injection tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 234 | P2 | 15/17 | Add workflow permissions. | M6782 | G2-229 | Verify knowledge source ownership and permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 235 | P2 | 15/19 | Add action confirmation. | M6784 | G2-236 | Verify action idempotency and replay protection | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 236 | P2 | 15/20 | Add action receipts. | M6785 | G2-236 | Verify action idempotency and replay protection | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 237 | P2 | 15/22 | Add connected-app context. | M6787 | G2-247 | Verify admin AI is limited to admin-owned operations context | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 238 | P2 | 15/23 | Add unified Dami context. | M6788 | G2-247 | Verify admin AI is limited to admin-owned operations context | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 239 | P2 | 15/24 | Add Dami action audit. | M6789 | G2-236 | Verify action idempotency and replay protection | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 240 | P2 | 15/25 | Verify Dami OS architecture. | M6790 | G2-239 | Verify staff escalation path when Dami cannot resolve | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 241 | P2 | 16/09 | Build memory controls. | M6799 | G2-244 | Verify memory write permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 242 | P2 | 17/16 | Build Dami notifications. | M6831 | G2-239 | Verify staff escalation path when Dami cannot resolve | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 243 | P2 | 18/16 | Add Dami analytics. | M6856 | G2-239 | Verify staff escalation path when Dami cannot resolve | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 244 | P2 | 19/17 | Add Dami adoption. | M6882 | G2-239 | Verify staff escalation path when Dami cannot resolve | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 245 | P2 | 20/09 | Search Dami knowledge. | M6899 | G2-229 | Verify knowledge source ownership and permissions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 246 | P2 | 02/13 | Inventory every notification credential. | M6453 | G2-252 | Verify user notification preferences | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 247 | P2 | 03/21 | Add account security notifications. | M6486 | G2-262 | Verify support handoff notifications | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 248 | P2 | 16/07 | Build notification controls. | M6797 | G2-252 | Verify user notification preferences | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 249 | P2 | 17/01 | Build notification center. | M6816 | G2-252 | Verify user notification preferences | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 250 | P2 | 17/02 | Build notification history. | M6817 | G2-252 | Verify user notification preferences | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 251 | P2 | 17/03 | Build notification categories. | M6818 | G2-252 | Verify user notification preferences | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 252 | P2 | 17/10 | Build notification grouping. | M6825 | G2-252 | Verify user notification preferences | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 253 | P2 | 17/12 | Build priority notifications. | M6827 | G2-262 | Verify support handoff notifications | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 254 | P2 | 17/13 | Build security notifications. | M6828 | G2-262 | Verify support handoff notifications | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 255 | P2 | 17/17 | Build marketplace notifications. | M6832 | G2-262 | Verify support handoff notifications | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 256 | P2 | 17/18 | Build social notifications. | M6833 | G2-262 | Verify support handoff notifications | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 257 | P2 | 17/21 | Build notification preferences persistence. | M6836 | G2-252 | Verify user notification preferences | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 258 | P2 | 17/22 | Build notification audit. | M6837 | G2-252 | Verify user notification preferences | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 259 | P2 | 17/23 | Build notification provider abstraction. | M6838 | G2-252 | Verify user notification preferences | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 260 | P2 | 17/25 | Verify notification reliability. | M6840 | G2-252 | Verify user notification preferences | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 261 | P2 | 08/05 | Add search. | M6595 | G2-293 | Verify search API authorization | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 262 | P2 | 15/03 | Add document indexing. | M6768 | G2-277 | Verify permission-aware indexing | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 263 | P2 | 16/10 | Build discovery controls. | M6800 | G2-286 | Verify abuse and scraping controls | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 264 | P2 | 20/01 | Finish unified NEXA Search. | M6891 | G2-293 | Verify search API authorization | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 265 | P2 | 20/02 | Search people. | M6892 | G2-293 | Verify search API authorization | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 266 | P2 | 20/03 | Search friends. | M6893 | G2-293 | Verify search API authorization | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 267 | P2 | 20/04 | Search groups. | M6894 | G2-293 | Verify search API authorization | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 268 | P2 | 20/05 | Search Marketplace. | M6895 | G2-293 | Verify search API authorization | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 269 | P2 | 20/06 | Search Yaayz. | M6896 | G2-293 | Verify search API authorization | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 270 | P2 | 20/07 | Search Zeeza. | M6897 | G2-293 | Verify search API authorization | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 271 | P2 | 20/10 | Search Help. | M6900 | G2-293 | Verify search API authorization | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 272 | P2 | 20/12 | Add semantic-search readiness. | M6902 | G2-288 | Verify semantic provider readiness is explicit | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 273 | P2 | 04/20 | Audit Admin deletion/deactivation. | M6510 | G2-320 | Verify notifications do not bypass consent | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 274 | P2 | 07/14 | Add conversion precision rules. | M6579 | G2-314 | Verify campaign preferences and unsubscribe | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 275 | P2 | 08/15 | Add country-specific onboarding. | M6605 | G2-303 | Verify onboarding progress persistence | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 276 | P2 | 09/19 | Build retention rules. | M6634 | G2-313 | Verify retention cohorts disclose missing data | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 277 | P2 | 16/17 | Build retention handling. | M6807 | G2-313 | Verify retention cohorts disclose missing data | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 278 | P2 | 18/05 | Add retention. | M6845 | G2-313 | Verify retention cohorts disclose missing data | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 279 | P2 | 18/07 | Add signup conversion. | M6847 | G2-307 | Verify referral attribution integrity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 280 | P2 | 19/01 | Rebuild first-run onboarding. | M6866 | G2-303 | Verify onboarding progress persistence | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 281 | P2 | 19/02 | Add country-aware onboarding. | M6867 | G2-303 | Verify onboarding progress persistence | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 282 | P2 | 19/03 | Add language-aware onboarding. | M6868 | G2-303 | Verify onboarding progress persistence | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 283 | P2 | 19/04 | Add personalized module introduction. | M6869 | G2-304 | Verify vendor onboarding and approval | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 284 | P2 | 19/05 | Add referral architecture. | M6870 | G2-307 | Verify referral attribution integrity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 285 | P2 | 19/06 | Add invitation links. | M6871 | G2-306 | Verify consent at referral and campaign entry | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 286 | P2 | 19/07 | Add referral attribution. | M6872 | G2-307 | Verify referral attribution integrity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 287 | P2 | 19/08 | Add referral rewards foundation. | M6873 | G2-307 | Verify referral attribution integrity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 288 | P2 | 19/09 | Add lifecycle messaging. | M6874 | G2-310 | Verify lifecycle event definitions | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 289 | P2 | 19/10 | Add activation tracking. | M6875 | G2-312 | Verify activation metrics use canonical sources | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 290 | P2 | 19/11 | Add retention tracking. | M6876 | G2-313 | Verify retention cohorts disclose missing data | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 291 | P2 | 19/12 | Add re-engagement. | M6877 | G2-312 | Verify activation metrics use canonical sources | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 292 | P2 | 19/13 | Add membership conversion. | M6878 | G2-313 | Verify retention cohorts disclose missing data | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 293 | P2 | 19/14 | Add seller acquisition. | M6879 | G2-321 | Verify seller acquisition metrics | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 294 | P2 | 19/15 | Add vendor acquisition. | M6880 | G2-304 | Verify vendor onboarding and approval | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 295 | P2 | 19/16 | Add creator acquisition. | M6881 | G2-321 | Verify seller acquisition metrics | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 296 | P2 | 19/20 | Add experimentation architecture. | M6885 | G2-320 | Verify notifications do not bypass consent | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 297 | P2 | 19/21 | Add feature flags. | M6886 | G2-315 | Verify growth experiments are feature-flagged | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 298 | P2 | 19/22 | Add safe rollout controls. | M6887 | G2-316 | Verify rollout and rollback controls | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 299 | P2 | 19/23 | Add growth analytics. | M6888 | G2-324 | Verify growth regression tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 300 | P2 | 19/24 | Add abuse-resistant referral controls. | M6889 | G2-309 | Verify abuse-resistant referral limits | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 301 | P2 | 19/25 | Verify global growth readiness. | M6890 | G2-324 | Verify growth regression tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 302 | P2 | 02/11 | Inventory every analytics credential. | M6451 | G2-349 | Verify analytics contract tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 303 | P2 | 02/21 | Add missing-secret readiness reporting. | M6461 | G2-328 | Distinguish zero from missing or unavailable | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 304 | P2 | 18/02 | Add DAU. | M6842 | G2-327 | Define metric names and calculation contracts | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 305 | P2 | 18/03 | Add WAU. | M6843 | G2-328 | Distinguish zero from missing or unavailable | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 306 | P2 | 18/04 | Add MAU. | M6844 | G2-329 | Verify event timestamps and timezone normalization | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 307 | P2 | 18/06 | Add churn. | M6846 | G2-331 | Verify audit events for privileged changes | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 308 | P2 | 18/08 | Add active-user segmentation. | M6848 | G2-333 | Verify metrics do not mix currencies | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 309 | P2 | 18/10 | Add order analytics. | M6850 | G2-349 | Verify analytics contract tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 310 | P2 | 18/12 | Add dispute analytics. | M6852 | G2-349 | Verify analytics contract tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 311 | P2 | 18/17 | Add social analytics. | M6857 | G2-349 | Verify analytics contract tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 312 | P2 | 18/20 | Add Staff workload analytics. | M6860 | G2-349 | Verify analytics contract tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 313 | P2 | 18/21 | Add system health analytics. | M6861 | G2-349 | Verify analytics contract tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 314 | P2 | 18/22 | Add provider health analytics. | M6862 | G2-349 | Verify analytics contract tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 315 | P2 | 18/23 | Add anomaly detection. | M6863 | G2-348 | Verify incident review records | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 316 | P2 | 18/24 | Add export/reporting. | M6864 | G2-344 | Verify audit export provenance | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 317 | P2 | 18/25 | Verify owner-level operational visibility. | M6865 | G2-326 | Inventory operational events and canonical sources | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 318 | P2 | 20/19 | Finish developer analytics. | M6909 | G2-349 | Verify analytics contract tests | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 319 | P2 | 03/02 | Finish password recovery. | M6467 | G2-410 | Verify job failure visibility and recovery | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 320 | P2 | 03/05 | Add single-use recovery. | M6470 | G2-410 | Verify job failure visibility and recovery | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 321 | P2 | 03/07 | Add recovery rate limiting. | M6472 | G2-410 | Verify job failure visibility and recovery | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 322 | P2 | 03/08 | Add recovery abuse detection. | M6473 | G2-410 | Verify job failure visibility and recovery | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 323 | P2 | 03/09 | Add recovery audit events. | M6474 | G2-410 | Verify job failure visibility and recovery | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 324 | P2 | 06/17 | Add failed-withdrawal recovery. | M6557 | G2-410 | Verify job failure visibility and recovery | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 325 | P2 | 08/12 | Add country availability rules. | M6602 | G2-412 | Verify health checks distinguish partial outage | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 326 | P2 | 15/21 | Add failed-action recovery. | M6786 | G2-410 | Verify job failure visibility and recovery | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 327 | P2 | 08/01 | Finalize complete country dataset. | M6591 | G2-442 | Verify country and phone entry behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 328 | P2 | 08/02 | Add ISO country codes. | M6592 | G2-442 | Verify country and phone entry behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 329 | P2 | 08/03 | Add country names. | M6593 | G2-429 | Verify screen-reader labels and names | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 330 | P2 | 08/04 | Add localized country names foundation. | M6594 | G2-444 | Verify localized validation messages | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 331 | P2 | 08/06 | Add alphabetical navigation. | M6596 | G2-427 | Verify keyboard navigation | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 332 | P2 | 08/07 | Add country flag metadata. | M6597 | G2-442 | Verify country and phone entry behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 333 | P2 | 08/08 | Add country calling codes. | M6598 | G2-442 | Verify country and phone entry behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 334 | P2 | 08/10 | Add country timezone mapping. | M6600 | G2-442 | Verify country and phone entry behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 335 | P2 | 08/11 | Add country region mapping. | M6601 | G2-442 | Verify country and phone entry behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 336 | P2 | 08/13 | Add restricted-country rules. | M6603 | G2-442 | Verify country and phone entry behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 337 | P2 | 08/16 | Add country-specific phone formatting. | M6606 | G2-442 | Verify country and phone entry behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 338 | P2 | 08/17 | Add country-specific address formats. | M6607 | G2-442 | Verify country and phone entry behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 339 | P2 | 08/18 | Add country-specific postal formats. | M6608 | G2-442 | Verify country and phone entry behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 340 | P2 | 08/19 | Add country-specific measurement defaults. | M6609 | G2-442 | Verify country and phone entry behavior | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 341 | P2 | 08/20 | Add country-specific date/time formats. | M6610 | G2-440 | Verify pluralization and date formatting | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 342 | P2 | 08/21 | Add locale persistence. | M6611 | G2-438 | Verify language selector and locale persistence | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 343 | P2 | 08/22 | Add language preference. | M6612 | G2-438 | Verify language selector and locale persistence | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 344 | P2 | 08/24 | Remove Nigeria-only assumptions. | M6614 | G2-449 | Perform manual assistive-technology review where available | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 345 | P2 | 01/01 | Inventory every current Main test. | M6416 | G2-451 | Verify release identity using locked project tooling | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 346 | P2 | 01/02 | Inventory every current Admin test. | M6417 | G2-452 | Verify roadmap block registration before execution | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 347 | P2 | 01/03 | Classify every failing test. | M6418 | G2-453 | Verify tests use current source contracts | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 348 | P2 | 01/04 | Separate historical failures from current regressions. | M6419 | G2-454 | Verify tests do not hard-code release identity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 349 | P2 | 01/05 | Remove obsolete test assumptions. | M6420 | G2-455 | Verify app boundary tests are standalone | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 350 | P2 | 01/06 | Repair genuinely broken current contracts. | M6421 | G2-453 | Verify tests use current source contracts | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 351 | P2 | 01/07 | Remove Main/Admin cross-project test leakage. | M6422 | G2-451 | Verify release identity using locked project tooling | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 352 | P2 | 01/08 | Correct stale filesystem references. | M6423 | G2-458 | Verify syntax and import sweeps | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 353 | P2 | 01/09 | Correct stale route references. | M6424 | G2-459 | Verify route target sweeps | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 354 | P2 | 01/10 | Correct stale fixture references. | M6425 | G2-460 | Verify cumulative contract gate | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 355 | P2 | 01/11 | Correct obsolete feature expectations. | M6426 | G2-461 | Verify focused tests for changed features | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 356 | P2 | 01/12 | Verify every current roadmap contract. | M6427 | G2-460 | Verify cumulative contract gate | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 357 | P2 | 01/13 | Verify every current release contract. | M6428 | G2-460 | Verify cumulative contract gate | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 358 | P2 | 01/14 | Verify every current security contract. | M6429 | G2-460 | Verify cumulative contract gate | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 359 | P2 | 01/15 | Verify every current API contract. | M6430 | G2-460 | Verify cumulative contract gate | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 360 | P2 | 01/16 | Verify every current import contract. | M6431 | G2-458 | Verify syntax and import sweeps | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 361 | P2 | 01/17 | Verify every current database contract. | M6432 | G2-460 | Verify cumulative contract gate | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 362 | P2 | 01/18 | Verify every current authentication contract. | M6433 | G2-460 | Verify cumulative contract gate | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 363 | P2 | 01/19 | Establish clean Main baseline. | M6434 | G2-469 | Verify seal checks after notes are written | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 364 | P2 | 01/20 | Establish clean Admin baseline. | M6435 | G2-470 | Verify archive ZIP integrity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 365 | P2 | 01/21 | Run Main Devil’s Walk. | M6436 | G2-471 | Verify checksum sidecar matches exact archive | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 366 | P2 | 01/22 | Run Admin Devil’s Walk. | M6437 | G2-472 | Verify checkpoint copy is byte-identical | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 367 | P2 | 01/23 | Run full available test suites. | M6438 | G2-462 | Verify full suite result and failure classification | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 368 | P2 | 01/24 | Document remaining external-only tests. | M6439 | G2-453 | Verify tests use current source contracts | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 369 | P2 | 03/24 | Add Main authentication acceptance tests. | M6489 | G2-453 | Verify tests use current source contracts | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 370 | P2 | 03/25 | Add Admin authentication acceptance tests. | M6490 | G2-453 | Verify tests use current source contracts | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 371 | P2 | 04/24 | Build security review surface. | M6514 | G2-474 | Verify rollback and artifact retention notes | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 372 | P2 | 04/25 | Test the complete Admin security boundary. | M6515 | G2-455 | Verify app boundary tests are standalone | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 373 | P2 | 08/23 | Add regional regression tests. | M6613 | G2-453 | Verify tests use current source contracts | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 374 | P2 | 09/05 | Build document submission model. | M6620 | G2-455 | Verify app boundary tests are standalone | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 375 | P2 | 09/06 | Build secure evidence references. | M6621 | G2-456 | Verify dependencies and lockfiles are consistent | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 376 | P2 | 09/07 | Build verification status machine. | M6622 | G2-457 | Verify install/build prerequisites are documented | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 377 | P2 | 09/08 | Build verification queue. | M6623 | G2-458 | Verify syntax and import sweeps | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 378 | P2 | 09/09 | Build verification review. | M6624 | G2-459 | Verify route target sweeps | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 379 | P2 | 09/10 | Build rejection reasons. | M6625 | G2-460 | Verify cumulative contract gate | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 380 | P2 | 09/11 | Build resubmission. | M6626 | G2-461 | Verify focused tests for changed features | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 381 | P2 | 09/13 | Build verification audit trail. | M6628 | G2-463 | Verify typecheck status and dependency prerequisites | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 382 | P2 | 09/16 | Build verification expiration. | M6631 | G2-466 | Verify known duplicate groups are reviewed, not blindly removed | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 383 | P2 | 09/17 | Build verification renewal. | M6632 | G2-467 | Verify release notes and handoff scope | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 384 | P2 | 09/18 | Build verification privacy controls. | M6633 | G2-468 | Verify active roadmap pointers and report identity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 385 | P2 | 09/20 | Build deletion rules. | M6635 | G2-470 | Verify archive ZIP integrity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 386 | P2 | 16/01 | Build Account Center. | M6791 | G2-451 | Verify release identity using locked project tooling | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 387 | P2 | 16/02 | Build identity section. | M6792 | G2-468 | Verify active roadmap pointers and report identity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 388 | P2 | 16/03 | Build security section. | M6793 | G2-453 | Verify tests use current source contracts | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 389 | P2 | 16/04 | Build privacy section. | M6794 | G2-454 | Verify tests do not hard-code release identity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 390 | P2 | 16/05 | Build verification section. | M6795 | G2-455 | Verify app boundary tests are standalone | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 391 | P2 | 16/06 | Build connected-services section. | M6796 | G2-456 | Verify dependencies and lockfiles are consistent | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 392 | P2 | 16/08 | Build AI controls. | M6798 | G2-458 | Verify syntax and import sweeps | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 393 | P2 | 16/11 | Build messaging controls. | M6801 | G2-461 | Verify focused tests for changed features | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 394 | P2 | 16/12 | Build location controls. | M6802 | G2-462 | Verify full suite result and failure classification | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 395 | P2 | 16/13 | Build data export. | M6803 | G2-465 | Verify safe cleanup does not delete user data | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 396 | P2 | 16/14 | Build data portability. | M6804 | G2-465 | Verify safe cleanup does not delete user data | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 397 | P2 | 16/15 | Build account deletion. | M6805 | G2-465 | Verify safe cleanup does not delete user data | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 398 | P2 | 16/16 | Build deletion confirmation. | M6806 | G2-466 | Verify known duplicate groups are reviewed, not blindly removed | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 399 | P2 | 16/18 | Build privacy audit. | M6808 | G2-468 | Verify active roadmap pointers and report identity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 400 | P2 | 16/19 | Build consent history. | M6809 | G2-469 | Verify seal checks after notes are written | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 401 | P2 | 16/20 | Build consent withdrawal. | M6810 | G2-470 | Verify archive ZIP integrity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 402 | P2 | 16/21 | Build data-access boundaries. | M6811 | G2-465 | Verify safe cleanup does not delete user data | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 403 | P2 | 16/22 | Build user-visible security history. | M6812 | G2-465 | Verify safe cleanup does not delete user data | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 404 | P2 | 16/23 | Build privacy regression suite. | M6813 | G2-462 | Verify full suite result and failure classification | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 405 | P2 | 16/24 | Build account-lifecycle tests. | M6814 | G2-453 | Verify tests use current source contracts | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 406 | P2 | 17/04 | Build per-category controls. | M6819 | G2-454 | Verify tests do not hard-code release identity | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 407 | P2 | 17/05 | Build push channel. | M6820 | G2-455 | Verify app boundary tests are standalone | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 408 | P2 | 17/06 | Build email channel. | M6821 | G2-456 | Verify dependencies and lockfiles are consistent | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 409 | P2 | 17/07 | Build in-app channel. | M6822 | G2-457 | Verify install/build prerequisites are documented | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 410 | P2 | 17/08 | Build SMS readiness. | M6823 | G2-458 | Verify syntax and import sweeps | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 411 | P2 | 17/09 | Build quiet hours. | M6824 | G2-459 | Verify route target sweeps | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 412 | P2 | 17/11 | Build deduplication. | M6826 | G2-461 | Verify focused tests for changed features | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 413 | P2 | 17/19 | Build marketing controls. | M6834 | G2-469 | Verify seal checks after notes are written | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 414 | P2 | 17/20 | Build delivery failure handling. | M6835 | G2-462 | Verify full suite result and failure classification | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 415 | P2 | 18/01 | Build owner dashboard. | M6841 | G2-451 | Verify release identity using locked project tooling | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 416 | P2 | 01/25 | Establish a truthful global readiness baseline. | M6440 | G2-500 | Issue a truthful readiness decision with scope and expiry | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 417 | P2 | 20/13 | Finish Extensions architecture. | M6903 | G2-488 | Verify international policy acceptance status is explicit | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 418 | P2 | 20/14 | Finish developer application registration. | M6904 | G2-489 | Verify payment provider acceptance status is explicit | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 419 | P2 | 20/16 | Finish API scopes. | M6906 | G2-491 | Verify moderation acceptance status is explicit | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 420 | P2 | 20/18 | Finish sandbox. | M6908 | G2-493 | Verify disaster-recovery evidence | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 421 | P2 | 20/20 | Finish app review. | M6910 | G2-485 | Verify security review status is explicit | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 422 | P2 | 20/22 | Finish app revocation. | M6912 | G2-497 | Verify no launch action occurs without owner authorization | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 423 | P2 | 20/23 | Perform complete security certification. | M6913 | G2-485 | Verify security review status is explicit | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 424 | P2 | 20/24 | Perform complete international readiness certification. | M6914 | G2-488 | Verify international policy acceptance status is explicit | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |
| 425 | P2 | 20/25 | Perform final Main + Admin production-readiness certification. | M6915 | G2-500 | Issue a truthful readiness decision with scope and expiry | Main-owned source/test evidence; external acceptance separate. | EVIDENCE_AUDIT_REQUIRED |

## Closure criteria

A row may leave this queue only after its specific requirement has a concrete source path/API/route or explicit absence finding, a relevant test result, and a status rationale. A keyword match or candidate V2 target is not evidence that the feature exists.
If the capability is absent, record `MISSING` with a safe remediation milestone. If only some behavior exists, record `PARTIAL`. If evidence is unavailable, record `UNVERIFIED`. If an external provider or deployed acceptance is required, record `DEFERRED` or `NOT TESTED` without inventing success.
Keep the historical V1 register/crosswalk unchanged. Keep Main and Admin execution milestones, releases, batches, checkpoints and completion states separate.

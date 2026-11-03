# Marketplace Exception Reliability and Payment Handoff

## Payment boundary
NEXA prepares the customer payment details and redirects to Sky Money with those details prefilled. The customer completes payment in Sky Money. NEXA must only mark a transaction paid after validating a trusted payment outcome tied to the expected transaction/reference and amount/currency. A return or redirect alone is not proof of payment. This workflow does not require an internal NEXA payout page or a payout-hold table.

## Authority
Main owns payment status, exception triage, refund/dispute decisions and operational writes. Admin displays Main-supplied records only and must not execute payments, issue refunds, infer payment completion, or invent missing source data.

## Reliability metadata
The exception read model returns bounded evidence expectations, category counts, triage event history, category SLA/age metadata and source-record availability diagnostics. Unavailable source tables remain explicitly unknown. Assignment lineage, triage notes and retention metadata must remain unavailable until a canonical Main-owned source exists; the UI must not fabricate them.

## Verification boundaries
Local contract and UI tests do not prove live Main–Admin HTTP integration, real Sky Money return/callback behavior, production provider validation, or device/browser runtime. Those remain NOT TESTED until an authorized environment is available.

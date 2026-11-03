# NEXA Ordered Block Walk

The development verification path is now sequential and product-shaped. It does not begin with a generic repository defect list.

## Order

`Login → Signup → Google callback → Home shell → Home visible blocks → Sky Money → Wallet → Subscription Centre → Zeeza and child sections → Marketplace → Disputes → Vendor Center → Yaayz → Leisure and child sections → Lifestyle → Search → Profile → Verification → Extensions → Developer → Dami → Staff → Admin web → every Admin page → Root shell.`

## Per-block rule

1. Inspect the block entry source first.
2. Traverse its local dependency graph.
3. Verify route/navigation authority.
4. Run only the targeted contracts/tests selected for that block.
5. Fix the block before advancing.
6. Runtime failures caused only by missing external dependencies/providers are parked and explicitly recorded as external.
7. The next block cannot start until the current block passes.

## Commands

- `npm run blockwalk` — print the complete ordered traversal.
- `npm run blockwalk:current` — show the current block.
- `npm run blockwalk:verify` — verify the current block, or confirm the traversal is complete.
- `npm run godhand -- next` — run and seal exactly one block, then advance one position.
- `npm run godhand -- verify` — verify exactly the current block.
- `npm run walk -- --block` — run the same current-block verification through Devil's Walk.
- `npm run walk -- --tests` — reserved for release/full-suite certification; it is not the normal development workflow.

## State

`BLOCK_WALK_STATE.json` records the ordered cursor and every passed block. It is not a substitute for source truth; the source tree and locked release identity remain authoritative.

# NEXA V5.98.92 B239 Report

- Roadmap: M3850–M3874
- Focused contract: 25/25 PASS
- Active cumulative release contracts: PASS
- Release audit: PASS
- Environment/deployment checks: EXCLUDED_FROM_RELEASE_CERTIFICATION

## Primary repair

The canonical Subscription Centre is presented inside Sky Money at `/\(tabs\)/money?view=subscription`. The global navigation previously classified that query route as ordinary Sky Money. B239 adds query-aware title and directory identity resolution so the global chrome correctly identifies the active surface as **NEXA Membership** while ordinary Money remains **Sky Money**.

## Additional closure

B239 locks the global Search/Add/Home/Menu keys, Add action destinations, active search-result navigation types, user/vendor route inventory, and Subscription Centre compatibility/canonical boundaries into the release contract.

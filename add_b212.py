from pathlib import Path
import json,re
root=Path('/mnt/data/b212_work')
version='V5.98.64'; batch='B212'; build='6032'; road='M3175–M3199 / B212'
roadmap='''## CURRENT 25-ROADMAP — M3175–M3199 / B212

**Project:** V5.98.64
**Batch:** B212
**Objective:** Aami Economy Security, Authority & Concurrency Hardening

1. M3175 — Audit B211 devil’s-walk findings against actual source.
2. M3176 — Preserve B211 as the immutable baseline and branch B212 cumulatively.
3. M3177 — Remove client-controlled fixed Aami reward amounts.
4. M3178 — Restrict variable reward amounts to authoritative server claims.
5. M3179 — Harden Aami claim amount validation and bounds.
6. M3180 — Prevent claim redemption from injecting arbitrary reward amounts.
7. M3181 — Replace client-supplied streak values with server-derived streak state.
8. M3182 — Add authoritative Aami streak check-in history.
9. M3183 — Make daily streak rewards idempotent per user/day.
10. M3184 — Preserve the existing streak reward ceiling.
11. M3185 — Move daily-cap evaluation inside the reward transaction.
12. M3186 — Preserve reward idempotency under concurrent requests.
13. M3187 — Preserve append-only Aami ledger semantics.
14. M3188 — Preserve Kitchen cashback one-for-one migration authority.
15. M3189 — Preserve Marketplace Aami purchase/review earning authority.
16. M3190 — Preserve Yaayz earning and anti-abuse boundaries.
17. M3191 — Preserve 18+ account and closed-account boundaries.
18. M3192 — Add adversarial tests for reward amount tampering.
19. M3193 — Add adversarial tests for streak tampering.
20. M3194 — Add adversarial tests for daily-cap concurrency boundaries.
21. M3195 — Add regression tests for claims and historical migration.
22. M3196 — Reconcile active Aami-only terminology without rewriting frozen evidence.
23. M3197 — Reconcile version, roadmap, memory and release-gate metadata.
24. M3198 — Run cumulative static, syntax, store and release audits.
25. M3199 — Perform final devil’s walk, permanent seal and complete B212 archive verification.

**B212 completion rule:** CHECK → FIX → TEST → RECHECK → SEAL. Preserve working NEXA architecture and do not rebuild unrelated modules.
'''
for fn in ['MASTER_ROADMAP.md','PRIORITY_ROADMAP.md','TEMPORARY_ROADMAP.md']:
    p=root/fn; s=p.read_text()
    s=s.replace('## CURRENT 25-ROADMAP — M3150–M3174 / B211', roadmap.rstrip())
    p.write_text(s)

p=root/'VERSION.md'; p.write_text(f'''## {version} {batch}\n\n**Current Version:** {version}\n**Batch:** {batch}\n**Milestones:** M3175–M3199\n**Android/iOS Build:** {build}\n\nSkyMoney remains the single financial home. It presents SkyMoney Cash as the real financial balance and **Aami** as the sole internal reward balance. B212 hardens Aami reward authority, claim validation, server-derived streaks and concurrent daily-cap enforcement without replacing the existing ledgers or product architecture.\n''')

for fn in ['package.json','server/package.json']:
    p=root/fn; data=json.loads(p.read_text()); data['version']='5.98.64'; p.write_text(json.dumps(data,indent=2)+'\n')
# lockfiles if present
for fn in ['package-lock.json','server/package-lock.json']:
    p=root/fn
    if p.exists():
        data=json.loads(p.read_text())
        data['version']='5.98.64'
        if isinstance(data.get('packages'),dict) and '' in data['packages']:
            data['packages']['']['version']='5.98.64'
        p.write_text(json.dumps(data,indent=2)+'\n')

p=root/'app.json'; s=p.read_text(); s=s.replace('"version": "5.98.63"','"version": "5.98.64"').replace('"buildNumber": "6031"','"buildNumber": "6032"').replace('"versionCode": 6031','"versionCode": 6032'); p.write_text(s)

p=root/'src/theme.ts'; s=p.read_text().replace('5.98.63','5.98.64'); p.write_text(s)

m=json.loads((root/'PROJECT_MEMORY.json').read_text())
for k in ['currentVersion','projectVersion','version','latestRelease','currentState']:
    if k in m: m[k]=('5.98.64' if k in ['currentVersion','projectVersion','version'] else 'V5.98.64 B212')
m['currentBatch']='B212'; m['batch']='B212'; m['currentRoadmap']=road; m['nextRoadmap']='M3200–M3224 / B213'; m['lastCompletedMilestones']='M3175–M3199'; m['latestMilestone']='M3199'; m['lastMilestoneBatch']='B212'; m['latestVerifiedRelease']='V5.98.64 B212'; m['releaseStatus']='B212 hardening in progress'
m.setdefault('recentUserPriorities',{})['aamiOnly']='Aami is the sole active reward-balance name; historical B209/B210 evidence remains frozen.'
m['latestValidation']={'status':'in progress','version':'V5.98.64','batch':'B212','milestones':'M3175–M3199'}
(root/'PROJECT_MEMORY.json').write_text(json.dumps(m,indent=2)+'\n')

# Add B212 contract to release gate after B211 contract.
p=root/'scripts/release-gate.mjs'; s=p.read_text(); needle="  'server/v5_98_63_b211_aami_only_terminology.contract.test.js',"
if "v5_98_64_b212_aami_security_hardening.contract.test.js" not in s:
    s=s.replace(needle, needle+"\n  'server/v5_98_64_b212_aami_security_hardening.contract.test.js',")
p.write_text(s)

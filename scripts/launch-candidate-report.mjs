import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { inspectProductionEnvironment, isHttpsUrl } from './production-env-contract.mjs';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const app = json('app.json').expo;
const pkg = json('package.json');
const server = json('server/package.json');
const memory = json('PROJECT_MEMORY.json');
const eas = json('eas.json');
const env = process.env;
const environment = inspectProductionEnvironment(env);
const privacy = String(env.EXPO_PUBLIC_PRIVACY_POLICY_URL || '').trim();
const terms = String(env.EXPO_PUBLIC_TERMS_URL || '').trim();
const api = String(env.EXPO_PUBLIC_API_URL || '').trim();
const sourceLegal = read('docs/legal/PRIVACY_POLICY.md') + '\n' + read('docs/legal/TERMS_OF_SERVICE.md');
const publicChecklist = read('docs/legal/LEGAL_PUBLICATION_CHECKLIST.md');
const sourcePlaceholders = [...sourceLegal.matchAll(/REPLACE WITH[^\n]*/gi)].map(m => m[0]);
const sampleAdMob = /3940256099942544/.test(read('app.json')) || /3940256099942544/.test(read('src/YaayzNativeAd.tsx'));
const publicKeys = environment.checks.filter(c => c.required);
const versionAligned = pkg.version === server.version && pkg.version === app.version;
const buildAligned = Number.isInteger(app.android?.versionCode) && /^\d+$/.test(String(app.ios?.buildNumber || '')) && app.android.versionCode > 0;
const productionProfile = eas.build?.production?.environment === 'production' && eas.build?.production?.channel === 'production';
const launchStrict = /NEXA_STRICT_LAUNCH/.test(read('server/productionLaunchCertification.js'));
const explicitCert = /NEXA_LAUNCH_CERTIFIED/.test(read('server/productionLaunchCertification.js'));
const report = {
  schema: 1,
  release: pkg.version,
  batch: memory.currentBatch,
  roadmap: memory.currentRoadmap || 'current',
  generatedAt: new Date().toISOString(),
  sourceReadiness: {
    versionAligned,
    buildAligned,
    easProjectIdConfigured: Boolean(app.extra?.eas?.projectId),
    productionProfile,
    node: eas.build?.base?.node,
    strictLaunchGuardPresent: launchStrict,
    explicitLaunchCertificationPresent: explicitCert,
    realAdMobIdentifiersPresent: !sampleAdMob,
    legalPublicationChecklistPresent: Boolean(publicChecklist),
    legalSourcePlaceholders: sourcePlaceholders.length,
  },
  environmentReadiness: {
    requiredPublicKeys: publicKeys.map(c => ({ key: c.key, configured: c.configured, valid: c.valid })),
    apiHttps: isHttpsUrl(api),
    privacyHttps: isHttpsUrl(privacy),
    termsHttps: isHttpsUrl(terms),
    legalUrlsDistinct: Boolean(privacy && terms && privacy !== terms),
  },
  externalBlockers: [
    ...environment.blockers.map(key => `${key}: production HTTPS value required`),
    ...(sourcePlaceholders.length ? ['legal-documents: publication placeholders remain and require legal review'] : []),
  ],
  secretsIncluded: false,
};
report.launchCandidateReady = report.externalBlockers.length === 0;
console.log(JSON.stringify(report, null, 2));
process.exit(report.launchCandidateReady ? 0 : 1);

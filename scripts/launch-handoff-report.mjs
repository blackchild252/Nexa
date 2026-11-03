import fs from 'node:fs';
import path from 'node:path';
import { inspectProductionEnvironment, isHttpsUrl } from './production-env-contract.mjs';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const app = json('app.json').expo;
const pkg = json('package.json');
const memory = json('PROJECT_MEMORY.json');
const eas = json('eas.json');
const env = process.env;
const environment = inspectProductionEnvironment(env);

const privacy = String(env.EXPO_PUBLIC_PRIVACY_POLICY_URL || '').trim();
const terms = String(env.EXPO_PUBLIC_TERMS_URL || '').trim();
const api = String(env.EXPO_PUBLIC_API_URL || '').trim();
const checklist = read('docs/legal/LEGAL_PUBLICATION_CHECKLIST.md');
const placeholders = [...checklist.matchAll(/\[ \] (.+)/g)].map(m => m[1]);
const sourceLegal = read('docs/legal/PRIVACY_POLICY.md') + '\n' + read('docs/legal/TERMS_OF_SERVICE.md');
const sourcePlaceholders = [...sourceLegal.matchAll(/REPLACE WITH[^\n]*/gi)].map(m => m[0]);
const admob = String(read('app.json')).includes('ca-app-pub-3940256099942544') || String(read('src/YaayzNativeAd.tsx')).includes('3940256099942544');

const externalBlockers = [];
for (const key of environment.blockers) externalBlockers.push(`${key}: production HTTPS value required`);
if (sourcePlaceholders.length) externalBlockers.push('legal-documents: publication placeholders remain and require legal review');

const report = {
  schema: 2,
  release: pkg.version,
  batch: memory.currentBatch,
  roadmap: memory.currentRoadmap || 'current',
  generatedAt: new Date().toISOString(),
  sourceReadiness: {
    packageVersion: pkg.version,
    expoVersion: app.version,
    androidVersionCode: app.android?.versionCode,
    iosBuildNumber: app.ios?.buildNumber,
    easProjectIdConfigured: Boolean(app.extra?.eas?.projectId),
    easProduction: eas.build?.production?.environment === 'production' && eas.build?.production?.channel === 'production',
    node: eas.build?.base?.node,
    productionAdMobSampleIdsAbsent: !admob,
    legalPublicationChecklistPresent: Boolean(checklist),
    legalPublicationChecklistOpenItems: placeholders.length,
    legalSourcePlaceholders: sourcePlaceholders.length,
  },
  environmentReadiness: {
    requiredPublicKeys: environment.checks.filter(c => c.required).map(c => ({ id: c.id, configured: c.configured, valid: c.valid })),
    apiHttps: isHttpsUrl(api),
    privacyHttps: isHttpsUrl(privacy),
    termsHttps: isHttpsUrl(terms),
    legalUrlsDistinct: Boolean(privacy && terms && privacy !== terms),
  },
  externalBlockers,
  launchable: externalBlockers.length === 0,
  secretValuesIncluded: false,
};

console.log(JSON.stringify(report, null, 2));

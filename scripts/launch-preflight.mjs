import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { inspectProductionEnvironment } from './production-env-contract.mjs';

// Launch preflight: reports the external items that must be supplied before a store build.
// It never invents values. Run before `eas build --profile production`:  npm run launch:preflight
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const app = JSON.parse(read('app.json')).expo;
const env = process.env;
const blockers = [];
const warnings = [];

const admob = (app.plugins || []).find(p => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads')?.[1] || {};
if (/ca-app-pub-3940256099942544/.test(String(admob.iosAppId))) blockers.push('iOS: app.json iosAppId is Google\'s sample AdMob app ID (register the iOS app in AdMob).');
if (/3940256099942544/.test(read('src/YaayzNativeAd.tsx'))) blockers.push('iOS: src/YaayzNativeAd.tsx still uses the sample native ad unit ID.');
if (!app.extra?.eas?.projectId) blockers.push('EAS: app.json has no expo.extra.eas.projectId (run `eas init`).');
if (!app.owner) warnings.push('EAS: app.json has no expo.owner (needed only for organization-owned Expo accounts).');
const environment = inspectProductionEnvironment(env);
for (const name of environment.blockers) blockers.push(`Build env: ${name} is missing or is not a valid https:// URL. Set it with: eas env:create --environment production --name ${name} --value <YOUR_HTTPS_URL>`);
if (!fs.readFileSync(path.join(root, '.nvmrc'), 'utf8').trim().startsWith(JSON.parse(read('eas.json')).build.base.node.split('.')[0])) warnings.push('eas.json Node major differs from .nvmrc.');

for (const b of blockers) console.log(`BLOCKER  ${b}`);
for (const w of warnings) console.log(`WARNING  ${w}`);
console.log(blockers.length ? `LAUNCH PREFLIGHT: ${blockers.length} blocker(s) remain.` : 'LAUNCH PREFLIGHT: no blockers found.');
process.exit(blockers.length ? 1 : 0);

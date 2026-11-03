const test = require('node:test');
const assert = require('node:assert/strict');
const __r=(p)=>JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'..',p),'utf8'));
const CUR=__r('package.json').version, CODE=__r('app.json').expo.android.versionCode, CURB=__r('PROJECT_MEMORY.json').currentBatch;

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const json = p => JSON.parse(read(p));
const app = json('app.json');
const pkg = json('package.json');
const serverPkg = json('server/package.json');
const lock = json('package-lock.json');
const eas = json('eas.json');
const memory = json('PROJECT_MEMORY.json');
const version = CUR;
const batch = CURB;
const checks = [
 ['root package version',()=>pkg.version===version],
 ['server package version',()=>serverPkg.version===version],
 ['lock root version',()=>lock.packages?.['']?.version===version],
 ['expo version',()=>app.expo.version===version],
 ['expo nexaVersion',()=>app.expo.extra?.nexaVersion===version],
 ['android versionName',()=>app.expo.android?.version===version],
 ['android versionCode advanced',()=>app.expo.android?.versionCode===CODE],
 ['ios versionName',()=>app.expo.ios?.version===version],
 ['ios version aligned',()=>app.expo.ios?.version===version],
 ['ios buildNumber advanced',()=>app.expo.ios?.buildNumber===String(CODE)],
 ['eas production profile',()=>eas.build?.production?.environment==='production'],
 ['eas production channel',()=>eas.build?.production?.channel==='production'],
 ['eas local app version source',()=>eas.cli?.appVersionSource==='local'],
 ['node engine retained',()=>pkg.engines?.node==='>=20.19.0'],
 ['npm package manager retained',()=>pkg.packageManager==='npm@10.9.2'],
 ['lockfile v3',()=>lock.lockfileVersion===3],
 ['server dependency parity',()=>Object.entries(serverPkg.dependencies||{}).every(([k,v])=>pkg.dependencies?.[k]===v)],
 ['Sentry server dependency',()=>Boolean(serverPkg.dependencies?.['@sentry/node'])],
 ['Sentry client dependency',()=>Boolean(pkg.dependencies?.['@sentry/react-native'])],
 ['Playwright dependency declared',()=>Boolean(pkg.devDependencies?.['@playwright/test'])],
 ['launch preflight exists',()=>fs.existsSync(path.join(root,'scripts/launch-preflight.mjs'))],
 ['dependency preflight exists',()=>fs.existsSync(path.join(root,'scripts/dependency-preflight.mjs'))],
 ['recovery drill exists',()=>fs.existsSync(path.join(root,'scripts/recovery-drill.mjs'))],
 ['builder gate exists',()=>fs.existsSync(path.join(root,'scripts/builder-gate.mjs'))],
 ['roadmap checkpoint current',()=>/M\d{4}/.test(read('MASTER_ROADMAP.md'))],
 ['next roadmap documented',()=>/M\d{4}/.test(read('MASTER_ROADMAP.md'))],
 ['project memory current',()=>memory.currentVersion===version && memory.currentBatch===batch],
 ['production AdMob ids non-sample',()=>!read('app.json').includes('ca-app-pub-3940256099942544')],
 ['no active private-key material',()=>!/(BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY)/.test(read('app.json'))],
 ['roadmap batch rule retained',()=>/\*\*Batch:\*\* B\d+/.test(read('VERSION.md'))],
];
for (const [name,fn] of checks) test(name,()=>assert.equal(fn(),true));

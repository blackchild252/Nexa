import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));

export function inspectStoreSubmissionConfig() {
  const app = json('app.json').expo;
  const eas = json('eas.json');
  const pkg = json('package.json');
  const checks = [
    ['version', app.version, new RegExp(`^${pkg.version.replaceAll('.', '\\.')}$`)],
    ['android.package', app.android?.package, /^com\.aami\.nexa$/],
    ['android.versionCode', app.android?.versionCode, new RegExp(`^${String(app.android?.versionCode)}$`)],
    ['ios.bundleIdentifier', app.ios?.bundleIdentifier, /^com\.aami\.nexa$/],
    ['ios.buildNumber', app.ios?.buildNumber, new RegExp(`^${String(app.ios?.buildNumber)}$`)],
    ['eas.projectId', app.extra?.eas?.projectId, /^[0-9a-f-]{36}$/i],
    ['eas.production.environment', eas.build?.production?.environment, /^production$/],
    ['eas.production.channel', eas.build?.production?.channel, /^production$/],
    ['eas.production.androidBuildType', eas.build?.production?.android?.buildType, /^app-bundle$/],
    ['eas.base.node', eas.build?.base?.node, /^22\.22\.2$/],
  ];
  return { checks: checks.map(([id,value,pattern]) => ({ id, configured: value != null, valid: pattern.test(String(value ?? '')) })), ok: checks.every(([,value,pattern]) => pattern.test(String(value ?? ''))) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const result = inspectStoreSubmissionConfig();
  for (const c of result.checks) console.log(`${c.valid ? 'PASS' : 'BLOCKER'} ${c.id}`);
  process.exit(result.ok ? 0 : 1);
}

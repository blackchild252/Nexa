import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
let playwrightAvailable = false;
try { require.resolve('@playwright/test', { paths: [root] }); playwrightAvailable = true; } catch (_) {}
if (playwrightAvailable) {
  const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--no-install','playwright','test','e2e/nexa-smoke.spec.js','--project=chromium'], { cwd: root, stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
const fallback = path.join(root, 'server', 'e2e_smoke_source.contract.test.js');
if (!fs.existsSync(fallback)) process.exit(1);
const r = spawnSync(process.execPath, ['--test', fallback], { cwd: root, stdio: 'inherit' });
process.exit(r.status ?? 1);

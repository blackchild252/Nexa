#!/usr/bin/env node
// Preflight then delegate to the actual smoke script, preserving its exit status.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const root = process.cwd();
const require = createRequire(path.join(root, 'server', 'index.js'));
const base = String(process.env.NEXA_PREVIEW_BASE_URL || 'http://127.0.0.1:3000');
let url;
try { url = new URL(base); } catch { console.error('Preview smoke blocked: NEXA_PREVIEW_BASE_URL is not a valid URL.'); process.exit(2); }
if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(url.hostname)) {
  console.error('Preview smoke blocked: only loopback URLs are allowed; no external host was contacted.');
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'server/package.json'), 'utf8'));
const missing = Object.keys(manifest.dependencies || {}).filter(name => {
  try { require.resolve(name); return false; } catch { return true; }
});
if (missing.length) {
  console.error(`Preview smoke prerequisite failure: ${missing.length} server dependencies missing (${missing.join(', ')}).`);
  console.error('Restore dependencies with npm ci when registry access is available, then rerun npm run preview:smoke.');
  process.exit(2);
}
const result = spawnSync(process.execPath, ['server/previewSmoke.js'], { cwd: root, stdio: 'inherit', env: process.env });
if (result.error) { console.error(`Preview smoke runner error: ${result.error.message}`); process.exit(1); }
process.exit(result.status === null ? 1 : result.status);

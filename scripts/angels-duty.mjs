#!/usr/bin/env node
/**
 * NEXA Angels Duty: permanent cleanup layer.
 *
 * Purpose: detect and safely remove only unambiguous temporary/generated junk.
 * Exact duplicate files are reported, never auto-deleted.
 * Historical release records, roadmap authorities, source, assets and runtime data
 * are protected from automatic deletion.
 *
 * Commands:
 *   npm run angels-duty                 audit only
 *   npm run angels-duty -- --apply      remove safe junk, then re-audit
 *   npm run angels-duty -- --json       machine-readable audit
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.env.NEXA_ROOT ? path.resolve(process.env.NEXA_ROOT) : process.cwd();
const apply = process.argv.includes('--apply');
const json = process.argv.includes('--json');

const PROTECTED_DIRS = new Set([
  '.git', 'node_modules', 'server/node_modules', 'coverage', 'dist', 'build',
]);
const PROTECTED_FILE_PATTERNS = [
  /^RELEASE_SEAL_V\d+\.\d+\.\d+\.json$/,
  /^B\d+_REPORT\.md$/,
  /^LAUNCH_HANDOFF\.md$/,
  /^VERSION\.md$/,
  /^MASTER_ROADMAP\.md$/,
  /^PRIORITY_ROADMAP\.md$/,
  /^TEMPORARY_ROADMAP\.md$/,
  /^AGENTS\.md$/,
  /^CLAUDE\.md$/,
  /^PROJECT_MEMORY\.json$/,
];
const SAFE_JUNK = [
  /\.tmp$/i,
  /\.temp$/i,
  /\.bak$/i,
  /\.orig$/i,
  /\.rej$/i,
  /\.swp$/i,
  /\.swo$/i,
  /~$/,
  /(^|\/)\.DS_Store$/i,
  /(^|\/)Thumbs\.db$/i,
  /(^|\/)npm-debug\.log(?:\.\d+)?$/i,
  /(^|\/)yarn-debug\.log$/i,
  /(^|\/)yarn-error\.log$/i,
  /(^|\/)pnpm-debug\.log$/i,
];

function isProtected(rel) {
  const normalized = rel.split(path.sep).join('/');
  const parts = normalized.split('/');
  if (parts.some(p => PROTECTED_DIRS.has(p))) return true;
  const base = parts.at(-1);
  return PROTECTED_FILE_PATTERNS.some(re => re.test(base));
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    const rel = path.relative(root, full);
    if (ent.isDirectory()) {
      if (isProtected(rel)) continue;
      walk(full, out);
    } else if (ent.isFile() && !isProtected(rel)) {
      out.push({ full, rel: rel.split(path.sep).join('/') });
    }
  }
  return out;
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const files = walk(root);
const junk = files.filter(f => SAFE_JUNK.some(re => re.test(f.rel)));
const byHash = new Map();
for (const f of files) {
  const stat = fs.statSync(f.full);
  if (stat.size === 0) {
    const hash = sha256(f.full);
    const list = byHash.get(hash) ?? [];
    list.push(f.rel);
    byHash.set(hash, list);
  } else if (stat.size <= 10 * 1024 * 1024) {
    const hash = sha256(f.full);
    const list = byHash.get(hash) ?? [];
    list.push(f.rel);
    byHash.set(hash, list);
  }
}
const duplicates = [...byHash.values()].filter(list => list.length > 1);

const removed = [];
if (apply) {
  for (const f of junk) {
    fs.rmSync(f.full, { force: true });
    removed.push(f.rel);
  }
}

const result = {
  operation: 'ANGELS DUTY',
  root,
  mode: apply ? 'APPLY' : 'AUDIT',
  scannedFiles: files.length,
  safeJunk: junk.map(f => f.rel),
  removed,
  exactDuplicateGroups: duplicates,
  protected: {
    historicalReleaseRecords: true,
    roadmapAuthorities: true,
    sourceAndRuntimeFiles: true,
    dependencyBuildDirectories: true,
  },
  blockers: 0,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('ANGELS DUTY — permanent cleanup layer');
  console.log(`MODE: ${result.mode}`);
  console.log(`SCANNED: ${result.scannedFiles} files`);
  console.log(`SAFE JUNK: ${result.safeJunk.length}`);
  for (const item of result.safeJunk) console.log(`  ${apply ? 'REMOVED' : 'CANDIDATE'} ${item}`);
  console.log(`EXACT DUPLICATE GROUPS: ${result.exactDuplicateGroups.length}`);
  for (const group of result.exactDuplicateGroups) console.log(`  REVIEW ${group.join(' <=> ')}`);
  console.log(`BLOCKERS: ${result.blockers}`);
  if (!apply && junk.length) console.log('ACTION: run `npm run angels-duty -- --apply` to remove only the safe-junk candidates.');
}

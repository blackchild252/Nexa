#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root = process.cwd();
const destination = process.argv.find(a => a.startsWith('--copy-to=')) || '--copy-to=/mnt/data/checkpoints/main';
const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'release-ship.mjs'), destination], { cwd: root, encoding: 'utf8', env: { ...process.env, NEXA_ROOT: root } });
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
process.exit(r.status ?? 1);

#!/usr/bin/env node
// Read-only prerequisite gate; it never runs Expo export or installs packages.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = process.cwd();
const require = createRequire(path.join(root, 'package.json'));
const packages = ['expo', 'react', 'react-native', 'react-native-web'];
const missing = packages.filter(name => { try { require.resolve(`${name}/package.json`); return false; } catch { try { require.resolve(name); return false; } catch { return true; } } });
const tsconfig = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'));
const expoBase = path.join(root, 'node_modules', 'expo', 'tsconfig.base.json');
const result = { readOnly: true, prerequisites: packages.map(name => ({ name, installed: !missing.includes(name) })), expoTsconfigBaseResolvable: tsconfig.extends === 'expo/tsconfig.base' && fs.existsSync(expoBase), missing, nextStep: missing.length ? 'Restore dependencies from package-lock.json with npm ci when registry access is available; this gate does not start an export.' : 'Prerequisites found; run npm run build:web to execute the actual export.' };
console.log(JSON.stringify(result, null, 2));
if (missing.length || !result.expoTsconfigBaseResolvable) process.exitCode = 2;

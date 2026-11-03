import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { URL } from 'node:url';

const root = process.env.NEXA_ROOT ? path.resolve(process.env.NEXA_ROOT) : process.cwd();
const unreadable = [];
const readJson = (file) => {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    return parsed;
  } catch { unreadable.push(file); return null; }
};
const pkg = readJson('package.json');
const serverPkg = readJson('server/package.json');
const lockPath = path.join(root, 'package-lock.json');
const lock = fs.existsSync(lockPath) ? readJson('package-lock.json') : null;
if (!pkg || !serverPkg) {
  // Fail closed with a short report: no stack trace, no file contents, no environment values.
  const report = { reproducible: false, blockers: unreadable.map(f => `${f} is missing, unreadable or not a JSON object`), remediation: ['Restore the named manifest(s) from the reviewed source tree; preflight is read-only and will not rewrite them.'] };
  fs.writeSync(1, JSON.stringify(report, null, 2) + '\n');
  process.exit(2);
}
const lockPackages = lock?.packages ?? {};
const rootDeclared = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
const missingLockEntries = Object.keys(rootDeclared).filter(name => !lockPackages[`node_modules/${name}`]);
const npmRegistryRaw = process.env.npm_config_registry || 'https://registry.npmjs.org/';
let npmRegistryHost = 'invalid-registry-url';
try { const registryUrl = new URL(npmRegistryRaw); npmRegistryHost = registryUrl.host; } catch {}
const networkHints = { registryHost: npmRegistryHost, proxyConfigured: Boolean(process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY), offlineMode: /^(1|true)$/i.test(process.env.npm_config_offline || '') };
const npmConfigProbe = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['config', 'get', 'registry'], { cwd: root, encoding: 'utf8', timeout: 5000, windowsHide: true });
if (npmConfigProbe.status === 0 && npmConfigProbe.stdout.trim()) { try { networkHints.registryHost = new URL(npmConfigProbe.stdout.trim()).host; } catch {} }
const lockDependencyEntriesValid = Boolean(lock) && missingLockEntries.length === 0;

// Keep diagnostic output bounded even when a damaged manifest declares an
// unusually large dependency set. Counts remain exact; names are a preview.
const boundedNames = (names, limit = 40) => ({
  total: names.length,
  shown: names.slice(0, limit).map(name => String(name).slice(0, 160)),
  truncated: names.length > limit,
});

const [nodeMajor, nodeMinor, nodePatch] = process.versions.node.split('.').map(Number);
const nodeMeetsMinimum = Number.isFinite(nodeMajor) && Number.isFinite(nodeMinor) && Number.isFinite(nodePatch) && (nodeMajor > 20 || (nodeMajor === 20 && nodeMinor >= 19));
const npmVersion = process.env.npm_config_user_agent?.match(/npm\/(\d+\.\d+\.\d+)/)?.[1] ?? null;
const declaredNpmVersion = pkg.packageManager?.match(/^npm@(\d+\.\d+\.\d+)$/)?.[1] ?? null;
const npmVersionMatchesWhenKnown = !npmVersion || !declaredNpmVersion || npmVersion === declaredNpmVersion;
const dependencyManifests = Object.keys(pkg.dependencies ?? {}).map(name => ({ name, file: path.join(root, 'node_modules', name, 'package.json') }));
const serverDependencyManifests = Object.keys(serverPkg.dependencies ?? {}).map(name => ({ name, file: path.join(root, 'server', 'node_modules', name, 'package.json') }));
const missingRootDependencies = dependencyManifests.filter(item => !fs.existsSync(item.file)).map(item => item.name);
const missingServerDependencies = serverDependencyManifests.filter(item => !fs.existsSync(item.file)).map(item => item.name);
const dependenciesInstalled = missingRootDependencies.length === 0 && missingServerDependencies.length === 0;
const checks = [
  { name: 'Node runtime satisfies package engines (>=20.19.0)', ok: nodeMeetsMinimum },
  { name: 'packageManager is npm@10.9.2', ok: pkg.packageManager === 'npm@10.9.2' },
  { name: 'npm runtime matches declared packageManager when available', ok: npmVersionMatchesWhenKnown },
  { name: 'server dependency manifest matches root runtime dependencies', ok: Object.entries(serverPkg.dependencies ?? {}).every(([k,v]) => pkg.dependencies?.[k] === v) },
  { name: 'package-lock.json present and readable', ok: Boolean(lock) && !unreadable.includes('package-lock.json') },
  { name: 'lockfileVersion is 3 when lock exists', ok: !lock || lock.lockfileVersion === 3 },
  { name: 'lockfile root version matches package version when lock exists', ok: !lock || lock.packages?.['']?.version === pkg.version },
  { name: 'lockfile root packageManager matches declared packageManager when lock exists', ok: !lock || !lock.packages?.['']?.packageManager || lock.packages[''].packageManager === pkg.packageManager },
  { name: 'every root dependency and devDependency has a lockfile package entry', ok: !lock || lockDependencyEntriesValid },
  { name: 'all declared root and server dependencies have installed package manifests', ok: dependenciesInstalled },
];
const blockers = checks.filter(c => !c.ok).map(c => c.name);
const remediation = [];
if (!nodeMeetsMinimum) remediation.push(`Use Node ${pkg.engines?.node ?? 'the version declared by package.json'}; current runtime is ${process.versions.node}.`);
if (!npmVersionMatchesWhenKnown) remediation.push(`Use the declared package manager ${pkg.packageManager}; current npm is ${npmVersion}.`);
if (!lock || !lockDependencyEntriesValid) remediation.push('Restore package-lock.json from the same reviewed dependency change as package.json; preflight is read-only and will not rewrite it.');
if (!dependenciesInstalled) remediation.push(`Dependencies are absent: install from the reviewed lockfile when registry access is available (npm ci). Missing root packages: ${missingRootDependencies.length}; missing server packages: ${missingServerDependencies.length}.`);
if (networkHints.offlineMode) remediation.push('npm offline mode is enabled; cached packages only can be used.');
if (networkHints.proxyConfigured) remediation.push('A proxy variable is present; its value is intentionally not printed.');
const result = { version: pkg.version, requiredNode: pkg.engines?.node ?? null, nodeVersion: process.versions.node, npmVersion, networkHints, checks, blockers, missingLockEntries: boundedNames(missingLockEntries), workspaceDependenciesInstalled: dependenciesInstalled, missingRootDependencies: boundedNames(missingRootDependencies), missingServerDependencies: boundedNames(missingServerDependencies), remediation, reproducible: blockers.length === 0 };
console.log(JSON.stringify(result, null, 2));
if (!result.reproducible) process.exitCode = 2;

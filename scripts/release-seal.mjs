import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
// A missing or broken project file ends the run with one short line and exit 2, never a stack trace.
const blocked = message => { console.error(`RELEASE SEAL BLOCKED — ${message}`); process.exit(2); };
const readProjectJson = name => {
  let text;
  try { text = fs.readFileSync(path.join(root, name), 'utf8'); } catch { return blocked(`${name} is missing or cannot be read. Run this from the project folder.`); }
  try { const value = JSON.parse(text); if (value && typeof value === 'object' && !Array.isArray(value)) return value; } catch { /* reported below */ }
  return blocked(`${name} is not a valid JSON object.`);
};
const pkg = readProjectJson('package.json');
const memory = readProjectJson('PROJECT_MEMORY.json');
if (typeof pkg.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(pkg.version)) blocked('package.json has no valid version.');
const version = pkg.version;
const batch = String(memory.currentBatch ?? '');
const sealPath = path.join(root, `RELEASE_SEAL_V${version}.json`);
const archiveName = `NEXA-MAIN-V${version}.zip`;
const EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'coverage', 'dist', 'build', '.data', '.expo', '.cache', '.turbo']);
const EXCLUDED_FILES = new Set([archiveName, `${archiveName}.sha256`, path.basename(sealPath)]);

function excludedFile(name) { return EXCLUDED_FILES.has(name) || /\.zip(?:\.sha256)?$/i.test(name) || (/^\.env(?:\..+)?$/i.test(name) && !/^\.env\.example$/i.test(name)) || /^\.npmrc$|^\.netrc$/i.test(name) || /\.(?:key|enc|pem|p12|pfx|jks|keystore)$/i.test(name) || /^(?:service-account|firebase-adminsdk).*\.json$/i.test(name); }

function walk(dir, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = rel ? path.join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) out.push(...walk(path.join(dir, entry.name), relative));
    } else if (entry.isFile() && !excludedFile(entry.name)) {
      out.push(relative.replaceAll(path.sep, '/'));
    }
  }
  return out;
}

const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

function snapshot() {
  const files = walk(root).map(file => ({ path: file, sha256: sha256(file) }));
  const fingerprint = crypto.createHash('sha256')
    .update(files.map(x => `${x.sha256}  ${x.path}\n`).join(''))
    .digest('hex');
  return { files, fingerprint };
}

function loadSeal() {
  if (!fs.existsSync(sealPath)) throw new Error(`Missing permanent release seal: ${path.basename(sealPath)}`);
  let seal;
  try { seal = JSON.parse(fs.readFileSync(sealPath, 'utf8')); } catch { throw new Error(`${path.basename(sealPath)} cannot be read as JSON`); }
  const fileShape = x => x && typeof x.path === 'string' && /^[0-9a-f]{64}$/.test(String(x.sha256));
  if (!seal || typeof seal !== 'object' || !Array.isArray(seal.files) || !seal.files.every(fileShape)) throw new Error(`${path.basename(sealPath)} is malformed`);
  return seal;
}
const shown = value => String(value).slice(0, 40);

function create() {
  if (!/^B\d+$/.test(batch)) throw new Error('Current Batch is invalid; cannot create release seal');
  if (fs.existsSync(sealPath)) {
    throw new Error(`Permanent release seal already exists: ${path.basename(sealPath)}. A sealed release cannot be overwritten; create a new version for the next release.`);
  }
  const snap = snapshot();
  const seal = {
    schema: 1,
    release: version,
    batch,
    archive: archiveName,
    sealed: true,
    environmentIndependent: true,
    generatedAt: new Date().toISOString(),
    fingerprint: snap.fingerprint,
    files: snap.files,
  };
  fs.writeFileSync(sealPath, `${JSON.stringify(seal, null, 2)}\n`);
  console.log(`RELEASE SEAL CREATED — V${version} / ${batch} — ${snap.files.length} files — ${snap.fingerprint}`);
}

function verify() {
  const seal = loadSeal();
  if (seal.release !== version) throw new Error(`Seal release ${shown(seal.release)} does not match package ${version}`);
  if (seal.batch !== batch) throw new Error(`Seal Batch ${shown(seal.batch)} does not match current Batch ${batch}`);
  if (seal.archive !== archiveName) throw new Error('Seal archive name drift');
  if (seal.environmentIndependent !== true || seal.sealed !== true) throw new Error('Permanent seal flags invalid');
  const snap = snapshot();
  const expected = new Map(seal.files.map(x => [x.path, x.sha256]));
  const actual = new Map(snap.files.map(x => [x.path, x.sha256]));
  const changed = [];
  for (const [file, hash] of expected) if (actual.get(file) !== hash) changed.push(file);
  for (const file of actual.keys()) if (!expected.has(file)) changed.push(file);
  if (changed.length || snap.fingerprint !== seal.fingerprint) {
    console.error('RELEASE SEAL FAILED — sealed source changed');
    for (const file of changed.slice(0, 50)) console.error(`- ${file}`);
    process.exit(1);
  }
  console.log(`RELEASE SEAL PASS — V${version} / ${batch} — ${seal.fingerprint}`);
}

function list() {
  const files = walk(root);
  const bad = files.filter(f => /[\r\n]/.test(f));
  if (bad.length) { console.error('RELEASE LIST FAILED — a file name contains a line break; rename it before packing'); process.exit(1); }
  process.stdout.write(files.map(f => `${f}\n`).join(''));
}

const command = process.argv[2] ?? 'verify';
try {
  if (command === 'create') create();
  else if (command === 'list') list();
  else if (command === 'verify') verify();
  else {
    console.error('Usage: node scripts/release-seal.mjs <create|verify|list>');
    process.exit(2);
  }
} catch (error) {
  // Messages written in this file are safe to show; anything from the system is shown as a generic line.
  console.error(`RELEASE SEAL BLOCKED — ${error && !error.code && error.name === 'Error' ? error.message : 'the project files could not be read'}`);
  process.exit(1);
}

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const source = process.env.DB_PATH || path.join(process.cwd(), 'server', 'nexa.db');
const verifyOnly = process.argv[2] === '--verify';
const destination = verifyOnly ? process.argv[3] : process.argv[2];
if (!destination) {
  console.error('Usage: node scripts/backup-db.mjs <destination.db> | node scripts/backup-db.mjs --verify <backup.db>');
  process.exit(2);
}
if (verifyOnly) {
  if (!fs.existsSync(destination)) { console.error("Backup does not exist; check the configured backup location."); process.exit(2); }
  const db = new Database(path.resolve(destination), { readonly: true, fileMustExist: true });
  try {
    const integrity = db.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') throw new Error(`SQLite integrity check failed: ${integrity}`);
    console.log(JSON.stringify({ ok: true, mode: 'verify', backup: path.basename(destination), integrity }));
  } finally { db.close(); }
} else {
  if (!fs.existsSync(source)) {
    console.error("Configured source database does not exist.");
    process.exit(2);
  }
  const db = new Database(source, { readonly: true });
  try {
    const target = path.resolve(destination);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (fs.existsSync(target)) throw new Error('Backup destination already exists.');
    db.prepare('VACUUM INTO ?').run(target);
    console.log(JSON.stringify({ ok: true, source: '[configured-db]', destination: path.basename(target), bytes: fs.statSync(target).size }));
  } finally {
    db.close();
  }
}

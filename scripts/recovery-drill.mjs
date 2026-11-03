import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const recovery = require('../server/recoveryOps.js');
const backup = path.resolve(process.argv[2] || '');
const scratch = path.resolve(process.argv[3] || path.join(process.cwd(), '.recovery-drill'));
if (!backup || !fs.existsSync(backup)) { console.error(JSON.stringify({ok:false,error:'backup path is required and must exist'})); process.exit(2); }
const result = recovery.restoreDrill(backup, scratch);
console.log(JSON.stringify({ok:result.ok, mode:'restore-drill', backup:path.basename(backup), steps:result.steps}, null, 2));
process.exit(result.ok ? 0 : 1);

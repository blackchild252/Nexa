// B91 repair 1 - guards against bugs that the older file-pinning contract tests never caught.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const walk = (d, acc = []) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? walk(p, acc) : acc.push(p); } return acc; };
const srcFiles = walk(path.join(root, 'src')).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.d.ts'));

test('fonts are registered by the ACTIVE root layout (src/app), not only the legacy app/ shell', () => {
  const layout = read('src/app/_layout.tsx');
  assert.match(layout, /useFonts\(/);
  for (const w of ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black']) {
    assert.match(layout, new RegExp(`NexaInter-${w}\\.otf`));
    assert.ok(fs.existsSync(path.join(root, 'assets', 'fonts', `NexaInter-${w}.otf`)));
  }
});

test('web document shell lives in the active routes directory', () => {
  assert.ok(fs.existsSync(path.join(root, 'src/app/+html.tsx')));
});

test('every relative import in src/ resolves to a real file', () => {
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx', '/index.js'];
  const missing = [];
  for (const f of srcFiles) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/(?:from\s+|import\s+|require\()\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const t = path.resolve(path.dirname(f), m[1]);
      if (!exts.some((e) => fs.existsSync(t + e) && fs.statSync(t + e).isFile())) missing.push(`${path.relative(root, f)} -> ${m[1]}`);
    }
  }
  assert.deepStrictEqual(missing, []);
});

test('all src files parse (skipped when TypeScript is not installed)', (t) => {
  let ts; try { ts = require('typescript'); } catch { return t.skip('typescript not installed'); }
  const errors = [];
  for (const f of srcFiles) {
    const r = ts.transpileModule(fs.readFileSync(f, 'utf8'), { fileName: f, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.Preserve } });
    for (const d of r.diagnostics || []) errors.push(`${path.relative(root, f)}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
  }
  assert.deepStrictEqual(errors, []);
});

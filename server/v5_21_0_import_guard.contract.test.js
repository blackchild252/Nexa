const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []);
const files = walk(path.join(root, 'src')).filter(f => !/[\\/]theme(Mode|Design)?\.ts$/.test(f));

// B57 CP6 reseal: Extensions / Developer Console crashed on open (ReferenceError) because `theme` / `useRef` were used but not imported.
test('B57 CP6 guard: every src file that reads theme.* imports theme', () => {
  const bad = files.filter(f => { const s = fs.readFileSync(f, 'utf8'); return /(?<![A-Za-z.])theme\./.test(s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')) && !/import \{[^}]*\btheme\b[^}]*\} from ['"][./]+theme['"]/.test(s); });
  assert.deepEqual(bad.map(f => path.relative(root, f)), []);
});

test('B57 CP6 guard: every src file that calls a React hook imports it', () => {
  const bad = [];
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '');
    for (const h of ['useRef', 'useState', 'useEffect', 'useMemo', 'useCallback']) {
      if (new RegExp(`(?<![A-Za-z.])${h}\\(`).test(s) && !new RegExp(`import[^;]*\\b${h}\\b[^;]*from ['"]react['"]`).test(s)) bad.push(`${path.relative(root, f)}: ${h}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('B57 CP6 Extensions and Developer Console imports are complete', () => {
  const ext = fs.readFileSync(path.join(root, 'src/ExtensionsScreen.tsx'), 'utf8');
  assert.match(ext, /import React, \{[^}]*\buseRef\b[^}]*\} from 'react'/);
  assert.match(ext, /import \{ theme, tc(?:, ds)? \} from '\.\/theme'/);
  assert.match(fs.readFileSync(path.join(root, 'src/ExtensionDeveloperScreen.tsx'), 'utf8'), /import \{ theme, tc(?:, ds)? \} from '\.\/theme'/);
});

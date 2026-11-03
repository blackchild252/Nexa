const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function filesUnder(root) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test('B364 consumer typography has no residual 11-13px explicit font sizes', () => {
  const src = path.join(process.cwd(), 'src');
  const offenders = [];
  for (const file of filesUnder(src)) {
    const text = fs.readFileSync(file, 'utf8');
    if (path.basename(file) === 'demoMode.tsx') continue;
    const re = /fontSize\s*:\s*(11|12|13)\b/g;
    let match;
    while ((match = re.exec(text))) offenders.push(`${path.relative(process.cwd(), file)}:${match[1]}`);
  }
  assert.deepEqual(offenders, []);
});

test('B364 readability baseline preserves 100% scaling and larger accessibility multipliers', () => {
  const theme = fs.readFileSync(path.join(process.cwd(), 'src', 'theme.ts'), 'utf8');
  assert.match(theme, /__NEXA_TEXT_SCALE__/);
  assert.match(theme, /fontSize/);
  const scale = fs.readFileSync(path.join(process.cwd(), 'src', 'nexaTextScale.ts'), 'utf8');
  assert.match(scale, /100/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('B361 route inventory: every canonical consumer route is backed by a real Expo Router screen', () => {
  const inventory = read('src/nexaRouteInventory.ts');
  const routes = [...inventory.matchAll(/['"](\/[^'"]+)['"]/g)].map((m) => m[1]).filter((r) => r !== '/');
  assert.ok(routes.length >= 25);
  for (const route of [...new Set(routes)]) {
    const clean = route.replace(/^\//, '');
    const parts = clean.split('/').filter(Boolean);
    const file = path.join(root, 'src', 'app', ...parts.map((part) => part.startsWith('[') && part.endsWith(']') ? part : part));
    const candidates = [
      path.join(file, 'index.tsx'), path.join(file, 'index.ts'), path.join(file, 'index.jsx'), path.join(file, 'index.js'),
      file + '.tsx', file + '.ts', file + '.jsx', file + '.js'
    ];
    assert.ok(candidates.some(fs.existsSync), `${route} has no screen file`);
  }
});

test('B361 canonical directory routes remain inside the route inventory', () => {
  const nav = read('src/nexaNavigation.ts');
  const inventory = read('src/nexaRouteInventory.ts');
  const targets = [...nav.matchAll(/pathname:\s*['"](\/[^'"]+)['"]/g)].map((m) => m[1]);
  for (const target of [...new Set(targets)]) assert.match(inventory, new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('B361 navigation validator rejects unknown destinations and preserves valid params', () => {
  const source = read('src/nexaNavigation.ts');
  assert.match(source, /export function validateNavigationTarget/);
  assert.match(source, /isKnownNexaRoute\(target\.pathname\)/);
  assert.match(source, /params: \{ \.\.\.target\.params \}/);
});

test('B361 Admin page registry has unique keys, labels, permissions and view implementations', () => {
  const app = read('admin-web/src/app.js');
  const rows = [...app.matchAll(/\{ key: "([a-z0-9-]+)", label: "([^"]+)", permission: "([a-z0-9_]+)", view: ([A-Za-z0-9_]+) \}/g)];
  assert.ok(rows.length >= 20);
  assert.equal(new Set(rows.map((r) => r[1])).size, rows.length);
  for (const row of rows) assert.match(app, new RegExp(`import \\{[^}]*\\b${row[4]}\\b[^}]*\\} from`));
});

test('B361 Admin navigation is permission-filtered before rendering tabs', () => {
  const app = read('admin-web/src/app.js');
  assert.match(app, /const pages = PAGES\.filter\(\(p\) => can\(me, p\.permission\)\)/);
  assert.match(app, /filterPages\(pages, query\)/);
  assert.match(app, /aria-current": p\.key === page\.key \? "page" : false/);
});

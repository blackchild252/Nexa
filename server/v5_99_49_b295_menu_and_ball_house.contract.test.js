const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function directoryRows() {
  const s = read('src/homeDesign.ts');
  const block = s.slice(s.indexOf('export const HOME_DIRECTORY'), s.indexOf('] as const', s.indexOf('export const HOME_DIRECTORY')));
  return [...block.matchAll(/\['([a-z]+)','([^']+)','([a-z-]+)','([^']+)'\]/g)].map((m) => ({ id: m[1], label: m[2], icon: m[3], path: m[4] }));
}
function directoryRoutes() {
  const s = read('src/nexaNavigation.ts');
  const block = s.slice(s.indexOf('const DIRECTORY_ROUTES'), s.indexOf('export function navigationForDirectoryItem'));
  const out = {};
  for (const m of block.matchAll(/^\s*([a-z]+): \{ pathname: '([^']+)'/gm)) out[m[1]] = m[2];
  return out;
}
function screenFile(pathname) {
  const clean = pathname.split('?')[0].replace(/^\//, '');
  const base = path.join(root, 'src', 'app', clean);
  const options = [base + '.tsx', path.join(base, 'index.tsx')];
  return options.find((p) => fs.existsSync(p)) || null;
}

test('B295 every directory row has a route and the route points at a real screen file', () => {
  const rows = directoryRows();
  const routes = directoryRoutes();
  assert.ok(rows.length >= 14, 'directory rows were read: ' + rows.length);
  const subscription = read('src/subscriptionCentre.ts');
  for (const row of rows) {
    if (row.id === 'subscription') { assert.match(subscription, /SUBSCRIPTION_CENTRE_CANONICAL_TARGET/); continue; }
    assert.ok(routes[row.id], `row "${row.id}" has no entry in DIRECTORY_ROUTES`);
    assert.ok(screenFile(routes[row.id]), `row "${row.id}" -> ${routes[row.id]} has no screen file under src/app`);
  }
});

test('B295 every directory screen has a default export that is a function or component', () => {
  const routes = directoryRoutes();
  for (const [id, pathname] of Object.entries(routes)) {
    const file = screenFile(pathname);
    assert.ok(file, `${id}: no file for ${pathname}`);
    assert.match(fs.readFileSync(file, 'utf8'), /export default|export \{[^}]*as default/, `${id}: ${path.relative(root, file)} has no default export`);
  }
});

test('B295 the drawer opens rows through navigationForDirectoryItem and never calls router with a raw id', () => {
  const s = read('src/NexaNavKeys.tsx');
  assert.match(s, /const target = navigationForDirectoryItem\(id\);/);
  assert.match(s, /if \(!target\) return;/);
  assert.ok(!/router\.(push|replace)\(id\b/.test(s));
});

test('B295 Yaayz ticket orders get the reservationExpiresAt column the tickets route reads', () => {
  const db = read('server/db.js');
  const index = read('server/index.js');
  assert.match(index, /reservationExpiresAt IS NOT NULL/);
  assert.match(db, /ALTER TABLE yaayz_ticket_orders ADD COLUMN reservationExpiresAt TEXT/);
});

test('B295 every column the Yaayz ticket-release query names is created by db.js', () => {
  const db = read('server/db.js');
  const index = read('server/index.js');
  const fn = index.slice(index.indexOf('function releaseExpiredYaayzReservations'), index.indexOf('app.get("/api/yaayz/ads"'));
  const cols = new Set(['id', 'ticketId', 'quantity', 'status', 'reservationExpiresAt', 'updatedAt']);
  for (const col of cols) assert.ok(new RegExp('\\b' + col + '\\b').test(fn), col + ' used in release query');
  const create = db.slice(db.indexOf('CREATE TABLE IF NOT EXISTS yaayz_ticket_orders'), db.indexOf('idx_yaayz_ticket_orders_payment'));
  for (const col of ['id', 'ticketId', 'quantity', 'status', 'updatedAt']) assert.match(create, new RegExp('\\b' + col + '\\b'), col + ' in CREATE TABLE');
  assert.match(db, /ticketOrderCols\.includes\("reservationExpiresAt"\)/);
});

test('B295 Ball House keeps football on screen when the tickets call fails', () => {
  const s = read('src/app/leisure/ball-house/index.tsx');
  assert.match(s, /Promise\.allSettled\(\[getBallHouseFootball/);
  assert.ok(!/Promise\.all\(\[getBallHouseFootball/.test(s), 'old all-or-nothing load gone');
  assert.match(s, /if\(fr\.status==='rejected'\)throw fr\.reason/);
  assert.match(s, /tr\.status==='fulfilled'/);
  assert.match(s, /Live football is unavailable right now\./);
});

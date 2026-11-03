'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('B407 bootstrap Admin remains server-only and fails closed on invalid credentials', () => {
  const src = read('server/adminBootstrap.js');
  assert.match(src, /NEXA_BOOTSTRAP_ADMIN_EMAIL/);
  assert.match(src, /NEXA_BOOTSTRAP_ADMIN_PASSWORD/);
  assert.match(src, /password\.length < 8/);
  assert.match(src, /hashPasswordSync/);
  assert.match(src, /accountStatus === 'closed'/);
  assert.doesNotMatch(src, /NEXA_BOOTSTRAP_ADMIN_PASSWORD\s*[:=]\s*['"][^'"]+['"]/);
});

test('B407 internally-created Admin and Staff credentials are hashed server-side', () => {
  const ops = read('server/adminOps.js');
  const staff = read('server/adminStaffWork.js');
  assert.match(ops, /auth\.hashPasswordSync\(password\)/);
  assert.match(staff, /auth\.hashPasswordSync\(password\)/);
  assert.doesNotMatch(ops, /password\s*:\s*password/);
  assert.doesNotMatch(staff, /password\s*:\s*password/);
});

test('B407 Admin and Staff creation preserve internal account ownership boundaries', () => {
  const ops = read('server/adminOps.js');
  const staff = read('server/adminStaffWork.js');
  assert.match(ops, /require\("admins"\)/);
  assert.match(staff, /const owner=/);
  assert.match(staff, /INSERT INTO admin_staff/);
  assert.match(staff, /CAPABILITIES/);
});

test('B407 permanent removal remains reasoned and owner-governed', () => {
  const src = read('server/adminOps.js');
  assert.match(src, /app\.delete\("\/api\/admin\/users\/:id"/);
  assert.match(src, /app\.delete\("\/api\/admin\/vendors\/:id"/);
  assert.match(src, /reason/);
  assert.match(src, /users_remove/);
  assert.match(src, /vendors_remove/);
});

test('B407 standalone Admin route inventory remains covered by Main governance', () => {
  const guide = read('docs/ADMIN_ROUTES_GUIDE.md');
  const ops = read('server/adminOps.js');
  assert.ok(guide.length > 1000);
  assert.match(ops, /auth\.authMiddleware/);
  assert.match(ops, /admin\.require/);
});

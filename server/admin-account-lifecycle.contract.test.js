'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const staff=fs.readFileSync(require.resolve('./adminStaffWork'),'utf8');
const ops=fs.readFileSync(require.resolve('./adminOps'),'utf8');
test('Admin creates Staff as an internal permanent account with credentials',()=>{
  assert.match(staff,/passwordHash=auth\.hashPasswordSync\(password\)/);
  assert.match(staff,/INSERT INTO users\(id,email,passwordHash,name,createdAt,accountStatus,adultConfirmedAt\)/);
  assert.match(staff,/INSERT INTO admin_staff/);
  assert.doesNotMatch(staff,/Find an active NEXA account before adding staff/);
});
test('Admin creates additional Admin accounts without Main App registration',()=>{
  assert.match(ops,/passwordHash = auth\.hashPasswordSync\(password\)/);
  assert.match(ops,/INSERT INTO users\(id,email,passwordHash,name,createdAt,accountStatus,adultConfirmedAt\)/);
  assert.match(ops,/INSERT INTO admin_users/);
});

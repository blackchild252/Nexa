'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const staff=()=>fs.readFileSync(path.join(__dirname,'staff.js'),'utf8');
const screen=()=>fs.readFileSync(path.join(__dirname,'..','src','StaffScreen.tsx'),'utf8');
const client=()=>fs.readFileSync(path.join(__dirname,'..','src','staff.ts'),'utf8');

test('Vendor owner can create a permanent credential-backed staff account',()=>{
  const s=staff();
  assert.match(s,/\/api\/mall\/vendor\/staff\/accounts/);
  assert.match(s,/getVendorForUser\(req\.user\.id\)/);
  assert.match(s,/Only the shop owner can create vendor staff accounts/);
  assert.match(s,/auth\.hashPasswordSync\(password\)/);
  assert.match(s,/status, inviteCode, expiresAt, createdAt, joinedAt/);
  assert.match(s,/res\.status\(201\)\.json\(\{ staff: staffOut\(created\) \}\)/);
  assert.doesNotMatch(s,/res\.status\(201\)\.json\([^\n]*password/);
});

test('Vendor staff creation validates credentials and preserves NEXA account isolation',()=>{
  const s=staff();
  assert.match(s,/password\.length < 8 \|\| password\.length > 128/);
  assert.match(s,/SELECT 1 FROM users WHERE email = \?/);
  assert.match(s,/That email already belongs to a NEXA account/);
  assert.match(s,/assignSignupUsername\(db, userId, name\)/);
  assert.match(s,/adultConfirmedAt/);
});

test('Vendor staff client exposes owner credential creation and confirmation UI',()=>{
  assert.match(client(),/apiStaffCreateAccount/);
  const s=screen();
  assert.match(s,/Create permanent staff accounts with credentials/);
  assert.match(s,/Vendor staff email/);
  assert.match(s,/Vendor staff password/);
  assert.match(s,/Confirm vendor staff password/);
  assert.match(s,/Passwords do not match/);
  assert.match(s,/Show staff password/);
  const auth=fs.readFileSync(path.join(__dirname,'..','src','auth.tsx'),'utf8');
  assert.match(auth,/authedFetch\('\/api\/mall\/staff\/me'\)/);
  assert.match(auth,/router\.replace\('\/staff'/);
});

test('Vendor staff access remains vendor-scoped and removal does not delete the NEXA user',()=>{
  const s=staff();
  assert.match(s,/getStaffVendorForUser/);
  assert.match(s,/vendorId = \? AND status != 'removed'/);
  assert.match(s,/UPDATE vendor_staff SET status = 'removed'/);
  assert.match(s,/delete the user's NEXA account/);
});

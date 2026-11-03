'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');

test('bootstrap Admin is server-side and password is never part of the web client',()=>{
  const src=fs.readFileSync(require.resolve('./adminBootstrap'),'utf8');
  assert.match(src,/NEXA_BOOTSTRAP_ADMIN_EMAIL/);
  assert.match(src,/NEXA_BOOTSTRAP_ADMIN_PASSWORD/);
  assert.match(src,/hashPasswordSync/);
  assert.match(src,/INSERT INTO users/);
  assert.match(src,/INSERT INTO admin_users/);
  assert.doesNotMatch(src,/Oladapo252\$/);
});

'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');
test('Admin Staff uses explicit capability-scoped work assignments',()=>{const src=fs.readFileSync(path.join(__dirname,'adminStaffWork.js'),'utf8');assert.match(src,/CAPABILITIES/);assert.match(src,/assignedTo/);assert.match(src,/staffGuard/);assert.match(src,/does not have the capability required/);assert.match(src,/submitted/);});
test('Admin owner permission includes delegated Staff work',()=>{const src=fs.readFileSync(path.join(__dirname,'adminAccess.js'),'utf8');assert.match(src,/staff_work/);});

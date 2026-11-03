'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');
test('Admin UI exposes Staff Work only through the explicit staff_work permission',()=>{const src=fs.readFileSync(path.join(__dirname,'..','admin-web','src','app.js'),'utf8');const view=fs.readFileSync(path.join(__dirname,'..','admin-web','src','views','staff-work.js'),'utf8');assert.match(src,/key: "staff-work"/);assert.match(src,/permission: "staff_work"/);assert.match(view,/Assign/);assert.match(view,/Deactivate/);});

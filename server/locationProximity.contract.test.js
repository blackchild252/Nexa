'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');
test('Chase can use private coarse device location cells for proximity without returning the cell',()=>{const src=fs.readFileSync(path.join(__dirname,'friends.js'),'utf8');assert.match(src,/locationCell/);assert.match(src,/return "local"/);assert.doesNotMatch(src,/cell: row\.locationCell/);});

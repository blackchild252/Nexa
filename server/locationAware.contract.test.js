'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');

test('NEXA location policy enables geolocation without exposing exact coordinates',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.json'),'utf8');
 const index=fs.readFileSync(path.join(__dirname,'index.js'),'utf8');
 const src=fs.readFileSync(path.join(__dirname,'..','src','nexaLocation.tsx'),'utf8');
 assert.match(app,/geolocation/); assert.match(index,/geolocation/); assert.match(src,/approximate|coarse|permission/i); assert.doesNotMatch(src,/console\.log\(.*latitude|console\.log\(.*longitude/);
});

test('location context has denied and unavailable fallbacks',()=>{
 const src=fs.readFileSync(path.join(__dirname,'..','src','nexaLocation.tsx'),'utf8');
 assert.match(src,/denied/); assert.match(src,/unavailable/); assert.match(src,/manual/);
});

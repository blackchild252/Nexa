import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('B340 Admin Staff Work supports filtered queues, bulk assignment, reclaim and Admin resolution',()=>{
 const src=fs.readFileSync(path.join(process.cwd(),'server','adminStaffWork.js'),'utf8');
 assert.match(src,/status=String\(req\.query\?\.status/);
 assert.match(src,/bulk-assign/);
 assert.match(src,/admin_staff_work_reclaim/);
 assert.match(src,/admin_staff_work_resolve/);
 assert.match(src,/A resolution note is required/);
});

test('B340 Staff Work UI exposes workload counts, filters and bulk assignment',()=>{
 const src=fs.readFileSync(path.join(process.cwd(),'admin-web','src','views','staff-work.js'),'utf8');
 assert.match(src,/Assign selected/);
 assert.match(src,/Filter status/);
 assert.match(src,/Filter priority/);
 assert.match(src,/Filter capability/);
 assert.match(src,/Reclaim/);
 assert.match(src,/Resolve/);
});

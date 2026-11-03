const test = require('node:test');
const assert = require('node:assert/strict');
const n = require('./notifications');

function fakeDb() {
  const rows = [
    { id:'n1', userId:'u1', title:'Hello', body:'World', type:'chat', data:'{"screen":"dm_thread","threadId":"t1"}', createdAt:'2026-09-25T10:00:00.000Z', readAt:null },
    { id:'n2', userId:'u1', title:'Read', body:'Done', type:'system', data:'{}', createdAt:'2026-09-24T10:00:00.000Z', readAt:'2026-09-24T11:00:00.000Z' },
  ];
  return { rows, prepare(sql) { return {
    all(...args) { if(sql.includes('notification_events') && sql.includes('createdAt <')) { if(sql.includes('type=?')) return rows.filter(r=>r.userId===args[0]&&r.type===args[1]&&r.createdAt<args[2]).slice(0,args[3]); return rows.filter(r=>r.userId===args[0]&&r.createdAt<args[1]).slice(0,args[2]); } if(sql.includes('notification_events')) { if(sql.includes('type=?')) return rows.filter(r=>r.userId===args[0]&&r.type===args[1]).slice(0,args[2]); return rows.filter(r=>r.userId===args[0]).slice(0,args[1]); } return []; },
    get(...args) { if(sql.includes('COUNT')) { if(sql.includes('type=?')) return {count:rows.filter(r=>r.userId===args[0]&&r.type===args[1]&&!r.readAt).length}; return {count:rows.filter(r=>r.userId===args[0]&&!r.readAt).length}; } return null; },
    run(...args) { if(sql.includes('readAt') && sql.includes('id=?')) { const r=rows.find(x=>x.id===args[1]&&x.userId===args[2]&&!x.readAt); if(r){r.readAt=args[0];return {changes:1};} return {changes:0}; } if(sql.includes('readAt') && sql.includes('userId=?')) { let c=0; const typed=sql.includes('type=?'); rows.filter(x=>x.userId===args[1]&&(!typed || x.type===args[2])&&!x.readAt).forEach(x=>{x.readAt=args[0];c++;}); return {changes:c}; } return {changes:0}; }
  }; } };
}

test('notification event creation strips secret-like fields and bounds text',()=>{
  const e=n.createEvent('u1','A'.repeat(200),'B'.repeat(700),{type:'chat',token:'secret',threadId:'t1',ok:true});
  assert.equal(e.title.length,120); assert.equal(e.body.length,500); assert.deepEqual(e.data,{type:'chat',threadId:'t1',ok:true});
});

test('notification list is user scoped and unread count is correct',()=>{
  const db=fakeDb(); const items=n.list(db,'u1'); assert.equal(items.length,2); assert.equal(items[0].data.threadId,'t1'); assert.equal(n.unreadCount(db,'u1'),1);
});

test('mark read only changes the owning user notification',()=>{
  const db=fakeDb(); assert.equal(n.markRead(db,'u1','n1'),1); assert.equal(n.unreadCount(db,'u1'),0); assert.equal(n.markRead(db,'u2','n1'),0);
});

test('mark all read is user scoped',()=>{
  const db=fakeDb(); assert.equal(n.markAllRead(db,'u1'),1); assert.equal(n.unreadCount(db,'u1'),0);
});


test('notification category filtering and unread counts remain user scoped',()=>{
  const db=fakeDb(); const chat=n.list(db,'u1',{type:'chat'}); assert.equal(chat.length,1); assert.equal(chat[0].id,'n1'); assert.equal(n.unreadCount(db,'u1','chat'),1); assert.equal(n.unreadCount(db,'u1','money'),0);
});

test('invalid notification category falls back to all categories',()=>{
  const db=fakeDb(); assert.equal(n.list(db,'u1',{type:'not-a-real-type'}).length,2); assert.equal(n.unreadCount(db,'u1','not-a-real-type'),1);
});

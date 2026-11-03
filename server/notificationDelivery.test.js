const test = require('node:test');
const assert = require('node:assert/strict');
const delivery = require('./notificationDelivery');

function fakeDb() {
  const state = {
    events: [{ id:'e1', title:'Title', body:'Body', data:'{}' }],
    tokens: [{ token:'t1', userId:'u1' }],
    rows: []
  };
  return {
    state,
    prepare(sql) {
      return {
        run(...args) {
          if (sql.includes("status='sending'")) {
            const r=state.rows.find(x=>x.id===args[1]);
            if(!r || !['pending','retry'].includes(r.status)) return {changes:0};
            r.status='sending'; r.updatedAt=args[0]; return {changes:1};
          }
          if (sql.includes('INSERT OR IGNORE INTO notification_deliveries')) {
            const [id,eventId,token,status,attempts,nextAttemptAt,createdAt,updatedAt,lastError] = args;
            if (state.rows.some(r => r.eventId === eventId && r.token === token)) return { changes:0 };
            state.rows.push({ id,eventId,token,status,attempts,nextAttemptAt,createdAt,updatedAt,lastError,providerTicketId:null,receiptStatus:null,receiptAt:null,receiptCheckAt:null });
            return { changes:1 };
          }
          if (sql.includes("status='awaiting_receipt'") && sql.includes('providerTicketId=?')) {
            const r=state.rows.find(x=>x.id===args[3]);
            if (!r) return {changes:0};
            Object.assign(r,{status:'awaiting_receipt',attempts:r.attempts+1,nextAttemptAt:args[0],providerTicketId:args[1],lastError:null});
            return {changes:1};
          }
          if (sql.includes("status='delivered'")) {
            const r=state.rows.find(x=>x.id===args[2]);
            if (!r || r.status !== 'receipt_checking') return {changes:0};
            Object.assign(r,{status:'delivered',receiptStatus:'ok',receiptAt:args[0],receiptCheckAt:null,nextAttemptAt:null,lastError:null}); return {changes:1};
          }
          if (sql.includes("SET status='receipt_checking'")) {
            const r=state.rows.find(x=>x.id===args[2]);
            if (!r || r.status !== 'awaiting_receipt') return {changes:0};
            r.status='receipt_checking'; r.receiptCheckAt=args[0]; r.updatedAt=args[1]; return {changes:1};
          }
          if (sql.includes("status='dead'")) {
            const receipt = sql.includes('receiptStatus=?'); const idIndex = receipt ? 4 : 2; const errorIndex = receipt ? 3 : 1;
            const r=state.rows.find(x=>x.id===args[idIndex]); if (!r) return {changes:0};
            Object.assign(r,{status:'dead',attempts:r.attempts+1,nextAttemptAt:null,receiptCheckAt:null,lastError:args[errorIndex]}); state.tokens=state.tokens.filter(x=>x.token!==r.token); return {changes:1};
          }
          if (sql.includes('receiptStatus=?, receiptAt=?')) {
            const r=state.rows.find(x=>x.id===args[2]); if (!r || r.status !== 'retry') return {changes:0};
            r.receiptStatus=args[0]; r.receiptAt=args[1]; return {changes:1};
          }
          if (sql.includes("status='failed'") && sql.includes('receipt expired')) {
            const r=state.rows.find(x=>x.id===args[2]); Object.assign(r,{status:'failed',nextAttemptAt:null,receiptCheckAt:null,lastError:args[1]}); return {changes:1};
          }
          if (sql.includes("SET status='awaiting_receipt'") && sql.includes('receiptCheckAt < ?')) {
            const r=state.rows.find(x=>x.status==='receipt_checking');
            if (!r) return {changes:0}; Object.assign(r,{status:'awaiting_receipt',receiptCheckAt:null,updatedAt:args[0],nextAttemptAt:args[1],lastError:args[2]}); return {changes:1};
          }
          if (sql.includes('SET status=?')) { const r=state.rows.find(x=>x.id===args[5]); Object.assign(r,{status:args[0],attempts:args[1],nextAttemptAt:args[2],lastError:args[4]}); return {changes:1}; }
          if (sql.includes('DELETE FROM push_tokens')) { state.tokens=state.tokens.filter(x=>x.token!==args[0]); return {changes:1}; }
          if (sql.includes("status='awaiting_receipt', receiptCheckAt=NULL")) {
            const r=state.rows.find(x=>x.id===args[1]); if (!r || r.status!=='receipt_checking') return {changes:0}; r.status='awaiting_receipt'; r.receiptCheckAt=null; r.updatedAt=args[0]; return {changes:1};
          }
          return {changes:0};
        },
        get(...args) {
          if (sql.includes('SELECT id,userId,title,body,data FROM notification_events')) { const event = state.events.find(x=>x.id===args[0]); return event ? {...event, userId:'u1'} : null; }
          if (sql.includes('SELECT 1 FROM push_tokens WHERE token=? AND userId=?')) return state.tokens.some(x=>x.token===args[0] && x.userId===args[1]) ? {ok:1} : null;
          return null;
        },
        all(...args) {
          if (sql.includes("status='awaiting_receipt'")) return state.rows.filter(r => r.status==='awaiting_receipt' && r.nextAttemptAt <= args[0]).slice(0,args[2]);
          if (sql.includes('FROM notification_deliveries')) return state.rows.filter(r => ['pending','retry'].includes(r.status) && r.nextAttemptAt <= args[0]).slice(0,args[1]);
          return [];
        }
      };
    }
  };
}

const event = { id:'e1', title:'Title', body:'Body', data:{} };

test('enqueue is durable and deduplicates event/device pairs', () => {
  const d=fakeDb(); assert.equal(delivery.enqueue(d,event,['t1','t1']),1); assert.equal(delivery.enqueue(d,event,['t1']),0); assert.equal(d.state.rows.length,1);
});

test('successful delivery is marked delivered', async () => {
  const d=fakeDb(); const now=new Date('2026-09-26T00:00:00Z'); delivery.enqueue(d,event,['t1'],now);
  const out=await delivery.deliverDue(d,now,10,async()=>({ok:true,status:200,json:async()=>({data:[{status:'ok',id:'ticket-1'}]})}));
  assert.equal(out.awaitingReceipt,1); assert.equal(d.state.rows[0].status,'awaiting_receipt'); assert.equal(d.state.rows[0].providerTicketId,'ticket-1');
});

test('transient failures back off and become terminal after bounded attempts', async () => {
  const d=fakeDb(); let now=new Date('2026-09-26T00:00:00Z'); delivery.enqueue(d,event,['t1'],now);
  const fail=async()=>({ok:false,status:503,json:async()=>({data:[{status:'error',message:'busy'}]})});
  for(let i=0;i<delivery.MAX_ATTEMPTS;i++) { const row=d.state.rows[0]; await delivery.deliverOne(d,row,now,fail); if(row.status==='failed') break; now=new Date(row.nextAttemptAt); }
  assert.equal(d.state.rows[0].status,'failed'); assert.equal(d.state.rows[0].attempts,delivery.MAX_ATTEMPTS);
});

test('dead Expo tokens are pruned', async () => {
  const d=fakeDb(); const now=new Date('2026-09-26T00:00:00Z'); delivery.enqueue(d,event,['t1'],now);
  const out=await delivery.deliverDue(d,now,10,async()=>({ok:true,status:200,json:async()=>({data:[{status:'error',details:{error:'DeviceNotRegistered'}}]})}));
  assert.equal(out.dead,1); assert.equal(d.state.tokens.length,0); assert.equal(d.state.rows[0].status,'dead');
});


test('queued delivery is not sent after a push token is reassigned or unregistered', async () => {
  const d=fakeDb(); const now=new Date('2026-09-26T00:00:00Z'); delivery.enqueue(d,event,['t1'],now);
  d.state.tokens = [{ token:'t1', userId:'u2' }];
  let called = false;
  const out=await delivery.deliverDue(d,now,10,async()=>{ called=true; return {ok:true,status:200,json:async()=>({data:[{status:'ok'}]})}; });
  assert.equal(called,false); assert.equal(out.dead,1); assert.equal(d.state.rows[0].status,'dead');
});


test('provider ticket acceptance is not delivery confirmation', async () => {
  const d=fakeDb(); const now=new Date('2026-09-26T00:00:00Z'); delivery.enqueue(d,event,['t1'],now);
  const out=await delivery.deliverDue(d,now,10,async()=>({ok:true,status:200,json:async()=>({data:[{status:'ok',id:'ticket-1'}]})}));
  assert.equal(out.delivered,0); assert.equal(d.state.rows[0].status,'awaiting_receipt');
});

test('ok Expo receipt transitions an awaiting ticket to delivered', async () => {
  const d=fakeDb(); const now=new Date('2026-09-26T00:00:00Z'); d.state.rows.push({id:'d1',eventId:'e1',token:'t1',status:'awaiting_receipt',attempts:1,nextAttemptAt:now.toISOString(),createdAt:now.toISOString(),updatedAt:now.toISOString(),providerTicketId:'ticket-1'});
  const out=await delivery.processReceipts(d,now,10,async()=>({ok:true,status:200,json:async()=>({data:{'ticket-1':{status:'ok'}}})}));
  assert.equal(out.delivered,1); assert.equal(d.state.rows[0].status,'delivered');
});

test('DeviceNotRegistered receipt retires the token', async () => {
  const d=fakeDb(); const now=new Date('2026-09-26T00:00:00Z'); d.state.rows.push({id:'d1',eventId:'e1',token:'t1',status:'awaiting_receipt',attempts:1,nextAttemptAt:now.toISOString(),createdAt:now.toISOString(),updatedAt:now.toISOString(),providerTicketId:'ticket-1'});
  const out=await delivery.processReceipts(d,now,10,async()=>({ok:true,status:200,json:async()=>({data:{'ticket-1':{status:'error',details:{error:'DeviceNotRegistered'}}}})}));
  assert.equal(out.dead,1); assert.equal(d.state.tokens.length,0); assert.equal(d.state.rows[0].status,'dead');
});


test('receipt checks are atomically claimed before provider polling', async () => {
  const d=fakeDb(); const now=new Date('2026-09-26T00:00:00Z');
  d.state.rows.push({id:'d1',eventId:'e1',token:'t1',status:'awaiting_receipt',attempts:1,nextAttemptAt:now.toISOString(),createdAt:now.toISOString(),updatedAt:now.toISOString(),providerTicketId:'ticket-1',receiptCheckAt:null});
  const out=await delivery.processReceipts(d,now,10,async()=>({ok:true,status:200,json:async()=>({data:{'ticket-1':{status:'ok'}}})}));
  assert.equal(out.delivered,1); assert.equal(d.state.rows[0].status,'delivered');
});

test('stale receipt-check lease is recoverable', () => {
  const d=fakeDb(); const now=new Date('2026-09-26T06:00:00Z');
  d.state.rows.push({id:'d1',eventId:'e1',token:'t1',status:'receipt_checking',attempts:1,nextAttemptAt:now.toISOString(),createdAt:'2026-09-26T00:00:00Z',updatedAt:'2026-09-26T00:00:00Z',providerTicketId:'ticket-1',receiptCheckAt:'2026-09-26T00:00:00Z'});
  const out=delivery.recoverStaleReceiptChecks(d,now);
  assert.equal(out.recovered,1); assert.equal(d.state.rows[0].status,'awaiting_receipt');
});

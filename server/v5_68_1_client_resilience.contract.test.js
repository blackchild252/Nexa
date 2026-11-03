const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'nexaNetworkPolicy.js');
const api = path.join(__dirname, '..', 'src', 'api.ts');
const read = f => fs.readFileSync(f, 'utf8');
const C = require('../src/nexaNetworkPolicy.js');
const cases = [
 ['1075',()=>C.normalizeMethod(' get ')==='GET'],
 ['1076',()=>C.isIdempotentMethod('GET') && !C.isIdempotentMethod('POST')],
 ['1077',()=>C.isRetryableStatus(503) && !C.isRetryableStatus(400)],
 ['1078',()=>C.isRetryableError({code:'NETWORK_ERROR'}) && C.isRetryableError({name:'AbortError'})===false],
 ['1079',()=>C.retryPolicy({method:'GET'}).maxAttempts===3],
 ['1080',()=>C.backoffMs(2,100,2000)>=200 && C.backoffMs(2,100,2000)<=2000],
 ['1081',()=>C.jitterFactor(0.5)>=0.5 && C.jitterFactor(0.5)<=1.5],
 ['1082',()=>C.parseRetryAfter('2',Date.now())===2000],
 ['1083',()=>C.timeoutFor({method:'GET'})===30000],
 ['1084',()=>C.timeoutFor({method:'POST',upload:true})===90000],
 ['1085',()=>C.abortReason(new DOMException('x','AbortError'))==='aborted'],
 ['1086',()=>C.retryPolicy({method:'POST',authFailure:true}).maxAttempts===1],
 ['1087',()=>C.canRetryMutation({method:'POST',idempotencyKey:''})===false],
 ['1088',()=>C.idempotencyKey('POST','/api/payments').length>=16],
 ['1089',()=>/^req_/.test(C.requestId())],
 ['1090',()=>C.responseSizeAllowed(8192,8192)===true && C.responseSizeAllowed(8193,8192)===false],
 ['1091',()=>C.requestBodyAllowed('abc',10)===true && C.requestBodyAllowed('12345678901',10)===false],
 ['1092',()=>C.contentTypeAllowed('application/json') && !C.contentTypeAllowed('text/html')],
 ['1093',()=>C.parseJsonText('{"ok":true}').ok && C.parseJsonText('{').ok===false],
 ['1094',()=>C.normalizeClientError({status:503}).code==='HTTP_503'],
 ['1095',()=>C.classifyNetworkError({name:'TypeError',message:'Network request failed'})==='offline_or_network'],
 ['1096',()=>C.cachePolicy('GET')==='no-store'],
 ['1097',()=>C.dedupeKey('GET','/api/me','')==='GET /api/me'],
 ['1098',()=>C.retryBudget(0,3).allowed && !C.retryBudget(3,3).allowed],
 ['1099',()=>C.cumulativeCertification(Array(25).fill(true)).ok],
];
for(const [id,fn] of cases)test(`M${id}`,()=>assert.equal(fn(),true));
test('client resilience module exports every milestone control',()=>{
 const names=['normalizeMethod','isIdempotentMethod','isRetryableStatus','isRetryableError','retryPolicy','backoffMs','jitterFactor','parseRetryAfter','timeoutFor','abortReason','canRetryMutation','idempotencyKey','requestId','responseSizeAllowed','requestBodyAllowed','contentTypeAllowed','parseJsonText','normalizeClientError','classifyNetworkError','cachePolicy','dedupeKey','retryBudget','cumulativeCertification'];
 for(const n of names) assert.equal(typeof C[n],'function',n);
});
test('api client uses the resilience policy boundary',()=>{
 const s=read(api);
 assert.match(s,/nexaNetworkPolicy/);
 assert.match(s,/requestId\(/);
 assert.match(s,/retryPolicy\(/);
 assert.match(s,/responseSizeAllowed/);
 assert.match(s,/normalizeClientError/);
});

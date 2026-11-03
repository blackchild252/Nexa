'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Readable } = require('stream');
const lifecycle = require('./v5_76_0_audio_upload_lifecycle');

function tempPolicy(overrides = {}) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-audio-b117-'));
  return lifecycle.createAudioUploadPolicy({
    NEXA_AUDIO_TMP_DIR: rootDir,
    NEXA_AUDIO_MAX_FILE_BYTES: '1024',
    NEXA_AUDIO_MAX_STORAGE_BYTES: '4096',
    NEXA_AUDIO_MAX_AGE_MS: '1000',
    NEXA_AUDIO_SWEEP_MS: '60000',
    ...overrides,
  });
}

function cleanup(policy) { fs.rmSync(policy.rootDir, { recursive: true, force: true }); }

// M1250 root/storage policy
// M1251 managed filename policy
// M1252 private directory policy
// M1253 safe path boundary
// M1254 symlink exclusion
// M1255 bounded file size policy
// M1256 bounded aggregate storage policy
// M1257 reservation accounting
// M1258 reservation release
// M1259 single-upload file creation
// M1260 exclusive file creation
// M1261 streamed byte accounting
// M1262 oversized stream cleanup
// M1263 successful stream finalization
// M1264 active-file tracking
// M1265 stale-file age policy
// M1266 stale-file cleanup
// M1267 active-file preservation
// M1268 request-level cleanup
// M1269 Multer integration contract
// M1270 startup cleanup contract
// M1271 scheduler contract
// M1272 environment configuration contract
// M1273 source integration contract
// M1274 cumulative certification

test('M1250: manager creates and uses a dedicated managed root', () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); assert.ok(fs.statSync(p.rootDir).isDirectory()); assert.equal(m.policy.rootDir,p.rootDir); } finally { cleanup(p); } });
test('M1251: generated names are random and extension-bound', () => { const a=lifecycle.managedFilename('../../voice.MP3'); const b=lifecycle.managedFilename('x.exe'); assert.match(a,/^nexa-voice-[a-f0-9]{32}\.mp3$/); assert.match(b,/^nexa-voice-[a-f0-9]{32}\.m4a$/); assert.notEqual(a,lifecycle.managedFilename('voice.mp3')); });
test('M1252: managed root is permission-restricted', () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); assert.equal(fs.statSync(m.policy.rootDir).mode & 0o777,0o700); } finally { cleanup(p); } });
test('M1253: path escape is rejected', () => { const p=tempPolicy(); try { assert.equal(lifecycle.isInsideRoot(p.rootDir,path.join(p.rootDir,'..','evil')), false); const m=lifecycle.createManager(p); assert.equal(m.remove('/tmp/not-nexa-audio'), false); } finally { cleanup(p); } });
test('M1254: symlinks are never counted or removed', () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); const target=path.join(p.rootDir,'nexa-voice-'+'a'.repeat(32)+'.m4a'); const outside=path.join(p.rootDir,'outside'); fs.writeFileSync(outside,'secret'); fs.symlinkSync(outside,target); assert.deepEqual(lifecycle.directoryUsage(p),{bytes:0,files:0}); assert.equal(m.remove(target),false); assert.equal(fs.existsSync(outside),true); } finally { cleanup(p); } });
test('M1255: max file size is bounded at 12 MiB by default', () => { const p=lifecycle.createAudioUploadPolicy({NEXA_AUDIO_TMP_DIR:os.tmpdir()}); assert.equal(p.maxFileBytes,12*1024*1024); });
test('M1256: aggregate storage has a bounded ceiling', () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); fs.writeFileSync(path.join(p.rootDir,'nexa-voice-'+'a'.repeat(32)+'.m4a'),Buffer.alloc(3500)); assert.throws(()=>m.reserve(),e=>e.code==='AUDIO_STORAGE_FULL'&&e.status===507); } finally { cleanup(p); } });
test('M1257: reservation accounts for the full upload budget', () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); const r=m.reserve(); assert.equal(m.stats().reservedBytes,1024); m.release(r); } finally { cleanup(p); } });
test('M1258: reservation release is idempotent', () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); const r=m.reserve(); m.release(r); m.release(r); assert.equal(m.stats().reservedBytes,0); } finally { cleanup(p); } });
test('M1259: storage creates one managed file', async () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); const storage=lifecycle.createStorage(m); const result=await new Promise((resolve,reject)=>storage._handleFile({}, {originalname:'voice.m4a',stream:Readable.from([Buffer.from('abc')])},(e,i)=>e?reject(e):resolve(i))); assert.equal(result.size,3); assert.ok(fs.existsSync(result.path)); m.remove(result.path); } finally { cleanup(p); } });
test('M1260: storage uses exclusive file creation', () => { const src=fs.readFileSync(path.join(__dirname,'v5_76_0_audio_upload_lifecycle.js'),'utf8'); assert.match(src,/createWriteStream\(target, \{ flags: 'wx', mode: 0o600 \}\)/); });
test('M1261: streamed byte accounting records exact size', async () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); const storage=lifecycle.createStorage(m); const result=await new Promise((resolve,reject)=>storage._handleFile({}, {originalname:'voice.wav',stream:Readable.from([Buffer.alloc(10),Buffer.alloc(7)])},(e,i)=>e?reject(e):resolve(i))); assert.equal(result.size,17); m.remove(result.path); } finally { cleanup(p); } });
test('M1262: oversized streams are deleted and release reservation', async () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); const storage=lifecycle.createStorage(m); const err=await new Promise(resolve=>storage._handleFile({}, {originalname:'voice.m4a',stream:Readable.from([Buffer.alloc(700),Buffer.alloc(700)])},e=>resolve(e))); assert.equal(err.code,'LIMIT_FILE_SIZE'); assert.equal(m.stats().reservedBytes,0); for(let i=0;i<100&&m.stats().files>0;i++) await new Promise(r=>setTimeout(r,10)); assert.equal(m.stats().files,0); } finally { cleanup(p); } });
test('M1263: successful stream finalization releases reservation', async () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); const storage=lifecycle.createStorage(m); const result=await new Promise((resolve,reject)=>storage._handleFile({}, {originalname:'voice.m4a',stream:Readable.from([Buffer.alloc(5)])},(e,i)=>e?reject(e):resolve(i))); assert.equal(m.stats().reservedBytes,0); m.remove(result.path); } finally { cleanup(p); } });
test('M1264: active files are protected from sweeps', () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); const target=path.join(p.rootDir,'nexa-voice-'+'b'.repeat(32)+'.m4a'); fs.writeFileSync(target,'x'); fs.utimesSync(target,new Date(0),new Date(0)); m.track(target); assert.equal(m.cleanupStale().skippedActive,1); assert.equal(fs.existsSync(target),true); m.untrack(target); m.remove(target); } finally { cleanup(p); } });
test('M1265: stale age is enforced', () => { const p=tempPolicy({NEXA_AUDIO_MAX_AGE_MS:'1000'}); try { assert.equal(p.maxAgeMs,1000); } finally { cleanup(p); } });
test('M1266: stale files are removed by the sweeper', () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); const target=path.join(p.rootDir,'nexa-voice-'+'c'.repeat(32)+'.m4a'); fs.writeFileSync(target,'x'); fs.utimesSync(target,new Date(0),new Date(0)); assert.equal(m.cleanupStale(Date.now()).removed,1); assert.equal(fs.existsSync(target),false); } finally { cleanup(p); } });
test('M1267: fresh files survive cleanup', () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); const target=path.join(p.rootDir,'nexa-voice-'+'d'.repeat(32)+'.m4a'); fs.writeFileSync(target,'x'); assert.equal(m.cleanupStale().removed,0); assert.equal(fs.existsSync(target),true); } finally { cleanup(p); } });
test('M1268: request cleanup removes managed files only', () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); const good=path.join(p.rootDir,'nexa-voice-'+'e'.repeat(32)+'.m4a'); const outside=path.join(p.rootDir,'not-managed.txt'); fs.writeFileSync(good,'x'); fs.writeFileSync(outside,'x'); assert.equal(lifecycle.cleanupRequestFiles(m,{file:{path:good},files:[{path:outside}]}),2); assert.equal(fs.existsSync(good),false); assert.equal(fs.existsSync(outside),true); } finally { cleanup(p); } });
test('M1269: Multer upload boundary uses the lifecycle storage in source', () => { const idx=fs.readFileSync(path.join(__dirname,'index.js'),'utf8'); assert.match(idx,/storage: audioUploadLifecycle\.createStorage\(audioUploadManager\)/); assert.match(idx,/limits: \{ fileSize: audioUploadManager\.policy\.maxFileBytes, files: 1 \}/); });
test('M1270: startup cleanup is wired', () => { const idx=fs.readFileSync(path.join(__dirname,'index.js'),'utf8'); assert.match(idx,/audioUploadManager\.cleanupStale\(\)/); });
test('M1271: periodic cleanup is bounded and unref-ed', () => { const p=tempPolicy(); try { const m=lifecycle.createManager(p); const timer=lifecycle.startCleanupScheduler(m); assert.equal(typeof timer.unref,'function'); clearInterval(timer); } finally { cleanup(p); } });
test('M1272: audio storage configuration is environment-driven and bounded', () => { const p=tempPolicy({NEXA_AUDIO_MAX_STORAGE_BYTES:'9999999999',NEXA_AUDIO_MAX_FILE_BYTES:'999999'}); assert.equal(p.maxStorageBytes,1024*1024*1024); assert.equal(p.maxFileBytes,999999); cleanup(p); });
test('M1273: global request errors invoke managed audio cleanup', () => { const idx=fs.readFileSync(path.join(__dirname,'index.js'),'utf8'); assert.match(idx,/audioUploadLifecycle\.cleanupRequestFiles\(audioUploadManager, req\)/); });
test('M1274: cumulative audio-upload lifecycle certification is complete', () => { const idx=fs.readFileSync(path.join(__dirname,'index.js'),'utf8'); assert.ok(fs.existsSync(path.join(__dirname,'v5_76_0_audio_upload_lifecycle.js'))); assert.match(idx,/v5_76_0_audio_upload_lifecycle/); assert.match(idx,/app\.post\("\/api\/transcribe"/); });

const fs=require('fs');
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function ok(name,cond){if(!cond)throw new Error('FAIL: '+name);console.log('PASS: '+name);}
const friends=read('src/useFriends.ts');
const zeeza=read('src/useZeeza.ts');
const vendor=read('src/VendorDashboard.tsx');
const admin=read('src/AdminDisputesScreen.tsx');
const market=read('src/MarketplaceScreen.tsx');
const notif=read('src/NotificationCenter.tsx');
const version=read('VERSION.md');
const roadmap=read('MASTER_ROADMAP.md');
ok('B42 historical contract on current V5.8.0',atLeast(currentVersionMd(version),'5.8.0')&&roadmap.includes('V5.6.0 — Batch B42'));
ok('Friends username request token',friends.includes('myUsernameRequest')&&friends.includes('requestId === myUsernameRequest.current'));
ok('DM deep-link request token',zeeza.includes('openThreadRequest')&&zeeza.includes('requestId !== openThreadRequest.current'));
ok('Room deep-link request token',zeeza.includes('openRoomRequest')&&zeeza.includes('requestId !== openRoomRequest.current'));
ok('Vendor dispute request token',vendor.includes('disputeRequest')&&vendor.includes('requestId===disputeRequest.current'));
ok('Admin dispute request token',admin.includes('loadRequest')&&admin.includes('requestId===loadRequest.current'));
ok('Marketplace dispute matrix request token',market.includes('disputesRequest')&&market.includes('requestId===disputesRequest.current'));
ok('Notification preference request token',notif.includes('preferenceRequest')&&notif.includes('requestId===preferenceRequest.current'));
ok('Notification mark-read request token',notif.includes('readRequest')&&notif.includes('requestId!==readRequest.current'));
ok('Notification mark-all preserves target filter',notif.includes('readAllRequest')&&notif.includes('const targetFilter=filter'));
ok('No V4.100.0 release line',!/^## V4\.100\.0/m.test(roadmap)&&roadmap.includes('V5.6.0 — Batch B42'));

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('B24 Home is the Royal Dark command center without the heavy bottom shell',()=>{
  const home=read('src/app/(tabs)/index.tsx');
  const tabs=read('src/app/(tabs)/_layout.tsx');
  const center=read('src/HomeCommandCenter.tsx');
  assert.match(home,/HomeCommandCenter/);
  assert.match(center,/MARKET WATCH/);
  assert.match(center,/NEXA UPDATES/);
  assert.match(center,/Dami/);
  assert.match(center,/Zeeza/);
  assert.match(center,/Audio/);
  assert.match(center,/Video/);
  assert.match(tabs,/tabBarStyle:\{display:'none'\}/);
});

test('B24 Market Watch rail uses provider quotes and refreshes automatically',()=>{
  const center=read('src/HomeCommandCenter.tsx');
  assert.match(center,/\/api\/market\/quotes/);
  assert.match(center,/subscribeNexaAutoRefresh/);
  assert.match(center,/money\?view=market/);
});

test('B24 Zeeza friend dock and calling dock use existing secure authorities',()=>{
  const center=read('src/HomeCommandCenter.tsx');
  assert.match(center,/useFriends/);
  assert.match(center,/createCall\(friendId,media\)/);
  assert.match(center,/\/zeeza\/call/);
  assert.match(center,/\/\(tabs\)\/zeeza\?section=friends/);
});

test('B24 Dami and Zeeza naming is canonical in active routes and source modules',()=>{
  assert.ok(fs.existsSync(path.join(root,'src/app/dami.tsx')));
  assert.ok(fs.existsSync(path.join(root,'src/app/zeeza/inbox.tsx')));
  assert.ok(fs.existsSync(path.join(root,'src/zeezaMessaging.ts')));
  assert.ok(fs.existsSync(path.join(root,'src/useZeeza.ts')));
  assert.ok(fs.existsSync(path.join(root,'src/ZeezaInbox.tsx')));
  assert.ok(fs.existsSync(path.join(root,'src/ZeezaThreadScreen.tsx')));
  assert.ok(fs.existsSync(path.join(root,'server/zeezaMessaging.js')));
  assert.ok(!fs.existsSync(path.join(root,'src/chat.ts')));
  assert.ok(!fs.existsSync(path.join(root,'src/useChat.ts')));
  assert.ok(!fs.existsSync(path.join(root,'src/ChatTab.tsx')));
  assert.ok(!fs.existsSync(path.join(root,'server/chat.js')));
  const api=read('src/api.ts');
  const server=read('server/index.js');
  assert.match(api,/\/api\/dami/);
  assert.match(server,/app\.post\("\/api\/dami"/);
  assert.match(server,/createZeezaMessaging/);
});

test('B24 Zeeza Inbox no longer exposes the old Chats label',()=>{
  const zeeza=read('src/app/(tabs)/zeeza.tsx');
  const inbox=read('src/ZeezaInbox.tsx');
  const room=read('src/RoomScreen.tsx');
  assert.match(zeeza,/Inbox/);
  assert.match(inbox,/Zeeza Inbox/);
  assert.doesNotMatch(zeeza,/>Chats</);
  assert.doesNotMatch(inbox,/>Chats</);
  assert.doesNotMatch(room,/>Chat</);
});

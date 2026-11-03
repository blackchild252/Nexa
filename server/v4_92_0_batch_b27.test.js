const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');


test('B27 Home has no destination tile/grid surface',()=>{
  const home=read('src/HomeCommandCenter.tsx');
  for(const retired of ['Quick Access','Sky Money','Dream Marketplace','Ball House','Game House','Fitness']) assert.doesNotMatch(home,new RegExp(retired));
  assert.match(home,/MARKET WATCH/);
  assert.match(home,/NEXA UPDATES/);
  assert.match(home,/function DamiCore/);
});

test('B27 calls expose audio/video choice only inside the call sheet',()=>{
  const home=read('src/HomeCommandCenter.tsx');
  assert.match(home,/startCall\(friend\.id,'audio'\)/);
  assert.match(home,/startCall\(friend\.id,'video'\)/);
  assert.match(home,/Audio · Video/);
  assert.doesNotMatch(home,/setMedia/);
});

test('B27 Royal Dark Home design references are versioned and packaged',()=>{
  assert.ok(fs.existsSync(path.join(root,'assets/design/NEXA_HOME_DESIGN_V1_2_3D_REFERENCE.png')));
  assert.ok(fs.existsSync(path.join(root,'assets/design/NEXA_HOME_DESIGN_V1_2_ROOT_CANONICAL.md')));
  assert.ok(fs.existsSync(path.join(root,'assets/design/NEXA_ROYAL_DARK_VISUAL_REFERENCE.md')));
  const doc=read('assets/design/NEXA_HOME_DESIGN_V1_2_ROOT_CANONICAL.md');
  assert.match(doc,/Version 1\.2/);
  assert.match(doc,/Royal Gold Dark/);
  assert.match(doc,/Dami/);
  assert.match(doc,/Zeeza/);
});

test('B27 naming remains Dami AI, Zeeza people/social and Inbox messaging',()=>{
  const contract=read('src/homeDesign.ts');
  assert.match(contract,/ai: 'Dami'/);
  assert.match(contract,/people: 'Zeeza'/);
  assert.match(contract,/messages: 'Inbox'/);
});

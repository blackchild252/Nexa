const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('B25 Home removes destination feature blocks from the main surface',()=>{
  const center=read('src/HomeCommandCenter.tsx');
  assert.match(center,/MARKET WATCH/); // top rail remains intentionally
  assert.match(center,/NEXA UPDATES/);
  assert.doesNotMatch(center,/Quick Access/);
  assert.doesNotMatch(center,/Dream Marketplace.*Sky Money/);
  assert.doesNotMatch(center,/Market Watch.*Sky Money.*Dream Marketplace/);
  assert.match(center,/DIRECTORY/);
});

test('B25 Home keeps the Dami centerpiece and current user/vendor action dock',()=>{
  const center=read('src/HomeCommandCenter.tsx');
  assert.match(center,/bottomDock/);
  assert.match(center,/function DamiCore/);
  assert.match(center,/style=\{styles\.damiButton\}/);
  for(const label of ['Open Zeeza friends','Open Yaayz','Open Zeeza calling','Open Business Hub']) assert.match(center,new RegExp(label));
  assert.doesNotMatch(center,/bottomDami/);
  assert.doesNotMatch(center,/mediaSwitch/);
});;

test('B25 Home directory is collapsible and contains destination sections',()=>{
  const center=read('src/HomeCommandCenter.tsx');
  const contract=read('src/homeDesign.ts');
  assert.match(center,/directoryOpen/);
  assert.match(center,/setDirectoryOpen\(true\)/);
  for(const label of ['Dami','Zeeza','Sky Money','Dream Marketplace','Yaayz','L.A.','Ball House','Kitchen','Game House','Fitness','Notifications','Search','Profile','Extensions','Developer Console']) assert.match(contract,new RegExp(label));
  assert.match(center,/Close Menu/);
});

test('B25 preserves Royal Dark motion architecture',()=>{
  const center=read('src/HomeCommandCenter.tsx');
  assert.match(center,/useMotion/);
  assert.match(center,/Animated\.loop/);
  assert.match(center,/Easing/);
  assert.match(center,/theme\.colors\.brightGold/);
  assert.match(center,/theme\.colors\.royalGold/);
});

test('B25 permanent Home V1 reference is packaged',()=>{
  assert.ok(fs.existsSync(path.join(root,'assets/design/NEXA_HOME_DESIGN_V1.md')));
  assert.ok(fs.existsSync(path.join(root,'assets/design/NEXA_HOME_DESIGN_V1_APPROVED_REFERENCE.png')));
  const doc=read('assets/design/NEXA_HOME_DESIGN_V1.md');
  assert.match(doc,/CANONICAL \/ APPROVED/);
  assert.match(doc,/Zeeza Friends \(left\), Dami \(center\), Calls Audio\/Video \(right\)/);
});

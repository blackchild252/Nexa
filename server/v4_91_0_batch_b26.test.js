const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('B26 Home retains contextual rails, Dami centerpiece, and the current action dock',()=>{
  const center=read('src/HomeCommandCenter.tsx');
  assert.match(center,/MARKET WATCH/);
  assert.match(center,/NEXA UPDATES/);
  assert.match(center,/damiButton/);
  assert.match(center,/bottomDock/);
  for(const label of ['Open Zeeza friends','Open Yaayz','Open Zeeza calling','Open Business Hub']) assert.match(center,new RegExp(label));
  assert.doesNotMatch(center,/Quick Access/);
  assert.doesNotMatch(center,/bottomDami/);
  assert.doesNotMatch(center,/mediaSwitch/);
  assert.doesNotMatch(center,/mediaChoice/);
});;

test('B26 Dami is the single visual AI centerpiece, not a third bottom button',()=>{
  const center=read('src/HomeCommandCenter.tsx');
  assert.match(center,/function DamiCore/);
  assert.match(center,/style=\{styles\.damiButton\}/);
  assert.match(center,/router\.push\('\/dami'/);
  assert.match(center,/HOME_DESIGN/);
  assert.doesNotMatch(center,/bottomDockSpacer/);
  assert.doesNotMatch(center,/style=\{styles\.bottomDami\}/);
});

test('B26 Home action dock retains Zeeza, Yaayz, Calls and Vendor destinations',()=>{
  const center=read('src/HomeCommandCenter.tsx');
  assert.match(center,/bottomDock/);
  for(const label of ['Open Zeeza friends','Open Yaayz','Open Zeeza calling','Open Business Hub']) assert.match(center,new RegExp(label));
});;

test('B26 sidebar remains the sole destination directory',()=>{
  const center=read('src/HomeCommandCenter.tsx');
  const contract=read('src/homeDesign.ts');
  assert.match(center,/DIRECTORY/);
  assert.match(center,/setDirectoryOpen\(true\)/);
  for(const label of ['Dami','Zeeza','Sky Money','Dream Marketplace','Yaayz','L.A.','Ball House','Kitchen','Game House','Fitness','Notifications','Search','Profile','Extensions','Developer Console']) assert.match(contract,new RegExp(label));
  assert.match(center,/Close Menu/);
});

test('B26 preserves the Royal Dark animation architecture',()=>{
  const center=read('src/HomeCommandCenter.tsx');
  assert.match(center,/useMotion/);
  assert.match(center,/Animated\.loop/);
  assert.match(center,/Easing/);
  assert.match(center,/theme\.colors\.brightGold/);
  assert.match(center,/theme\.colors\.royalGold/);
});

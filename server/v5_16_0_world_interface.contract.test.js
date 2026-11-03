const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

test('B52-01 world registry exists', () => assert.ok(exists('src/nexaWorlds.ts')));
test('B52-02 shared world background exists', () => assert.ok(exists('src/NexaWorldBackground.tsx')));
test('B52-03 Dami world is wired', () => assert.match(read('src/app/dami.tsx'), /world="dami"/));
test('B52-04 Sky Money world is wired', () => assert.match(read('src/app/(tabs)/money.tsx'), /world="sky-money"/));
test('B52-05 Marketplace world is wired', () => assert.match(read('src/app/(tabs)/marketplace.tsx'), /world="dream-marketplace"/));
test('B52-06 Zeeza world is wired', () => assert.match(read('src/app/(tabs)/zeeza.tsx'), /world="zeeza"/));
test('B52-07 leisure worlds are wired', () => {
  for (const [file, world] of [
    ['src/app/leisure/kitchen/index.tsx', 'kitchen'],
    ['src/app/leisure/ball-house/index.tsx', 'ball-house'],
    ['src/app/leisure/fitness/index.tsx', 'fitness'],
    ['src/app/leisure/game-house/index.tsx', 'game-house'],
  ]) assert.match(read(file), new RegExp(`world="${world}"`));
});
test('B52-08 local world assets exist', () => {
  for (const file of ['dami_world.jpg','sky_money_world.jpg','dream_marketplace_world.jpg','kitchen_world.jpg','ball_house_world.jpg','fitness_world.jpg','game_house_world.jpg','zeeza_world.jpg']) assert.ok(exists(`assets/worlds/${file}`));
});
test('B52-09 laptop audit handoff exists', () => assert.ok(exists('docs/design/NEXA_INTERFACE_AUDIT_LAPTOP_STAGED.md')));
test('B52-10 version is synchronized', () => {
  const current = JSON.parse(read('package.json')).version; assert.match(read('VERSION.md'), new RegExp('V'+current.replace(/\./g,'\\.')));
  assert.match(read('VERSION.md'), /B\d+/);
  assert.match(read('MASTER_ROADMAP.md'), /(?:CURRENT ACTIVE|COMPLETED) MAIN BLOCK — M\d+–M\d+/);
});

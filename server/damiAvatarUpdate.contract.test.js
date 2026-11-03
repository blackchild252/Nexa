const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('Dami avatar replaces robot component and is selectable from the homepage', () => {
  const robot = read('src/NexaDamiRobot.tsx');
  const home = read('src/HomeCommandCenter.tsx');
  assert.match(robot, /AvatarStage/);
  assert.match(robot, /useAvatar/);
  assert.match(home, /NexaAvatarStudio/);
  assert.match(home, /Customize your Dami avatar/);
});

test('avatar studio exposes requested customization, scenes, language ordering, and tiered poses', () => {
  const catalogue = read('src/nexaAvatar.ts');
  const studio = read('src/NexaAvatarStudio.tsx');
  for (const key of ['HAIR', 'GLASSES', 'MUSTACHES', 'TOPS', 'BOTTOMS', 'SHOES', 'BAGS', 'SCENES', 'LANGUAGES', 'POSES']) assert.match(catalogue, new RegExp(`export const ${key}|export const ${key}:`));
  for (const key of ['ttlVoice', 'ttlPose', 'ttlFace', 'ttlHair', 'ttlGlasses', 'ttlMustache', 'ttlBottom', 'ttlShoes', 'ttlBag', 'ttlBackground']) assert.ok(studio.includes(`'${key}'`) && catalogue.includes(`${key}:`), `missing studio control: ${key}`);
  for (const label of ['Avatar & voice', 'Pose', 'Face', 'Hair', 'Glasses', 'Mustache', 'Trouser / skirt', 'Shoes', 'Bag', 'Background']) assert.ok(catalogue.includes(`'${label}'`), `missing English title: ${label}`);
  assert.ok(catalogue.indexOf("label: 'Yorùbá'") < catalogue.indexOf("label: 'English'"), 'local languages should precede universal languages');
  assert.match(catalogue, /label: 'Standing', min: 'free'/);
  assert.match(catalogue, /label: 'Moving', min: 'regular'/);
  assert.match(catalogue, /label: 'Computer', min: 'premium'/);
  assert.match(catalogue, /label: 'Lying on couch', min: 'vip'/);
});

test('owner preview unlocks full tier capabilities only in development', () => {
  const catalogue = read('src/nexaAvatar.ts');
  const motion = read('src/motion.tsx');
  assert.match(catalogue, /AVATAR_UNLOCK_ALL_PREVIEW = typeof __DEV__ !== 'undefined' && __DEV__/);
  assert.match(motion, /raw \?\? 'vip'/);
  assert.match(motion, /v === 'off' \|\| v === 'none' \|\| v === 'false'/);
});

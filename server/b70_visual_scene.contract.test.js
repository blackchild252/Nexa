const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const worlds = ['home','dami','sky-money','dream-marketplace','kitchen','ball-house','fitness','game-house','leisure','zeeza','yaayz','notifications','search','profile','extensions','developer','subscription','auth','staff','disputes'];

test('B70: every NEXA world has an explicit visual scene contract', () => {
  const source = fs.readFileSync(path.join(root, 'src/nexaSceneContract.ts'), 'utf8');
  for (const world of worlds) assert.match(source, new RegExp(`(?:^|\\n)\\s*(?:'${world}'|${world.replace('-', '\\-')})\\s*:`), world);
  assert.match(source, /environment: 'cosmos' \| 'artwork' \| 'native'/);
  assert.match(source, /depth: 'rings' \| 'atmosphere' \| 'quiet-orb'/);
});

test('B70: quiet worlds receive the shared cinematic accent without route ownership', () => {
  const source = fs.readFileSync(path.join(root, 'src/NexaWorldBackground.tsx'), 'utf8');
  assert.match(source, /NexaSceneAccent/);
  assert.match(source, /sceneContract\.depth === 'quiet-orb'/);
  assert.doesNotMatch(source, /router\.(push|replace)\(/);
});

test('B70: scene accent remains decorative and responsive', () => {
  const source = fs.readFileSync(path.join(root, 'src/NexaSceneAccent.tsx'), 'utf8');
  assert.match(source, /pointerEvents="none"/);
  assert.match(source, /useWindowDimensions/);
  assert.match(source, /allows\('world-ambient'\)/);
  assert.match(source, /NexaGlossyOrb/);
});

test('B70: reduced-motion/static capability cannot force ambient animation', () => {
  const source = fs.readFileSync(path.join(root, 'src/NexaSceneAccent.tsx'), 'utf8');
  assert.match(source, /if \(!animated\)/);
  assert.match(source, /allows\('world-ambient'\)/);
  assert.match(source, /if \(!animated\)/);
});

test('B70: existing visual layer order remains environment -> accent -> depth -> readability -> content', () => {
  const source = fs.readFileSync(path.join(root, 'src/NexaWorldBackground.tsx'), 'utf8');
  const accent = source.indexOf('NexaSceneAccent');
  const depth = source.indexOf('<NexaDepthLayer');
  const readability = source.indexOf('{showReadability ?');
  const content = source.indexOf('<View style={styles.content}>');
  assert.ok(accent > 0 && depth > accent && readability > depth && content > readability);
});

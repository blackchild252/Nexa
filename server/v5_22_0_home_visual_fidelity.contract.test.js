import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('B58 M136 Home visual contract: cinematic background is a real bundled asset and Home remains the command center', () => {
  const design = read('src/homeDesign.ts');
  const background = path.join(root, 'assets/design/NEXA_HOME_CINEMATIC_BACKGROUND_V1.png');
  const designDoc = path.join(root, 'assets/design/NEXA_HOME_DESIGN_V1_3_CINEMATIC.md');
  const world = read('src/NexaWorldBackground.tsx');
  const home = read('src/HomeCommandCenter.tsx');

  assert.equal(fs.existsSync(background), true, 'Home cinematic background asset must exist');
  assert.equal(fs.existsSync(designDoc), true, 'Home V1.3 design contract must exist');
  assert.match(design, /HOME_DESIGN_VERSION\s*=\s*'1\.3'/);
  assert.match(design, /HOME_DESIGN_RELEASE\s*=\s*'\d+\.\d+\.\d+'/); // exact value is enforced by scripts/release-identity.mjs
  assert.match(design, /environment:\s*'home-cinematic-v1'/);
  assert.match(design, /NEXA_HOME_CINEMATIC_BACKGROUND_V1\.png/);
  assert.match(world, /HOME_CINEMATIC_BACKGROUND/);
  assert.match(world, /world === 'home' \? <Image source=\{HOME_CINEMATIC_BACKGROUND\}/);
  assert.match(world, /!light && cosmos && world === 'dami'/);
  assert.doesNotMatch(world, /!light && cosmos \? <NexaCosmos/);
  assert.match(world, /world === 'home' \? <NexaDarkHome \/> : null/);
  assert.match(home, /<Rail title="MARKET WATCH"/);
  assert.match(home, /<Rail title="NEXA UPDATES"/);
  assert.match(home, /<DamiCore onOpen=/);
  assert.match(home, /tone="red"/);
  assert.match(home, /tone="blue"/);
  assert.match(home, /<Directory open=/);
});

test('B58 M136 Home visual contract: new environment is decorative and does not replace motion/accessibility authority', () => {
  const world = read('src/NexaWorldBackground.tsx');
  const darkHome = read('src/NexaDarkHome.tsx');
  assert.match(world, /accessible=\{false\}/);
  assert.match(world, /styles\.homeCinematicImage/);
  assert.match(darkHome, /pointerEvents="none"/);
  assert.match(darkHome, /allows\('world-ambient'\)/);
  assert.match(darkHome, /if \(!animated\)/);
});

test('B58 M136 release metadata remains synchronized with the current release', () => {
  const packageJson = JSON.parse(read('package.json'));
  const current = packageJson.version;
  const serverPackage = JSON.parse(read('server/package.json'));
  const appJson = JSON.parse(read('app.json'));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(packageJson.version, current);
  assert.equal(serverPackage.version, current);
  assert.equal(appJson.version, current);
  assert.equal(appJson.expo.version, current);
  assert.equal(appJson.expo.ios.bundleIdentifier, 'com.aami.nexa');
  assert.equal(appJson.expo.android.package, 'com.aami.nexa');
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.version, current);
  assert.equal(lock.packages[''].version, current);
});

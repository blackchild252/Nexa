import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('B58 M306 module scenes add world-specific atmosphere without replacing module authorities', () => {
  const world = read('src/NexaWorldBackground.tsx');
  const atmosphere = read('src/NexaModuleAtmosphere.tsx');
  assert.match(world, /isAtmosphereWorld\(world\)/);
  assert.match(world, /<NexaModuleAtmosphere world=\{world\}/);
  assert.match(atmosphere, /pointerEvents="none"/);
  assert.match(atmosphere, /accessible=\{false\}/);
  assert.match(atmosphere, /allows\('world-ambient'\)/);
  assert.match(atmosphere, /mode === 'dark'/);
  assert.match(atmosphere, /'sky-money'/);
  assert.match(atmosphere, /'dream-marketplace'/);
  assert.match(atmosphere, /'ball-house'/);
  assert.match(atmosphere, /'game-house'/);
  assert.match(atmosphere, /zeeza/);
  assert.match(atmosphere, /yaayz/);
});

test('B58 M306 module atmosphere remains decorative and motion-safe', () => {
  const atmosphere = read('src/NexaModuleAtmosphere.tsx');
  assert.match(atmosphere, /if \(!motion\)/);
  assert.match(atmosphere, /setValue\(0\)/);
  assert.doesNotMatch(atmosphere, /router\.|authedFetch|onPress/);
});

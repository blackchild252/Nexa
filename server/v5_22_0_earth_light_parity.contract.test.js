import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function luminance(hex) {
  const rgb = [0, 2, 4].map(i => parseInt(hex.slice(1 + i, 3 + i), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('B58 M307 Earth Light parity adds a restrained readability guard to Home and Dami', () => {
  const world = read('src/NexaWorldBackground.tsx');
  assert.match(world, /<NexaEarth variant=\{earthVariant\} dim=/);
  assert.match(world, /earthVariant === 'home' \|\| earthVariant === 'dami'/);
  assert.match(world, /styles\.lightReadabilityGuard/);
  assert.match(world, /rgba\(244,250,255,0\.22\)/);
});

test('B58 M307 Earth Light key text and focus colors meet WCAG AA contrast on light surfaces', () => {
  assert.ok(contrast('#2A2118', '#F2F9FF') >= 7, 'primary Earth Light text should have strong contrast');
  assert.ok(contrast('#1767A9', '#F2F9FF') >= 4.5, 'Earth Light focus/accent blue should meet AA');
  assert.ok(contrast('#4A3B2C', '#FFFFFF') >= 7, 'secondary Earth Light text should have strong contrast');
  assert.ok(contrast('#6B6254', '#FFFFFF') >= 4.5, 'muted Earth Light text should meet AA');
});

test('B58 M307 Earth Light scene retains the existing motion authority and decorative boundary', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /allows\('world-ambient'\)/);
  assert.match(earth, /if \(!animated\)/);
  assert.match(earth, /pointerEvents="none"/);
  assert.match(earth, /accessible=\{false\}/);
});

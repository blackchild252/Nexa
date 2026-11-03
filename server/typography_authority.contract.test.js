const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('typography uses one shared NEXA font authority', () => {
  const fonts = read('src/nexaFonts.ts');
  const typography = read('src/nexaTypography.ts');
  const theme = read('src/theme.ts');

  assert.match(fonts, /export const NEXA_FONTS/);
  assert.match(typography, /from ['"]\.\/nexaFonts['"]/);
  assert.match(theme, /from ['"]\.\/nexaFonts['"]/);
  assert.doesNotMatch(typography, /export const NEXA_FONTS\s*=\s*Object\.freeze/);
  assert.doesNotMatch(theme, /const NEXA_FONTS\s*=\s*Object\.freeze/);
});

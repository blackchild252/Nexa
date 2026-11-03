const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('B261-A11Y0 every Image in the Zeeza profile screen is labelled for screen readers', () => {
  const src = read('src/ZeezaProfile.tsx');
  const tags = src.match(/<Image\b[^>]*\/>/g) || [];
  assert.ok(tags.length >= 2, 'profile screen must still render its images');
  for (const t of tags) assert.match(t, /accessibilityLabel=/, `unlabelled image: ${t.slice(0, 80)}`);
});

test('B261-HOME0 the safe-area top padding stays on the Home screen only (homepage-only rule)', () => {
  const dir = path.join(__dirname, '..', 'src');
  const users = fs.readdirSync(dir).filter(f => /\.tsx$/.test(f) && /safeInsets\.top\s*\+\s*8/.test(read('src/' + f)));
  assert.deepStrictEqual(users, ['HomeCommandCenter.tsx']);
});

test('B261-HOME1 earlier Home repairs are still in place (badge colour, safe area, ticker width)', () => {
  assert.match(read('src/MarketplaceScreen.tsx'), /const SALE_BADGE_BG = '#B83629'/);
  assert.match(read('src/HomeCommandCenter.tsx'), /paddingTop: safeInsets\.top \+ 8/);
  assert.match(read('src/HomeCommandCenter.tsx'), /const TICKER_TRACK_WIDTH = 6000;/);
});

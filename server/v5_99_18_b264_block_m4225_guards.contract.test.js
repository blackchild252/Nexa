const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('B264-U1 (M4228) the five dead names are gone and the app entry still imports what it uses', () => {
  assert.doesNotMatch(read('src/HomeCommandCenter.tsx'), /const\s*\{\s*width\s*,\s*gutter/);
  assert.match(read('src/HomeCommandCenter.tsx'), /const\s*\{\s*gutter\s*,\s*contentWidth/);
  assert.doesNotMatch(read('src/LeisureKitchenScreen.tsx'), /const amount=menu\.reduce/);
  assert.doesNotMatch(read('src/MarketplaceScreen.tsx'), /const\s*\{\s*cols\s*,\s*cardWidth\s*\}\s*=\s*useColumns/);
  assert.match(read('src/MarketplaceScreen.tsx'), /const\s*\{\s*cardWidth\s*\}\s*=\s*useColumns\(\)/);
});

test('B264-U2 (M4230) the unused-looking upload timeout in api.ts is kept on purpose (the robot ambient flag was removed with owner OK, M4289)', () => {
  assert.match(read('src/api.ts'), /UPLOAD_TIMEOUT_MS = 90_000/);
});

test('B264-U3 (M4231) the fee-preview flow and the order flow that were NOT touched still work the same way', () => {
  const leisure = read('src/LeisureKitchenScreen.tsx');
  assert.match(leisure, /fee-preview\?items=/);
  assert.match(leisure, /Before you confirm/);
  const yaayz = read('src/YaayzScreen.tsx');
  assert.match(yaayz, /tickets\/fee-preview\?ticketId=/);
  assert.match(yaayz, /buy\(ticket,r\.preview\)/);
});

test('B264-U4 (M4228) Home header still uses the saved spacing after the width cleanup', () => {
  const home = read('src/HomeCommandCenter.tsx');
  assert.match(home, /useNexaHomeSpacing\(\)/);
  assert.match(home, /homeSpacing/);
});

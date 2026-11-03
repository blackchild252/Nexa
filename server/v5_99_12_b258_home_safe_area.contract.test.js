const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'HomeCommandCenter.tsx'), 'utf8');

test('B258-SAFE0 Home reads the real phone insets from react-native-safe-area-context', () => {
  assert.match(src, /import \{ useSafeAreaInsets \} from 'react-native-safe-area-context'/);
  assert.match(src, /const safeInsets = useSafeAreaInsets\(\)/);
});

test('B258-SAFE1 Home root keeps the header below the status bar and above the navigation bar', () => {
  assert.match(src, /paddingTop: safeInsets\.top \+ 8/);
  assert.match(src, /paddingBottom: Math\.max\(safeBottom, safeInsets\.bottom\)/);
});

test('B258-SAFE2 the menu (directory) panel also clears the status bar', () => {
  assert.match(src, /const panelInsets=useSafeAreaInsets\(\)/);
  assert.match(src, /paddingTop:panelInsets\.top\+18/);
});

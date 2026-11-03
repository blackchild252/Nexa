const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Lifestyle lives in Zeeza (moved out of L.A.); /lifestyle redirects there; the dock stays at five destinations', () => {
  const tabs = read('src/app/(tabs)/_layout.tsx');
  assert.doesNotMatch(tabs, /lifestyle/i);
  assert.match(read('src/app/lifestyle.tsx'), /Redirect/);
  assert.match(read('src/app/(tabs)/zeeza.tsx'), /<LifestyleScreen postId=\{requestedPostId\}/);
  assert.doesNotMatch(read('src/LeisureArenaScreen.tsx'), /Open Lifestyle/);
});

test('Lifestyle is a known route with a screen title and keeps Zeeza highlighted in the menu', () => {
  assert.match(read('src/nexaRouteInventory.ts'), /'\/lifestyle'/);
  assert.match(read('src/nexaNavKeys.ts'), /\['\/lifestyle', 'Lifestyle'\]/);
  assert.match(read('src/nexaNavKeys.ts'), /startsWith\('\/lifestyle'\)\) return 'zeeza'/);
  assert.doesNotMatch(read('src/nexaSafeArea.ts'), /'\/lifestyle'/);
});

test('Lifestyle screen has the two bottom-right buttons and friend names', () => {
  const f = read('src/LifestyleScreen.tsx');
  assert.match(f, /accessibilityLabel="Post a recent photo or video"/);
  assert.match(f, /accessibilityLabel="Take a new photo or video"/);
  assert.match(f, /launchCameraAsync/);
  assert.match(f, /launchImageLibraryAsync/);
  assert.match(f, /mediaTypes: \['images', 'videos'\]/);
  assert.match(f, /useFriends\(/);
});

test('Camera permission wording exists for the picker plugin', () => {
  const j = JSON.parse(read('app.json'));
  const plugin = JSON.stringify(j).match(/"expo-image-picker",\{[^}]*\}/)[0];
  assert.match(plugin, /cameraPermission/);
});

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = (rel) => fs.readFileSync(path.join(__dirname, '..', 'src', rel), 'utf8');

test('B296 the Dami route passes a back action that never dead-ends (no history goes Home)', () => {
  const s = src('app/dami.tsx');
  assert.match(s, /import \{ nexaGoBack \} from '\.\.\/NexaNavKeys'/);
  assert.match(s, /<NexaAI embedded onBack=\{nexaGoBack\}/);
  const nav = src('NexaNavKeys.tsx');
  assert.match(nav, /export function nexaGoBack\(\) \{\s*if \(decideBack\(router\.canGoBack\(\)\) === 'back'\) router\.back\(\);\s*else router\.replace\('\/\(tabs\)'/);
});

test('B296 the embedded Dami header shows a 44px Go back button when onBack is given', () => {
  const s = src('NexaAI.tsx');
  assert.match(s, /onBack\?:\(\)=>void/);
  assert.match(s, /embedded&&onBack\?<NexaPressable accessibilityRole="button" accessibilityLabel="Go back" onPress=\{onBack\}/);
  const i = s.indexOf('accessibilityLabel="Go back"');
  assert.match(s.slice(i, i + 400), /minWidth:44,minHeight:44,width:44,height:44/);
});

test('B296 the global bar still stays hidden on /dami so there are not two back buttons', () => {
  assert.match(src('nexaNavKeys.ts'), /HIDDEN_EXACT = new Set\(\[[^\]]*'\/dami'\]\)/);
});

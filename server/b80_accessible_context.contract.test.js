const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');


test('shared interaction helper exports semantic grouping', () => {
    const s = read('src/interactionAccessibility.ts');
    assert.match(s, /export function accessibilityGroup/);
    assert.match(s, /accessibilityRole/);
  });
test('shared interaction helper exports action hints', () => {
    const s = read('src/interactionAccessibility.ts');
    assert.match(s, /export function actionHint/);
    assert.match(s, /accessibilityHint/);
  });
test('navigation exposes toolbar context', () => assert.match(read('src/NexaNavKeys.tsx'), /accessibilityGroup\("NEXA navigation keys", "toolbar"\)/));
test('navigation controls expose task hints', () => assert.match(read('src/NexaNavKeys.tsx'), /actionHint\(/));
test('directory header has semantic context', () => assert.match(read('src/NexaNavKeys.tsx'), /NEXA directory header/));
test('directory options have a stable accessible label', () => assert.match(read('src/NexaNavKeys.tsx'), /NEXA directory options/));
test('Yaayz sorting is grouped', () => assert.match(read('src/YaayzHomeFeed.tsx'), /accessibilityGroup\("Yaayz discovery sorting"/));
test('Yaayz sorting actions expose hints', () => assert.match(read('src/YaayzHomeFeed.tsx'), /Sort Yaayz by/));
test('interaction target contract remains 44px', () => assert.match(read('src/accessibility.ts'), /minTouchTarget: 44/));
test('B80 preserves shared motion authority rather than creating a second one', () => assert.match(read('src/motion.tsx'), /NEXA_MOTION_ACCESSIBILITY_CONTRACT/));

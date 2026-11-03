const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('B368-01: shared touch target floor remains canonical', () => assert.match(read('src/interactionAccessibility.ts'), /minWidth:\s*ACCESSIBILITY\.minTouchTarget[\s\S]*minHeight:\s*ACCESSIBILITY\.minTouchTarget/));
test('B368-02: standard button has 44px floor', () => assert.match(read('src/styles.ts'), /button:\{[^}]*minHeight:theme\.accessibility\.minTouchTarget/));
test('B368-03: secondary button has 44px floor', () => assert.match(read('src/styles.ts'), /buttonSecondary:\{[^}]*minHeight:theme\.accessibility\.minTouchTarget/));
test('B368-04: compact pill has 44px floor', () => assert.match(read('src/styles.ts'), /pill:\{[^}]*minHeight:theme\.accessibility\.minTouchTarget/));
test('B368-05: legacy btn style has 44px floor', () => assert.match(read('src/styles.ts'), /btn:\{[^}]*minHeight:theme\.accessibility\.minTouchTarget/));
test('B368-06: save button has 44px floor', () => assert.match(read('src/styles.ts'), /saveBtn:\{[^}]*minHeight:theme\.accessibility\.minTouchTarget/));
test('B368-07: target button has 44px floor', () => assert.match(read('src/styles.ts'), /targetBtn:\{[^}]*minHeight:theme\.accessibility\.minTouchTarget/));
test('B368-08: standard button centers content', () => assert.match(read('src/styles.ts'), /button:\{[^}]*justifyContent:'center'/));
test('B368-09: secondary button centers content', () => assert.match(read('src/styles.ts'), /buttonSecondary:\{[^}]*justifyContent:'center'/));
test('B368-10: pill centers content', () => assert.match(read('src/styles.ts'), /pill:\{[^}]*justifyContent:'center'/));
test('B368-11: directory close target is 44px', () => assert.match(read('src/HomeCommandCenter.tsx'), /directoryClose:\{width:44,height:44/));
test('B368-12: call controls meet 44px floor', () => assert.match(read('src/CallScreen.tsx'), /control:\{[^}]*minHeight:44/));
test('B368-13: accept call meets 44px floor', () => assert.match(read('src/CallScreen.tsx'), /accept:\{[^}]*minHeight:44/));
test('B368-14: decline call meets 44px floor', () => assert.match(read('src/CallScreen.tsx'), /decline:\{[^}]*minHeight:44/));
test('B368-15: Yaayz social feed card is not itself a pressable wrapper', () => assert.match(read('src/YaayzSocialFeed.tsx'), /<View style=\{\[s\.card/));
test('B368-16: Yaayz social media/content uses one dedicated pressable', () => assert.match(read('src/YaayzSocialFeed.tsx'), /<NexaPressable onPress=\{\(\)=>tap\(post\)\}/));
test('B368-17: Yaayz social double-tap instruction is exposed', () => assert.match(read('src/YaayzSocialFeed.tsx'), /Double tap to like/));
test('B368-18: Yaayz social share remains independently actionable', () => assert.match(read('src/YaayzSocialFeed.tsx'), /accessibilityLabel="Share Yaayz post" onPress=\{\(\)=>sharePost\(post\)\}/));
test('B368-19: Yaayz social comment remains independently actionable', () => assert.match(read('src/YaayzSocialFeed.tsx'), /accessibilityLabel="Post Yaayz comment" onPress=\{\(\)=>addComment\(post\)/));
test('B368-20: Yaayz social comment input remains separate from media gesture', () => assert.match(read('src/YaayzSocialFeed.tsx'), /accessibilityLabel="Yaayz comment"/));
test('B368-21: raw Consumer Pressable usage stays inside motion primitives', () => {
  const files = fs.readdirSync(path.join(__dirname, '..', 'src')).filter(f => f.endsWith('.tsx') && f !== 'motion.tsx');
  for (const f of files) {
    const s = read(`src/${f}`);
    assert.equal((s.match(/<Pressable\b/g) || []).length, 0, `${f} contains raw Pressable`);
    assert.equal((s.match(/<TouchableOpacity\b/g) || []).length, 0, `${f} contains raw TouchableOpacity`);
  }
});
test('B368-22: 100% typography baseline remains available', () => assert.match(read('src/nexaTextScale.ts'), /1\s*[,\]]/));
test('B368-23: larger text scales remain available', () => assert.match(read('src/nexaTextScale.ts'), /1\.15/));
test('B368-24: maximum user text multiplier remains 145%', () => assert.match(read('src/interactionAccessibility.ts'), /maxFontSizeMultiplier:\s*1\.45/));
test('B368-25: Admin Web retains 44px button and form floors', () => {
  const css = read('admin-web/style.css');
  assert.match(css, /input,select,textarea\{[^}]*min-height:44px/);
  assert.match(css, /button\{[^}]*min-height:44px/);
});

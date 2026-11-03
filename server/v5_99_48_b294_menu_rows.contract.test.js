const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = (rel) => fs.readFileSync(path.join(__dirname, '..', 'src', rel), 'utf8');

test('B294 both pressables lay out their children with the row style, not a fixed column wrapper', () => {
  const s = src('motion.tsx');
  assert.equal((s.match(/<Animated\.View style=\{\[\{transform:\[\{scale\}\]\},pressableInnerLayout\(style\)\]\}>/g) || []).length, 2);
  assert.ok(!/<Animated\.View style=\{\{transform:\[\{scale\}\]\}\}>\{children\}/.test(s), 'old column-only wrapper gone');
});

test('B294 wrapper copies only child-layout keys and fills the pressable', () => {
  const s = src('motion.tsx');
  assert.match(s, /INNER_LAYOUT_KEYS=\['flexDirection','alignItems','justifyContent','gap','rowGap','columnGap','flexWrap'\]/);
  assert.match(s, /const out:any=\{flexGrow:1,flexShrink:1\}/);
  assert.ok(!/INNER_LAYOUT_KEYS=\[[^\]]*(padding|margin|backgroundColor|border)/.test(s), 'box keys stay on the pressable');
});

test('B294 NEXA directory rows are icon + label only, with no chevron, and still open their screen', () => {
  const s = src('NexaNavKeys.tsx');
  const start = s.indexOf('HOME_DIRECTORY.map(');
  const end = s.indexOf('<View style={st.divider} />');
  const block = s.slice(start, end);
  assert.ok(block.length > 100);
  assert.ok(!/chevron/.test(block), 'no chevron in directory rows');
  assert.match(block, /onPress=\{\(\) => go\(id\)\}/);
  assert.match(block, /accessibilityRole="tab"/);
  assert.match(s, /row: \{ minHeight: 52, flexDirection: 'row' as const, alignItems: 'center' as const/);
});

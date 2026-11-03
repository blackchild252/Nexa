const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = (rel) => fs.readFileSync(path.join(__dirname, '..', 'src', rel), 'utf8');

test('B290 Sky Money tab row scrolls sideways and keeps every tab', () => {
  const s = src('MoneyDashboard.tsx');
  assert.match(s, /<ScrollView horizontal showsHorizontalScrollIndicator=\{false\}[^>]*accessibilityRole="tablist"/);
  for (const label of ['Overview', 'Activity', 'Planning', 'Sky Store Savings', 'Sky Group Savings', 'Sky Market Watch', 'Sky Insights']) {
    assert.ok(s.includes(`'${label}'`), `tab ${label} present`);
  }
  assert.ok(!/<View style=\{ds\(\{ flexDirection: "row", marginTop: 16, marginBottom: 14 \}\)\}>\s*\{\(\[\['overview'/.test(s), 'old non-scrolling row removed');
});

test('B290 every Sky Money screen has vertical scroll', () => {
  for (const f of ['MoneyDashboard', 'FinancialPlanning', 'StoreAjo', 'GroupsTab', 'Subscription', 'MarketWatch', 'MarketInsights']) {
    assert.ok(/ScrollView/.test(src(`${f}.tsx`)), `${f} has ScrollView`);
  }
});

test('B290 plan prices stay inside the card at any text size', () => {
  const s = src('Subscription.tsx');
  assert.match(s, /flex:1,flexShrink:1,paddingRight:10\}\)\}><Text style=\{ds\(\{color:theme\.colors\.ivoryText,fontWeight:'900',fontSize:20\}/);
  assert.match(s, /flexShrink:0,textAlign:'right'\}\)\} numberOfLines=\{1\}>\{money\(plan\.monthlyFee\.amount(?:,plan\.monthlyFee\.currency)?\)\}\/mo/);
  assert.match(s, /\[s\.muted,\{flex:1,flexShrink:1,paddingRight:10\}\]/);
});

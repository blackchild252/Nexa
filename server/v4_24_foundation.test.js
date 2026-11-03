const test=require('node:test'); const assert=require('node:assert/strict');
const notifications=require('./notifications'); const planning=require('./moneyPlanningMaturity'); const discovery=require('./marketplaceDiscovery');
test('V4.24 notification actions include unified destinations',()=>{assert.equal(notifications.normalizeAction({screen:'profile'}).action,'profile');assert.equal(notifications.normalizeAction({screen:'leisure_kitchen'}).action,'leisure_kitchen');});
test('V4.24 planning period helpers are deterministic',()=>{assert.match(planning.monthStart(new Date('2026-09-15T00:00:00Z')),/^2026-09-01$/);assert.match(planning.monthEnd(new Date('2026-09-15T00:00:00Z')),/^2026-09-30$/);});
test('V4.24 marketplace discovery preserves canonical category set',()=>{assert.equal(discovery.DEFAULT_CATEGORIES.length,15);assert.ok(discovery.DEFAULT_CATEGORIES.includes('phones & tablets'));});

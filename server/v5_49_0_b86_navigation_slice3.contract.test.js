const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function routeExists(pathname) {
  const p = String(pathname).split('?')[0].split('#')[0].replace(/^\/+/, '');
  const normalized = p === '(tabs)' ? '(tabs)/index' : p;
  return fs.existsSync(path.join(root, 'src', 'app', normalized + '.tsx')) ||
    fs.existsSync(path.join(root, 'src', 'app', normalized, 'index.tsx'));
}

test('B86 M585 Leisure world routes are real and each child world has a valid entry path', () => {
  const arena = read('src/LeisureArenaScreen.tsx');
  const nav = read('src/nexaNavigation.ts');
  const expected = ['/(tabs)/leisure', '/leisure/kitchen', '/leisure/ball-house', '/leisure/game-house', '/leisure/fitness'];
  for (const route of expected) assert.equal(routeExists(route), true, `missing Leisure route: ${route}`);
  for (const route of expected.slice(1)) assert.match(arena, new RegExp(`path:'${route}'`));
  for (const id of ['leisure', 'ball', 'kitchen', 'game', 'fitness']) assert.match(nav, new RegExp(`${id}:\\s*\\{ pathname:`));
});

test('B86 M586 Leisure child screens use shared Back behavior and preserve Yaayz return-to-origin', () => {
  const ball = read('src/app/leisure/ball-house/index.tsx');
  const game = read('src/app/leisure/game-house/index.tsx');
  const fitness = read('src/app/leisure/fitness/index.tsx');
  const keys = read('src/NexaNavKeys.tsx');
  const yaayz = read('src/YaayzScreen.tsx');
  assert.match(ball, /import \{ nexaGoBack \} from '\.\.\/\.\.\/\.\.\/NexaNavKeys'/);
  assert.match(game, /import \{ nexaGoBack \} from '\.\.\/\.\.\/\.\.\/NexaNavKeys'/);
  assert.match(fitness, /import \{ nexaGoBack \} from '\.\.\/\.\.\/\.\.\/NexaNavKeys'/);
  assert.match(ball, /onPress=\{\(\)=>nexaGoBack\(\)\}/);
  assert.match(game, /onPress=\{\(\)=>nexaGoBack\(\)\}/);
  assert.match(fitness, /onPress=\{\(\)=>nexaGoBack\(\)\}/);
  assert.match(keys, /export function nexaGoBack\(\) \{[\s\S]*router\.replace\('\/\(tabs\)'/);
  assert.match(yaayz, /requestedReturn && \['\/leisure\/ball-house','\/leisure\/game-house','\/leisure'\]\.includes\(requestedReturn\)/);
  assert.match(yaayz, /router\.replace\(requestedReturn as any\)/);
});

test('B86 M587 Notification destinations remain server-owned and client-supported without fabricating new action types', () => {
  const server = read('server/notifications.js');
  const nav = read('src/nexaNavigation.ts');
  const push = read('src/pushRouting.ts');
  const home = read('src/app/(tabs)/index.tsx');
  assert.match(server, /leisure: "leisure", leisure_kitchen: "leisure_kitchen", leisure_lifestyle: "leisure_lifestyle"/);
  assert.match(server, /if \(screen === "leisure" \|\| screen === "leisure_kitchen" \|\| screen === "leisure_lifestyle"\) return "leisure"/);
  assert.match(push, /screen: "leisure" \| "leisure_kitchen" \| "leisure_lifestyle"/);
  assert.match(nav, /case 'leisure': return navigationForDirectoryItem\('leisure'\)/);
  assert.match(nav, /case 'leisure_kitchen': return navigationForLeisureActivity\('kitchen'\)/);
  assert.match(home, /authedFetch\(`\/api\/notifications\/\$\{encodeURIComponent\(notificationId\)\}\/action`\)/);
  assert.match(home, /if \(target\) router\.push\(target as any\)/);
});

test('B86 M588 Add actions remain centralized, reachable and mapped to existing destinations', () => {
  const keys = read('src/NexaNavKeys.tsx');
  const nav = read('src/nexaNavigation.ts');
  const expected = [
    ["friend", '/(tabs)/zeeza', "section: 'friends'"],
    ["money", '/wallet', null],
    ["group", '/(tabs)/money', "view: 'groups'"],
    ["product", '/marketplace/vendor', null],
  ];
  assert.match(keys, /const ADD_ACTIONS: Array/);
  assert.match(keys, /onPress=\{openAdd\}/);
  assert.match(keys, /NEXA_QUICK_ACCESS_LABELS\.add/);
  for (const [id, route, param] of expected) {
    assert.match(nav, new RegExp(`case '${id}': return validateNavigationTarget\\(\\{ pathname: '${route.replace(/[()]/g, '\\$&')}'`));
    if (param) assert.match(nav, new RegExp(param.replace(/[{}]/g, '\\$&')));
  }
  assert.equal(routeExists('/wallet'), true);
  assert.equal(routeExists('/marketplace/vendor'), true);
  assert.equal(routeExists('/(tabs)/zeeza'), true);
  assert.equal(routeExists('/(tabs)/money'), true);
});

test('B86 M589 Dami navigation has explicit allowed destinations and a safe Home close path', () => {
  const dami = read('src/app/dami.tsx');
  const nav = read('src/nexaNavigation.ts');
  const ai = read('src/NexaAI.tsx');
  assert.match(dami, /navigationForDamiDestination/);
  assert.match(dami, /if\(nav==='home'\) router\.replace\(target as any\)/);
  assert.match(dami, /onClose=\{\(\)=>router\.replace\('\/\(tabs\)' as any\)\}/);
  for (const value of ['home','dami','zeeza','yaayz','leisure']) {
    assert.ok(nav.includes(`if (value === '${value}')`), `Dami destination branch missing: ${value}`);
  }
  assert.match(nav, /if \(value === 'marketplace'\) return navigationForDirectoryItem\('marketplace'\)/);
  assert.match(nav, /if \(value === 'vendor'\) return navigationForDirectoryItem\('vendor'\)/);
  assert.match(nav, /if \(value === 'money' \|\| value\.startsWith\('money_'\)\)/);
  assert.match(nav, /const viewMap: Record<string, string> = \{ store_savings: 'ajo', group_savings: 'groups', planning: 'planning', market: 'market', insights: 'insights' \}/);
  assert.match(ai, /onNavigate/);
});

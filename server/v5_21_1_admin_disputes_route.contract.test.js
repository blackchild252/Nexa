'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('Admin Disputes route exists and re-checks admin status before rendering the screen', () => {
  const route = read('src/app/marketplace/disputes.tsx');
  assert.match(route, /AdminDisputesScreen/);
  assert.match(route, /adminStatus\(\)/);
  assert.match(route, /r\?\.isAdmin \? 'admin' : 'denied'/);
  assert.match(route, /Administrative Director access required/);
  assert.match(route, /nexaGoBack/);
});

test('Admin Disputes is reached only from the Marketplace admin-only button', () => {
  assert.match(read('src/app/(tabs)/marketplace.tsx'), /onAdmin=\{\(\) => router\.push\('\/marketplace\/disputes'/);
  assert.match(read('src/MarketplaceScreen.tsx'), /isAdmin&&<(?:NexaPressable|TouchableOpacity)[^>]*onPress=\{\(\)=>onAdmin\?\.\(\)\}/);
});

test('Admin dispute endpoints stay server-restricted', () => {
  const index = read('server/index.js');
  assert.match(index, /app\.get\("\/api\/mall\/admin\/disputes", auth\.authMiddleware, (?:adminAccess\.scopedGate\("[a-z_]+"\), )?(?:requireMallAdmin|mallAdminFor\("[a-z_]+"\))/);
  assert.match(index, /app\.post\("\/api\/mall\/admin\/disputes\/:disputeId\/resolve", auth\.authMiddleware, (?:adminAccess\.scopedGate\("[a-z_]+"\), )?(?:requireMallAdmin|mallAdminFor\("[a-z_]+"\))/);
});

test('Launch config: EAS profiles and server deploy workflow exist and stay honest about missing targets', () => {
  const eas = JSON.parse(read('eas.json'));
  for (const p of ['development', 'preview', 'production']) assert.ok(eas.build[p], p);
  assert.equal(eas.build.development.developmentClient, true);
  assert.ok(!eas.build.production.autoIncrement, 'EAS must not own the build code (B255): release:bump does');
  const wf = read('.github/workflows/nexa-server-deploy.yml');
  assert.match(wf, /NOT CONFIGURED/);
  assert.match(read('Dockerfile'), /HEALTHCHECK[\s\S]*\/health\/live/);
});

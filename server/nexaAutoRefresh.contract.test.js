import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/nexaAutoRefresh.ts', import.meta.url), 'utf8');

test('NEXA auto refresh coordinator uses bounded foreground refresh semantics', () => {
  assert.match(src, /NEXA_AUTO_REFRESH_INTERVAL_MS\s*=\s*30_000/);
  assert.match(src, /NEXA_AUTO_REFRESH_MIN_INTERVAL_MS\s*=\s*5_000/);
  assert.match(src, /next === 'active'/);
  assert.match(src, /if \(!active\) return/);
  assert.match(src, /wasBackground/);
  assert.match(src, /listeners\.add\(listener\)/);
  assert.match(src, /pending\.has\(listener\)/);
  assert.match(src, /Promise\.resolve\(listener\(reason\)\)/);
});

test('NEXA auto refresh has process-wide coordinator rather than per-screen timers', () => {
  assert.match(src, /let installed = false/);
  assert.match(src, /if \(installed\) return/);
  assert.match(src, /setInterval\(\(\) => emit\('interval'\)/);
});


test('Marketplace refresh hook has an explicit active lifecycle gate', () => {
  const marketplace = fs.readFileSync(new URL('../src/useMarketplace.ts', import.meta.url), 'utf8');
  assert.match(marketplace, /useMarketplace\(user\?:\{id\?:string;email\?:string\}, active=true\)/);
  assert.match(marketplace, /if\(!active\)return;return subscribeNexaAutoRefresh/);
});


test('NEXA auto refresh bounds listener failure pressure and staggers listeners', () => {
  assert.match(src, /NEXA_AUTO_REFRESH_STAGGER_MS\s*=\s*50/);
  assert.match(src, /NEXA_AUTO_REFRESH_MAX_FAILURE_BACKOFF_MS\s*=\s*120_000/);
  assert.match(src, /nextAllowedAt/);
  assert.match(src, /failures/);
  assert.match(src, /setTimeout\(run, index \* NEXA_AUTO_REFRESH_STAGGER_MS\)/);
  assert.match(src, /failures\.delete\(listener\)/);
});

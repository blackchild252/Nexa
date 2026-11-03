const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = (rel) => fs.readFileSync(path.join(__dirname, '..', 'src', rel), 'utf8');

test('B289 root layout uses the NEXA crash screen as the ErrorBoundary', () => {
  const s = src('app/_layout.tsx');
  assert.match(s, /export \{ NexaErrorScreen as ErrorBoundary \} from '\.\.\/NexaErrorScreen';/);
  assert.ok(!/export \{ ErrorBoundary \} from 'expo-router'/.test(s));
});

test('B289 crash screen shows the message and the stack and offers Retry and Home', () => {
  const s = src('NexaErrorScreen.tsx');
  assert.match(s, /error\?\.stack/);
  assert.match(s, /Something went wrong/);
  assert.match(s, /accessibilityLabel="Retry"/);
  assert.match(s, /accessibilityLabel="Go to Home"/);
});

test('B289 crash screen runs outside the providers: no context or provider hooks', () => {
  const s = src('NexaErrorScreen.tsx');
  assert.ok(!/use(Motion|ThemeMode|Auth|NexaNav|Context)\b/.test(s));
  assert.ok(!/from '\.\/(ThemeProvider|auth|NexaNavKeys)'/.test(s));
});

test('B289 Yaayz ad is wrapped so an ad failure cannot crash the screen', () => {
  assert.match(src('YaayzHomeFeed.tsx'), /<YaayzAdBoundary><YaayzNativeAd index=\{item\.index\}\/><\/YaayzAdBoundary>/);
  const b = src('YaayzAdBoundary.tsx');
  assert.match(b, /getDerivedStateFromError/);
  assert.match(b, /return this\.state\.failed \? null : this\.props\.children/);
});

test('B289 ads SDK is started with the documented default import', () => {
  const s = src('YaayzNativeAd.tsx');
  assert.match(s, /import mobileAds from 'react-native-google-mobile-ads';/);
  assert.ok(!/^\s+mobileAds,\s*$/m.test(s));
});

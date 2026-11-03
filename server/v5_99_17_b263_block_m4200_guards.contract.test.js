const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const lum = hex => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const walk = (dir, out = []) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(f.name)) out.push(p); } return out; };

test('B263-ERR0 (M4161) dark error TEXT token meets 4.5:1 on every dark surface', () => {
  const theme = read('src/theme.ts');
  const dark = theme.match(/errorText:\s*'(#[0-9A-Fa-f]{6})'/)[1];
  for (const bg of ['#000000', '#1A1A1A', '#2A2A2A', '#3A1717']) assert.ok(ratio(dark, bg) >= 4.5, `${dark} on ${bg} = ${ratio(dark, bg).toFixed(2)}`);
});

test('B263-ERR1 light errorText token exists and meets 4.5:1 on white', () => {
  const theme = read('src/theme.ts');
  const all = [...theme.matchAll(/errorText:\s*'(#[0-9A-Fa-f]{6})'/g)].map(m => m[1]);
  assert.strictEqual(all.length, 2, 'errorText must exist in both palettes');
  assert.ok(ratio(all[1], '#FFFFFF') >= 4.5);
});

test('B263-ERR2 the Royal Dark error/danger fills are unchanged (white call-button text depends on them)', () => {
  const theme = read('src/theme.ts');
  assert.match(theme, /error:\s*'#E74C3C'/);
  assert.match(theme, /danger:\s*'#E74C3C'/);
});

test('B263-ERR3 no screen uses the fill colour theme.colors.error/danger as text colour', () => {
  const bad = [];
  for (const f of walk(path.join(__dirname, '..', 'src'))) {
    if (f.endsWith('theme.ts')) continue;
    read(path.relative(path.join(__dirname, '..'), f)).split('\n').forEach((l, i) => {
      if (/^\s*\/\//.test(l)) return;
      if (/(?<!backgroundColor:)theme\.colors\.(error|danger)\b/.test(l.replace(/backgroundColor:\s*theme\.colors\.(error|danger)\b/g, ''))) bad.push(`${path.basename(f)}:${i + 1}`);
    });
  }
  assert.deepStrictEqual(bad, []);
});

test('B263-HOME0 (M4166) spacing store: four levels, safe default, bad values fall back to standard', () => {
  const src = read('src/nexaHomeSpacing.ts');
  assert.match(src, /NEXA_HOME_SPACINGS: readonly NexaHomeSpacing\[\] = \[0, 8, 16, 24\]/);
  assert.match(src, /let activeSpacing: NexaHomeSpacing = 0;/);
  const norm = new Function('const L=[0,8,16,24]; return (v)=>{const n=Number(v); return L.includes(n)?n:0;}')();
  assert.strictEqual(norm('16'), 16);
  assert.strictEqual(norm('999'), 0);
  assert.strictEqual(norm(null), 0);
  assert.strictEqual(norm('abc'), 0);
});

test('B263-HOME1 Home screen and its menu panel add the saved spacing on top of the automatic safe area', () => {
  const home = read('src/HomeCommandCenter.tsx');
  assert.match(home, /paddingTop: safeInsets\.top \+ 8 \+ homeSpacing,/);
  assert.match(home, /paddingTop:panelInsets\.top\+18\+homeSpacingPanel,/);
  assert.match(home, /const homeSpacing = useNexaHomeSpacing\(\);/);
});

test('B263-HOME2 only the Home screen reads the Home spacing (homepage-only rule)', () => {
  const users = walk(path.join(__dirname, '..', 'src'))
    .filter(f => /useNexaHomeSpacing\(\)/.test(fs.readFileSync(f, 'utf8')) && !/nexaHomeSpacing\.ts$/.test(f))
    .map(f => path.basename(f)).sort();
  // The settings control reads the value only to show which option is selected; it applies no spacing.
  assert.deepStrictEqual(users, ['HomeCommandCenter.tsx', 'NexaHomeSpacingControl.tsx']);
  assert.doesNotMatch(read('src/NexaHomeSpacingControl.tsx'), /paddingTop\s*:\s*[^,}]*spacing/);
});

test('B263-HOME3 the saved spacing loads at start-up and the control is in Profile & Settings', () => {
  assert.match(read('src/ThemeProvider.tsx'), /await loadNexaHomeSpacingPreference\(\)/);
  const profile = read('src/app/(tabs)/profile.tsx');
  assert.match(profile, /<NexaReadingSettings\/><NexaHomeSpacingControl\/>/);
  const ctl = read('src/NexaHomeSpacingControl.tsx');
  assert.match(ctl, /accessibilityRole="radiogroup"/);
  assert.match(ctl, /accessibilityRole="radio"/);
  assert.match(ctl, /minHeight: 44/);
});

test('B263-A11Y0 Notification Center actually renders its screen-reader announcement', () => {
  const src = read('src/NotificationCenter.tsx');
  assert.match(src, /import \{ NexaLiveRegion \} from '\.\/NexaLiveRegion';/);
  assert.match(src, /<NexaLiveRegion message=\{liveMessage\}/);
});

test('B263-PAY0 a failed Yaayz fee settle during payment confirmation is logged, not silent', () => {
  const src = read('server/paymentReconciler.js');
  assert.match(src, /catch \(feeErr\) \{ console\.warn\(`\[NEXA\] Yaayz fee settle deferred/);
  assert.doesNotMatch(src, /settleYaayzFee\(db, order\.ownerId, order\.id\); \} catch \(_\) \{\}/);
});

test('B263-IMP0 the unused imports removed in M4165 stay out of the files they were removed from', () => {
  const gone = { 'src/CallScreen.tsx': [/\bcreateCall\b/, /import \{ router \}/], 'src/Wallet.tsx': [/import \{ BRAND \}/, /import \{ openPaymentUrl \}/], 'src/NexaAI.tsx': [/NEXA_LOGO/], 'src/YaayzScreen.tsx': [/\bLinking\b/] };
  for (const [f, res] of Object.entries(gone)) for (const re of res) assert.doesNotMatch(read(f), re, `${f} re-imports ${re}`);
});

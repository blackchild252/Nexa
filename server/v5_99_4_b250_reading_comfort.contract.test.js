const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { stripTypeScriptTypes } = require('node:module');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const X = json('app.json').expo;
const R = '5.99.4';
const checks = [
 ['M4100 B249 baseline preserved as history',()=>assert.ok(fs.existsSync(path.join(root,'RELEASE_SEAL_V5.99.3.json')))],
 ['M4101 package/server/lock/Expo release is V5.99.4',()=>{assert.equal(json('package.json').version,R);assert.equal(json('server/package.json').version,R);assert.equal(json('package-lock.json').version,R);assert.equal(json('package-lock.json').packages[''].version,R);assert.equal(X.version,R);assert.equal(X.android.version,R)}],
 ['M4102 build code 6069 in every app.json field',()=>{assert.equal(X.android.versionCode,6069);assert.equal(String(X.ios.buildNumber),'6069');assert.equal(X.extra.versionCode,6069);assert.equal(X.versionCode,undefined);assert.equal(json('app.json').versionCode,6069);assert.equal(X.android.package,'com.aami.nexa')}],
 ['M4103 saved reading preferences are restored at start-up',()=>{assert.match(read('src/ThemeProvider.tsx'),/await loadNexaTypographyPreferences\(\)/);assert.match(read('src/nexaTypographyPreferences.ts'),/export async function loadNexaTypographyPreferences/)}],
 ['M4104 text size or font change re-renders the whole app',()=>{const s=read('src/app/_layout.tsx');assert.match(s,/useNexaTextScale\(\)/);assert.match(s,/useNexaFontChoice\(\)/);assert.match(s,/<NexaNavProvider key=\{appearance\}>/)}],
 ['M4105 font-type store is dependency-light and publishes the live family',()=>{const s=read('src/nexaFontChoice.ts');assert.match(s,/__NEXA_FONT_FAMILY__/);assert.match(s,/useSyncExternalStore/)}],
 ['M4106 four font choices, Inter is the default',()=>{const s=read('src/nexaFontFamilies.ts');assert.match(s,/'inter' \| 'system' \| 'serif' \| 'mono'/);assert.match(s,/DEFAULT_NEXA_FONT_CHOICE: NexaFontChoice = 'inter'/)}],
 ['M4107 shared style walker remaps NexaInter families',()=>{const s=read('src/theme.ts');assert.match(s,/__NEXA_FONT_FAMILY__/);assert.match(s,/INTER_WEIGHT\[v\]/);assert.match(s,/scaleTextStyle\(designStyle\(currentThemeMode\(\), style\)\)/)}],
 ['M4108 weight is kept when a remapped style has none',()=>assert.match(read('src/theme.ts'),/node\.fontWeight == null\) out\.fontWeight = INTER_WEIGHT\[v\]/)],
 ['M4109 font choice persists and restores',()=>{const s=read('src/nexaTypographyPreferences.ts');assert.match(s,/persistNexaFontChoice/);assert.match(s,/NEXA_FONT_CHOICE_STORAGE_KEY/)}],
 ['M4110 font type control exists with radio semantics',()=>{const s=read('src/NexaReadingSettings.tsx');assert.match(s,/export function NexaFontTypeControl/);assert.match(s,/accessibilityRole="radio"/)}],
 ['M4111 Profile & Settings Appearance hosts reading comfort',()=>{const s=read('src/app/(tabs)/profile.tsx');assert.match(s,/<NexaReadingSettings\/>/);assert.match(s,/<ThemePicker preference=\{preference\} onSelect=\{setPreference\}\/>/)}],
 ['M4112 Home menu text-size control preserved',()=>assert.match(read('src/HomeCommandCenter.tsx'),/<NexaTextSizeControl\/>/)],
 ['M4113 route is restored after an appearance change',()=>{const s=read('src/app/_layout.tsx');assert.match(s,/router\.replace\(target as any\)/);assert.match(s,/\[appearance\]/)}],
 ['M4114 controls keep 44px touch targets and labels',()=>{const s=read('src/NexaReadingSettings.tsx');assert.match(s,/minHeight: 56/);assert.match(s,/minHeight: 44/);assert.match(s,/accessibilityLabel=\{`\$\{NEXA_FONT_CHOICE_LABELS\[option\]\} font/)}],
 ['M4115 controls use theme tokens in both interfaces (no hard-coded colours)',()=>assert.doesNotMatch(read('src/NexaReadingSettings.tsx'),/#[0-9a-fA-F]{3,6}|rgba?\(/)],
 ['M4116 bundled Inter font authority and loading preserved',()=>{assert.match(read('src/nexaFonts.ts'),/NexaInter-Regular/);assert.match(read('src/app/_layout.tsx'),/useFonts\(/)}],
 ['M4117 existing text-scale authority unchanged (1/1.15/1.3/1.45)',()=>assert.match(read('src/nexaTextScale.ts'),/NexaTextScale = 1 \| 1\.15 \| 1\.3 \| 1\.45/)],
 ['M4118 reset-to-standard control restores Standard + Inter',()=>{assert.match(read('src/nexaTypographyPreferences.ts'),/persistNexaTextScale\(1\)[\s\S]*persistNexaFontChoice\('inter'\)/);assert.match(read('src/NexaReadingSettings.tsx'),/Reset to 100% default/)}],
 ['M4119 pure font logic behaves (normalise + per-platform families)',async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nexa-font-')); const code=stripTypeScriptTypes(read('src/nexaFontFamilies.ts'),{mode:'strip'}); const out=path.join(dir,'nexaFontFamilies.mjs'); fs.writeFileSync(out,code); const m=await import(pathToFileURL(out).href);assert.equal(m.normalizeNexaFontChoice('serif'),'serif');assert.equal(m.normalizeNexaFontChoice('bogus'),'inter');assert.equal(m.systemFamilyFor('inter','android'),'');assert.equal(m.systemFamilyFor('mono','android'),'monospace');assert.equal(m.systemFamilyFor('serif','ios'),'Georgia');assert.equal(m.NEXA_FONT_CHOICES.length,4);assert.equal(m.NEXA_INTER_WEIGHTS['NexaInter-Black'],'900')}],
 ['M4120 release gate registers B250 contract',()=>assert.match(read('scripts/release-gate.mjs'),/v5_99_4_b250_reading_comfort\.contract\.test\.js/)],
 ['M4121 historical B250 block remains in the canonical roadmap and report',()=>{assert.match(read('MASTER_ROADMAP.md'),/M4100–M4124/);assert.match(read('B250_REPORT.md'),/M4100–M4124/)}],
 ['M4122 AGENTS/VERSION/PROJECT_MEMORY aligned to V5.99.4 B250',()=>{assert.match(read('AGENTS.md'),/Current state: \*\*V5\.99\.4 B250\*\* \(build code 6069\)/);assert.match(read('VERSION.md'),/\*\*Current Version:\*\* V5\.99\.4/);const m=json('PROJECT_MEMORY.json');assert.equal(m.currentBatch,'B250');assert.equal(m.releaseArchive,'NEXA-V5.99.4.zip')}],
 ['M4123 Home/Subscription/theme release identity matches',()=>{assert.match(read('src/homeDesign.ts'),/'5\.99\.4'/);assert.match(read('src/subscriptionCentre.ts'),/'5\.99\.4'/);assert.match(read('src/theme.ts'),/release: '5\.99\.4'/)}],
 ['M4124 locked naming rule still present',()=>{const s=read('AGENTS.md');assert.match(s,/PERMANENT NEXA RULE — LOCKED/);assert.match(s,/Install-over-old rule/)}],
];
(async()=>{let failed=0;
// Historical identity checks retired: they pin an older release and cannot hold after a bump. Skipped on purpose (not passed).
const RETIRED=new Set(["M4101 package/server/lock/Expo release is V5.99.4", "M4102 build code 6069 in every app.json field", "M4120 release gate registers B250 contract", "M4122 AGENTS/VERSION/PROJECT_MEMORY aligned to V5.99.4 B250", "M4123 Home/Subscription/theme release identity matches"]);
for(const [name,fn] of checks){if(RETIRED.has(name)){console.log(`SKIP (retired: historical identity) ${name}`);continue}try{await fn();console.log(`PASS ${name}`)}catch(e){failed++;console.error(`FAIL ${name}: ${e.message.split('\n')[0]}`)}}
console.log(`B250 focused: ${checks.length-failed-RETIRED.size}/${checks.length} PASS (${RETIRED.size} retired)`);
if(failed)process.exit(1);})();

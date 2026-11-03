const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const { stripTypeScriptTypes } = require('node:module');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const X = json('app.json').expo;
const R = '5.99.5';
const checks = [
 ['B251 release identity is consistent everywhere (superseded by the current release test)',()=>{const R=json('package.json').version;assert.match(R,/^\d+\.\d+\.\d+$/);assert.equal(json('server/package.json').version,R);assert.equal(json('package-lock.json').version,R);assert.equal(json('package-lock.json').packages[''].version,R);assert.equal(X.version,R);assert.equal(X.android.version,R)}],
 ['B251 build code identical in every app.json field, package unchanged',()=>{const c=X.android.versionCode;assert.ok(c>=6070);assert.equal(String(X.ios.buildNumber),String(c));assert.equal(X.extra.versionCode,c);assert.equal(X.versionCode,undefined);assert.equal(json('app.json').versionCode,c);assert.equal(X.android.package,'com.aami.nexa')}],
 ['B251 rails start at the right edge and end past the left edge',()=>{const s=read('src/HomeCommandCenter.tsx');assert.match(s,/new Animated\.Value\(viewportW\),\[viewportW,contentW\]/);assert.match(s,/toValue:-contentW/);}],
 ['B251 rails use a single copy (nothing appears mid-bar)',()=>{const s=read('src/HomeCommandCenter.tsx');assert.doesNotMatch(s,/copies/);assert.doesNotMatch(s,/tickerCopy\} accessibilityElementsHidden/)}],
 ['B251 rails travel distance includes the bar width',()=>assert.match(read('src/HomeCommandCenter.tsx'),/\(viewportW\+contentW\)\/TICKER_SPEED/)],
 ['B251 rails stay hidden until measured, then loop',()=>{const s=read('src/HomeCommandCenter.tsx');assert.match(s,/opacity:moving\?1:0/);assert.match(s,/Animated\.loop/)}],
 ['B251 reduced-motion strip preserved',()=>assert.match(read('src/HomeCommandCenter.tsx'),/reducedMotion\s*\?\s*<ScrollView horizontal/)],
 ['B251 three rails preserved',()=>assert.equal((read('src/HomeCommandCenter.tsx').match(/<Rail /g)||[]).length,3)],
 ['B251 default-font patch covers Text and TextInput, guarded',()=>{const s=read('src/nexaDefaultFont.ts');assert.match(s,/patch\(Text\)/);assert.match(s,/patch\(TextInput\)/);assert.match(s,/typeof original !== 'function'/);assert.match(s,/catch \{/)}],
 ['B251 root layout loads the default-font patch',()=>assert.match(read('src/app/_layout.tsx'),/import '\.\.\/nexaDefaultFont';/)],
 ['B251 resolver behaves',async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nexa-font-')); const code=stripTypeScriptTypes(read('src/nexaFontFamilies.ts'),{mode:'strip'}); const out=path.join(dir,'nexaFontFamilies.mjs'); fs.writeFileSync(out,code); const m=await import(pathToFileURL(out).href);const r=m.resolveNexaTextStyle;
   assert.deepEqual(r({},''),{fontFamily:'NexaInter-Regular',fontWeight:'normal'});
   assert.deepEqual(r({fontWeight:'700'},''),{fontFamily:'NexaInter-Bold',fontWeight:'normal'});
   assert.deepEqual(r({fontWeight:'900'},''),{fontFamily:'NexaInter-Black',fontWeight:'normal'});
   assert.equal(r({fontFamily:'NexaInter-Bold',fontWeight:'700'},''),null);
   assert.equal(r({fontFamily:'monospace'},'serif'),null);
   assert.deepEqual(r({fontWeight:'700'},'serif'),{fontFamily:'serif',fontWeight:'700'});
   assert.deepEqual(r({fontFamily:'NexaInter-Bold'},'serif'),{fontFamily:'serif',fontWeight:'700'});
   assert.deepEqual(r({},'monospace'),{fontFamily:'monospace'})}],
 ['B251 B250 reading-comfort controls preserved',()=>{assert.match(read('src/app/(tabs)/profile.tsx'),/<NexaReadingSettings\/>/);assert.match(read('src/ThemeProvider.tsx'),/loadNexaTypographyPreferences/)}],
 ['B251 release gate registers B251 contract',()=>assert.match(read('scripts/release-gate.mjs'),/v5_99_5_b251_rails_and_default_font\.contract\.test\.js/)],
 ['B251 AGENTS/VERSION/PROJECT_MEMORY aligned',()=>{const v=json('package.json').version;const m=json('PROJECT_MEMORY.json');assert.match(read('AGENTS.md'),new RegExp('Current state: \\*\\*V'+v.replace(/\./g,'\\.')+' '+m.currentBatch+'\\*\\*'));assert.match(read('VERSION.md'),new RegExp('\\*\\*Current Version:\\*\\* V'+v.replace(/\./g,'\\.')));assert.match(m.currentBatch,/^B\d+$/);assert.match(read('AGENTS.md'),/Install-over-old rule/)}],
];
(async()=>{let failed=0;
for(const [name,fn] of checks){try{await fn();console.log(`PASS ${name}`)}catch(e){failed++;console.error(`FAIL ${name}: ${e.message.split('\n')[0]}`)}}
console.log(`B251 focused: ${checks.length-failed}/${checks.length} PASS`);
if(failed)process.exit(1);})();

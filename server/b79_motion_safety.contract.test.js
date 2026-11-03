const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
function read(p){return fs.readFileSync(path.join(__dirname,'..',p),'utf8');}

test('B79 shared motion contract makes reduced motion, static free tier and cleanup explicit',()=>{const src=read('src/motion.tsx');assert.match(src,/reducedMotionWins: true/);assert.match(src,/freeTierStatic: true/);assert.match(src,/requiresCleanup: true/);});
test('B79 system reduce-motion changes remain live at runtime',()=>{const src=read('src/motion.tsx');assert.match(src,/reduceMotionChanged/);assert.match(src,/setReducedMotionCache\(v\)|setReducedMotionCache = \(v: unknown\)/);assert.match(src,/reducedMotionListeners\.add\(setReducedMotion\)/);});
test('B79 shared animation cleanup helper stops active values',()=>{const src=read('src/motion.tsx');assert.match(src,/function stopNexaAnimations\(values: Animated\.Value\[\]\)/);assert.match(src,/value\.stopAnimation\(\)/);});
test('B79 entry animations expose an unmount cleanup path',()=>{const src=read('src/motion.tsx');assert.match(src,/const animation=Animated\.parallel/);assert.match(src,/return \(\)=>animation\.stop\(\)/);});
test('B79 press feedback cancels stale springs and cleans up on unmount',()=>{const src=read('src/motion.tsx');assert.match(src,/springRef\.current\?\.stop\(\)/);assert.match(src,/useEffect\(\(\)=>\(\)=>\{springRef\.current\?\.stop\(\)/);});
test('B79 Royal Dark world motion remains subscription-gated',()=>{const src=read('src/NexaDarkHome.tsx');assert.match(src,/allows\('world-ambient'\)/);assert.match(src,/return \(\) => loops\.forEach/);});
test('B79 Earth Light world motion remains subscription-gated',()=>{const src=read('src/NexaEarthHome.tsx');assert.match(src,/allows\('world-ambient'\)/);assert.match(src,/return \(\) => loops\.forEach/);});
test('B79 shared depth layer freezes and cleans ambient motion when disabled',()=>{const src=read('src/NexaDepthLayer.tsx');assert.match(src,/if \(!ambient \|\| reducedMotion\)/);assert.match(src,/loop\.stop\(\)/);assert.match(src,/spinLoop\.stop\(\)/);});
test('B79 module atmosphere freezes and cleans ambient motion when disabled',()=>{const src=read('src/NexaModuleAtmosphere.tsx');assert.match(src,/allows\('world-ambient'\)/);assert.match(src,/sweep\.stopAnimation\(\)/);assert.match(src,/pulse\.stopAnimation\(\)/);});
test('B79 decorative motion layers remain non-interactive',()=>{for(const p of ['src/NexaCosmos.tsx','src/NexaDepthLayer.tsx','src/NexaModuleAtmosphere.tsx']){const src=read(p);assert.match(src,/pointerEvents=["']none["']/ ,p+' must remain non-interactive');}});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const has = (file, re) => assert.match(read(file), re, file);

test('B378 GroupScreen delete override inherits the shared saveBtn border width', () => {
  has('src/GroupScreen.tsx', /style=\{\[s\.saveBtn,\s*\{\s*borderColor:/);
  has('src/styles.ts', /saveBtn:\{[^}]*borderWidth:1/);
});

test('B378 cinematic horizon glow declares its own border width', () => has('src/NexaCinematicFrame.tsx', /horizonGlow:[^\n]*borderWidth:\s*1/));
test('B378 cinematic top-left corner declares its top/left widths', () => has('src/NexaCinematicFrame.tsx', /cornerTL:[^\n]*borderTopWidth:\s*1[^\n]*borderLeftWidth:\s*1/));
test('B378 cinematic bottom-right corner declares its bottom/right widths', () => has('src/NexaCinematicFrame.tsx', /cornerBR:[^\n]*borderBottomWidth:\s*1[^\n]*borderRightWidth:\s*1/));

test('B378 Dami ring inset inherits ringInset border width', () => has('src/NexaDamiRobot.tsx', /ringInset:[^\n]*borderWidth:\s*1/));
test('B378 scene accent halo declares its border width', () => has('src/NexaSceneAccent.tsx', /halo:[^\n]*borderWidth:\s*1/));

test('B378 Yaayz featured card inherits card border width', () => has('src/styles.ts', /card:\{[^}]*borderWidth:1/));
test('B378 Yaayz Dami card inherits card border width', () => has('src/YaayzHomeFeed.tsx', /item\.kind==='ai'.*s\.card/s));
test('B378 Yaayz advert card inherits card border width', () => has('src/YaayzHomeFeed.tsx', /item\.kind==='advert'.*s\.card/s));
test('B378 Yaayz ticket card inherits card border width', () => has('src/YaayzHomeFeed.tsx', /s\.card,\{padding:0,overflow:'hidden',borderColor:/));
test('B378 Yaayz social post inherits card border width', () => has('src/YaayzSocialFeed.tsx', /s\.card,\{minHeight:420[^}]*borderColor:/));

test('B378 Zeeza visibility active override inherits visibilityButton width', () => {
  has('src/ZeezaProfile.tsx', /visibilityButtonActive:[^\n]*borderColor:/);
  has('src/ZeezaProfile.tsx', /visibilityButton:[^\n]*borderWidth:\s*1/);
});
test('B378 Zeeza chase active override inherits chaseToggle width', () => {
  has('src/ZeezaProfile.tsx', /chaseToggleOn:[^\n]*borderColor:/);
  has('src/ZeezaProfile.tsx', /chaseToggle:[^\n]*borderWidth:\s*1/);
});
test('B378 Zeeza toggle-dot active override inherits toggle-dot width', () => {
  has('src/ZeezaProfile.tsx', /toggleDotOn:[^\n]*borderColor:/);
  has('src/ZeezaProfile.tsx', /toggleDot:[^\n]*borderWidth:\s*2/);
});

test('B378 group top button has a declared border width', () => has('src/groupStyles.ts', /topBtn:\s*\{[^}]*borderWidth:\s*1/));
test('B378 group badge has a declared border width', () => has('src/groupStyles.ts', /badge:\s*\{[^}]*borderWidth:\s*1/));
test('B378 group badge variants inherit badge width', () => { has('src/groupStyles.ts', /badgeMint:\s*\{[^}]*borderColor:/); has('src/groupStyles.ts', /badgeAmber:\s*\{[^}]*borderColor:/); });
test('B378 group kind card has a declared border width', () => has('src/groupStyles.ts', /kindCard:\s*\{[^}]*borderWidth:\s*1/));
test('B378 group kind-card active override inherits width', () => has('src/groupStyles.ts', /kindCardOn:\s*\{[^}]*borderColor:/));
test('B378 group danger button override inherits small-button width', () => has('src/groupStyles.ts', /smallBtn:\s*\{[^}]*borderWidth:\s*1/));
test('B378 group chip active override inherits chip width', () => has('src/groupStyles.ts', /chip:\s*\{[^}]*borderWidth:\s*1/));
test('B378 social sub-tab active override inherits sub-tab bottom width', () => {
  has('src/socialStyles.ts', /subTab:\s*\{[^}]*borderBottomWidth:\s*2/);
  has('src/socialStyles.ts', /subTabOn:\s*\{[^}]*borderBottomColor:/);
});

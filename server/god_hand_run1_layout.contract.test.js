"use strict";
// Guards for God Hand run 1, group 4, first part (M4505 to M4509). No release number is hard-coded.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { stripTypeScriptTypes } = require("node:module");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const load = async (f) => { const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'nexa-pure-')); const code = stripTypeScriptTypes(read(f), { mode: 'strip' }); const out = path.join(dir, path.basename(f, '.ts') + '.mjs'); fs.writeFileSync(out, code); return import(pathToFileURL(out).href); };

test("M4505: small buttons reach the 44dp minimum from the shared token", () => {
  assert.match(read("src/theme.ts"), /minTouchTarget:\s*44/);
  const styles = read("src/styles.ts");
  const small = styles.match(/smallButton:\{[^}]*\}/)[0];
  assert.match(small, /minHeight:theme\.accessibility\.minTouchTarget/);
  assert.match(small, /justifyContent:'center'/);
  const store = read("src/MarketplaceStorefront.tsx");
  assert.doesNotMatch(store, /minHeight:36/, "Marketplace + Add must not stay at 36");
  assert.match(store, /marginTop:6,minHeight:theme\.accessibility\.minTouchTarget/);
});

test("M4506: keyboard overlap maths", async () => {
  const { keyboardOverlap } = await load("src/keyboardOverlap.ts");
  assert.equal(keyboardOverlap(800, null), 0, "no keyboard");
  assert.equal(keyboardOverlap(800, 500), 300, "keyboard covers the bottom 300");
  assert.equal(keyboardOverlap(500, 500), 0, "window already resized");
  assert.equal(keyboardOverlap(400, 500), 0, "box ends above the keyboard");
  assert.equal(keyboardOverlap(NaN, 500), 0);
  assert.equal(keyboardOverlap(800, Infinity), 0);
  assert.equal(keyboardOverlap(800.4, 500.2), 300);
});

test("M4506: shared keyboard wrapper covers the screens that had none; auth keeps its own", () => {
  const ks = read("src/KeyboardSafe.tsx");
  assert.match(ks, /keyboardWillShow/);
  assert.match(ks, /keyboardDidShow/);
  assert.match(ks, /measureInWindow/);
  assert.match(ks, /Platform\.OS === 'web'/);
  assert.match(ks, /from '\.\/keyboardOverlap'/);
  const bg = read("src/NexaWorldBackground.tsx");
  assert.match(bg, /import \{ KeyboardSafe \} from '\.\/KeyboardSafe'/);
  assert.match(bg, /world === 'auth' \? <View style=\{styles\.content\}>\{children\}<\/View> : <KeyboardSafe style=\{styles\.content\}>/);
  // every screen the milestone names is hosted by NexaWorldBackground (directly or through RoyalBackground)
  const hosts = {
    "src/app/(tabs)/zeeza.tsx": "NexaWorldBackground", "src/app/dami.tsx": "NexaWorldBackground",
    "src/app/(tabs)/search.tsx": "NexaWorldBackground", "src/app/wallet.tsx": "NexaWorldBackground",
    "src/app/staff.tsx": "NexaWorldBackground", "src/app/(tabs)/yaayz.tsx": "NexaWorldBackground",
    "src/app/(tabs)/marketplace.tsx": "NexaWorldBackground", "src/app/leisure/fitness/index.tsx": "NexaWorldBackground",
    "src/app/leisure/kitchen/index.tsx": "NexaWorldBackground", "src/ExtensionsScreen.tsx": "NexaWorldBackground",
  };
  for (const [file, host] of Object.entries(hosts)) assert.match(read(file), new RegExp(host), `${file} should be hosted by ${host}`);
});

test("M4507: login and signup scroll, keep keyboard handling, and keep every field", () => {
  for (const [file, fields] of [["src/app/auth/login.tsx", ["Email address", "Password"]], ["src/app/auth/signup.tsx", ["Username", "Email address", "Password"]]]) {
    const src = read(file);
    assert.match(src, /<ScrollView keyboardShouldPersistTaps="handled"/, file);
    assert.match(src, /contentContainerStyle=\{ds\(\{flexGrow:1,justifyContent:'center'/, file);
    assert.match(src, /<\/ScrollView><\/RoyalBackground><\/KeyboardAvoidingView>/, file);
    assert.match(src, /KeyboardAvoidingView/, file);
    assert.match(src, /import \{[^}]*ScrollView[^}]*\} from 'react-native'/, file);
    for (const f of fields) assert.ok(src.includes(`accessibilityLabel="${f}"`), `${file} lost the ${f} field`);
    assert.ok(src.includes("accessibilityRole=\"checkbox\""), `${file} lost the 18+ confirmation`);
  }
});

test("M4508: safe-area numbers use the phone's insets and equal the old values with no inset", async () => {
  const sa = await load("src/nexaSafeArea.ts");
  assert.deepEqual(sa.tabBarMetrics(0), { height: 76, paddingBottom: 9 });
  assert.deepEqual(sa.tabBarMetrics(undefined), { height: 76, paddingBottom: 9 });
  assert.deepEqual(sa.tabBarMetrics(24), { height: 100, paddingBottom: 33 });
  assert.deepEqual(sa.tabBarMetrics(-5), { height: 76, paddingBottom: 9 });
  assert.equal(sa.menuTopPadding(0), 44);
  assert.equal(sa.menuTopPadding(20), 44, "never closer to the top than before");
  assert.equal(sa.menuTopPadding(59), 71, "a tall notch pushes the menu down");
  assert.equal(sa.addSheetBottomPadding(0), 24);
  assert.equal(sa.addSheetBottomPadding(34), 58);
  for (const tab of ["/", "/money", "/zeeza", "/marketplace", "/yaayz", "/leisure", "/profile", "/search"]) {
    assert.equal(sa.stackBottomInset(tab, 30), 0, `${tab} is inside the dock or Home`);
  }
  for (const stack of ["/wallet", "/staff", "/dami", "/subscription", "/zeeza/inbox", "/marketplace/vendor", "/leisure/kitchen", "/auth/login", "/extensions"]) {
    assert.equal(sa.stackBottomInset(stack, 30), 30, `${stack} is a stack screen`);
  }
  assert.equal(sa.stackBottomInset("/wallet", 0), 0);
});

test("M4508: the tab bar, menu, add sheet and stack screens use the helper", () => {
  const tabs = read("src/app/(tabs)/_layout.tsx");
  assert.doesNotMatch(tabs, /height:76/);
  assert.match(tabs, /useSafeAreaInsets/);
  assert.match(tabs, /tabBarMetrics\(useSafeAreaInsets\(\)\.bottom\)/);
  const nav = read("src/NexaNavKeys.tsx");
  assert.match(nav, /menuTopPadding\(drawerInsets\.top\)/);
  assert.match(nav, /paddingBottom: drawerInsets\.bottom/);
  assert.match(nav, /addSheetBottomPadding\(addInsets\.bottom\)/);
  assert.match(nav, /stackBottomInset\(normalizePath\(providerPath\), providerInsets\.bottom\)/);
  const sa = read("src/nexaSafeArea.ts");
  assert.doesNotMatch(sa, /^import /m, "nexaSafeArea.ts stays free of imports so it can be tested alone");
});

test("M4509: the four long-text rows can shrink and keep their end control on screen", () => {
  const chase = read("src/ZeezaChase.tsx");
  assert.match(chase, /<View style=\{ds\(\{flex:1,flexShrink:1,marginRight:10\}\)\}><Text style=\{local\.chaseTitle\}>Chase preferences/);
  assert.match(chase, /<Ionicons style=\{ds\(\{flexShrink:0\}\)\} name=\{filtersOpen/);
  const market = read("src/MarketplaceScreen.tsx");
  assert.match(market, /<Text numberOfLines=\{2\} style=\{\[s\.buttonText,ds\(\{flex:1,flexShrink:1,marginRight:10\}\)\]\}>🛒 View cart/);
  assert.match(market, /<Text numberOfLines=\{1\} style=\{\[s\.buttonText,ds\(\{flexShrink:0\}\)\]\}>\{money\(/);
  const profile = read("src/app/(tabs)/profile.tsx");
  assert.match(profile, /ds\(\{flex:1,flexShrink:1,marginRight:12,color:theme\.colors\.text,fontWeight:'700'\}\)\}>\{label\}/);
  assert.match(profile, /ds\(\{flexShrink:0,color:privacy\[k\]/);
  const store = read("src/MarketplaceStorefront.tsx");
  assert.match(store, /ds\(\{flex:1,flexShrink:1,marginRight:12,color:theme\.colors\.text,fontWeight:'700'\}\)\}>\{label\}/);
  assert.match(store, /<View style=\{ds\(\{flexShrink:0,width:44,height:26/);
});

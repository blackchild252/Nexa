"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

const nav = read("src/nexaNavigation.ts");
const routes = read("src/nexaRouteInventory.ts");
const home = read("src/HomeCommandCenter.tsx");
const homeDesign = read("src/homeDesign.ts");
const keys = read("src/NexaNavKeys.tsx");
const rootLayout = read("src/app/_layout.tsx");
const tabs = read("src/app/(tabs)/_layout.tsx");
const theme = read("src/theme.ts");
const responsive = read("src/nexaResponsive.ts");
const search = read("src/UnifiedSearch.tsx");
const zeeza = read("src/app/(tabs)/zeeza.tsx");
const yaayz = read("src/YaayzScreen.tsx");
const yaayzFeed = read("src/YaayzHomeFeed.tsx");
const market = read("src/MarketplaceStorefront.tsx");
const vendor = read("src/VendorDashboard.tsx");
const money = read("src/app/(tabs)/money.tsx");
const wallet = read("src/Wallet.tsx");
const leisure = read("src/app/(tabs)/leisure.tsx");
const server = read("server/index.js");
const auth = read("server/auth.js");
const interaction = read("src/nexaInteraction.ts");

const milestones = [
  ["M1825", "primary navigation destinations use the canonical route inventory", () => {
    for (const id of ["home", "zeeza", "money", "marketplace", "yaayz", "leisure", "search", "profile", "vendor"]) {
      assert.match(nav, new RegExp(`${id}:\\s*\\{ pathname:`));
    }
    for (const route of ["/(tabs)", "/(tabs)/zeeza", "/(tabs)/money", "/(tabs)/marketplace", "/(tabs)/yaayz", "/(tabs)/leisure", "/(tabs)/search", "/(tabs)/profile", "/marketplace/vendor"]) assert.match(routes, new RegExp(route.replace(/[()\\/]/g, "\\$&")));
  }],
  ["M1826", "Home actions retain explicit destinations and action controls", () => {
    assert.match(home, /Open NEXA Add actions/);
    assert.match(home, /Open NEXA directory/);
    assert.match(home, /Open Zeeza friends/);
    assert.match(home, /Open Zeeza calling/);
    assert.match(home, /Open Business Hub/);
  }],
  ["M1827", "all Add actions resolve through one destination authority", () => {
    for (const action of ["friend", "money", "group", "product"]) assert.match(nav, new RegExp(`case '${action}':`));
    assert.match(keys, /navigationForAddAction\(action\)/);
  }],
  ["M1828", "Search entry points converge on the shared Search route", () => {
    assert.match(keys, /router\.push\('\/\(tabs\)\/search'/);
    assert.match(home, /router\.push\('\/\(tabs\)\/search'/);
    assert.match(search, /navigationForSearchResult\(r\)/);
  }],
  ["M1829", "Back and fallback behavior is explicit and Home-safe", () => {
    assert.match(keys, /decideBack\(router\.canGoBack\(\)\)/);
    assert.match(keys, /router\.replace\('\/\(tabs\)'/);
  }],
  ["M1830", "Home keeps the Royal Dark/Earth Light visual authorities", () => {
    assert.match(homeDesign, /home-command-center/);
    assert.match(homeDesign, /NEXA_HOME_CINEMATIC_BACKGROUND_V1/);
    assert.match(home, /NexaDamiRobot/);
    assert.match(theme, /Royal Fusion \/ Royal Gold Dark/);
    assert.match(theme, /Royal Fusion \/ Earth Light/);
  }],
  ["M1831", "Home directory width adapts to screen size", () => {
    assert.match(home, /useNexaResponsiveLayout/);
    assert.match(home, /directoryWidth/);
    assert.match(responsive, /const directoryWidth =/);
  }],
  ["M1832", "user/vendor actions stay in the product shell while Profile is excluded from the dock", () => {
    assert.match(tabs, /name="profile" options=\{\{title:BRAND\.profile,href:null\}\}/);
    assert.match(home, /Open Business Hub/);
    assert.match(home, /Open Yaayz/);
  }],
  ["M1833", "typography, spacing and text scaling have shared authorities", () => {
    assert.match(theme, /scaleTextStyle/);
    assert.match(theme, /NEXA_FONTS/);
    assert.match(responsive, /minimumReadableFontSize/);
    assert.match(theme, /spacing:/);
  }],
  ["M1834", "cinematic, animation and hero layers are bounded and motion-aware", () => {
    const frame = read("src/NexaCinematicFrame.tsx");
    assert.match(frame, /overflow/);
    assert.match(home, /useMotion\(\)/);
    assert.match(home, /NexaGlossyOrb/);
  }],
  ["M1835", "Royal Dark and Earth Light share behavioral route authority", () => {
    assert.match(theme, /THEMES: Record<ThemeMode, Theme>/);
    assert.match(nav, /DIRECTORY_ROUTES/);
    assert.ok(exists("src/NexaWorldBackground.tsx"));
  }],
  ["M1836", "duplicated visual components have shared visual-system authorities", () => {
    assert.ok(exists("src/nexaVisualSystem.ts"));
    assert.match(read("src/NexaWorldBackground.tsx"), /nexaVisualSystem|theme/);
  }],
  ["M1837", "theme switching restores the active route instead of losing navigation state", () => {
    assert.match(rootLayout, /lastPath/);
    assert.match(rootLayout, /router\.replace\(target/);
    assert.match(rootLayout, /key=\{(?:mode|appearance)\}/);
  }],
  ["M1838", "typography uses the canonical NEXA font authority", () => {
    assert.ok(exists("src/nexaFonts.ts"));
    assert.match(theme, /from '\.\/nexaFonts'/);
    assert.match(rootLayout, /NEXA_FONTS/);
    assert.match(read("server/typography_authority.contract.test.js"), /NEXA_FONTS/);
  }],
  ["M1839", "responsive sizing uses live dimensions and accessibility font scaling", () => {
    assert.match(responsive, /useWindowDimensions/);
    assert.match(responsive, /fontScale/);
    assert.match(responsive, /Math\.min\(.*720/);
  }],
  ["M1840", "Zeeza navigation, calls and messaging remain connected", () => {
    assert.match(zeeza, /ZeezaInbox/);
    assert.match(zeeza, /FriendsScreen/);
    assert.match(zeeza, /ZeezaChase/);
    assert.match(zeeza, /requestedThreadId|requestedRoomId/);
    assert.ok(exists("src/CallScreen.tsx"));
  }],
  ["M1841", "Yaayz feed navigation and consequential actions retain state guards", () => {
    assert.match(yaayz, /YaayzHomeFeed/);
    assert.match(yaayz, /createNexaInteractionGuard/);
    assert.match(yaayzFeed, /accessibilityLabel/);
    assert.ok(exists("src/YaayzNativeAd.tsx"));
  }],
  ["M1842", "Marketplace and Vendor flows retain product, variant and stock authorities", () => {
    assert.match(market, /onBuyNow/);
    assert.match(vendor, /Add product/);
    assert.ok(exists("server/productStock.js"));
    assert.match(read("server/productStock.js"), /function reserve/);
  }],
  ["M1843", "Sky Money and wallet state remain separated behind wallet authorities", () => {
    assert.match(money, /MoneyDashboard/);
    assert.ok(exists("src/Wallet.tsx"));
    assert.ok(exists("server/wallet.js"));
    assert.ok(exists("server/walletOperations.js"));
  }],
  ["M1844", "Leisure/L.A. routes retain their dedicated destinations", () => {
    assert.match(leisure, /NexaWorldBackground/);
    for (const route of ["ball-house", "fitness", "game-house", "kitchen"]) assert.ok(exists(`src/app/leisure/${route}/index.tsx`));
  }],
  ["M1845", "server route ownership is split into named business authorities", () => {
    for (const module of ["server/wallet.js", "server/productStock.js", "server/paymentReconciler.js", "server/vendorFulfillment.js", "server/subscriptions.js"]) assert.ok(exists(module));
    assert.match(server, /require\("\.\/wallet"\)|require\('\.\/wallet'\)/);
    assert.match(server, /paymentReconciler/);
  }],
  ["M1846", "database access enforces authenticated ownership predicates on critical resources", () => {
    assert.match(server, /WHERE userId=\?\s*ORDER BY/);
    assert.match(server, /WHERE id=\? AND userId=\?/);
    assert.match(server, /WHERE id=\? AND buyerId=\?/);
  }],
  ["M1847", "authentication and session boundaries remain server-authoritative", () => {
    assert.match(auth, /authMiddleware/);
    assert.match(auth, /SESSION_CAP/);
    assert.match(read("src/auth.tsx"), /SecureStore/);
    assert.match(read("src/auth.tsx"), /rotateAuthSession/);
  }],
  ["M1848", "cross-module interaction state has retry and duplicate-action protection", () => {
    assert.match(interaction, /tryBegin/);
    assert.match(interaction, /end/);
    assert.match(read("src/NexaDataState.tsx"), /retry/);
    assert.match(server, /idempotency/i);
  }],
  ["M1849", "cumulative regression, syntax and import contracts are present", () => {
    assert.ok(exists("server/v5_98_6_major_upgrade.contract.test.js"));
    assert.ok(exists("server/v5_94_0_navigation_continuity.contract.test.js"));
    assert.ok(exists("server/releaseConsistency.test.js"));
  }],
];

for (const [id, title, fn] of milestones) test(`${id} ${title}`, fn);

test("M1825-M1849 contract contains exactly 25 milestones", () => assert.equal(milestones.length, 25));

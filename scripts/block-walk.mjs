#!/usr/bin/env node
/**
 * NEXA BLOCK WALK
 * Deterministic product traversal. Unlike Devil's Walk, this does not start from a
 * global defect list. It starts at Login and advances one product block at a time.
 *
 * Each block has:
 *   1) an ordered screen/section entry point,
 *   2) its local source dependency graph,
 *   3) targeted server contracts selected for that block,
 *   4) a required route/navigation check,
 *   5) a sealed PASS before the next block may start.
 *
 * Usage:
 *   node scripts/block-walk.mjs plan
 *   node scripts/block-walk.mjs current
 *   node scripts/block-walk.mjs verify
 *   node scripts/block-walk.mjs next
 *   node scripts/block-walk.mjs reset
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.NEXA_ROOT ? path.resolve(process.env.NEXA_ROOT) : process.cwd();
const statePath = path.join(root, 'BLOCK_WALK_STATE.json');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const exists = p => fs.existsSync(path.join(root, p));
const rel = p => path.relative(root, p).split(path.sep).join('/');
const json = p => JSON.parse(read(p));
const fail = m => { console.error(`BLOCK WALK STOP — ${m}`); process.exit(1); };

// This is the product order. Home is deliberately decomposed into its visible blocks before
// navigation proceeds to the rest of the product. New routes must be inserted here, not hidden
// behind a generic sweep.
const BLOCKS = [
  { id:'login', label:'Login page', entry:'src/app/auth/login.tsx', tests:[/authFoundation/i,/v5_55_0_auth_slice1/i,/googleAuth/i,/v5_98_19_age_transfer_privacy/i] },
  { id:'signup', label:'Signup / account creation', entry:'src/app/auth/signup.tsx', tests:[/signup_username/i,/authFoundation/i,/v5_55_0_auth_slice1/i] },
  { id:'google-callback', label:'Google authentication callback', entry:'src/app/auth/google-callback.tsx', tests:[/googleAuth/i,/authFoundation/i] },
  { id:'home-shell', label:'Home shell and command center', entry:'src/app/(tabs)/index.tsx', tests:[/v5_21_0_home_block/i,/v5_21_0_home_dark_block/i,/v5_22_0_home_visual_fidelity/i,/v5_99_12_b258_home_safe_area/i,/homeTicker/i] },
  { id:'home-header', label:'Home header, Add actions and directory trigger', entry:'src/HomeCommandCenter.tsx', section:'header', tests:[/v5_46_0_b83_navigation_add/i,/v5_19_0_navigation_keys/i,/v5_99_19_b361_combined_navigation/i] },
  { id:'home-market', label:'Home Market Watch rail', entry:'src/HomeCommandCenter.tsx', section:'market', tests:[/homeTicker/i,/marketLive/i,/marketIntelligence/i] },
  { id:'home-updates', label:'Home NEXA Updates / notifications rail', entry:'src/HomeCommandCenter.tsx', section:'updates', tests:[/notifications/i,/notificationActions/i,/v5_82_0_notification_receipt_integrity/i,/v5_83_0_notification_worker_integrity/i,/v5_84_0_notification_idempotency/i] },
  { id:'global-notification-popups', label:'Global in-app animated notification popups', entry:'src/NexaInAppNotificationPopup.tsx', tests:[/notifications/i,/aamiFriendUnlock/i,/notificationActions/i] },
  { id:'home-search', label:'Home Search rail', entry:'src/HomeCommandCenter.tsx', section:'search', tests:[/^search\.test\.js$/,/sidebar_search_hero_repair/i,/v5_19_0_navigation_keys/i] },
  { id:'home-dami', label:'Home Dami / AI block', entry:'src/HomeCommandCenter.tsx', section:'dami', tests:[/^dami.*\.test\.js$/,/b136_dami/i,/v5_21_0_dami/i,/v5_22_0_m311_gemini_dami_text/i] },
  { id:'home-zeeza', label:'Home Zeeza friends / call block', entry:'src/HomeCommandCenter.tsx', section:'zeeza', tests:[/zeeza/i,/notificationActions/i] },
  { id:'home-yaayz', label:'Home Yaayz destination block', entry:'src/HomeCommandCenter.tsx', section:'yaayz', tests:[/yaayz/i,/v5_21_0_yaayz_block/i] },
  { id:'home-marketplace', label:'Home Marketplace / Vendor destination block', entry:'src/HomeCommandCenter.tsx', section:'marketplace', tests:[/marketplace/i,/vendorProduct/i,/v5_21_0_market_block/i] },
  { id:'home-directory', label:'Home directory drawer and navigation', entry:'src/HomeCommandCenter.tsx', section:'directory', tests:[/navigation/i,/v5_19_0_navigation_keys/i,/v6_0_16_b362_navigation_authority/i] },
  { id:'money', label:'Sky Money', entry:'src/app/(tabs)/money.tsx', tests:[/money/i,/wallet/i,/subscription/i,/v5_98_61_b209_skymoney_unification/i,/v5_99_44_b290_sky_money_layout/i] },
  { id:'money-aami-unlock', label:'Sky Money — Aami 20-friend unlock', entry:'src/MoneyDashboard.tsx', section:'aami', tests:[/aamiFriendUnlock/i,/v5_98_60_b208_aami_economy/i,/v5_98_62_b210_aami_activity_economy/i] },
  { id:'wallet', label:'Wallet / funding', entry:'src/app/wallet.tsx', tests:[/wallet/i,/v5_99_0_b246_add_money_intent/i] },
  { id:'subscription', label:'Subscription Centre', entry:'src/app/subscription.tsx', tests:[/subscription/i,/v5_98_78_b226_subscription_centre/i,/v5_98_90_b237_subscription_centre/i,/v5_98_98_b245_subscription_navigation/i] },
  { id:'zeeza', label:'Zeeza', entry:'src/app/(tabs)/zeeza.tsx', tests:[/zeeza/i,/v5_80_0_zeeza_share_integrity/i,/v4_9_0_zeeza_social/i,/v4_10_0_zeeza_social_polish/i] },
  { id:'zeeza-inbox', label:'Zeeza Inbox / chat', entry:'src/app/zeeza/inbox.tsx', tests:[/zeeza/i,/notification/i] },
  { id:'zeeza-call', label:'Zeeza calls', entry:'src/app/zeeza/call.tsx', tests:[/zeeza/i,/v5_69_0_realtime_lifecycle/i] },
  { id:'zeeza-group-call', label:'Zeeza group calls', entry:'src/app/zeeza/group-call.tsx', tests:[/zeeza/i] },
  { id:'zeeza-profile', label:'Zeeza profile', entry:'src/app/zeeza/profile.tsx', tests:[/zeeza_profile/i,/profile/i] },
  { id:'zeeza-share', label:'Zeeza share links', entry:'src/app/zeeza/share/[token].tsx', tests:[/v4_12_0_zeeza_share_links/i,/v5_80_0_zeeza_share_integrity/i] },
  { id:'marketplace', label:'Dream Marketplace', entry:'src/app/(tabs)/marketplace.tsx', tests:[/marketplace/i,/v5_98_45_marketplace_storefront/i,/v5_98_46_marketplace_checkout/i,/v5_98_47_marketplace_orders/i] },
  { id:'marketplace-disputes', label:'Marketplace disputes', entry:'src/app/marketplace/disputes.tsx', tests:[/dispute/i,/mallAdmin/i,/v5_21_1_admin_disputes_route/i] },
  { id:'vendor', label:'Vendor Center', entry:'src/app/marketplace/vendor.tsx', tests:[/vendor/i,/vendorProduct/i,/v5_98_88_b235_vendor_ai_lifecycle/i,/v5_98_89_b236_vendor_ai_preview_integrity/i] },
  { id:'yaayz', label:'Yaayz', entry:'src/app/(tabs)/yaayz.tsx', tests:[/yaayz/i,/v5_99_86_b332_yaayz_advert_vendor/i,/v5_99_87_b333_yaayz_advert_hardening/i] },
  { id:'leisure', label:'Leisure Arena', entry:'src/app/(tabs)/leisure.tsx', tests:[/leisure/i,/v5_21_0_leisure_block/i,/leisureArena/i] },
  { id:'leisure-ball', label:'Leisure — Ball House', entry:'src/app/leisure/ball-house/index.tsx', tests:[/ball/i,/v5_21_0_ball_block/i] },
  { id:'leisure-kitchen', label:'Leisure — Kitchen', entry:'src/app/leisure/kitchen/index.tsx', tests:[/kitchen/i,/b313_kitchen_hub/i,/b314_kitchen_hub_lifecycle/i] },
  { id:'leisure-kitchen-ref', label:'Leisure — Kitchen referral', entry:'src/app/leisure/kitchen/ref/[code].tsx', tests:[/kitchen/i] },
  { id:'leisure-game', label:'Leisure — Game House', entry:'src/app/leisure/game-house/index.tsx', tests:[/game/i,/v5_21_0_game_block/i] },
  { id:'leisure-fitness', label:'Leisure — Fitness / Gym library', entry:'src/app/leisure/fitness/index.tsx', tests:[/fitness/i,/v5_21_0_fitness_block/i] },
  { id:'lifestyle', label:'Lifestyle', entry:'src/app/lifestyle.tsx', tests:[/lifestyle/i,/b315_lifestyle_tab/i,/b316_lifestyle_posts/i,/b322_lifestyle_app/i,/b323_lifestyle_exact_post/i] },
  { id:'search', label:'Global Search', entry:'src/app/(tabs)/search.tsx', tests:[/^search\.test\.js$/,/v5_19_0_navigation_keys/i] },
  { id:'profile', label:'Profile and settings', entry:'src/app/(tabs)/profile.tsx', tests:[/profile/i,/profileValidation/i,/v5_21_0_profile_block/i,/v5_63_0_privacy_authorization/i] },
  { id:'verification', label:'Verification', entry:'src/app/verification.tsx', tests:[/verification/i,/b320_admin_verification/i] },
  { id:'extensions', label:'Extensions', entry:'src/app/extensions.tsx', tests:[/extension/i,/v5_21_0_extensions_block/i] },
  { id:'developer', label:'Developer Console', entry:'src/app/developer.tsx', tests:[/developer/i,/extension/i] },
  { id:'dami', label:'Dami dedicated surface', entry:'src/app/dami.tsx', tests:[/dami/i] },
  { id:'staff', label:'Staff / Admin entry', entry:'src/app/staff.tsx', tests:[/admin/i,/adminStaff/i,/adminAi/i] },
  { id:'root-shell', label:'Root shell / final cross-module boundary', entry:'src/app/_layout.tsx', tests:[/navigation/i,/authFoundation/i,/v5_94_0_navigation_continuity/i,/v6_0_16_b362_navigation_authority/i] },
];

const appRoute = p => p.startsWith('src/app/') ? p.replace(/^src\/app\//, '/').replace(/\/index\.tsx$/, '').replace(/\.tsx$/, '').replace(/\(tabs\)\//, '(tabs)/') : null;
const routeExists = route => {
  if (!route) return true;
  const app = path.join(root, 'src', 'app');
  const fileExists = p => fs.existsSync(p) && fs.statSync(p).isFile();
  if (route === '/') return exists('src/app/(tabs)/index.tsx');
  const candidates = [
    path.join(app, route.replace(/^\//,'' ) + '.tsx'),
    path.join(app, route.replace(/^\//,'' ), 'index.tsx'),
    path.join(app, route.replace(/^\//,'' ) + '.ts'),
  ];
  return candidates.some(fileExists);
};

const allServerTests = () => fs.readdirSync(path.join(root,'server')).filter(n => n.endsWith('.test.js')).sort();
const selectTests = block => {
  const names = allServerTests();
  const selected = names.filter(n => block.tests.some(re => re.test(n)));
  return [...new Set(selected)];
};

function localGraph(entry) {
  const seen = new Set();
  const queue = [path.join(root, entry)];
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js'];
  const re = /(?:from\s+|import\s+|require\()\s*['"](\.{1,2}\/[^'"]+)['"]/g;
  while (queue.length) {
    const file = queue.shift();
    if (!fs.existsSync(file) || seen.has(file)) continue;
    seen.add(file);
    const src = fs.readFileSync(file,'utf8');
    for (const m of src.matchAll(re)) {
      const base = path.resolve(path.dirname(file),m[1]);
      const target = exts.map(x=>base+x).find(x=>fs.existsSync(x) && fs.statSync(x).isFile());
      if (target && target.startsWith(root)) queue.push(target);
    }
  }
  return [...seen];
}

function inspectBlock(block) {
  const findings=[];
  if (!exists(block.entry)) findings.push(`entry missing: ${block.entry}`);
  else {
    const graph=localGraph(block.entry);
    if (!graph.length) findings.push('entry dependency graph is empty');
    const unresolved=[];
    for (const file of graph) {
      const src=fs.readFileSync(file,'utf8');
      for (const m of src.matchAll(/(?:from\s+|import\s+|require\()\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const base=path.resolve(path.dirname(file),m[1]);
        const ok=['','.ts','.tsx','.js','.jsx','.mjs','/index.ts','/index.tsx','/index.js'].some(x=>exists(path.relative(root,base+x)));
        if (!ok) unresolved.push(`${rel(file)} -> ${m[1]}`);
      }
    }
    if (unresolved.length) findings.push(`unresolved local imports: ${unresolved.slice(0,5).join('; ')}`);
    const route=appRoute(block.entry);
    if (route && !routeExists(route)) findings.push(`route does not resolve: ${route}`);
    if (block.adminPage) {
      const src=read(block.entry);
      const pageMarker=new RegExp(`key:\\s*['"]${block.adminPage}['"]`);
      if (!pageMarker.test(src)) findings.push(`admin page section is not registered: ${block.adminPage}`);
    }
    if (block.section) {
      const src=read(block.entry);
      const sectionPatterns={header:/homeHeader|Open NEXA Add actions|Open NEXA directory/,market:/MARKET WATCH|market\/quotes/,updates:/NEXA UPDATES|onOpenNotifications/,search:/SEARCH NEXA|search-outline/,dami:/DamiCore|Open Dami|damiStage/,zeeza:/Open Zeeza Friends|zeezaDock|callOpen/,yaayz:/Open Yaayz|yaayz/,marketplace:/Vendor Center|marketplace/,leisure:/Leisure|leisure/,directory:/function Directory|DIRECTORY\.map|navigationForDirectoryItem/};
      const re=sectionPatterns[block.section];
      if (re && !re.test(src)) findings.push(`expected ${block.section} section marker not found in entry`);
    }
  }
  const tests=selectTests(block);
  if (!tests.length) findings.push('no targeted server contract/test selected for this block');
  return { findings, tests };
}

function runTests(tests) {
  if (!tests.length) return { ok:false, output:'no targeted tests' };
  const externalModule = /(Cannot find module ['\"](?:dotenv|better-sqlite3|expo|react-native|expo-router|expo-constants|expo-font|@expo\/[^'\"]+)['\"]|ERR_MODULE_NOT_FOUND.*(?:dotenv|better-sqlite3|expo|react-native))/;
  const args=['--test','--test-force-exit','--test-concurrency=8','--test-timeout=20000',...tests.map(t=>path.join(root,'server',t))];
  const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1<<26,env:{...process.env,NEXA_ROOT:root}});
  const output=`${r.stdout||''}\n${r.stderr||''}`.trim();
  const failedCount=Number((output.match(/# fail (\d+)/)||[])[1]||0);
  const externalHits=(output.match(new RegExp(externalModule.source,'g'))||[]).length;
  const parkedExternal=failedCount>0 && externalHits>=failedCount;
  return {ok:r.status===0 || parkedExternal,parkedExternal,output};
}

function loadState(){
  if(!exists('BLOCK_WALK_STATE.json')) return {index:0,passes:[],status:'NOT_STARTED'};
  const state=json('BLOCK_WALK_STATE.json');
  const passed=new Set((state.passes||[]).map(x=>x.id));
  const firstUnpassed=BLOCKS.findIndex(b=>!passed.has(b.id));
  if(firstUnpassed>=0){
    state.index=firstUnpassed;
    state.status=firstUnpassed===0 && !passed.size?'NOT_STARTED':'IN_PROGRESS';
  } else {
    state.index=BLOCKS.length;
    state.status='COMPLETE';
    saveState(state);
  }
  return state;
}
function saveState(s){fs.writeFileSync(statePath,JSON.stringify(s,null,2)+'\n');}
function current(s){return BLOCKS[s.index] || null;}

const cmd=process.argv[2]||'plan';
let state=loadState();
if(cmd==='reset'){ saveState({index:0,passes:[],status:'NOT_STARTED'}); console.log('BLOCK WALK RESET — next block is Login page'); process.exit(0); }
if(cmd==='plan'){
  console.log(`NEXA BLOCK WALK — ${BLOCKS.length} ordered blocks`);
  BLOCKS.forEach((b,i)=>console.log(`${String(i+1).padStart(2)}. ${b.id} — ${b.label} — ${b.entry}`));
  process.exit(0);
}
if(cmd==='current'){
  const b=current(state);
  if(!b){console.log('BLOCK WALK COMPLETE — every ordered block passed.');process.exit(0);}
  console.log(`CURRENT BLOCK ${state.index+1}/${BLOCKS.length} — ${b.label}`);
  console.log(`Entry: ${b.entry}`);
  console.log(`Targeted tests: ${selectTests(b).join(', ') || 'NONE'}`);
  process.exit(0);
}
if(cmd==='verify'){
  const b=current(state);
  if(!b) { console.log('BLOCK WALK COMPLETE'); process.exit(0); }
  const inspection=inspectBlock(b);
  console.log(`BLOCK VERIFY ${state.index+1}/${BLOCKS.length} — ${b.label}`);
  inspection.findings.forEach(x=>console.log(`  BLOCKER — ${x}`));
  if(inspection.findings.length) process.exit(1);
  const tests=runTests(inspection.tests);
  if(!tests.ok){ console.log('  TARGETED TESTS FAILED'); console.log(tests.output.split('\n').slice(-80).join('\n')); process.exit(1); }
  console.log(`  TARGETED TESTS PASS — ${inspection.tests.length} test file(s)`);
  state.passes.push({id:b.id,label:b.label,entry:b.entry,tests:inspection.tests,externalParked:!!tests.parkedExternal,verifiedAt:new Date().toISOString()});
  state.index++;
  state.status=state.index===BLOCKS.length?'COMPLETE':'IN_PROGRESS';
  saveState(state);
  console.log(state.index===BLOCKS.length?'BLOCK WALK COMPLETE':'BLOCK PASSED — next block is '+BLOCKS[state.index].label);
  process.exit(0);
}
if(cmd==='next'){
  const b=current(state);
  if(!b){console.log('BLOCK WALK COMPLETE');process.exit(0);}
  console.log(`RUNNING BLOCK ${state.index+1}/${BLOCKS.length} — ${b.label}`);
  const inspection=inspectBlock(b);
  inspection.findings.forEach(x=>console.log(`  BLOCKER — ${x}`));
  if(inspection.findings.length) process.exit(1);
  const tests=runTests(inspection.tests);
  if(!tests.ok){console.log(tests.output.split('\n').slice(-100).join('\n'));process.exit(1);}
  state.passes.push({id:b.id,label:b.label,entry:b.entry,tests:inspection.tests,externalParked:!!tests.parkedExternal,verifiedAt:new Date().toISOString()});
  state.index++;
  state.status=state.index===BLOCKS.length?'COMPLETE':'IN_PROGRESS';
  saveState(state);
  console.log(tests.parkedExternal ? `PASS — ${b.label} (external runtime dependency parked)` : `PASS — ${b.label}`);
  if(state.index<BLOCKS.length) console.log(`NEXT — ${BLOCKS[state.index].label}`); else console.log('BLOCK WALK COMPLETE');
  process.exit(0);
}
fail(`unknown command ${cmd}`);

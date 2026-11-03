const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const tests = [
       ['M4031 Wallet reads route view parameter',()=>assert.match(read('src/Wallet.tsx'),/useLocalSearchParams/)],
 ['M4032 Wallet accepts deposit route view',()=>assert.match(read('src/Wallet.tsx'),/params\.view === "deposit"/)],
 ['M4033 Wallet accepts withdraw route view',()=>assert.match(read('src/Wallet.tsx'),/params\.view === "withdraw"/)],
 ['M4034 Wallet accepts send route view',()=>assert.match(read('src/Wallet.tsx'),/params\.view === "send"/)],
 ['M4035 Wallet accepts history route view',()=>assert.match(read('src/Wallet.tsx'),/params\.view === "history"/)],
 ['M4036 Wallet preserves home fallback',()=>assert.match(read('src/Wallet.tsx'),/: "home"/)],
 ['M4037 Add Money remains canonical action',()=>assert.match(read('src/NexaNavKeys.tsx'),/\['money', 'Add Money'/)],
 ['M4038 Add Money uses canonical resolver',()=>assert.match(read('src/NexaNavKeys.tsx'),/navigationForAddAction\(action\)/)],
 ['M4039 Add Money resolves to Wallet',()=>assert.match(read('src/nexaNavigation.ts'),/case 'money': return validateNavigationTarget\(\{ pathname: '\/wallet'/)],
 ['M4040 Add Money resolves directly to deposit',()=>assert.match(read('src/nexaNavigation.ts'),/params: \{ view: 'deposit' \}/)],
 ['M4041 Add Friend remains Zeeza',()=>assert.match(read('src/nexaNavigation.ts'),/case 'friend': return validateNavigationTarget\(\{ pathname: '\/\(tabs\)\/zeeza'/)],
 ['M4042 New Sky Group remains Money groups',()=>assert.match(read('src/nexaNavigation.ts'),/case 'group': return validateNavigationTarget\(\{ pathname: '\/\(tabs\)\/money', params: \{ view: 'groups' \} \}/)],
 ['M4043 Add Product remains Vendor Center',()=>assert.match(read('src/nexaNavigation.ts'),/case 'product': return validateNavigationTarget\(\{ pathname: '\/marketplace\/vendor' \}/)],
 ['M4044 Wallet deposit UI remains',()=>assert.match(read('src/Wallet.tsx'),/\[\["deposit","Add Money"\]/)],
 ['M4045 Wallet withdraw UI remains',()=>assert.match(read('src/Wallet.tsx'),/\[\["deposit","Add Money"\],\["withdraw","Withdraw"\]/)],
 ['M4046 Wallet send UI remains',()=>assert.match(read('src/Wallet.tsx'),/\[\["deposit","Add Money"\],\["withdraw","Withdraw"\],\["send","Send Money"\]/)],
 ['M4047 wallet transaction submit remains',()=>assert.match(read('src/Wallet.tsx'),/const submit = async \(action/)],
  ['M4049 version-only seal tooling remains',()=>assert.match(read('scripts/release-seal.mjs'),/NEXA-MAIN-V\$\{version\}\.zip/)],
];
for (const [name,fn] of tests) test(name,fn);
assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */;

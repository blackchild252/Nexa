const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const expected = [
  ['src/StoreAjo.tsx','Loading savings options'],
  ['src/auth.tsx','Restoring your NEXA session'],
  ['src/RoomScreen.tsx','Loading room messages'],
  ['src/ZeezaThreadScreen.tsx','Loading conversation messages'],
  ['src/Subscription.tsx','Loading subscription information'],
  ['src/MarketplaceScreen.tsx','Loading more marketplace products'],
  ['src/LeisureKitchenScreen.tsx','Loading Kitchen orders'],
  ['src/ExtensionDeveloperScreen.tsx','Loading developer extensions'],
  ['src/StaffScreen.tsx','Loading staff records'],
  ['src/GroupsTab.tsx','Loading groups'],
  ['src/GroupScreen.tsx','Loading group details'],
  ['src/KitchenHub.tsx','Loading Kitchen'],
  ['src/MarketplaceStorefront.tsx','Loading product options'],
  ['src/MarketplaceStorefront.tsx','Loading saved marketplace items'],
  ['src/NexaAI.tsx','Loading Dami action history'],
  ['src/FriendsScreen.tsx','Searching for friends'],
  ['src/FriendsScreen.tsx','Loading friends'],
  ['src/GetVerifiedScreen.tsx','Loading verification status'],
  ['src/LifestyleScreen.tsx','Loading comments'],
  ['src/LifestyleScreen.tsx','profile photo'],
  ['src/ZeezaInbox.tsx','Loading Zeeza conversations'],
  ['src/ZeezaInbox.tsx','Loading Zeeza rooms'],
  ['src/MoneyDashboard.tsx','Loading money dashboard'],
  ['src/ExtensionsScreen.tsx','Loading extensions'],
  ['src/Wallet.tsx','Loading Sky Money wallet'],
  ['src/ZeezaChase.tsx','Loading Zeeza Chase profiles'],
  ['src/FinancialPlanning.tsx','Loading financial planning data'],
  ['src/VendorDashboard.tsx','Loading vendor account'],
];

for (const [file, label] of expected) {
  test(`B369 status accessibility: ${file} exposes ${label}`, () => {
    const s = read(file);
    assert.match(s, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
}

test('B369 standalone progress indicators use an accessible progressbar role', () => {
  const files = expected.map(([f]) => f).filter((f,i,a)=>a.indexOf(f)===i);
  for (const f of files) {
    const s = read(f);
    if (/Loading|Searching/.test(s)) assert.ok(s.includes('accessibilityRole="progressbar"') || f==='src/LifestyleScreen.tsx', `${f} has status text but no progressbar role`);
  }
});

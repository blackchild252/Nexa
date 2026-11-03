const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const checks = [
 ['Yaayz loading has progress semantics','src/YaayzSocialFeed.tsx','Loading Yaayz posts'],
 ['Yaayz refresh has button role','src/YaayzSocialFeed.tsx','accessibilityRole="button" accessibilityLabel="Refresh Yaayz social feed"'],
 ['Yaayz retry is labelled','src/YaayzSocialFeed.tsx','accessibilityLabel="Retry Yaayz social feed"'],
 ['Yaayz comment field is contextual','src/YaayzSocialFeed.tsx','accessibilityLabel={`Comment on Yaayz post by ${post.authorName||\'NEXA user\'}`}'],
 ['Dami workflows loading is announced','src/NexaAI.tsx','Loading saved Dami workflows'],
 ['Dami workflow history loading is announced','src/NexaAI.tsx','Loading workflow history for'],
 ['Dami response loading is announced','src/NexaAI.tsx','Waiting for ${NEXA_AI_NAME} response'],
 ['Staff join progress is announced','src/StaffScreen.tsx','Joining shop staff team'],
 ['Zeeza profile loading is announced','src/ZeezaProfile.tsx','Loading Zeeza profile'],
 ['Zeeza profile loading is polite','src/ZeezaProfile.tsx','accessibilityLiveRegion="polite"'],
 ['Zeeza Chase comment is contextual','src/ZeezaChase.tsx','accessibilityLabel={`Comment on ${user.name}`}'],
 ['Lifestyle comment is contextual','src/LifestyleScreen.tsx','accessibilityLabel={`Comment on ${post.author.name}`}'],
 ['Subscription loading is polite','src/Subscription.tsx','accessibilityLiveRegion="polite"'],
 ['Subscription loading has progress role','src/Subscription.tsx','accessibilityRole="progressbar"'],
 ['Subscription loading has label','src/Subscription.tsx','Loading subscription information'],
 ['Dami main message field remains labelled','src/NexaAI.tsx','accessibilityLabel={`Message ${NEXA_AI_NAME}`}'],
 ['Dami send remains labelled','src/NexaAI.tsx','accessibilityLabel="Send message to Dami"'],
 ['Dami live voice remains labelled','src/NexaAI.tsx','Start live voice'],
 ['Dami recorded voice remains labelled','src/NexaAI.tsx','Record a voice command'],
 ['Staff invite remains labelled','src/StaffScreen.tsx','accessibilityLabel="Shop staff invite code"'],
 ['Friends search remains labelled','src/FriendsScreen.tsx','accessibilityLabel="Search friends by username"'],
 ['Verification details remains labelled','src/GetVerifiedScreen.tsx','Details for ${title} verification'],
 ['Lifestyle error is a live region','src/LifestyleScreen.tsx','accessibilityLiveRegion="polite"'],
 ['Marketplace loading-more has progress semantics','src/MarketplaceScreen.tsx','Loading more marketplace products'],
 ['Room message loading has progress semantics','src/RoomScreen.tsx','Loading room messages'],
];
for (const [name,file,needle] of checks) {
 const s=read(file);
 assert(s.includes(needle), `${name}: missing ${needle}`);
}
console.log(`B370 accessibility/status contract: ${checks.length}/${checks.length} PASS`);

# B315 report (V5.99.69)

## Built
- New Lifestyle tab in the dock (route /lifestyle, label "Lifestyle", icon images-outline). Uses the Leisure scene background.
- src/LifestyleScreen.tsx: "Your moment" plus the real friend list (names, profile photos or initials), a feed area, and an honest empty state.
- Two round buttons at the bottom right: upper small = post a recent photo or video (photo library); lower large = take a new photo or video (camera).
- Your own new posts appear at the top of the feed, marked "on this phone only".
- app.json: camera and microphone wording added to the image picker plugin.
- Roadmap 1 and 2 checked: nationality is required (form and server) and the country field already reads "Neighbouring country". No code change needed.

## Tested (PASSED)
- Contract tests: server/b315_lifestyle_tab.contract.test.js plus the tab, layout, navigation, Chase and Kitchen Hub contract tests (53 passed, 0 failed).

## NOT tested
- TypeScript typecheck and the full server test suite (no node_modules in this environment).
- Any phone run: camera, photo library, video picking, layout on a real screen, Earth Light theme look.

## DEFERRED
- Saving posts and showing friends' real posts (needs a server posts route, privacy rules, and file storage for photos and videos).
- Videos show as a still frame with a play mark; no video playback yet.
- Lifestyle is not yet in the side-menu directory list.

## Next
- Server posts route and friend feed; phone check of the Lifestyle tab.

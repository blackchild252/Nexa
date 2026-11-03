# Yaayz Home — AdMob Integration (V5.23.0)

## Scope
Google AdMob is scoped to the Yaayz Home page only. No Google ad component is mounted on Yaayz ticket browsing/checkout, YaayzAdvert browsing, other NEXA modules, or the NEXA Home command center.

## Implementation
- `src/YaayzHomeFeed.tsx` is the new Home-only feed composer. It treats native ads as explicit sponsored feed items rather than a hard-coded ad stack.
- `src/YaayzNativeAd.tsx` owns the native AdMob presentation.
- `src/YaayzScreen.tsx` mounts three native-ad slots only inside `mode === "home"`.
- `app.json` includes the `react-native-google-mobile-ads` Expo config plugin.
- `react-native-google-mobile-ads` is pinned to `16.5.0`, matching the current Expo 54 / React Native 0.81.5 baseline.
- Production Android AdMob App ID and Yaayz Native Ad Unit ID supplied by the owner are now wired. iOS remains on the existing test App ID until an iOS production App ID is supplied.

## UX
The Home surface presents a vertically scrollable sponsored-discovery area. Native media, headline, body and CTA assets are rendered using the Google native-ad contract, with visible `SPONSORED` attribution. Google controls the served creative; NEXA controls the surrounding presentation.

## Validation
- Yaayz/AdMob focused contract suite: **4/4 PASS** in this patch; prior **19/19 PASS** baseline preserved.
- Release audit: **PASS — 5.23.0**.
- Live AdMob network/build validation: **NOT TESTED** because a native development build and production IDs are not yet available.
- npm lockfile regeneration: **BLOCKED / CARRY-FORWARD** because registry access timed out during installation; the lockfile was not fabricated.

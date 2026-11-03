// Web preview stand-in: Google native ads only exist in the mobile app.
// Metro picks this file instead of YaayzNativeAd.tsx for web builds, so the
// native-only `react-native-google-mobile-ads` module is never bundled for web.
export function YaayzNativeAd(_props: {index?: number}) {
  return null;
}

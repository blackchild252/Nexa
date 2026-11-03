import React, {useEffect, useState} from 'react';
import {Image, Platform, Text, View} from 'react-native';
import {
  NativeAdEventType,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
  useNativeAd,
} from 'react-native-google-mobile-ads';
import mobileAds from 'react-native-google-mobile-ads';
import {ds, theme} from './theme';
import {NexaPressable} from './motion';
import {prepareAdConsent} from './adConsent';

// Production native ad units: one per platform, each belonging to its own AdMob app (the iOS app ID is in app.json).
const ANDROID_NATIVE_AD_UNIT_ID = 'ca-app-pub-9908588255141470/7710261131';
const IOS_NATIVE_AD_UNIT_ID = 'ca-app-pub-9908588255141470/6735627793';
const NATIVE_AD_UNIT_ID = Platform.OS === 'ios' ? IOS_NATIVE_AD_UNIT_ID : ANDROID_NATIVE_AD_UNIT_ID;

/**
 * Yaayz Home-only AdMob surface.
 *
 * This component deliberately lives outside the generic NEXA shell so Google ads
 * cannot accidentally appear in other modules. Production ad unit IDs are set per platform above.
 */
export function YaayzNativeAd({index = 0}: {index?: number}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [consentReady, setConsentReady] = useState(false);
  const {status, nativeAd, retry} = useNativeAd({
    adUnitId: NATIVE_AD_UNIT_ID,
    autoLoad: sdkReady && consentReady,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const consent = await prepareAdConsent();
        if (!mounted) return;
        setConsentReady(consent.canRequestAds);
        if (!consent.canRequestAds) return;
        await mobileAds().initialize();
        if (mounted) setSdkReady(true);
      } catch {
        if (mounted) { setConsentReady(false); setSdkReady(false); }
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!nativeAd) return;
    const paid = nativeAd.addAdEventListener(NativeAdEventType.PAID, () => {
      // Revenue telemetry can be connected to the existing NEXA observability
      // boundary later; never log or expose advertiser/payment identifiers here.
    });
    return () => paid.remove();
  }, [nativeAd]);

  if (!nativeAd) {
    if ((status === 'error' || status === 'no-fill') && sdkReady && index === 0) {
      return (
        <View style={ds({marginTop: 12, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface})}>
          <Text style={ds({color: theme.colors.muted, fontSize: 14, fontWeight: '800'})}>YAAYZ SPONSORED</Text>
          <Text style={ds({color: theme.colors.text, marginTop: 4, fontWeight: '700'})}>Ads are temporarily unavailable.</Text>
          <NexaPressable accessibilityRole="button" accessibilityLabel="Retry Yaayz sponsored ad" onPress={retry} style={ds({minHeight:44,justifyContent:'center',marginTop:4})}><Text style={ds({color: theme.colors.goldBright, fontWeight: '900'})}>Try again</Text></NexaPressable>
        </View>
      );
    }
    return null;
  }

  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={ds({marginTop: 12, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surface})}
    >
      <View style={ds({padding: 14})}>
        <View style={ds({flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10})}>
          <Text style={ds({color: theme.colors.goldBright, fontSize: 15, fontWeight: '900', letterSpacing: 1})}>SPONSORED</Text>
          {nativeAd.icon ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image accessible accessibilityRole="image" accessibilityLabel="Advertiser icon" source={{uri: nativeAd.icon.url}} style={ds({width: 34, height: 34, borderRadius: 10})} />
            </NativeAsset>
          ) : null}
        </View>

        <NativeMediaView resizeMode="cover" style={ds({width: '100%', minHeight: 220, borderRadius: 18, overflow: 'hidden'})} />

        <NativeAsset assetType={NativeAssetType.HEADLINE}>
          <Text style={ds({color: theme.colors.text, fontSize: 22, fontWeight: '900', marginTop: 12})}>{nativeAd.headline}</Text>
        </NativeAsset>

        {nativeAd.body ? (
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text style={ds({color: theme.colors.muted, fontSize: 16, lineHeight: 20, marginTop: 7})}>{nativeAd.body}</Text>
          </NativeAsset>
        ) : null}

        {nativeAd.cta ? (
          <NativeAsset assetType={NativeAssetType.CTA}>
            <Text style={ds({alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: theme.colors.goldBright, color: '#000000', fontWeight: '900'})}>{nativeAd.cta}</Text>
          </NativeAsset>
        ) : null}
      </View>
    </NativeAdView>
  );
}

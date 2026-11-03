import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { theme } from './theme';
import { API_BASE } from './api';

export const NEXA_DEMO_MODE = typeof __DEV__ !== 'undefined' ? (__DEV__ || process.env.EXPO_PUBLIC_NEXA_DEMO_MODE === '1') : process.env.EXPO_PUBLIC_NEXA_DEMO_MODE === '1';

export function NexaDemoBanner() {
  const [serverPreview, setServerPreview] = useState(false);
  useEffect(() => {
    if (!NEXA_DEMO_MODE || !API_BASE) return;
    let live = true;
    fetch(`${API_BASE}/api/demo/status`, { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : null)
      .then(v => { if (live) setServerPreview(Boolean(v?.previewMode)); })
      .catch(() => { if (live) setServerPreview(false); });
    return () => { live = false; };
  }, []);
  if (!NEXA_DEMO_MODE || !serverPreview) return null;
  return <View pointerEvents="none" accessibilityRole="text" accessibilityLabel="NEXA preview mode. Demo data is displayed. Blaca Essentials and other preview fixtures are not real customer data." style={{ position:'absolute', top:8, right:8, zIndex:9999, paddingHorizontal:10, paddingVertical:6, borderRadius:999, borderWidth:1, borderColor:theme.colors.goldBright, backgroundColor:'rgba(8,10,14,0.92)' }}><Text style={{ color:theme.colors.goldBright, fontSize:12, fontWeight:'800' }}>DEMO DATA</Text></View>;
}

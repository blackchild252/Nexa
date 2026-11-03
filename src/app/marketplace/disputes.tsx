import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text,  View } from 'react-native';
import { NexaPressable } from '../../motion';
import { AdminDisputesScreen } from '../../AdminDisputesScreen';
import { adminStatus } from '../../marketplace';
import { nexaGoBack } from '../../NexaNavKeys';
import { theme } from '../../theme';

// Administrative Director disputes route. Reached only from the Administrative Director-only "Administrative Director disputes" button in
// Dream Marketplace. The server (requireMallAdmin) is the real gate; this check only keeps a
// deep link from showing an empty admin screen to someone who is not an Administrative Director.
export default function AdminDisputesRoute() {
  const [state, setState] = useState<'checking' | 'admin' | 'denied'>('checking');
  useEffect(() => {
    let live = true;
    adminStatus()
      .then((r: any) => { if (live) setState(r?.isAdmin ? 'admin' : 'denied'); })
      .catch(() => { if (live) setState('denied'); });
    return () => { live = false; };
  }, []);
  if (state === 'admin') return <AdminDisputesScreen onBack={() => nexaGoBack()} />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 }}>
      {state === 'checking'
        ? <ActivityIndicator color={theme.colors.royalGold} />
        : <NexaPressable accessibilityRole="button" accessibilityLabel="Back from administrator access check" onPress={() => nexaGoBack()}><Text style={{ color: theme.colors.text, textAlign: 'center' }}>Administrative Director access required. Tap to go back.</Text></NexaPressable>}
    </View>
  );
}

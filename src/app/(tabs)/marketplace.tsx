import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../auth';
import { MarketplaceScreen } from '../../MarketplaceScreen';
import { NexaWorldBackground } from '../../NexaWorldBackground';

// The master Dream Marketplace tab mounts the complete customer storefront.
// Vendor/staff operations remain available through the existing /staff route.
export default function MarketplaceRoute() {
  const { user } = useAuth();
  const params=useLocalSearchParams<{search?:string;orderId?:string;tab?:string}>();
  const initialSearch=Array.isArray(params.search)?params.search[0]:params.search;
  return <NexaWorldBackground world="dream-marketplace"><MarketplaceScreen user={user||undefined} initialSearch={initialSearch} initialOrderId={params.orderId as string|undefined} initialTab={params.tab as string|undefined} onVendor={() => router.push('/marketplace/vendor' as any)} onAdmin={() => router.push('/marketplace/disputes' as any)} /></NexaWorldBackground>;
}

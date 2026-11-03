import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { VendorDashboard } from '../../VendorDashboard';
import { NexaWorldBackground } from '../../NexaWorldBackground';
import { nexaGoBack } from '../../NexaNavKeys';
// the vendor dashboard is part of Dream Marketplace, so it lives in the Dream Marketplace world.
export default function VendorRoute(){const p=useLocalSearchParams<{tab?:string|string[];orderId?:string|string[]}>();const tab=Array.isArray(p.tab)?p.tab[0]:p.tab;const orderId=Array.isArray(p.orderId)?p.orderId[0]:p.orderId;return <NexaWorldBackground world="dream-marketplace"><VendorDashboard onBack={()=>nexaGoBack()} initialTab={tab} initialOrderId={orderId}/></NexaWorldBackground>;}

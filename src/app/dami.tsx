import React from 'react';
import { NexaAI } from '../NexaAI';
import { router } from 'expo-router';
import { navigationForDamiDestination } from '../nexaNavigation';
import { NexaWorldBackground } from '../NexaWorldBackground';
import { nexaGoBack } from '../NexaNavKeys';

type Nav = 'home'|'money'|'money_wallet'|'money_planning'|'money_store_savings'|'money_group_savings'|'money_market'|'money_insights'|'zeeza'|'marketplace'|'vendor'|'yaayz'|'leisure'|'none';
export default function Dami(){
  const navigate=(nav:Nav)=>{
    const target=navigationForDamiDestination(nav);
    if(!target) return;
    if(nav==='home') router.replace(target as any);
    else router.push(target as any);
  };
  return <NexaWorldBackground world="dami"><NexaAI embedded onBack={nexaGoBack} onNavigate={navigate} onClose={()=>router.replace('/(tabs)' as any)} /></NexaWorldBackground>;
}

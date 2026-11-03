import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { LeisureKitchenScreen } from '../../../LeisureKitchenScreen';
import { NexaWorldBackground } from '../../../NexaWorldBackground';

export default function Kitchen(){
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  return <NexaWorldBackground world="kitchen"><LeisureKitchenScreen initialReferral={typeof ref === 'string' ? ref : undefined} /></NexaWorldBackground>;
}

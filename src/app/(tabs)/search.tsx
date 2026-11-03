import React from 'react';
import { UnifiedSearch } from '../../UnifiedSearch';
import { NexaWorldBackground } from '../../NexaWorldBackground';
import { nexaGoBack } from '../../NexaNavKeys';

export default function SearchTab(){
  return <NexaWorldBackground world="search"><UnifiedSearch onClose={nexaGoBack} /></NexaWorldBackground>;
}

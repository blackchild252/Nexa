import React from 'react';
import { Wallet } from '../Wallet';
import { NexaWorldBackground } from '../NexaWorldBackground';
// Wallet is a Sky Money screen, so it lives in the Sky Money world (Royal Dark vault layer / Earth Light coins + growth bars).
export default function WalletRoute(){ return <NexaWorldBackground world="sky-money"><Wallet/></NexaWorldBackground>; }

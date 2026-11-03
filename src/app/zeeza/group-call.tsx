import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { GroupCallScreen } from '../../GroupCallScreen';
export default function ZeezaGroupCallRoute(){const p=useLocalSearchParams<{callId?:string}>();if(!p.callId)return null;return <GroupCallScreen callId={String(p.callId)}/>;}

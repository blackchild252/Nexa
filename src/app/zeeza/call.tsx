import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { CallScreen } from '../../CallScreen';
export default function ZeezaCallRoute(){ const p=useLocalSearchParams<{callId?:string;media?:string}>(); if(!p.callId)return null; return <CallScreen callId={String(p.callId)} media={p.media==='video'?'video':'audio'} />; }

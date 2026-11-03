import React from 'react';
import { router } from 'expo-router';
import { ZeezaProfile } from '../../ZeezaProfile';
export default function ZeezaProfileRoute(){ return <ZeezaProfile onBack={() => router.replace('/(tabs)/zeeza' as any)} />; }

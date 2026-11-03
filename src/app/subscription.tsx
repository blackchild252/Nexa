import React,{useEffect} from 'react';
import {ActivityIndicator,View} from 'react-native';
import {router} from 'expo-router';
import {theme} from '../theme';

// Directory compatibility entry: canonical Subscription Centre presentation remains SkyMoney > Subscription Centre.
// This route remains as a compatibility bridge for existing deep links.
export default function SubscriptionRoute(){
  useEffect(()=>{ router.replace('/(tabs)/money?view=subscription' as any); },[]);
  return <View style={{flex:1,backgroundColor:theme.colors.background,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={theme.colors.goldBright}/></View>;
}

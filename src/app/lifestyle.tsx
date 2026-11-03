import React from 'react'; import {Redirect, useLocalSearchParams} from 'expo-router';
// Lifestyle lives inside Zeeza. This route stays so older links and push taps keep working.
export default function Lifestyle(){const p=useLocalSearchParams<{postId?:string}>(); const postId=Array.isArray(p.postId)?p.postId[0]:p.postId; return <Redirect href={(postId?{pathname:'/(tabs)/zeeza',params:{section:'lifestyle',postId}}:{pathname:'/(tabs)/zeeza',params:{section:'lifestyle'}}) as any}/>;}

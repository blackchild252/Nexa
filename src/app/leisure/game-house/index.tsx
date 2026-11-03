import React from 'react';
import {ScrollView,Text,View} from 'react-native';
import {router} from 'expo-router';
import {s} from '../../../styles';
import {theme,ds} from '../../../theme';
const games=[{name:'PUBG Mobile',tag:'Squad strategy · battle royale',perks:'Community nights, team challenges and venue events'},{name:'Call of Duty: Mobile',tag:'Competitive FPS',perks:'Friendly brackets, loadout discussions and skill boards'},{name:'Fortnite',tag:'Creative · battle royale',perks:'Community sessions and featured challenges'}];
import { NexaWorldBackground } from '../../../NexaWorldBackground';
import { nexaGoBack } from '../../../NexaNavKeys';

export default function GameHouse(){return <NexaWorldBackground world="game-house"><ScrollView style={s.wrap} contentContainerStyle={ds({paddingBottom:120})}><Text style={s.title}>🎮 Game House</Text><Text style={s.subtitle}>Play together. Meet your squad. Track the community.</Text>
 <View style={[s.card,{marginTop:14,borderColor:theme.colors.borderGold,borderWidth:1}]}><Text style={s.section}>Game House entry</Text><Text style={s.muted}>Tickets for physical Game House sessions are listed and sold through Yaayz when a venue publishes inventory.</Text><NexaPressable accessibilityRole="button" accessibilityLabel="Find Game House tickets in Yaayz" style={[s.smallButton,{marginTop:12}]} onPress={()=>router.push({pathname:'/(tabs)/yaayz',params:{type:'event',search:'Game House',returnTo:'/leisure/game-house'}} as any)}><Text style={s.buttonText}>Find Game House tickets in Yaayz</Text></NexaPressable></View>
 <Text style={[s.section,{marginTop:18,marginBottom:8}]}>Featured games</Text>{games.map(g=><View key={g.name} style={s.card}><Text style={ds({color:theme.colors.goldBright,fontWeight:'900'})}>{g.name}</Text><Text style={s.section}>{g.tag}</Text><Text style={s.muted}>{g.perks}</Text></View>)}
 <View style={s.card}><Text style={s.section}>Community leaderboard</Text><Text style={s.muted}>Venue-hosted results and player rankings can appear here when verified event results are connected. No fabricated player scores are shown.</Text></View>
 <View style={s.card}><Text style={s.section}>No livestreaming</Text><Text style={s.muted}>Game House showcases games, perks, community events and venue tickets. It does not broadcast gameplay like Twitch.</Text></View>
 <NexaPressable accessibilityRole="button" accessibilityLabel="Back to Leisure" onPress={()=>nexaGoBack()}><Text style={[s.muted,{marginTop:14}]}>← Back to L.A.</Text></NexaPressable></ScrollView></NexaWorldBackground>}

import { NexaPressable } from '../../../motion';

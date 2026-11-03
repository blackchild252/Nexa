import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, tc, ds, di } from '../../theme';
import { BRAND } from '../../brand';
import { NexaAnimatedView, useMotion } from '../../motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarMetrics } from '../../nexaSafeArea';

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  money: 'wallet-outline',
  zeeza: 'people-outline',
  marketplace: 'storefront-outline',
  yaayz: 'ticket-outline',
  leisure: 'sparkles-outline',
};

/**
 * Legacy compatibility contract: name="ai" options={{href:null}} remains intentionally non-active.
 * Canonical NEXA primary navigation.
 * Preserve the established user-world product shell. Dami is the AI companion
 * surface (Home/AI), while Inbox is the user-facing name for direct/community messaging.
 */
function MotionTabIcon({color,size,focused,name}:{color:string;size:number;focused:boolean;name:keyof typeof Ionicons.glyphMap}){
  const {allows}=useMotion(); const animated=allows('navigation');
  // Royal Dark: solid gold-blue disc with a dark icon (unchanged). Earth Light: a soft water-wash pill with a blue filled icon.
  const earth=theme.design.id==='earth-light';
  const bubble=earth
    ? {width:46,height:30,borderRadius:15,backgroundColor:focused?theme.colors.goldWash:'transparent'}
    : {width:34,height:34,borderRadius:17,backgroundColor:focused?theme.colors.brightGold:'transparent',...focused?theme.shadow.glow:{}};
  return <NexaAnimatedView motion="navigation" disabled={!animated} minLevel={30} style={{...bubble,alignItems:'center',justifyContent:'center'}}><Ionicons name={di(name,focused) as any} color={earth?(focused?theme.colors.brightGold:color):(focused?theme.colors.deepBlack:color)} size={focused?(earth?20:18):size}/></NexaAnimatedView>;
}
export default function TabsLayout(){
  const { reducedMotion, allows } = useMotion();
  const dock = tabBarMetrics(useSafeAreaInsets().bottom); // M4508: the dock clears the gesture bar
  // M4496: switching tabs gets one short fade for everyone (basic motion); none when the phone asks for reduced motion.
  const tabAnimation = reducedMotion || !allows('navigation') ? 'none' : 'fade';
  return <Tabs screenOptions={({route}) => ({
    headerShown:false,
    animation:tabAnimation,
    sceneStyle:{backgroundColor:theme.colors.deepBlack},
    tabBarStyle:{backgroundColor:theme.colors.deepBlack,borderTopColor:tc('rgba(212,175,55,0.45)'),borderTopWidth:1,height:dock.height,paddingTop:7,paddingBottom:dock.paddingBottom,...theme.shadow.gold,...(theme.design.id==='earth-light'?{borderTopLeftRadius:24,borderTopRightRadius:24}:{})},
    tabBarActiveTintColor:theme.colors.brightGold,
    tabBarInactiveTintColor:tc('#8A8A8A'),
    tabBarLabelStyle:ds({fontSize:14,fontWeight:'800'}),
    tabBarAccessibilityLabel: ({index:'Home', money:'Sky Money', zeeza:'Zeeza social', marketplace:'Dream Marketplace', yaayz:'Yaayz discovery and tickets', leisure:'Leisure Arena', profile:'NEXA profile and settings'} as Record<string,string>)[route.name] || route.name,
    tabBarIcon:({color,size,focused})=>{
      const name=iconMap[route.name] || 'ellipse-outline';
      return <MotionTabIcon color={color} size={size} focused={focused} name={name}/>;
    },
  })}>
    <Tabs.Screen name="index" options={{title:'Home', tabBarStyle:{display:'none'}}}/>
    <Tabs.Screen name="money" options={{title:BRAND.money}}/>
    <Tabs.Screen name="zeeza" options={{title:BRAND.zeeza}}/>
    <Tabs.Screen name="marketplace" options={{title:BRAND.marketplace}}/>
    <Tabs.Screen name="yaayz" options={{title:BRAND.yaayz}}/>
    <Tabs.Screen name="leisure" options={{title:BRAND.leisure}}/>
    {/* Profile/settings remains a real deep-link route, but is deliberately excluded from the user-world dock. */}
    <Tabs.Screen name="profile" options={{title:BRAND.profile,href:null}}/>
    {/* V5.19.0: Search is reached from the global navigation keys / directory, never as an unlabeled 8th tab. */}
    <Tabs.Screen name="search" options={{href:null}}/>
  </Tabs>;
}

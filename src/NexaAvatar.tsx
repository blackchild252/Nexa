import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';
import { useMotion } from './motion';
import { MOTION_MS } from './motionTiming';
import { useAvatar, SKINS, HAIR_COLORS, TOPS, BOTTOMS, SHOES, BAGS, type AvatarConfig, type Pose, type Opt } from './nexaAvatar';

/** Cartoon avatar drawn from native views (no image, no SVG dependency). 200 x 260 design box. */
const W = 200, H = 260;
const col = (list: Opt[], id: string) => list.find(o => o.id === id)?.color || '#888';
const Box = ({ x, y, w, h, c, r = 0, s }: { x: number; y: number; w: number; h: number; c?: string; r?: number; s?: any }) =>
  <View style={[{ position: 'absolute', left: x, top: y, width: w, height: h, backgroundColor: c, borderRadius: r }, s]} />;
// A limb that swings from its top edge.
function Limb({ x, y, w, h, c, r, rot }: { x: number; y: number; w: number; h: number; c: string; r: number; rot: Animated.AnimatedInterpolation<string> | string }) {
  return <Animated.View style={{ position: 'absolute', left: x, top: y, width: w, height: h, backgroundColor: c, borderRadius: r, transform: [{ translateY: -h / 2 }, { rotate: rot as any }, { translateY: h / 2 }] }} />;
}

function Scene({ id }: { id: string }) {
  const o = 0.5;
  if (id === 'neighborhood') return <View style={{ position: 'absolute', inset: 0, opacity: o } as any}>
    <Box x={0} y={0} w={W} h={150} c="#7fb4d9" /><Box x={0} y={175} w={W} h={90} c="#5c8a4e" />
    {[[14, 100, 50, '#c9785a'], [78, 84, 56, '#d8b05a'], [146, 104, 48, '#8f7ab3']].map(([x, y, w, c]: any, i) => <View key={i}><Box x={x} y={y + 20} w={w} h={60} c={c} r={3} /><Box x={x - 4} y={y} w={w + 8} h={22} c="#6b3f2a" r={4} /><Box x={x + w / 2 - 6} y={y + 52} w={12} h={28} c="#3a2418" r={2} /></View>)}
  </View>;
  if (id === 'office') return <View style={{ position: 'absolute', inset: 0, opacity: o } as any}>
    <Box x={0} y={0} w={W} h={H} c="#cfd6dd" /><Box x={20} y={40} w={64} h={74} c="#9ed0f0" r={4} s={{ borderWidth: 4, borderColor: '#eef2f5' }} /><Box x={120} y={60} w={60} h={8} c="#7a5a3a" /><Box x={128} y={36} w={10} h={24} c="#c0392b" /><Box x={144} y={30} w={10} h={30} c="#2f7de1" /><Box x={160} y={40} w={10} h={20} c="#2f7d4f" /><Box x={0} y={200} w={W} h={60} c="#7d8a96" />
  </View>;
  if (id === 'kitchen') return <View style={{ position: 'absolute', inset: 0, opacity: o } as any}>
    <Box x={0} y={0} w={W} h={H} c="#f0e2c8" /><Box x={14} y={30} w={80} h={56} c="#b98550" r={4} /><Box x={106} y={30} w={80} h={56} c="#b98550" r={4} /><Box x={0} y={170} w={W} h={90} c="#a86f3d" /><Box x={0} y={166} w={W} h={8} c="#e8e8e8" /><Box x={140} y={120} w={34} h={46} c="#d9d9d9" r={4} />
  </View>;
  if (id === 'livingroom') return <View style={{ position: 'absolute', inset: 0, opacity: o } as any}>
    <Box x={0} y={0} w={W} h={H} c="#d9c3a5" /><Box x={22} y={46} w={44} h={56} c="#6b8cae" s={{ borderWidth: 4, borderColor: '#7a5a3a' }} /><Box x={140} y={60} w={34} h={34} c="#e8c35a" r={17} /><Box x={0} y={205} w={W} h={55} c="#8a6a4a" />
  </View>;
  return null;
}

export function NexaAvatar({ cfg, pose, size = 220, animate = true }: { cfg: AvatarConfig; pose?: Pose; size?: number; animate?: boolean }) {
  const { allows, reducedMotion } = useMotion();
  const p: Pose = pose || cfg.pose;
  const skin = col(SKINS, cfg.skin), hairC = col(HAIR_COLORS, cfg.hairColor), topC = col(TOPS, cfg.top), botC = col(BOTTOMS, cfg.bottom), shoeC = col(SHOES, cfg.shoes);
  const male = cfg.gender === 'male';
  const go = animate && !reducedMotion && allows('dami');
  const t = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!go) { t.stopAnimation(); t.setValue(0); blink.setValue(1); return; }
    const ms = p === 'move' ? 520 : 1900;
    const a = Animated.loop(Animated.sequence([Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(t, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    const b = Animated.loop(Animated.sequence([Animated.delay(3200), Animated.timing(blink, { toValue: 0.1, duration: MOTION_MS.blinkClose, useNativeDriver: true }), Animated.timing(blink, { toValue: 1, duration: MOTION_MS.avatarBlinkOpen, useNativeDriver: true })]));
    a.start(); b.start(); return () => { a.stop(); b.stop(); };
  }, [go, p, t, blink]);
  const swing = (deg: number) => t.interpolate({ inputRange: [0, 1], outputRange: [`${-deg}deg`, `${deg}deg`] });
  const amp = p === 'move' ? 22 : 4;
  const bob = t.interpolate({ inputRange: [0, 1], outputRange: [0, p === 'move' ? -5 : -2] });
  const seated = p === 'sit' || p === 'computer';
  const lying = p === 'lie';
  const dy = seated ? 44 : 0;

  const eyeY = 54;
  // Male and female bodies differ: broader torso and squarer jaw with heavier brows (male); slimmer torso, lashes and blush (female).
  const tx = male ? 64 : 68, tw = male ? 72 : 64, tr = male ? 16 : 22, armL = male ? 48 : 52, armR = male ? 136 : 132, headR = male ? 28 : 34;
  const faceBits = <>
    <Animated.View style={{ position: 'absolute', left: 84, top: eyeY, width: 7, height: 9, borderRadius: 4, backgroundColor: '#1b1410', transform: [{ scaleY: blink }] }} />
    <Animated.View style={{ position: 'absolute', left: 109, top: eyeY, width: 7, height: 9, borderRadius: 4, backgroundColor: '#1b1410', transform: [{ scaleY: blink }] }} />
    {male
      ? <><Box x={80} y={43} w={15} h={4} r={2} c="#2a1c14" /><Box x={105} y={43} w={15} h={4} r={2} c="#2a1c14" /></>
      : <><Box x={80} y={46} w={13} h={2} r={1} c="#2a1c14" /><Box x={107} y={46} w={13} h={2} r={1} c="#2a1c14" /><Box x={82} y={52} w={2} h={4} r={1} c="#1b1410" /><Box x={116} y={52} w={2} h={4} r={1} c="#1b1410" /></>}
    {cfg.face === 'wow' ? <Box x={96} y={74} w={9} h={10} r={5} c="#7a2a2a" /> : cfg.face === 'calm' ? <Box x={92} y={77} w={16} h={3} r={2} c="#7a2a2a" /> :
      <Box x={90} y={72} w={20} h={cfg.face === 'grin' ? 12 : 9} c={cfg.face === 'grin' ? '#fff' : 'transparent'} r={10} s={{ borderBottomWidth: 3, borderBottomColor: '#7a2a2a', borderLeftWidth: cfg.face === 'grin' ? 1 : 0, borderRightWidth: cfg.face === 'grin' ? 1 : 0, borderColor: '#7a2a2a' }} />}
    {male ? null : <><Box x={78} y={68} w={9} h={5} r={3} c="rgba(230,80,80,0.35)" /><Box x={113} y={68} w={9} h={5} r={3} c="rgba(230,80,80,0.35)" /></>}
  </>;
  const glasses = cfg.glasses === 'none' ? null : <>
    {[80, 105].map(x => <View key={x} style={{ position: 'absolute', left: x, top: 48, width: 16, height: cfg.glasses === 'square' ? 15 : 16, borderRadius: cfg.glasses === 'square' ? 3 : 8, borderWidth: 2.5, borderColor: '#222', backgroundColor: cfg.glasses === 'shades' ? '#111' : 'rgba(180,220,255,0.25)' }} />)}
    <Box x={96} y={55} w={8} h={2.5} c="#222" />
  </>;
  const stache = cfg.mustache === 'none' ? null : <Box x={cfg.mustache === 'thick' ? 87 : 90} y={68} w={cfg.mustache === 'thick' ? 26 : 20} h={cfg.mustache === 'thick' ? 8 : 5} r={4} c={hairC} />;
  const hairBack = cfg.hair === 'long' ? <Box x={64} y={26} w={72} h={86} r={34} c={hairC} /> : null;
  const hairFront = cfg.hair === 'bald' ? null : <>
    {cfg.hair === 'curly' ? [66, 80, 94, 108, 122].map((x, i) => <Box key={x} x={x - 6} y={i % 2 ? 18 : 24} w={22} h={22} r={11} c={hairC} />) : null}
    {cfg.hair === 'bun' ? <Box x={90} y={10} w={20} h={20} r={10} c={hairC} /> : null}
    <Box x={67} y={cfg.hair === 'short' ? 24 : 26} w={66} h={cfg.hair === 'curly' ? 20 : 22} r={30} c={hairC} />
  </>;

  const legY = 168;
  const bottomFull = cfg.bottom === 'trousers' || cfg.bottom === 'jeans';
  const legLen = cfg.bottom === 'shorts' ? 28 : 62;
  const figure = <>
    {/* bags behind */}
    {cfg.bag === 'back' ? <Box x={60} y={104} w={80} h={58} r={12} c={col(BAGS, 'back')} /> : null}
    {hairBack}
    {/* legs */}
    {!seated && !lying ? <>
      <Limb x={73} y={legY} w={24} h={62} c={bottomFull || cfg.bottom === 'shorts' ? botC : skin} r={8} rot={p === 'move' ? swing(amp) : '0deg'} />
      <Limb x={103} y={legY} w={24} h={62} c={bottomFull || cfg.bottom === 'shorts' ? botC : skin} r={8} rot={p === 'move' ? swing(-amp) : '0deg'} />
      {cfg.bottom !== 'trousers' && cfg.bottom !== 'jeans' ? <><Box x={73} y={legY + legLen} w={24} h={62 - legLen} c={skin} r={6} s={{ opacity: cfg.bottom === 'shorts' ? 1 : 0 }} /><Box x={103} y={legY + legLen} w={24} h={62 - legLen} c={skin} r={6} s={{ opacity: cfg.bottom === 'shorts' ? 1 : 0 }} /></> : null}
      <Box x={69} y={226} w={32} h={14} r={7} c={shoeC} /><Box x={99} y={226} w={32} h={14} r={7} c={shoeC} />
    </> : <>
      {/* thighs forward, shins down */}
      <Box x={78} y={170} w={70} h={24} r={10} c={cfg.bottom === 'skirt' ? skin : botC} /><Box x={142} y={176} w={22} h={56} r={9} c={cfg.bottom === 'skirt' ? skin : botC} /><Box x={138} y={228} w={34} h={14} r={7} c={shoeC} />
    </>}
    {cfg.bottom === 'skirt' ? <Box x={62} y={160} w={76} h={seated ? 28 : 40} r={14} c={botC} /> : <Box x={72} y={160} w={56} h={14} r={6} c={botC} />}
    {/* torso + arms */}
    <Box x={tx} y={96} w={tw} h={76} r={tr} c={topC} />
    {cfg.top === 'hoodie' ? <Box x={82} y={92} w={36} h={14} r={8} c="rgba(0,0,0,0.18)" /> : null}
    {cfg.top === 'shirt' ? <Box x={98} y={100} w={4} h={66} c="rgba(0,0,0,0.12)" /> : null}
    {p === 'computer' ? <>
      <Limb x={armR - 8} y={104} w={14} h={50} c={topC} r={7} rot="-62deg" /><Box x={150} y={140} w={14} h={14} r={7} c={skin} />
    </> : <>
      <Limb x={armL} y={102} w={16} h={58} c={topC} r={8} rot={p === 'move' ? swing(-amp) : lying ? '0deg' : '4deg'} />
      <Limb x={armR} y={102} w={16} h={58} c={topC} r={8} rot={p === 'move' ? swing(amp) : lying ? '0deg' : '-4deg'} />
      {!seated ? <><Box x={armL} y={156} w={16} h={14} r={8} c={skin} /><Box x={armR} y={156} w={16} h={14} r={8} c={skin} /></> : null}
    </>}
    {cfg.bag === 'side' ? <><View style={{ position: 'absolute', left: 80, top: 100, width: 4, height: 80, backgroundColor: '#5a3a22', transform: [{ rotate: '-35deg' }] }} /><Box x={118} y={150} w={34} h={28} r={7} c={col(BAGS, 'side')} /></> : null}
    {/* neck + head */}
    <Box x={male ? 90 : 92} y={86} w={male ? 20 : 16} h={16} c={skin} />
    <Box x={66} y={24} w={68} h={72} r={headR} c={skin} />
    <Box x={62} y={54} w={8} h={14} r={4} c={skin} /><Box x={130} y={54} w={8} h={14} r={4} c={skin} />
    {hairFront}{faceBits}{stache}{glasses}
  </>;

  const furniture = (p === 'sit' || p === 'lie') ? <>
    <Box x={lying ? 10 : 40} y={lying ? 196 : 110} w={lying ? 180 : 130} h={lying ? 44 : 130} r={16} c="#8b4a3b" />
    {!lying ? <Box x={46} y={196} w={140} h={44} r={12} c="#a85d4b" /> : <Box x={14} y={188} w={172} h={24} r={12} c="#a85d4b" />}
    <Box x={lying ? 10 : 36} y={lying ? 236 : 236} w={lying ? 12 : 12} h={14} c="#4a2a22" /><Box x={lying ? 178 : 160} y={236} w={12} h={14} c="#4a2a22" />
  </> : p === 'computer' ? <>
    <Box x={110} y={150} w={80} h={8} r={3} c="#7a5a3a" /><Box x={116} y={158} w={6} h={80} c="#6b4a2a" /><Box x={178} y={158} w={6} h={80} c="#6b4a2a" />
    <Box x={134} y={100} w={44} h={34} r={4} c="#222" s={{ borderWidth: 3, borderColor: '#555' }} /><Box x={140} y={106} w={32} h={22} c="#58b6ff" r={2} /><Box x={150} y={134} w={12} h={16} c="#555" />
    <Box x={52} y={200} w={44} h={10} r={4} c="#666" /><Box x={60} y={210} w={6} h={30} c="#555" />
  </> : null;

  const body = lying
    ? { transform: [{ translateX: -4 }, { translateY: 50 }, { rotate: '-84deg' }, { scale: 0.85 }] as any }
    : { transform: [{ translateY: dy }, { translateY: bob }] as any };
  const scale = size / H;
  return <View pointerEvents="none" style={{ width: W * scale, height: H * scale, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="image" accessibilityLabel="Dami avatar">
    <View style={{ width: W, height: H, transform: [{ scale }] }}>
      {furniture && (p === 'sit' || p === 'lie') ? furniture : null}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, body]}>{figure}</Animated.View>
      {p === 'computer' ? furniture : null}
    </View>
  </View>;
}

/** Dusty circular stage: the avatar stands in the middle of a soft translucent circle that blends into the page. */
export function AvatarStage({ cfg, size, onPress }: { cfg: AvatarConfig; size: number; onPress?: () => void }) {
  const ring = size * 1.08;
  const pressRef = useRef(onPress); pressRef.current = onPress;
  const pan = useMemo(() => PanResponder.create({ onStartShouldSetPanResponder: () => Boolean(pressRef.current), onPanResponderRelease: (_e, g) => { if (Math.abs(g.dx) + Math.abs(g.dy) < 8) pressRef.current?.(); } }), []);
  return <View {...pan.panHandlers} style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }} accessibilityRole={onPress ? 'button' : 'image'} accessibilityLabel="Dami, your AI assistant">
    <View pointerEvents="none" style={{ position: 'absolute', width: ring, height: ring, borderRadius: ring / 2, overflow: 'hidden', backgroundColor: 'rgba(210,190,150,0.10)', borderWidth: 14, borderColor: 'rgba(200,175,120,0.13)' }}>
      <View style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: W, height: H, transform: [{ scale: ring / W }] }}><Scene id={cfg.scene} /></View></View>
    </View>
    <View pointerEvents="none" style={{ position: 'absolute', width: ring - 6, height: ring - 6, borderRadius: ring / 2, borderWidth: 1, borderColor: 'rgba(230,205,140,0.28)' }} />
    <NexaAvatar cfg={cfg} size={size * 0.9} />
  </View>;
}

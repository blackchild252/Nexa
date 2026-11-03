import React, { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { NexaPressable } from './motion';
import { theme, themedStyles, tc } from './theme';
import { useMotion } from './motion';
import { AvatarStage } from './NexaAvatar';
import { optLabel } from './nexaAvatarLabels';
import { saveAvatar, useAvatarTier, tierAllows, tr, LANGUAGES, POSES, SKINS, FACES, HAIR, HAIR_COLORS, GLASSES, MUSTACHES, TOPS, BOTTOMS, SHOES, BAGS, SCENES, type AvatarConfig, type Opt } from './nexaAvatar';

function Row({ title, list, value, onPick, dots, lang, lockedIds }: { title: string; list: Opt[]; value: string; onPick: (id: string) => void; dots?: boolean; lang: string; lockedIds?: string[] }) {
  return <View style={styles.sec}><Text style={styles.secTitle}>{title}</Text><View style={styles.chips}>
    {list.map(o => { const on = o.id === value; return <NexaPressable key={o.id} onPress={() => onPick(o.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${title}: ${optLabel(lang, o.id, o.label)}`} style={[styles.chip, on && styles.chipOn]}>
      {dots && o.color ? <View style={[styles.dot, { backgroundColor: o.color }]} /> : null}<Text style={[styles.chipText, on && styles.chipTextOn]}>{optLabel(lang, o.id, o.label)}{lockedIds?.includes(o.id) ? ' 🔒' : ''}</Text></NexaPressable>; })}
  </View></View>;
}

export function NexaAvatarStudio({ open, initial, onClose }: { open: boolean; initial: AvatarConfig; onClose: () => void }) {
  const [c, setC] = useState<AvatarConfig>(initial);
  const [note, setNote] = useState('');
  const { tier: savedTier } = useMotion(); const tier = useAvatarTier(savedTier);
  React.useEffect(() => { if (open) { setC(initial); setNote(''); } }, [open, initial]);
  const set = (k: keyof AvatarConfig) => (v: string) => setC(p => ({ ...p, [k]: v } as AvatarConfig));
  const L = c.lang;
  const poseList = POSES.map(p => ({ id: p.id, label: p.label })), lockedPoses = POSES.filter(p => !tierAllows(tier, p.min)).map(p => p.id);
  const pickPose = (id: string) => { const p = POSES.find(x => x.id === id)!; if (tierAllows(tier, p.min)) { setNote(''); set('pose')(id); } else setNote(tr(L, 'locked')); };
  const save = async () => { await saveAvatar(c); onClose(); };
  const local = LANGUAGES.filter(l => l.group === 'local'), uni = LANGUAGES.filter(l => l.group === 'universal');
  return <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}><View style={styles.back}><View style={styles.sheet}>
    <View style={styles.head}><Text style={styles.title}>{tr(L, 'edit')}</Text><NexaPressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.x}><Text style={styles.xt}>✕</Text></NexaPressable></View>
    <View style={{ alignItems: 'center' }}><AvatarStage cfg={c} size={190} /></View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
      <Row lang={L} title={tr(L, 'language')} list={[...local.map(l => ({ id: l.code, label: l.label })), ...uni.map(l => ({ id: l.code, label: l.label }))]} value={c.lang} onPick={set('lang')} />
      <Text style={styles.hint}>{tr(L, 'local')} → {tr(L, 'universal')}</Text>
      <Row lang={L} title={tr(L, 'ttlVoice')} list={[{ id: 'female', label: 'Female · female voice' }, { id: 'male', label: 'Male · male voice' }]} value={c.gender} onPick={set('gender')} />
      <Row lang={L} title={tr(L, 'ttlPose')} list={poseList} value={c.pose} onPick={pickPose} lockedIds={lockedPoses} />
      {note ? <Text style={styles.hint} accessibilityLiveRegion="polite">{note}</Text> : null}
      <Row lang={L} title={tr(L, 'ttlFace')} list={SKINS} value={c.skin} onPick={set('skin')} dots />
      <Row lang={L} title={tr(L, 'ttlExpression')} list={FACES} value={c.face} onPick={set('face')} />
      <Row lang={L} title={tr(L, 'ttlHair')} list={HAIR} value={c.hair} onPick={set('hair')} />
      <Row lang={L} title={tr(L, 'ttlHairColor')} list={HAIR_COLORS} value={c.hairColor} onPick={set('hairColor')} dots />
      <Row lang={L} title={tr(L, 'ttlGlasses')} list={GLASSES} value={c.glasses} onPick={set('glasses')} />
      <Row lang={L} title={tr(L, 'ttlMustache')} list={MUSTACHES} value={c.mustache} onPick={set('mustache')} />
      <Row lang={L} title={tr(L, 'ttlTop')} list={TOPS} value={c.top} onPick={set('top')} dots />
      <Row lang={L} title={tr(L, 'ttlBottom')} list={BOTTOMS} value={c.bottom} onPick={set('bottom')} dots />
      <Row lang={L} title={tr(L, 'ttlShoes')} list={SHOES} value={c.shoes} onPick={set('shoes')} dots />
      <Row lang={L} title={tr(L, 'ttlBag')} list={BAGS} value={c.bag} onPick={set('bag')} />
      <Row lang={L} title={tr(L, 'ttlBackground')} list={SCENES} value={c.scene} onPick={set('scene')} />
    </ScrollView>
    <NexaPressable onPress={save} accessibilityRole="button" accessibilityLabel={tr(L, 'save')} style={styles.save}><Text style={styles.saveText}>{tr(L, 'save')}</Text></NexaPressable>
  </View></View></Modal>;
}

const styles = themedStyles(() => ({
  back: { flex: 1, backgroundColor: tc('rgba(0,0,0,0.7)'), justifyContent: 'flex-end' },
  sheet: { height: '92%', backgroundColor: theme.colors.graphite, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: theme.colors.borderGold, padding: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { color: theme.colors.ivoryText, fontSize: 24, fontWeight: '900' },
  x: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }, xt: { color: theme.colors.text, fontSize: 18 },
  sec: { marginTop: 14 }, secTitle: { color: theme.colors.goldBright, fontSize: 15, fontWeight: '900', marginBottom: 7 }, hint: { color: theme.colors.muted, fontSize: 14, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 13, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.borderGold, flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center' },
  chipOn: { backgroundColor: theme.colors.brightGold, borderWidth: 2 }, chipText: { color: theme.colors.ivoryText, fontSize: 15, fontWeight: '700' }, chipTextOn: { color: theme.colors.deepBlack, fontWeight: '900' },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  save: { minHeight: 52, borderRadius: 20, backgroundColor: theme.colors.brightGold, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, saveText: { color: theme.colors.deepBlack, fontSize: 18, fontWeight: '900' },
}));

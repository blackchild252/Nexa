import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, tc, themedStyles, di } from './theme';
import { NexaMotionSurface, NexaPressable, SIDE_MENU_MS, useMotion, useModalAnimation } from './motion';
import { HOME_DIRECTORY } from './homeDesign';
import { ProfilePhotoIcon } from './myAvatar';
import { accessibilityGroup, actionHint } from './interactionAccessibility';
import { modalA11y, modalBackdropA11y, modalCloseA11y } from './modalAccessibility';
import { useModalFocus } from './modalFocus';
import { navigationForAddAction, navigationForDirectoryItem, type AddNavigationAction } from './nexaNavigation';
import { navigationAccessibilityLabel, NEXA_QUICK_ACCESS_LABELS } from './nexaAccessibility';
import { decideBack, directoryIdForPath, isOnModuleRoot, menuMoveMode, navKeysVisible, normalizePath, titleForPath } from './nexaNavKeys';
import { addSheetBottomPadding, menuTopPadding, stackBottomInset } from './nexaSafeArea';

/**
 * NEXA Navigation Keys (V5.19.0 / B55).
 *
 * One consistent set of keys on every inner screen:
 *   Back · (title) · Search · Home · Menu
 * Back never dead-ends (no history → Home). Menu opens the full NEXA directory
 * from anywhere, not just from Home. Destinations come from `nexaNavigation.ts`.
 */

type NavContextValue = { openDirectory: () => void; closeDirectory: () => void; openAdd: () => void; closeAdd: () => void; goBack: () => void; goHome: () => void };
const NavContext = createContext<NavContextValue>({ openDirectory: () => {}, closeDirectory: () => {}, openAdd: () => {}, closeAdd: () => {}, goBack: () => {}, goHome: () => {} });
export function useNexaNav() { return useContext(NavContext); }

export function nexaGoBack() {
  if (decideBack(router.canGoBack()) === 'back') router.back();
  else router.replace('/(tabs)' as any);
}
export function nexaGoHome() { router.replace('/(tabs)' as any); }

// M4510: the screen the menu last pushed to (module-level so it survives the menu closing).
let lastMenuHop: string | null = null;

function DirectoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { allows } = useMotion();
  const pathname = usePathname();
  const activeId = directoryIdForPath(pathname);
  const drawerInsets = useSafeAreaInsets();
  const x = useRef(new Animated.Value(1)).current;
  const panelRef = useRef<any>(null);
  useModalFocus(open, panelRef);
  useEffect(() => {
    Animated.timing(x, { toValue: open ? 0 : 1, duration: allows('navigation') ? SIDE_MENU_MS : 0, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [open, allows, x]);

  const go = (id: string) => {
    const target = navigationForDirectoryItem(id);
    onClose();
    if (!target) return;
    if (id !== 'notifications' && isOnModuleRoot(pathname, (target as any).pathname)) return;
    if (id === 'home' || id === 'notifications') { lastMenuHop = null; router.replace(target as any); return; }
    const mode = menuMoveMode(pathname, lastMenuHop);
    lastMenuHop = normalizePath((target as any).pathname);
    if (mode === 'replace') router.replace(target as any);
    else router.push(target as any);
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <View style={st.backdrop} {...modalBackdropA11y()}>
        <NexaPressable style={st.dismiss} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close NEXA directory" />
        <Animated.View ref={panelRef} tabIndex={-1 as any} {...modalA11y("NEXA directory", "NEXA directory options")} style={[st.panel, { paddingTop: menuTopPadding(drawerInsets.top), paddingBottom: drawerInsets.bottom, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 380] }) }] }]}>
          <View style={st.panelHeader} {...accessibilityGroup("NEXA directory header")}>
            <View><Text style={st.brand}>NEXA</Text><Text style={st.tagline}>Your World. One App.</Text></View>
            <NexaPressable onPress={onClose} style={st.closeBtn} {...modalCloseA11y("Close NEXA directory")}>
              <Ionicons name="close" size={22} color={theme.colors.ivoryText} />
            </NexaPressable>
          </View>
          <ScrollView accessibilityRole="tablist" accessibilityLabel="NEXA directory options" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {HOME_DIRECTORY.map(([id, label, icon]) => {
              const active = id === activeId;
              return (
                <NexaPressable key={id} onPress={() => go(id)} style={[st.row, active && st.rowActive]} accessibilityRole="tab" accessibilityLabel={navigationAccessibilityLabel(id)} accessibilityState={{ selected: active }}>
                  {id === 'profile' ? <ProfilePhotoIcon size={26} icon={di(icon) as any} color={active ? theme.colors.deepBlack : theme.colors.goldBright} /> : <Ionicons name={di(icon) as any} size={20} color={active ? theme.colors.deepBlack : theme.colors.goldBright} />}
                  <Text style={[st.rowLabel, active && st.rowLabelActive]}>{label}</Text>
                </NexaPressable>
              );
            })}
            <View style={st.divider} />
            <NexaPressable onPress={onClose} style={st.row} accessibilityRole="button" accessibilityLabel="Close Menu">
              <Ionicons name="arrow-back" size={20} color={theme.colors.goldBright} /><Text style={st.rowLabel}>Close Menu</Text>
            </NexaPressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}


const ADD_ACTIONS: Array<[AddNavigationAction, string, keyof typeof Ionicons.glyphMap, string]> = [
  ['friend', 'Add Friend', 'person-add-outline', 'Find and add a Zeeza friend'],
  ['money', 'Add Money', 'add-circle-outline', 'Open Sky Wallet to add money'],
  ['group', 'New Sky Group', 'people-circle-outline', 'Create a new Sky Group'],
  ['product', 'Add Product', 'cube-outline', 'Open your Marketplace product manager'],
];

function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const modalAnimation = useModalAnimation('sheet');
  const addInsets = useSafeAreaInsets();
  const panelRef = useRef<any>(null);
  useModalFocus(open, panelRef);
  const go = (action: AddNavigationAction) => {
    const target = navigationForAddAction(action);
    onClose();
    if (target) router.push(target as any);
  };
  return (
    <Modal visible={open} transparent animationType={modalAnimation} onRequestClose={onClose}>
      <View style={st.addBackdrop} {...modalBackdropA11y()}>
        <NexaPressable style={st.addDismiss} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close Add menu" />
        <NexaMotionSurface visible={open} motion="expand" style={[st.addPanel, { paddingBottom: addSheetBottomPadding(addInsets.bottom) }]}><View ref={panelRef} tabIndex={-1 as any} {...modalA11y('NEXA Add', 'NEXA creation actions')}>
          <View style={st.addHeader} {...accessibilityGroup('NEXA Add actions')}>
            <View><Text style={st.addTitle}>Add</Text><Text style={st.addSubtitle}>Start something in NEXA</Text></View>
            <NexaPressable onPress={onClose} style={st.closeBtn} {...modalCloseA11y('Close Add menu')}>
              <Ionicons name="close" size={22} color={theme.colors.ivoryText} />
            </NexaPressable>
          </View>
          {ADD_ACTIONS.map(([id, label, icon, hint]) => (
            <NexaPressable key={id} accessibilityRole="button" accessibilityLabel={label} onPress={() => go(id)} style={st.addRow} {...actionHint(hint)}>
              <View style={st.addIcon}><Ionicons name={di(icon) as any} size={21} color={theme.colors.brightGold} /></View>
              <View style={{ flex: 1 }}><Text style={st.addLabel}>{label}</Text><Text style={st.addHint}>{hint}</Text></View>
              <Ionicons name="chevron-forward" size={17} color={theme.colors.muted} />
            </NexaPressable>
          ))}
        </View>
        </NexaMotionSurface>
      </View>
    </Modal>
  );
}

function KeyButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <NexaPressable onPress={onPress} style={st.key} hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }} accessibilityRole="button" accessibilityLabel={label} {...actionHint(label === "Go back" ? "Return to the previous NEXA screen" : label === "NEXA Home" ? "Return to NEXA Home" : label === "Open NEXA directory" ? "Open the NEXA directory" : "Open NEXA Search")}>
      <Ionicons name={di(icon) as any} size={22} color={theme.colors.brightGold} />
    </NexaPressable>
  );
}

/** The bar itself. Renders nothing on Home, Dami, calls and auth (they own their chrome). */
export function NexaNavBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { openDirectory, openAdd } = useNexaNav();
  if (!navKeysVisible(pathname)) return null;
  const onSearch = () => { if (directoryIdForPath(pathname) !== 'search') router.push('/(tabs)/search' as any); };
  return (
    <View style={[st.bar, { paddingTop: insets.top + 4 }]} {...accessibilityGroup("NEXA navigation keys", "toolbar")}>
      <KeyButton icon="chevron-back" label="Go back" onPress={nexaGoBack} />
      <Text style={st.title} numberOfLines={2} accessibilityRole="header">{titleForPath(pathname)}</Text>
      <KeyButton icon="search-outline" label={NEXA_QUICK_ACCESS_LABELS.search} onPress={onSearch} />
      <KeyButton icon="add" label={NEXA_QUICK_ACCESS_LABELS.add} onPress={openAdd} />
      <KeyButton icon="home-outline" label={NEXA_QUICK_ACCESS_LABELS.home} onPress={nexaGoHome} />
      <KeyButton icon="menu" label={NEXA_QUICK_ACCESS_LABELS.menu} onPress={openDirectory} />
    </View>
  );
}

export function NexaNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const providerInsets = useSafeAreaInsets();
  const providerPath = usePathname();
  const openDirectory = useCallback(() => { setAddOpen(false); setOpen(true); }, []);
  const closeDirectory = useCallback(() => setOpen(false), []);
  const openAdd = useCallback(() => { setOpen(false); setAddOpen(true); }, []);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const value = useMemo(() => ({ openDirectory, closeDirectory, openAdd, closeAdd, goBack: nexaGoBack, goHome: nexaGoHome }), [openDirectory, closeDirectory, openAdd, closeAdd]);
  return (
    <NavContext.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: theme.colors.deepBlack }}>
        <NexaNavBar />
        <View style={{ flex: 1, paddingBottom: stackBottomInset(normalizePath(providerPath), providerInsets.bottom) }}>{children}</View>
      </View>
      <DirectoryDrawer open={open} onClose={closeDirectory} />
      <AddSheet open={addOpen} onClose={closeAdd} />
    </NavContext.Provider>
  );
}

const st = themedStyles(() => ({
  bar: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 2, paddingHorizontal: 4, paddingBottom: 6, backgroundColor: tc('rgba(0,0,0,0.94)'), borderBottomWidth: 1, borderBottomColor: tc('rgba(212,175,55,0.38)'), ...theme.shadow.gold },
  title: { flex: 1, flexShrink: 1, color: theme.colors.ivoryText, fontSize: 17, fontWeight: '900' as const, letterSpacing: 0, paddingHorizontal: 3 },
  key: { width: theme.accessibility.minTouchTarget, height: theme.accessibility.minTouchTarget, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderColor: tc('rgba(212,175,55,0.30)'), backgroundColor: tc('rgba(26,26,26,0.85)') },
  backdrop: { flex: 1, flexDirection: 'row' as const, backgroundColor: tc('rgba(0,0,0,0.62)') },
  dismiss: { flex: 1 },
  panel: { width: '82%' as const, maxWidth: 360, backgroundColor: theme.colors.deepBlack, borderLeftWidth: 1, borderLeftColor: theme.colors.borderGold, paddingTop: 44, paddingHorizontal: 16, shadowColor: theme.colors.royalGold, shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.24, shadowRadius: 24, elevation: 14 },
  panelHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: tc('rgba(212,175,55,0.22)') },
  brand: { color: theme.colors.goldBright, fontSize: 30, fontWeight: '900' as const, letterSpacing: 2 },
  tagline: { color: theme.colors.muted, fontSize: 14, marginTop: 1 },
  addBackdrop: { flex: 1, justifyContent: 'flex-end' as const, backgroundColor: tc('rgba(0,0,0,0.62)') },
  addDismiss: { flex: 1 },
  addPanel: { backgroundColor: theme.colors.deepBlack, borderTopWidth: 1, borderTopColor: theme.colors.borderGold, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: theme.colors.royalGold, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.24, shadowRadius: 24, elevation: 16 },
  addHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingBottom: 12 },
  addTitle: { color: theme.colors.goldBright, fontSize: 26, fontWeight: '900' as const },
  addSubtitle: { color: theme.colors.muted, fontSize: 14, marginTop: 2 },
  addRow: { minHeight: 64, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: tc('rgba(212,175,55,0.10)') },
  addIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.borderGold, backgroundColor: theme.colors.graphite, alignItems: 'center' as const, justifyContent: 'center' as const },
  addLabel: { color: theme.colors.ivoryText, fontSize: 17, fontWeight: '900' as const },
  addHint: { color: theme.colors.muted, fontSize: 14, marginTop: 2 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.borderGold, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: theme.colors.graphite },
  row: { minHeight: 52, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 13, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: tc('rgba(212,175,55,0.08)'), borderRadius: 14 },
  rowActive: { backgroundColor: theme.colors.brightGold },
  rowLabel: { flex: 1, color: theme.colors.ivoryText, fontSize: 16, fontWeight: '800' as const },
  rowLabelActive: { color: theme.colors.deepBlack },
  divider: { height: 1, backgroundColor: tc('rgba(212,175,55,0.3)'), marginVertical: 10 },
}));

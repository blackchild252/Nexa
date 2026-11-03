import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Share, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CountryPicker } from '../CountryPicker';
import type { NexaCountry } from '../countries';
import { useAuth } from '../auth';
import { authedFetch, updateRegionalPreferences } from '../api';
import { RoyalBackground } from '../RoyalBackground';
import { NexaFocusPressable } from '../motion';
import { theme, ds } from '../theme';
import { s } from '../styles';

const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'fr', label: 'Français' }, { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' }, { code: 'ar', label: 'العربية' }, { code: 'ha', label: 'Hausa' },
  { code: 'yo', label: 'Yorùbá' }, { code: 'ig', label: 'Igbo' }, { code: 'pcm', label: 'Nigerian Pidgin' }, { code: 'sw', label: 'Kiswahili' },
];
const MODULE_COPY: Record<string, string> = {
  marketplace: 'Discover products and trusted sellers.', dami: 'Ask Dami for help, ideas and guided tasks.', sky_money: 'Review money features when available in your region.',
  social: 'Connect with people and communities.', customer_care: 'Get help from NEXA support.', wallet: 'Review your wallet and money activity.', profile: 'Personalize your NEXA profile.', creator_tools: 'Explore tools for creators.',
};
export default function Onboarding() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ ref?: string }>();
  const [country, setCountry] = useState<NexaCountry['code']>('NG');
  const [language, setLanguage] = useState('en');
  const [modules, setModules] = useState<string[]>(Object.keys(MODULE_COPY));
  const [selectedModule, setSelectedModule] = useState('marketplace');
  const [busy, setBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [onboardingVariant, setOnboardingVariant] = useState(false);
  const eventKey = useMemo(() => `onboarding-start:${user?.id || 'user'}:${Date.now().toString(36)}`, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    authedFetch(`/api/growth/onboarding-config?country=${encodeURIComponent(country)}&language=${encodeURIComponent(language)}`)
      .then((config: any) => { if (!cancelled) { if (Array.isArray(config.modules)) setModules(config.modules.filter((key: string) => !!MODULE_COPY[key])); setOnboardingVariant(config.assignments?.onboarding_v2 === true); setConfigLoaded(true); } })
      .catch(() => { if (!cancelled) setConfigLoaded(true); });
    authedFetch('/api/growth/events', { method: 'POST', headers: { 'Idempotency-Key': eventKey }, body: JSON.stringify({ eventName: 'onboarding_started', country, language }) }).catch(() => {});
    if (params.ref && String(params.ref).trim()) {
      authedFetch('/api/growth/referrals/attribute', { method: 'POST', body: JSON.stringify({ token: String(params.ref) }) }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, []);

  async function finish() {
    if (!country || !language || !selectedModule) { Alert.alert('Finish setup', 'Choose your country, language and a module to start with.'); return; }
    setBusy(true);
    try {
      await updateRegionalPreferences(country, language, language);
      await authedFetch('/api/growth/events', { method: 'POST', headers: { 'Idempotency-Key': `onboarding-complete:${user?.id || 'user'}` }, body: JSON.stringify({ eventName: 'onboarding_completed', country, language }) }).catch(() => {});
      await authedFetch('/api/growth/events', { method: 'POST', headers: { 'Idempotency-Key': `module-intro:${user?.id || 'user'}:${selectedModule}` }, body: JSON.stringify({ eventName: 'module_intro_viewed', country, language, module: selectedModule }) }).catch(() => {});
      await authedFetch('/api/growth/events', { method: 'POST', headers: { 'Idempotency-Key': `activation:${user?.id || 'user'}` }, body: JSON.stringify({ eventName: 'activation', country, language, module: selectedModule }) }).catch(() => {});
      router.replace('/(tabs)' as any);
    } catch (error: any) { Alert.alert('Could not save your preferences', error?.message || 'Please check your connection and try again.'); }
    finally { setBusy(false); }
  }

  async function createInvite() {
    setInviteBusy(true);
    try {
      const result: any = await authedFetch('/api/growth/referrals/me');
      if (!result?.token) { Alert.alert('Invite code unavailable', result?.reason || 'A new invite code could not be shown.'); return; }
      setInviteToken(String(result.token));
      await Share.share({ message: `Join me on NEXA: nexa://auth/signup?ref=${result.token}\nIf the app is not installed yet, install NEXA and enter invitation code ${result.token}.`, title: 'Invite someone to NEXA' });
    } catch (error: any) { Alert.alert('Invite code unavailable', error?.message || 'Please try again later.'); }
    finally { setInviteBusy(false); }
  }

  return <KeyboardAvoidingView style={ds({ flex: 1 })} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <RoyalBackground world="auth" style={ds({ flex: 1 })}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={ds({ flexGrow: 1, justifyContent: 'center', padding: theme.layout.pagePadding, width: '100%', maxWidth: 640, alignSelf: 'center' })}>
        <Text style={s.title}>{onboardingVariant ? 'Welcome to NEXA' : 'Make NEXA yours'}</Text>
        <Text style={s.subtitle}>Choose your region and language, then pick a place to begin. You can change these preferences later.</Text>
        <View style={[s.card, { marginTop: 20, gap: 12 }]}>
          <CountryPicker value={country} valueMode="code" onSelect={(item) => setCountry(item.code)} label="Your country or territory" locale={language} />
          <Text style={s.section}>App language</Text>
          <View style={ds({ flexDirection: 'row', flexWrap: 'wrap', gap: 8 })}>
            {LANGUAGES.map((item) => <NexaFocusPressable key={item.code} accessibilityRole="radio" accessibilityState={{ selected: language === item.code }} onPress={() => setLanguage(item.code)} style={ds({ minHeight: 42, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: language === item.code ? theme.colors.gold : theme.colors.border, backgroundColor: language === item.code ? theme.colors.surfaceElevated : theme.colors.surface })}><Text style={ds({ color: theme.colors.text, fontWeight: language === item.code ? '900' : '600' })}>{item.label}</Text></NexaFocusPressable>)}
          </View>
          <Text style={[s.section, { marginTop: 4 }]}>Start with a module</Text>
          {modules.map((key) => <NexaFocusPressable key={key} accessibilityRole="radio" accessibilityState={{ selected: selectedModule === key }} onPress={() => setSelectedModule(key)} style={ds({ borderWidth: 1, borderColor: selectedModule === key ? theme.colors.gold : theme.colors.border, borderRadius: 12, padding: 12, backgroundColor: selectedModule === key ? theme.colors.surfaceElevated : theme.colors.surface })}><Text style={ds({ color: theme.colors.text, fontWeight: '900', textTransform: 'capitalize' })}>{key.replace(/_/g, ' ')}</Text><Text style={ds({ color: theme.colors.muted, marginTop: 4 })}>{MODULE_COPY[key] || 'Explore this part of NEXA.'}</Text></NexaFocusPressable>)}
          <NexaFocusPressable accessibilityRole="button" disabled={busy || !configLoaded} onPress={finish} style={[s.button, { marginTop: 8, opacity: busy || !configLoaded ? 0.65 : 1 }]}><Text style={s.btnText}>{busy ? 'Saving your setup…' : 'Finish setup'}</Text></NexaFocusPressable>
          <NexaFocusPressable accessibilityRole="button" disabled={inviteBusy} onPress={createInvite} style={[s.buttonSecondary, { minHeight: 48, opacity: inviteBusy ? 0.65 : 1 }]}><Text style={s.buttonText}>{inviteBusy ? 'Preparing invite…' : 'Invite someone to NEXA'}</Text></NexaFocusPressable>
          {inviteToken ? <Text selectable style={ds({ color: theme.colors.goldHot, fontWeight: '800', textAlign: 'center' })}>Your one-time invite code: {inviteToken}</Text> : null}
          <Text style={ds({ color: theme.colors.muted, fontSize: 14 })}>Growth and invitation rewards are not automatic. NEXA records only the selected setup events; outbound lifecycle messages remain off.</Text>
        </View>
      </ScrollView>
    </RoyalBackground>
  </KeyboardAvoidingView>;
}

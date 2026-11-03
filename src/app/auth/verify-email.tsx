import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { confirmEmailVerification, requestEmailVerification } from '../../api';
import { s } from '../../styles';
import { theme, ds } from '../../theme';
import { RoyalBackground } from '../../RoyalBackground';
import { NexaFocusPressable } from '../../motion';
export default function VerifyEmail() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token || '';
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  const [state, setState] = useState<'request' | 'loading' | 'success' | 'error'>(token ? 'loading' : 'request');
  useEffect(() => { let live = true; if (!token) return; confirmEmailVerification(token).then(() => { if (live) setState('success'); }).catch(() => { if (live) setState('error'); }); return () => { live = false; }; }, [token]);
  const request = async () => { if (!/^\S+@\S+\.\S+$/.test(email.trim())) { Alert.alert('Email required', 'Enter the email address on your NEXA account.'); return; } setBusy(true); try { const result = await requestEmailVerification(email.trim().toLowerCase()); Alert.alert('Check your email', result?.message || 'If the account can receive verification mail, a link will be sent.'); } catch (e: any) { Alert.alert('Could not request verification', e?.message || 'Please try again.'); } finally { setBusy(false); } };
  return <RoyalBackground world="auth" style={ds({ flex: 1, justifyContent: 'center', padding: 24 })}><View style={[s.card, { gap: 14 }]}>{state === 'loading' ? <ActivityIndicator color={theme.colors.goldHot} /> : null}<Text style={s.title}>{state === 'loading' ? 'Verifying email…' : state === 'success' ? 'Email verified' : state === 'error' ? 'Link unavailable' : 'Verify your email'}</Text><Text style={s.subtitle}>{state === 'success' ? 'Your NEXA email address has been verified.' : state === 'error' ? 'This link may have expired or already been used. Request a fresh verification link below.' : state === 'request' ? 'We will send a secure verification link if an account matches your email.' : 'Please wait while we securely verify your email address.'}</Text>{state === 'request' || state === 'error' ? <><Text style={s.section}>Account email</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" accessibilityLabel="Account email" placeholder="you@example.com" placeholderTextColor={theme.colors.muted} style={s.authInput} /><NexaFocusPressable accessibilityRole="button" disabled={busy} style={[s.button, { marginTop: 8, opacity: busy ? .65 : 1 }]} onPress={request}><Text style={s.btnText}>{busy ? 'Please wait…' : 'Send verification link'}</Text></NexaFocusPressable></> : null}<NexaFocusPressable accessibilityRole="button" style={{ paddingVertical: 12, alignItems: 'center' }} onPress={() => router.replace('/auth/login' as any)}><Text style={{ color: theme.colors.goldHot, fontWeight: '800' }}>Return to sign in</Text></NexaFocusPressable></View></RoyalBackground>;
}

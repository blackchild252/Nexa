import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { s } from '../../styles';
import { theme, ds } from '../../theme';
import { RoyalBackground } from '../../RoyalBackground';
import { useNexaResponsive } from '../../nexaTypography';
import { NexaFocusPressable } from '../../motion';
import { confirmPasswordReset, requestPasswordReset } from '../../api';
import { PasswordInput } from '../../PasswordInput';
export default function RecoverAccount() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token || '';
  const { gutter, contentMaxWidth } = useNexaResponsive();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    if (token && password.length < 8) { Alert.alert('Choose a password', 'Use at least 8 characters with uppercase, lowercase, number and special character.'); return; }
    if (!token && !/^\S+@\S+\.\S+$/.test(email.trim())) { Alert.alert('Email required', 'Enter the email address on your NEXA account.'); return; }
    setBusy(true);
    try {
      if (token) { await confirmPasswordReset(token, password); Alert.alert('Password reset', 'Your password has been changed and active sessions have been signed out.', [{ text: 'Return to sign in', onPress: () => router.replace('/auth/login' as any) }]); }
      else { const result = await requestPasswordReset(email.trim().toLowerCase()); Alert.alert('Check your email', result?.message || 'If an account matches that email, recovery instructions will be sent.'); }
    } catch (e: any) { Alert.alert(token ? 'Could not reset password' : 'Could not request recovery', e?.message || 'Please try again.'); }
    finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={ds({ flex: 1 })} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><RoyalBackground world="auth" style={ds({ flex: 1 })}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ds({ flexGrow: 1, justifyContent: 'center', paddingVertical: theme.layout.pagePadding, paddingHorizontal: gutter, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' })}><Text style={s.title}>{token ? 'Choose a new password' : 'Recover your account'}</Text><Text style={s.subtitle}>{token ? 'Recovery links expire and can only be used once.' : 'We will send a secure recovery link if an account matches your email.'}</Text><View style={[s.card, { marginTop: 22 }]}>{token ? <><Text style={s.section}>New password</Text><PasswordInput value={password} onChangeText={setPassword} accessibilityLabel="New password" placeholder="New password" placeholderTextColor={theme.colors.muted} /></> : <><Text style={s.section}>Email</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" accessibilityLabel="Account email" placeholder="you@example.com" placeholderTextColor={theme.colors.muted} style={s.authInput} /></>}<NexaFocusPressable accessibilityRole="button" disabled={busy} style={[s.button, { marginTop: 18, opacity: busy ? .65 : 1 }]} onPress={submit}><Text style={s.btnText}>{busy ? 'Please wait…' : token ? 'Reset password' : 'Send recovery link'}</Text></NexaFocusPressable><NexaFocusPressable accessibilityRole="button" style={{ paddingVertical: 16, alignItems: 'center' }} onPress={() => router.replace('/auth/login' as any)}><Text style={{ color: theme.colors.goldHot, fontWeight: '800' }}>Back to sign in</Text></NexaFocusPressable></View></ScrollView></RoyalBackground></KeyboardAvoidingView>;
}

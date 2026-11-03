import React, { useState } from 'react';
import { TextInput, NexaFocusPressable, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { s } from './styles';
import { theme, ds } from './theme';

// One password field for the whole app: show/hide eye, correct Android/iOS autofill hints.
// isNew = true for sign-up and "new password" fields, false for sign-in and "current password" fields.
export function PasswordInput({ isNew, style, ...props }: TextInputProps & { isNew?: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <View style={ds({ justifyContent: 'center' })}>
      <TextInput
        {...props}
        secureTextEntry={!shown}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={isNew ? 'new-password' : 'current-password'}
        textContentType={isNew ? 'newPassword' : 'password'}
        importantForAutofill="yes"
        style={[s.authInput, style, ds({ paddingRight: 48 })]}
      />
      <NexaFocusPressable
        accessibilityRole="button"
        accessibilityLabel={shown ? 'Hide password' : 'Show password'}
        onPress={() => setShown(v => !v)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={ds({ position: 'absolute', right: 4, top: 6, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' })}
      >
        <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={22} color={theme.colors.muted} />
      </NexaFocusPressable>
    </View>
  );
}

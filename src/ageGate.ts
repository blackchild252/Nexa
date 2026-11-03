import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'nexa.age.confirmed.v1';
let runtimeConfirmed = false;

export async function setAdultConfirmation(value: boolean) {
  runtimeConfirmed = value === true;
  try {
    if (Platform.OS === 'web') {
      window.sessionStorage.setItem(KEY, runtimeConfirmed ? '1' : '0');
    } else {
      await SecureStore.setItemAsync(KEY, runtimeConfirmed ? '1' : '0');
    }
  } catch {}
}

export async function getAdultConfirmation() {
  if (runtimeConfirmed) return true;
  try {
    const value = Platform.OS === 'web'
      ? window.sessionStorage.getItem(KEY)
      : await SecureStore.getItemAsync(KEY);
    runtimeConfirmed = value === '1';
  } catch {}
  return runtimeConfirmed;
}

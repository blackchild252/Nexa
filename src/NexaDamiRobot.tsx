import React from 'react';
import { View } from 'react-native';
import { AvatarStage } from './NexaAvatar';
import { useAvatar } from './nexaAvatar';

/**
 * Dami is now the customizable cartoon avatar (it replaces the old 3D robot everywhere).
 * The export name and props are unchanged so every existing place that showed the robot
 * (Home, the Dami screen header and its scenes) now shows the user's avatar.
 */
export function NexaDamiRobot({ size = 210, waveSpan = 0, onPress }: { size?: number; waveSpan?: number; active?: boolean; onPress?: () => void }) {
  const cfg = useAvatar();
  const box = Math.max(size, waveSpan);
  return <View style={{ width: box, height: size * 1.08, alignItems: 'center', justifyContent: 'center' }}><AvatarStage cfg={cfg} size={size} onPress={onPress} /></View>;
}

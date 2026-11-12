import { Platform, Vibration } from 'react-native';

export function hapticTick(): void {
  if (Platform.OS === 'android') Vibration.vibrate(12);
}

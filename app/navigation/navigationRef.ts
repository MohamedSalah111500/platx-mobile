import { createNavigationContainerRef } from '@react-navigation/native';
import { useAuthStore } from '../store/auth.store';
import type { RootStackParamList } from '../types/navigation.types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToNotifications() {
  if (!navigationRef.isReady()) return;
  if (!useAuthStore.getState().isAuthenticated) return;
  (navigationRef.navigate as (name: string, params?: object) => void)('Main', {
    screen: 'HomeTab',
    params: { screen: 'NotificationsList' },
  });
}

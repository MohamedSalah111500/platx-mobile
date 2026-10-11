import { createNavigationContainerRef } from '@react-navigation/native';
import { useAuthStore } from '../store/auth.store';
import { useParentStore } from '../store/parent.store';
import type { RootStackParamList } from '../types/navigation.types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToNotifications() {
  if (!navigationRef.isReady()) return;
  if (useParentStore.getState().token) {
    (navigationRef.navigate as (name: string, params?: object) => void)('Parent', {
      screen: 'ParentNotifications',
    });
    return;
  }
  if (!useAuthStore.getState().isAuthenticated) return;
  (navigationRef.navigate as (name: string, params?: object) => void)('Main', {
    screen: 'HomeTab',
    params: { screen: 'NotificationsList' },
  });
}

export function navigateToCourse(courseId: number) {
  if (!navigationRef.isReady()) return;
  if (!useAuthStore.getState().isAuthenticated) return;
  (navigationRef.navigate as (name: string, params?: object) => void)('Main', {
    screen: 'HomeTab',
    params: { screen: 'CourseDetail', params: { courseId } },
  });
}

export function openGuardianLink(code: string) {
  if (!navigationRef.isReady()) return;
  if (useAuthStore.getState().isAuthenticated) return;
  (navigationRef.navigate as (name: string, params?: object) => void)(
    useParentStore.getState().token ? 'Parent' : 'Auth',
    { screen: 'ParentLink', params: { code } }
  );
}

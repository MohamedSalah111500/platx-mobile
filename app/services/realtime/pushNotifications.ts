import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import apiClient from '../api/client';
import { DEVICE_TOKEN_URLS } from '../api/endpoints';
import { STORAGE_KEYS } from '../../config';
import { logger } from '../logger';

function getProjectId(): string | null {
  return (
    (Constants as any)?.easConfig?.projectId ??
    (Constants as any)?.expoConfig?.extra?.eas?.projectId ??
    null
  );
}

export async function registerForPushNotifications(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      logger.log('[Push] permission not granted, skipping registration');
      return false;
    }

    const projectId = getProjectId();
    if (!projectId) {
      logger.log('[Push] no EAS projectId configured, skipping registration');
      return false;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return false;

    // Register every time rather than only when the token changes. The server drops a
    // token as soon as one delivery comes back "DeviceNotRegistered" (an app update or
    // a long-closed app is enough), and a device that skipped re-registering because
    // its stored copy still matched would then stay silent for good. Registering is an
    // upsert, so repeating it is free.
    await apiClient.post(DEVICE_TOKEN_URLS.REGISTER, {
      token,
      platform: Platform.OS,
    });
    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
    logger.log(`[Push] token registered (${token.slice(0, 18)}…)`);
    return true;
  } catch (err) {
    logger.recordError(err, 'Push:register');
    return false;
  }
}

export async function unregisterPushNotifications(authToken?: string | null): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    if (!token) return;
    await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);
    await apiClient.post(
      DEVICE_TOKEN_URLS.UNREGISTER,
      { token },
      authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined
    );
    logger.log('[Push] token unregistered');
  } catch (err) {
    logger.recordError(err, 'Push:unregister');
  }
}

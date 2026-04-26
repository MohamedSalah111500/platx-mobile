import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../../config';
import { notificationsApi } from '../api/notifications.api';

const BACKGROUND_NOTIFICATION_TASK = 'background-notification-check';
const LAST_COUNT_KEY = 'bg_notification_last_count';

// Background task: checks for new notifications when app is backgrounded/closed
// Wrapped in try/catch — defineTask at module load can crash on devices without task manager support
try {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!userData) return BackgroundFetch.BackgroundFetchResult.NoData;

      const user = JSON.parse(userData);
      if (!user?.token) return BackgroundFetch.BackgroundFetchResult.NoData;

      const role = user.roles?.[0] || 'Student';
      const response = await notificationsApi.getByRole(role, 1, 5, user.studentId);
      const currentCount = response.totalCount;

      const lastCountStr = await AsyncStorage.getItem(LAST_COUNT_KEY);
      const lastCount = lastCountStr ? parseInt(lastCountStr, 10) : 0;

      if (lastCount > 0 && currentCount > lastCount && response.items.length > 0) {
        const newest = response.items[0];
        await Notifications.scheduleNotificationAsync({
          content: {
            title: String(newest.title || 'PlatX'),
            body: String(newest.body || newest.message || 'You have a new notification'),
            sound: 'default',
            ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
          },
          trigger: null,
        });
      }

      await AsyncStorage.setItem(LAST_COUNT_KEY, String(currentCount));
      return currentCount > lastCount
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
} catch {}

export async function registerBackgroundNotifications() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
      minimumInterval: 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // Background fetch not available on this device
  }
}

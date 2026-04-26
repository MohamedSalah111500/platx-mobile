import * as signalR from '@microsoft/signalr';
import { LogBox, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { HUB_URLS } from '../api/endpoints';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationsStore } from '../../store/notifications.store';
import { registerBackgroundNotifications } from './backgroundNotifications';

// Suppress known SignalR reconnection warnings in dev
LogBox.ignoreLogs([
  'WebSocket closed with status code: 1006',
  'Connection disconnected',
  'Network request failed',
]);

// Configure foreground notification display — wrapped in try/catch
// because module-level errors crash the JS bundle on some Android devices
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {}

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  }).catch(() => {});
}

async function ensureNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

class SignalRService {
  private notificationHub: signalR.HubConnection | null = null;
  private liveClassroomHub: signalR.HubConnection | null = null;

  // --- Notifications Hub ---
  async startNotificationConnection(): Promise<void> {
    const token = useAuthStore.getState().token;
    if (!token) return;

    await ensureNotificationPermissions();
    registerBackgroundNotifications();

    this.notificationHub = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URLS.NOTIFICATIONS, {
        accessTokenFactory: () => useAuthStore.getState().token || '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000, 60000])
      .configureLogging(signalR.LogLevel.None)
      .build();

    this.notificationHub.serverTimeoutInMilliseconds = 120000;
    this.notificationHub.keepAliveIntervalInMilliseconds = 30000;

    // Handle real-time notifications
    this.notificationHub.on('UpdateCatalog', async (notificationJson: string) => {
      // Refresh notification list
      const { user } = useAuthStore.getState();
      if (user) {
        const role = user.roles?.[0] as any;
        useNotificationsStore.getState().fetch(role, 1, 15, user.studentId);
      }

      // Parse and show push notification
      let title = 'PlatX';
      let body = 'You have a new notification';
      try {
        let parsed: any = notificationJson;
        if (typeof notificationJson === 'string') {
          try {
            parsed = JSON.parse(notificationJson);
          } catch {
            body = notificationJson || body;
          }
        }
        if (parsed && typeof parsed === 'object') {
          title = String(parsed.title || 'PlatX');
          body = String(parsed.body || parsed.message || body);
          useNotificationsStore.getState().addNotification({
            ...parsed,
            createdDate: parsed.createdDate || parsed.createdAt || new Date().toISOString(),
          });
        }
      } catch {
        // Use default title/body
      }

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: 'default',
            ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
          },
          trigger: null,
        });
      } catch {
        // Notification scheduling failed silently
      }
    });

    // Auto-retry when connection fully closes (after all automatic retries exhausted)
    this.notificationHub.onclose(() => {
      setTimeout(() => this.retryNotificationConnection(), 5000);
    });

    try {
      await this.notificationHub.start();
    } catch {
      setTimeout(() => this.retryNotificationConnection(), 5000);
    }
  }

  private async retryNotificationConnection() {
    if (!this.notificationHub) return;
    if (
      this.notificationHub.state === signalR.HubConnectionState.Connected ||
      this.notificationHub.state === signalR.HubConnectionState.Connecting ||
      this.notificationHub.state === signalR.HubConnectionState.Reconnecting
    ) return;
    try {
      await this.notificationHub.start();
    } catch {
      setTimeout(() => this.retryNotificationConnection(), 15000);
    }
  }

  // --- Live Classroom Hub ---
  async startLiveClassroomConnection(): Promise<void> {
    if (
      this.liveClassroomHub &&
      (this.liveClassroomHub.state === signalR.HubConnectionState.Connected ||
        this.liveClassroomHub.state === signalR.HubConnectionState.Connecting ||
        this.liveClassroomHub.state === signalR.HubConnectionState.Reconnecting)
    ) {
      return;
    }

    const token = useAuthStore.getState().token;
    if (!token) return;

    this.liveClassroomHub = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URLS.LIVE_CLASSROOM, {
        accessTokenFactory: () => useAuthStore.getState().token || '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.None)
      .build();

    this.liveClassroomHub.onclose(() => {
      // Silent close
    });

    try {
      await this.liveClassroomHub.start();
    } catch {
      // Silent fail
    }
  }

  // --- Live Classroom Methods ---
  async joinClassroom(liveClassroomId: number, userId: number, isTeacher: boolean) {
    await this.liveClassroomHub?.invoke('JoinClassroom', liveClassroomId, userId, isTeacher);
  }

  async leaveClassroom(liveClassroomId: number, userId: number) {
    await this.liveClassroomHub?.invoke('LeaveClassroom', liveClassroomId, userId);
  }

  async approveStudent(liveClassroomId: number, studentId: number, approve: boolean) {
    await this.liveClassroomHub?.invoke('ApproveStudent', liveClassroomId, studentId, approve, null);
  }

  async removeStudent(liveClassroomId: number, studentId: number) {
    await this.liveClassroomHub?.invoke('RemoveStudent', liveClassroomId, studentId);
  }

  async endLiveSession(liveClassroomId: number, teacherId: number) {
    await this.liveClassroomHub?.invoke('EndLiveSession', liveClassroomId, teacherId, null);
  }

  async sendLiveMessage(liveClassroomId: number, senderId: number, senderName: string, message: string) {
    await this.liveClassroomHub?.invoke('SendMessage', liveClassroomId, senderId, senderName, message);
  }

  async raiseHand(liveClassroomId: number, studentId: number, studentName: string) {
    await this.liveClassroomHub?.invoke('RaiseHand', liveClassroomId, studentId, studentName);
  }

  async lowerHand(liveClassroomId: number, studentId: number) {
    await this.liveClassroomHub?.invoke('LowerHand', liveClassroomId, studentId);
  }

  async toggleMute(liveClassroomId: number, studentId: number, isMuted: boolean) {
    await this.liveClassroomHub?.invoke('ToggleMute', liveClassroomId, studentId, isMuted);
  }

  async toggleVideo(liveClassroomId: number, studentId: number, isOff: boolean) {
    await this.liveClassroomHub?.invoke('ToggleVideo', liveClassroomId, studentId, isOff);
  }

  // --- Live Classroom Event Registration ---
  onParticipantList(callback: (participants: any[]) => void) {
    this.liveClassroomHub?.on('ParticipantList', callback);
  }

  onStudentJoined(callback: (student: any) => void) {
    this.liveClassroomHub?.on('StudentJoined', callback);
  }

  onStudentLeft(callback: (data: any) => void) {
    this.liveClassroomHub?.on('StudentLeft', callback);
  }

  onStudentApproved(callback: (data: any) => void) {
    this.liveClassroomHub?.on('StudentApproved', callback);
  }

  onStudentRemoved(callback: (data: any) => void) {
    this.liveClassroomHub?.on('StudentRemoved', callback);
  }

  onLiveSessionEnded(callback: () => void) {
    this.liveClassroomHub?.on('LiveSessionEnded', callback);
  }

  onReceiveMessage(callback: (message: any) => void) {
    this.liveClassroomHub?.on('ReceiveMessage', callback);
  }

  onHandRaised(callback: (data: any) => void) {
    this.liveClassroomHub?.on('HandRaised', callback);
  }

  // --- Connection Management ---
  async startConnection(): Promise<void> {
    await this.startNotificationConnection();
  }

  async stopConnection(): Promise<void> {
    await this.notificationHub?.stop();
    await this.liveClassroomHub?.stop();
    this.notificationHub = null;
    this.liveClassroomHub = null;
  }

  async stopLiveClassroomConnection(): Promise<void> {
    try {
      await this.liveClassroomHub?.stop();
    } catch {
      // Ignore stop errors
    }
    this.liveClassroomHub = null;
  }
}

export const signalRService = new SignalRService();
export default signalRService;

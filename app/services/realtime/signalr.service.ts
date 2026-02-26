import * as signalR from '@microsoft/signalr';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { HUB_URLS } from '../api/endpoints';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationsStore } from '../../store/notifications.store';

// Detect if running in Expo Go (push notifications removed in SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

// Conditionally load expo-notifications (crashes in Expo Go SDK 53+)
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    // Configure how notifications are shown when app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // expo-notifications not available
  }
}

// Request notification permissions (required on iOS and Android 13+)
async function ensureNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return false;
    }
    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }
    return true;
  } catch (err) {
    console.warn('[Notifications] Permission request error:', err);
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

    // Request notification permissions before connecting
    await ensureNotificationPermissions();

    this.notificationHub = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URLS.NOTIFICATIONS, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 1000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Listen for new notifications
    this.notificationHub.on('UpdateCatalog', (notificationJson: string) => {
      try {
        const raw = typeof notificationJson === 'string' ? JSON.parse(notificationJson) : notificationJson;
        // Ensure createdDate field is present
        const notification = {
          ...raw,
          createdDate: raw.createdDate || raw.createdAt || new Date().toISOString(),
        };
        console.log('[SignalR] Notification received:', notification.title);
        useNotificationsStore.getState().addNotification(notification);
        // Show local push notification (only in dev builds, not Expo Go)
        if (Notifications) {
          try {
            const content: any = {
              title: String(notification.title || 'PLATX'),
              body: String(notification.body || notification.message || 'You have a new notification'),
              sound: 'default',
            };
            if (Platform.OS === 'android') {
              content.channelId = 'default';
            }
            Notifications.scheduleNotificationAsync({
              content,
              trigger: null,
            }).catch((err: any) => console.warn('[Notifications] Schedule error:', err));
          } catch (scheduleErr) {
            console.warn('[Notifications] Failed to schedule:', scheduleErr);
          }
        }
      } catch (e) {
        console.log('[SignalR] Notification parse error:', e);
      }
    });

    this.notificationHub.onclose(() => {
      console.log('[SignalR] Notification hub closed');
    });

    this.notificationHub.onreconnecting(() => {
      console.log('[SignalR] Notification hub reconnecting...');
    });

    this.notificationHub.onreconnected(() => {
      console.log('[SignalR] Notification hub reconnected');
    });

    try {
      await this.notificationHub.start();
      console.log('[SignalR] Notification hub connected');
    } catch (err) {
      console.error('[SignalR] Notification hub error:', err);
    }
  }

  // --- Live Classroom Hub ---
  async startLiveClassroomConnection(): Promise<void> {
    // Guard: if already connected or connecting, don't create a new one
    if (
      this.liveClassroomHub &&
      (this.liveClassroomHub.state === signalR.HubConnectionState.Connected ||
        this.liveClassroomHub.state === signalR.HubConnectionState.Connecting ||
        this.liveClassroomHub.state === signalR.HubConnectionState.Reconnecting)
    ) {
      console.log('[SignalR] Live classroom hub already connected');
      return;
    }

    const token = useAuthStore.getState().token;
    if (!token) return;

    this.liveClassroomHub = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URLS.LIVE_CLASSROOM, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.liveClassroomHub.onclose((err) => {
      console.log('[SignalR] Live classroom hub closed', err?.message ?? '');
    });

    this.liveClassroomHub.onreconnecting((err) => {
      console.log('[SignalR] Live classroom hub reconnecting...', err?.message ?? '');
    });

    this.liveClassroomHub.onreconnected(() => {
      console.log('[SignalR] Live classroom hub reconnected');
    });

    try {
      await this.liveClassroomHub.start();
      console.log('[SignalR] Live classroom hub connected');
    } catch (err) {
      console.warn('[SignalR] Live classroom hub connection failed:', err);
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
      // Ignore stop errors (connection may already be closed)
    }
    this.liveClassroomHub = null;
  }
}

export const signalRService = new SignalRService();
export default signalRService;

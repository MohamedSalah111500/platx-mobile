import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput,
  Modal,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  PermissionsAndroid,
  TurboModuleRegistry,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { liveApi } from '../../services/api/live.api';
import { signalRService } from '../../services/realtime/signalr.service';
import * as AgoraService from '../../services/agora/agora.service';
import { logger } from '../../services/logger';
import { usePreventScreenCapture } from 'expo-screen-capture';
import type { IRtcEngineEventHandler } from '../../services/agora/agora.service';

// Conditionally load RtcSurfaceView (only available in dev builds, not Expo Go)
let RtcSurfaceView: any = null;
const hasAgora = !!TurboModuleRegistry.get('AgoraRtcNg');
if (hasAgora) {
  try {
    RtcSurfaceView = require('react-native-agora').RtcSurfaceView;
  } catch {
    // Agora not available
  }
}
import type { RootStackParamList } from '../../types/navigation.types';
import type { LiveSession, LiveParticipant, LiveMessage, JoinLivePayload } from '../../types/live.types';
import { REQUEST_ONLY } from '../../config/storePolicy';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveClassroom'>;

// Dark video-call theme (always dark regardless of app theme) — used for the
// video stage, top bar, controls and chat overlay. Sheets/modals follow the app theme.
const DARK = {
  bg: '#0f0f1a',
  surface: '#1a1a2e',
  surfaceLight: '#252540',
  text: '#ffffff',
  textSecondary: '#a0a0b8',
  accent: '#4f46e5',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
};

const CONTROL_SIZE = 52;
const CONTROL_ICON = 22;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LiveClassroomScreen({ navigation, route }: Props) {
  const { roomId, isTeacher } = route.params;
  const { user, isStudent } = useAuth();
  const { t, isRTL } = useRTL();
  const { theme } = useTheme();

  // Block screenshots/screen recording during live sessions, to protect the
  // classroom feed from being captured.
  usePreventScreenCapture('live-classroom');

  // Room & session state
  const [room, setRoom] = useState<LiveSession | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agoraJoined, setAgoraJoined] = useState(false);

  // Controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Chat state
  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Participants panel
  const [participantsVisible, setParticipantsVisible] = useState(false);

  // Payment (paid session) state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
  const [paymentProof, setPaymentProof] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const chatListRef = useRef<FlatList>(null);
  // Join already answers with a token bound to a server-assigned Agora uid. Reusing
  // it avoids a second round trip and keeps two people from picking the same uid,
  // which Agora resolves by kicking the first one out of the channel.
  const agoraCredsRef = useRef<{ token?: string; uid?: number } | null>(null);

  // Numeric id used for hub calls (same id JoinClassroom is invoked with).
  const hubUserId = user?.studentId ?? 0;
  const hubUserIdRef = useRef(hubUserId);
  hubUserIdRef.current = hubUserId;
  const fullNameRef = useRef('');
  fullNameRef.current = user ? `${user.firstName} ${user.lastName}` : '';

  // ─── Load Room ───────────────────────────────
  useEffect(() => {
    loadRoom();
  }, [roomId]);

  const loadRoom = async () => {
    try {
      setError(null);
      const data = await liveApi.getRoom(roomId);
      setRoom(data);
      await joinSession(data);
    } catch (err: any) {
      setError(err?.userMessage || t('live.failedToLoadSession'));
    } finally {
      setLoading(false);
    }
  };

  // ─── Join Session ────────────────────────────
  const joinSession = async (
    roomData?: LiveSession | null,
    payment?: Pick<JoinLivePayload, 'paymentTransactionId' | 'paymentTransactionImg' | 'accessRequestOnly'>
  ) => {
    if (!user) return;
    const currentRoom = roomData || room;

    // Teacher/host is already a participant
    if (
      currentRoom?.teacherId != null &&
      currentRoom.teacherId === user.studentId
    ) {
      setJoined(true);
      loadParticipants();
      return;
    }

    setJoining(true);
    setPendingApproval(false);
    try {
      let response: any;
      const userId = (user.studentId ?? 0);
      if (isStudent) {
        response = await liveApi.join({
          liveClassroomId: roomId,
          studentId: userId,
          ...payment,
        });
      } else {
        response = await liveApi.joinStaff({
          liveClassroomId: roomId,
          staffId: userId,
        });
      }
      if (response?.token) {
        agoraCredsRef.current = {
          token: response.token,
          uid: typeof response.uid === 'number' ? response.uid : undefined,
        };
      }
      const status = response?.status;
      if (status === 1) {
        setPendingApproval(true);
        setPaymentModalVisible(false);
        Alert.alert(t('live.pending'), t('live.joinRequestPending'));
      } else if (status === 2) {
        setPaymentModalVisible(true);
      } else if (status === 3) {
        setPaymentModalVisible(false);
        Alert.alert(t('live.denied'), t('live.joinRequestDenied'));
      } else if (status === 4) {
        setPaymentModalVisible(false);
        Alert.alert(t('live.closed'), t('live.sessionClosed'));
      } else {
        setPaymentModalVisible(false);
        setJoined(true);
      }
      loadParticipants();
    } catch (err: any) {
      const msg =
        err?.userMessage ||
        err?.response?.data?.message ||
        t('live.joinSessionFailed');
      if (
        msg.toLowerCase().includes('entity') ||
        err?.response?.status === 409
      ) {
        setJoined(true);
        loadParticipants();
      } else {
        Alert.alert(t('live.joinError'), msg);
      }
    } finally {
      setJoining(false);
      setSubmittingPayment(false);
    }
  };

  const pickPaymentProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const name = asset.fileName || `live-payment-${Date.now()}.jpg`;
    const type = asset.mimeType || 'image/jpeg';
    setPaymentProof({ uri: asset.uri, name, type });
  };

  const submitPayment = () => {
    if (!paymentTransactionId.trim()) {
      Alert.alert(t('common.validation'), t('live.transactionIdRequired'));
      return;
    }
    if (!paymentProof) {
      Alert.alert(t('common.validation'), t('live.receiptImageRequired'));
      return;
    }
    setSubmittingPayment(true);
    joinSession(room, {
      paymentTransactionId: paymentTransactionId.trim(),
      paymentTransactionImg: paymentProof,
    });
  };

  // iOS: a paid session is joined by asking the teacher for access — no payment details.
  const sendJoinRequest = () => {
    setSubmittingPayment(true);
    joinSession(room, { accessRequestOnly: true });
  };

  const loadParticipants = async () => {
    try {
      const data = await liveApi.getParticipants(roomId);
      setParticipants(Array.isArray(data) ? data : []);
    } catch {
      // Non-critical
    }
  };

  // ─── Request Permissions ──────────────────────
  const requestPermissions = async (): Promise<boolean> => {
    // The microphone is what carries the lesson. iOS grants it silently on first
    // use, so a teacher who once tapped "Don't Allow" would broadcast video with
    // no sound and nothing would say why - ask for it explicitly instead.
    try {
      const mic = await requestRecordingPermissionsAsync();
      if (!mic.granted) {
        logger.log('[Live] microphone permission denied');
        Alert.alert(
          t('live.permissionsRequired'),
          t('live.microphoneDenied'),
          mic.canAskAgain
            ? undefined
            : [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('live.openSettings'), onPress: () => Linking.openSettings() },
              ],
        );
        return false;
      }
    } catch (err) {
      logger.log(`[Live] microphone permission check failed: ${String(err)}`);
    }

    if (Platform.OS === 'android') {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ];
      const results = await PermissionsAndroid.requestMultiple(permissions);
      const audioGranted =
        results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const cameraGranted =
        results[PermissionsAndroid.PERMISSIONS.CAMERA] ===
        PermissionsAndroid.RESULTS.GRANTED;
      if (!audioGranted || !cameraGranted) {
      }
      return audioGranted && cameraGranted;
    }
    return true; // iOS handled via Info.plist
  };

  // A live lesson behaves like a call: it has to be audible with the ring switch
  // on silent and it needs the recording session. The app's sound effects set the
  // opposite mode at startup, so claim it back while the room is open.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true }).catch((err) =>
      logger.log(`[Live] could not set the audio mode: ${String(err)}`),
    );
    return () => {
      setAudioModeAsync({ playsInSilentMode: false, allowsRecording: false }).catch(() => {});
    };
  }, []);

  // ─── Agora Setup ─────────────────────────────
  useEffect(() => {
    if (!joined || !room || !user) return;
    let mounted = true;
    let eventHandler: IRtcEngineEventHandler;

    const setupAgora = async () => {
      try {
        if (!AgoraService.isAgoraAvailable()) {
          logger.log('[Live] Agora native module not available');
          Alert.alert(
            t('live.agoraNotAvailable') || 'Live not available',
            'The live video module is not available on this build.',
          );
          return;
        }

        logger.log('[Live] requesting permissions');
        const granted = await requestPermissions();
        if (!granted) {
          logger.log('[Live] permissions denied');
          Alert.alert(
            t('live.permissionsRequired') || 'Permissions required',
            t('live.permissionsExplanation') ||
              'Camera and microphone access are required to join.',
          );
          return;
        }

        const joinCreds = agoraCredsRef.current;
        let token = joinCreds?.token;
        let uid = joinCreds?.uid;
        let appId: string | undefined;

        if (!token) {
          logger.log(`[Live] fetching Agora token for channel=${room.channelName}`);
          const tokenResp = await liveApi.getToken({
            channelName: room.channelName,
            uid: uid ?? user.studentId ?? 0,
            role: isTeacher ? 1 : 0,
          });
          token = tokenResp?.token;
          uid = typeof tokenResp?.uid === 'number' ? tokenResp.uid : uid;
          appId = (tokenResp as any)?.appId as string | undefined;
        }

        // Servers that leave the app id out of the token response publish it on its
        // own endpoint, so fetch it there instead of failing the join.
        if (token && !appId) {
          logger.log('[Live] no appId with the token, asking the config endpoint');
          appId = (await liveApi.getAgoraAppId().catch(() => null)) ?? undefined;
        }
        if (!appId || !token) {
          logger.log(`[Live] cannot join: appId=${!!appId} token=${!!token}`);
          Alert.alert(
            t('common.error'),
            t('live.invalidTokenResponse') || 'Failed to get live session token.',
          );
          return;
        }

        logger.log('[Live] initializing Agora engine');
        AgoraService.initEngine(appId);

        eventHandler = {
          onJoinChannelSuccess: (_connection: any, _elapsed: number) => {
            if (!mounted) return;
            logger.log('[Live] Agora joined channel successfully');
            setAgoraJoined(true);
          },
          onUserJoined: (_connection: any, remoteUid: number) => {
            if (!mounted) return;
            logger.log(`[Live] remote user joined uid=${remoteUid}`);
            setRemoteUids((prev) =>
              prev.includes(remoteUid) ? prev : [...prev, remoteUid],
            );
          },
          onUserOffline: (_connection: any, remoteUid: number) => {
            if (!mounted) return;
            logger.log(`[Live] remote user left uid=${remoteUid}`);
            setRemoteUids((prev) => prev.filter((id) => id !== remoteUid));
          },
          onError: (errCode: number, msg: string) => {
            logger.log(`[Live] Agora error code=${errCode} msg=${msg}`);
            logger.recordError(new Error(`Agora error ${errCode}: ${msg}`), 'Live:Agora');
          },
          // 1 = capturing, 2 = encoding, 3 = failed. A non-zero error means the
          // microphone never started (permission, or another app holding it).
          onLocalAudioStateChanged: (_c: any, state: number, error: number) => {
            logger.log(`[Live] local audio state=${state} error=${error}`);
          },
          // Reason 5 = the sender muted, 6 = the receiver muted, 7 = the sender left.
          onRemoteAudioStateChanged: (
            _c: any,
            remoteUid: number,
            state: number,
            reason: number,
          ) => {
            logger.log(`[Live] remote audio uid=${remoteUid} state=${state} reason=${reason}`);
          },
          onUserMuteAudio: (_c: any, remoteUid: number, muted: boolean) => {
            logger.log(`[Live] uid=${remoteUid} muted=${muted}`);
          },
          onAudioRoutingChanged: (routing: number) => {
            logger.log(`[Live] audio route=${routing}`);
          },
        };
        AgoraService.registerEvents(eventHandler);

        const effectiveUid = uid ?? (user.studentId ?? 0);
        logger.log(`[Live] joining as ${isTeacher ? 'host' : 'audience'} uid=${effectiveUid}`);
        if (isTeacher) {
          AgoraService.joinAsHost(token, room.channelName, effectiveUid);
        } else {
          AgoraService.joinAsAudience(token, room.channelName, effectiveUid);
        }
      } catch (err: any) {
        logger.recordError(err, 'Live:setupAgora');
        Alert.alert(
          t('common.error'),
          err?.userMessage || t('live.joinSessionFailed'),
        );
      }
    };

    setupAgora();

    return () => {
      mounted = false;
      if (eventHandler) AgoraService.unregisterEvents(eventHandler);
      AgoraService.leave();
      AgoraService.destroy();
      setAgoraJoined(false);
      setRemoteUids([]);
    };
  }, [joined, room?.channelName]);

  // ─── SignalR Setup ───────────────────────────
  // Connect while waiting for approval too, so the StudentApproved event reaches us.
  const signalRActive = joined || pendingApproval;
  useEffect(() => {
    if (!signalRActive || !user) return;
    let mounted = true;

    const setupSignalR = async () => {
      try {
        // 1. Start the connection first (creates the hub)
        await signalRService.startLiveClassroomConnection();

        // 2. Register ALL event handlers BEFORE joining
        //    (server sends ParticipantList immediately on join)
        signalRService.onReceiveMessage((msg: any) => {
          if (!mounted) return;
          // Own messages are already added locally when sent; skip the hub echo.
          if (
            Number(msg.senderId) === hubUserIdRef.current &&
            msg.senderName === fullNameRef.current
          ) {
            return;
          }
          const message: LiveMessage = {
            senderId: msg.senderId,
            senderName: msg.senderName,
            message: msg.message,
            timestamp: msg.timestamp || msg.sentAt || new Date().toISOString(),
          };
          setMessages((prev) => [...prev, message]);
          setUnreadCount((prev) => prev + 1);
        });

        signalRService.onParticipantList((list: any[]) => {
          if (!mounted) return;
          setParticipants(Array.isArray(list) ? list : []);
        });

        // Hub payload is { userId, connectionId, joinedAt } (no name), so
        // refresh the participant list, keeping live hand/mute/video flags.
        signalRService.onStudentJoined(async () => {
          if (!mounted) return;
          try {
            const list = await liveApi.getParticipants(roomId);
            if (!mounted || !Array.isArray(list)) return;
            setParticipants((prev) =>
              list.map((p) => {
                const old = prev.find((o) => o.studentId === p.studentId);
                return old
                  ? { ...p, isHandRaised: old.isHandRaised, isMuted: old.isMuted, isVideoOff: old.isVideoOff }
                  : p;
              }),
            );
          } catch {
            // Non-critical
          }
        });

        signalRService.onStudentLeft((data: any) => {
          if (!mounted) return;
          const leftId = Number(data?.userId ?? data?.studentId);
          setParticipants((prev) =>
            prev.filter((p) => p.studentId !== leftId),
          );
        });

        signalRService.onStudentApproved((data: any) => {
          if (!mounted) return;
          if (data.studentId === user.studentId) {
            setPendingApproval(false);
            setJoined(true);
          }
          setParticipants((prev) =>
            prev.map((p) =>
              p.studentId === data.studentId
                ? { ...p, status: 'approved' }
                : p,
            ),
          );
        });

        signalRService.onStudentRemoved((data: any) => {
          if (!mounted) return;
          if (data.studentId === user.studentId) {
            Alert.alert(t('live.removed'), t('live.youWereRemoved'));
            navigation.goBack();
          }
          setParticipants((prev) =>
            prev.filter((p) => p.studentId !== data.studentId),
          );
        });

        signalRService.onLiveSessionEnded(() => {
          if (!mounted) return;
          Alert.alert(t('live.ended'), t('live.sessionEnded'));
          navigation.goBack();
        });

        signalRService.onHandRaised((data: any) => {
          if (!mounted) return;
          setParticipants((prev) =>
            prev.map((p) =>
              p.studentId === data.studentId
                ? { ...p, isHandRaised: true }
                : p,
            ),
          );
        });

        signalRService.onHandLowered((data: any) => {
          if (!mounted) return;
          setParticipants((prev) =>
            prev.map((p) =>
              p.studentId === data?.studentId
                ? { ...p, isHandRaised: false }
                : p,
            ),
          );
        });

        // 3. NOW join the classroom (triggers server to send ParticipantList)
        await signalRService.joinClassroom(
          roomId,
          (user.studentId ?? 0),
          isTeacher,
        );
      } catch (err) {
      }
    };

    setupSignalR();

    return () => {
      mounted = false;
      signalRService
        .leaveClassroom(roomId, hubUserIdRef.current)
        .catch(() => {});
      signalRService.stopLiveClassroomConnection().catch(() => {});
    };
  }, [signalRActive]);

  // ─── Handlers ────────────────────────────────
  const handleToggleMic = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    AgoraService.toggleMic(newMuted);
    signalRService
      .toggleMute(roomId, hubUserId, newMuted)
      .catch(() => {});
  };

  const handleToggleCamera = () => {
    const newOff = !isVideoOff;
    setIsVideoOff(newOff);
    AgoraService.toggleCamera(newOff);
    signalRService
      .toggleVideo(roomId, hubUserId, newOff)
      .catch(() => {});
  };

  const handleRaiseHand = () => {
    const newRaised = !isHandRaised;
    setIsHandRaised(newRaised);
    const fullName = `${user!.firstName} ${user!.lastName}`;
    if (newRaised) {
      signalRService
        .raiseHand(roomId, hubUserId, fullName)
        .catch(() => {});
    } else {
      signalRService.lowerHand(roomId, hubUserId).catch(() => {});
    }
  };

  const handleSendMessage = () => {
    if (!chatText.trim() || !user) return;
    const fullName = `${user.firstName} ${user.lastName}`;
    signalRService
      .sendLiveMessage(roomId, (user.studentId ?? 0), fullName, chatText.trim())
      .catch(() => {});
    // Optimistic: add to local messages
    setMessages((prev) => [
      ...prev,
      {
        senderId: (user.studentId ?? 0),
        senderName: fullName,
        message: chatText.trim(),
        timestamp: new Date().toISOString(),
      },
    ]);
    setChatText('');
  };

  const handleEndSession = () => {
    if (!user) return;
    Alert.alert(t('live.endSession'), t('live.endSessionConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('live.end'),
        style: 'destructive',
        onPress: async () => {
          try {
            await liveApi.endLive({
              liveClassroomId: roomId,
              teacherId: (user.studentId ?? 0),
            });
            Alert.alert(t('live.ended'), t('live.sessionEnded'));
            navigation.goBack();
          } catch {
            Alert.alert(t('common.error'), t('live.endSessionFailed'));
          }
        },
      },
    ]);
  };

  const handleEndOrLeave = () => {
    if (isTeacher) {
      handleEndSession();
    } else {
      Alert.alert(t('live.leave'), t('live.leaveConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('live.leave'),
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  };

  const handleToggleChat = () => {
    setChatVisible((v) => !v);
    if (!chatVisible) setUnreadCount(0);
  };

  const handleApproveStudent = async (studentId: number) => {
    try {
      await liveApi.approve({
        liveClassroomId: roomId,
        studentId,
        approve: true,
      });
      signalRService.approveStudent(roomId, studentId, true).catch(() => {});
    } catch {
      Alert.alert(t('common.error'), t('live.approveFailed'));
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    try {
      await liveApi.removeParticipant(roomId, studentId);
      signalRService.removeStudent(roomId, studentId).catch(() => {});
    } catch {
      Alert.alert(t('common.error'), t('live.removeFailed'));
    }
  };

  // ─── Render: Video Area ──────────────────────
  const renderVideoArea = () => {
    // If Agora is not available, show fallback immediately (don't show infinite spinner)
    if (!RtcSurfaceView || !AgoraService.isAgoraAvailable()) {
      return (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam-outline" size={48} color={DARK.textSecondary} />
          <Text style={styles.placeholderText}>
            {t('live.videoUnavailable')}
          </Text>
          <Text style={[styles.placeholderText, { fontSize: 12, marginTop: 4 }]}>
            {t('live.videoUnavailableHint')}
          </Text>
        </View>
      );
    }

    // Agora available but still connecting
    if (!agoraJoined) {
      return (
        <View style={styles.videoPlaceholder}>
          <Spinner />
          <Text style={styles.placeholderText}>{t('live.connecting')}</Text>
        </View>
      );
    }

    if (isTeacher) {
      if (isVideoOff) {
        return (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam-off" size={48} color={DARK.textSecondary} />
            <Text style={styles.placeholderText}>{t('live.cameraOff')}</Text>
          </View>
        );
      }
      return <RtcSurfaceView style={styles.fullVideo} canvas={{ uid: 0 }} />;
    }

    // Student: show teacher's remote feed
    const teacherUid = remoteUids.length > 0 ? remoteUids[0] : null;
    if (teacherUid != null) {
      return (
        <RtcSurfaceView
          style={styles.fullVideo}
          canvas={{ uid: teacherUid }}
        />
      );
    }

    return (
      <View style={styles.videoPlaceholder}>
        <Ionicons name="videocam-outline" size={48} color={DARK.textSecondary} />
        <Text style={styles.placeholderText}>
          {t('live.videoActiveWaiting')}
        </Text>
      </View>
    );
  };

  // ─── Render: Chat Message ────────────────────
  const renderChatMessage = useCallback(
    ({ item }: { item: LiveMessage }) => (
      <View style={styles.chatBubble}>
        <Text style={styles.chatSender}>{item.senderName}</Text>
        <Text style={styles.chatText}>{item.message}</Text>
      </View>
    ),
    [],
  );

  // ─── Render: Participant Row ─────────────────
  const renderParticipant = useCallback(
    ({ item }: { item: LiveParticipant }) => (
      <View style={[styles.participantRow, { borderBottomColor: theme.colors.divider }]}>
        <View style={[styles.participantAvatar, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="person" size={16} color={theme.colors.primary} />
        </View>
        <Text style={[styles.participantName, { color: theme.colors.text }]} numberOfLines={1}>
          {item.studentName}
        </Text>
        {item.isHandRaised && (
          <Ionicons name="hand-left" size={16} color={theme.colors.warning} />
        )}
        {item.isMuted && (
          <Ionicons name="mic-off" size={16} color={theme.colors.textSecondary} />
        )}
        {isTeacher && item.status === 'pending' && (
          <TouchableOpacity
            onPress={() => handleApproveStudent(item.studentId)}
            style={styles.approveBtn}
          >
            <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
          </TouchableOpacity>
        )}
        {isTeacher && item.status === 'approved' && (
          <TouchableOpacity
            onPress={() => handleRemoveStudent(item.studentId)}
            style={styles.removeBtn}
          >
            <Ionicons name="remove-circle" size={22} color={theme.colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    ),
    [isTeacher, theme],
  );

  // ─── Loading State ───────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={DARK.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('live.joiningSession')}</Text>
        </View>
        <View style={styles.videoPlaceholder}>
          <Spinner />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error State ─────────────────────────────
  if (error || !room) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={DARK.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('live.liveSession')}</Text>
        </View>
        <View style={styles.videoPlaceholder}>
          <Ionicons name="alert-circle-outline" size={48} color={DARK.danger} />
          <Text style={[styles.placeholderText, { color: DARK.danger, marginTop: 12 }]}>
            {error || t('live.sessionNotFound')}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              loadRoom();
            }}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Render ─────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => handleEndOrLeave()}
        >
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={DARK.text} />
        </TouchableOpacity>

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{t('live.live')}</Text>
        </View>

        <Text style={styles.topBarTitle} numberOfLines={1}>
          {room.liveName || room.title || t('live.liveSession')}
        </Text>

        <TouchableOpacity
          style={styles.participantCountBtn}
          onPress={() => setParticipantsVisible(true)}
        >
          <Ionicons name="people" size={18} color={DARK.text} />
          <Text style={styles.participantCountText}>
            {participants.length}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Video Area ── */}
      <View style={styles.videoArea}>
        {joined ? (
          renderVideoArea()
        ) : (
          <View style={styles.videoPlaceholder}>
            <Ionicons
              name={
                pendingApproval
                  ? 'hourglass-outline'
                  : joining
                    ? 'hourglass-outline'
                    : 'radio-button-on'
              }
              size={48}
              color={DARK.textSecondary}
            />
            <Text style={styles.placeholderText}>
              {pendingApproval
                ? t('live.waitingForApproval')
                : joining
                  ? t('live.joining')
                  : t('live.connecting')}
            </Text>
            {!joined && !joining && (
              <TouchableOpacity
                style={[styles.retryButton, { marginTop: 16 }]}
                onPress={() => joinSession()}
              >
                <Text style={styles.retryText}>{t('live.tryAgain')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Chat Overlay ── */}
        {chatVisible && joined && (
          <KeyboardAvoidingView
            style={styles.chatOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={100}
          >
            <FlatList
              ref={chatListRef}
              data={messages}
              renderItem={renderChatMessage}
              keyExtractor={(_, i) => String(i)}
              style={styles.chatList}
              contentContainerStyle={{ paddingBottom: 8 }}
              onContentSizeChange={() =>
                chatListRef.current?.scrollToEnd({ animated: true })
              }
              ListEmptyComponent={
                <Text style={styles.chatEmpty}>{t('live.noMessages')}</Text>
              }
            />
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                value={chatText}
                onChangeText={setChatText}
                placeholder={t('live.sendMessage')}
                placeholderTextColor={DARK.textSecondary}
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity onPress={handleSendMessage} style={styles.chatSendBtn}>
                <Ionicons
                  name="send"
                  size={20}
                  color={DARK.accent}
                  style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>

      {/* ── Control Bar ── */}
      {joined && (
        <View style={styles.controlBar}>
          {/* Mic */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: isMuted ? DARK.danger : DARK.surfaceLight },
            ]}
            onPress={handleToggleMic}
          >
            <Ionicons
              name={isMuted ? 'mic-off' : 'mic'}
              size={CONTROL_ICON}
              color={DARK.text}
            />
          </TouchableOpacity>

          {/* Camera (teacher only) */}
          {isTeacher && (
            <TouchableOpacity
              style={[
                styles.controlButton,
                {
                  backgroundColor: isVideoOff
                    ? DARK.danger
                    : DARK.surfaceLight,
                },
              ]}
              onPress={handleToggleCamera}
            >
              <Ionicons
                name={isVideoOff ? 'videocam-off' : 'videocam'}
                size={CONTROL_ICON}
                color={DARK.text}
              />
            </TouchableOpacity>
          )}

          {/* End / Leave */}
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndOrLeave}
          >
            <Ionicons name="call" size={CONTROL_ICON} color={DARK.text} />
          </TouchableOpacity>

          {/* Chat */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              {
                backgroundColor: chatVisible
                  ? DARK.accent
                  : DARK.surfaceLight,
              },
            ]}
            onPress={handleToggleChat}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={CONTROL_ICON}
              color={DARK.text}
            />
            {unreadCount > 0 && !chatVisible && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Raise Hand (student only) */}
          {!isTeacher && (
            <TouchableOpacity
              style={[
                styles.controlButton,
                {
                  backgroundColor: isHandRaised
                    ? DARK.warning
                    : DARK.surfaceLight,
                },
              ]}
              onPress={handleRaiseHand}
            >
              <Ionicons name="hand-left" size={CONTROL_ICON} color={DARK.text} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Participants Modal ── */}
      <Modal
        visible={participantsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setParticipantsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.participantsPanel, { backgroundColor: theme.colors.card }]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: theme.colors.text }]}>
                {t('live.participants')} ({participants.length})
              </Text>
              <TouchableOpacity
                onPress={() => setParticipantsVisible(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={participants}
              keyExtractor={(p) => String(p.id || p.studentId)}
              renderItem={renderParticipant}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={[styles.emptyPanelText, { color: theme.colors.textSecondary }]}>
                  {t('live.noActiveSessions')}
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ── Paid session: join request (iOS) / payment proof (other platforms) ── */}
      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.participantsPanel, { backgroundColor: theme.colors.card }]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: theme.colors.text }]}>
                {t(REQUEST_ONLY ? 'live.requestToJoinTitle' : 'live.paymentProofRequired')}
              </Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.emptyPanelText, { color: theme.colors.textSecondary }]}>
              {t(REQUEST_ONLY ? 'live.requestToJoinNotice' : 'live.sessionRequiresPayment')}
            </Text>

            {REQUEST_ONLY ? (
              <TouchableOpacity
                style={[styles.submitPaymentBtn, { backgroundColor: theme.colors.primary }, submittingPayment && { opacity: 0.6 }]}
                onPress={sendJoinRequest}
                disabled={submittingPayment}
                activeOpacity={0.8}
              >
                <Text style={styles.submitPaymentText}>
                  {submittingPayment ? t('live.joining') : t('live.sendJoinRequest')}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.proofPicker, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
                  onPress={pickPaymentProof}
                  activeOpacity={0.8}
                >
                  {paymentProof ? (
                    <Image source={{ uri: paymentProof.uri }} style={styles.proofPreview} resizeMode="cover" />
                  ) : (
                    <View style={styles.proofEmpty}>
                      <Ionicons name="cloud-upload-outline" size={28} color={theme.colors.primary} />
                      <Text style={[styles.proofEmptyText, { color: theme.colors.textSecondary }]}>{t('live.attachReceipt')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {paymentProof && (
                  <TouchableOpacity onPress={pickPaymentProof}>
                    <Text style={[styles.changeProofText, { color: theme.colors.primary }]}>{t('live.changeReceipt')}</Text>
                  </TouchableOpacity>
                )}

                <Text style={[styles.emptyPanelText, { color: theme.colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
                  {t('live.paymentTransactionId')}
                </Text>
                <TextInput
                  style={[
                    styles.paymentInput,
                    {
                      borderColor: theme.colors.inputBorder,
                      backgroundColor: theme.colors.inputBackground,
                      color: theme.colors.inputText,
                    },
                  ]}
                  placeholder={t('live.enterPaymentTransactionId')}
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  value={paymentTransactionId}
                  onChangeText={setPaymentTransactionId}
                />

                <TouchableOpacity
                  style={[styles.submitPaymentBtn, { backgroundColor: theme.colors.primary }, submittingPayment && { opacity: 0.6 }]}
                  onPress={submitPayment}
                  disabled={submittingPayment}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitPaymentText}>
                    {submittingPayment ? t('live.joining') : t('live.submitPayment')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK.bg,
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: DARK.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DARK.danger + '25',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginEnd: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: DARK.danger,
  },
  liveText: {
    ...typography.caption,
    color: DARK.danger,
    fontFamily: 'Cairo_700Bold',
    fontSize: 11,
  },
  topBarTitle: {
    ...typography.body,
    color: DARK.text,
    fontFamily: 'Cairo_600SemiBold',
    flex: 1,
  },
  participantCountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginStart: 8,
    gap: 4,
  },
  participantCountText: {
    ...typography.caption,
    color: DARK.text,
    fontFamily: 'Cairo_600SemiBold',
  },

  // Video Area
  videoArea: {
    flex: 1,
    backgroundColor: DARK.bg,
  },
  fullVideo: {
    flex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DARK.bg,
  },
  placeholderText: {
    ...typography.body,
    color: DARK.textSecondary,
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: DARK.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  retryText: {
    ...typography.button,
    color: '#fff',
  },

  // Control Bar
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: DARK.surface,
  },
  controlButton: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: CONTROL_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    backgroundColor: DARK.danger,
    width: CONTROL_SIZE + 8,
    height: CONTROL_SIZE + 8,
    borderRadius: (CONTROL_SIZE + 8) / 2,
    transform: [{ rotate: '135deg' }],
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    end: -2,
    backgroundColor: DARK.danger,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Cairo_700Bold',
  },

  // Chat Overlay
  chatOverlay: {
    position: 'absolute',
    start: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.75,
    maxHeight: '55%',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chatList: {
    flex: 1,
  },
  chatBubble: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: 6,
  },
  chatSender: {
    ...typography.caption,
    color: DARK.accent,
    fontFamily: 'Cairo_700Bold',
    marginBottom: 2,
  },
  chatText: {
    ...typography.bodySmall,
    color: DARK.text,
  },
  chatEmpty: {
    ...typography.caption,
    color: DARK.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    paddingHorizontal: spacing.md,
    marginTop: 6,
  },
  chatInput: {
    flex: 1,
    color: DARK.text,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
  },
  chatSendBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginStart: 4,
  },

  // Participants Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  participantsPanel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '65%',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  panelTitle: {
    ...typography.sectionTitle,
    flex: 1,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: spacing.xs,
  },
  participantName: {
    ...typography.body,
    flex: 1,
  },
  approveBtn: {
    padding: 4,
  },
  removeBtn: {
    padding: 4,
  },
  emptyPanelText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: 20,
  },
  proofPicker: {
    height: 140,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  proofPreview: {
    width: '100%',
    height: '100%',
  },
  proofEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  proofEmptyText: {
    ...typography.bodySmall,
  },
  changeProofText: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  paymentInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  submitPaymentBtn: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  submitPaymentText: {
    ...typography.body,
    color: '#fff',
    fontFamily: 'Cairo_600SemiBold',
  },
});

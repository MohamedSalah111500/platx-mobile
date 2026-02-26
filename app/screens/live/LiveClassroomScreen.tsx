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
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  PermissionsAndroid,
  TurboModuleRegistry,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { liveApi } from '../../services/api/live.api';
import { signalRService } from '../../services/realtime/signalr.service';
import * as AgoraService from '../../services/agora/agora.service';
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
import type { LiveSession, LiveParticipant, LiveMessage } from '../../types/live.types';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveClassroom'>;

// Dark video-call theme (always dark regardless of app theme)
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
  const { t } = useRTL();

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

  const chatListRef = useRef<FlatList>(null);

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
      setError(err?.userMessage || err?.message || 'Failed to load session.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Join Session ────────────────────────────
  const joinSession = async (roomData?: LiveSession | null) => {
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
        });
      } else {
        response = await liveApi.joinStaff({
          liveClassroomId: roomId,
          staffId: userId,
        });
      }
      const status = response?.status;
      if (status === 1) {
        setPendingApproval(true);
        Alert.alert(t('live.pending'), t('live.joinRequestPending'));
      } else if (status === 2) {
        Alert.alert(t('live.paymentRequired'), t('live.sessionRequiresPayment'));
      } else if (status === 3) {
        Alert.alert(t('live.denied'), t('live.joinRequestDenied'));
      } else if (status === 4) {
        Alert.alert(t('live.closed'), t('live.sessionClosed'));
      } else {
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
    }
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
        console.warn('[Live] Permissions not granted:', results);
      }
      return audioGranted && cameraGranted;
    }
    return true; // iOS handled via Info.plist
  };

  // ─── Agora Setup ─────────────────────────────
  useEffect(() => {
    if (!joined || !room || !user) return;
    let mounted = true;
    let eventHandler: IRtcEngineEventHandler;

    const setupAgora = async () => {
      try {
        if (!AgoraService.isAgoraAvailable()) {
          console.warn('[Live] Agora not available in this build');
          return;
        }
        const granted = await requestPermissions();
        console.log('[Live] Permissions granted:', granted);

        const tokenResp = await liveApi.getToken({
          channelName: room.channelName,
          uid: (user.studentId ?? 0),
          role: isTeacher ? 1 : 0,
        });

        const { token, appId, uid } = tokenResp || ({} as any);
        console.log('[Live] Token received, appId:', appId, 'uid:', uid, 'channel:', room.channelName);

        AgoraService.initEngine(appId);
        console.log('[Live] Engine initialized');

        eventHandler = {
          onJoinChannelSuccess: (_connection: any, _elapsed: number) => {
            console.log('[Agora] Joined channel successfully');
            if (!mounted) return;
            setAgoraJoined(true);
          },
          onUserJoined: (_connection: any, remoteUid: number) => {
            console.log('[Agora] Remote user joined:', remoteUid);
            if (!mounted) return;
            setRemoteUids((prev) =>
              prev.includes(remoteUid) ? prev : [...prev, remoteUid],
            );
          },
          onUserOffline: (_connection: any, remoteUid: number) => {
            console.log('[Agora] Remote user left:', remoteUid);
            if (!mounted) return;
            setRemoteUids((prev) => prev.filter((id) => id !== remoteUid));
          },
          onError: (errCode: number, msg: string) => {
            console.warn('[Agora] Error code:', errCode, 'msg:', msg);
          },
        };
        AgoraService.registerEvents(eventHandler);

        const effectiveUid = uid ?? (user.studentId ?? 0);
        console.log('[Live] Joining as', isTeacher ? 'HOST' : 'AUDIENCE', 'uid:', effectiveUid);
        if (isTeacher) {
          AgoraService.joinAsHost(token, room.channelName, effectiveUid);
        } else {
          AgoraService.joinAsAudience(token, room.channelName, effectiveUid);
        }
      } catch (err) {
        console.warn('[Live] Agora setup error', err);
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
  useEffect(() => {
    if (!joined || !user) return;
    let mounted = true;

    const setupSignalR = async () => {
      try {
        // 1. Start the connection first (creates the hub)
        await signalRService.startLiveClassroomConnection();

        // 2. Register ALL event handlers BEFORE joining
        //    (server sends ParticipantList immediately on join)
        signalRService.onReceiveMessage((msg: any) => {
          if (!mounted) return;
          const message: LiveMessage = {
            senderId: msg.senderId,
            senderName: msg.senderName,
            message: msg.message,
            timestamp: msg.timestamp || new Date().toISOString(),
          };
          setMessages((prev) => [...prev, message]);
          setUnreadCount((prev) => prev + 1);
        });

        signalRService.onParticipantList((list: any[]) => {
          if (!mounted) return;
          setParticipants(Array.isArray(list) ? list : []);
        });

        signalRService.onStudentJoined((student: any) => {
          if (!mounted) return;
          setParticipants((prev) => {
            if (prev.find((p) => p.studentId === student.studentId)) return prev;
            return [...prev, student];
          });
        });

        signalRService.onStudentLeft((data: any) => {
          if (!mounted) return;
          setParticipants((prev) =>
            prev.filter((p) => p.studentId !== data.studentId),
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
                ? { ...p, isHandRaised: data.isRaised ?? true }
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
        console.warn('[Live] SignalR setup error', err);
      }
    };

    setupSignalR();

    return () => {
      mounted = false;
      signalRService
        .leaveClassroom(roomId, parseInt(user!.userId))
        .catch(() => {});
      signalRService.stopLiveClassroomConnection().catch(() => {});
    };
  }, [joined]);

  // ─── Handlers ────────────────────────────────
  const handleToggleMic = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    AgoraService.toggleMic(newMuted);
    signalRService
      .toggleMute(roomId, parseInt(user!.userId), newMuted)
      .catch(() => {});
  };

  const handleToggleCamera = () => {
    const newOff = !isVideoOff;
    setIsVideoOff(newOff);
    AgoraService.toggleCamera(newOff);
    signalRService
      .toggleVideo(roomId, parseInt(user!.userId), newOff)
      .catch(() => {});
  };

  const handleRaiseHand = () => {
    const newRaised = !isHandRaised;
    setIsHandRaised(newRaised);
    const fullName = `${user!.firstName} ${user!.lastName}`;
    if (newRaised) {
      signalRService
        .raiseHand(roomId, parseInt(user!.userId), fullName)
        .catch(() => {});
    } else {
      signalRService.lowerHand(roomId, parseInt(user!.userId)).catch(() => {});
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
    if (!agoraJoined) {
      return (
        <View style={styles.videoPlaceholder}>
          <Spinner />
          <Text style={styles.placeholderText}>{t('live.connecting')}</Text>
        </View>
      );
    }

    // If Agora is not available (e.g. Expo Go), show a message
    if (!RtcSurfaceView) {
      return (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam-outline" size={48} color={DARK.textSecondary} />
          <Text style={styles.placeholderText}>
            Video is not available in this build
          </Text>
          <Text style={[styles.placeholderText, { fontSize: 12, marginTop: 4 }]}>
            Use a development build for full video support
          </Text>
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
      <View style={styles.participantRow}>
        <View style={styles.participantAvatar}>
          <Ionicons name="person" size={16} color={DARK.accent} />
        </View>
        <Text style={styles.participantName} numberOfLines={1}>
          {item.studentName}
        </Text>
        {item.isHandRaised && (
          <Ionicons
            name="hand-left"
            size={16}
            color={DARK.warning}
            style={{ marginRight: 8 }}
          />
        )}
        {item.isMuted && (
          <Ionicons
            name="mic-off"
            size={16}
            color={DARK.textSecondary}
            style={{ marginRight: 8 }}
          />
        )}
        {isTeacher && item.status === 'pending' && (
          <TouchableOpacity
            onPress={() => handleApproveStudent(item.studentId)}
            style={styles.approveBtn}
          >
            <Ionicons name="checkmark-circle" size={22} color={DARK.success} />
          </TouchableOpacity>
        )}
        {isTeacher && item.status === 'approved' && (
          <TouchableOpacity
            onPress={() => handleRemoveStudent(item.studentId)}
            style={styles.removeBtn}
          >
            <Ionicons name="remove-circle" size={22} color={DARK.danger} />
          </TouchableOpacity>
        )}
      </View>
    ),
    [isTeacher],
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
            <Ionicons name="chevron-back" size={24} color={DARK.text} />
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
            <Ionicons name="chevron-back" size={24} color={DARK.text} />
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
          <Ionicons name="chevron-back" size={24} color={DARK.text} />
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
                <Ionicons name="send" size={20} color={DARK.accent} />
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
          <View style={styles.participantsPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>
                {t('live.participants')} ({participants.length})
              </Text>
              <TouchableOpacity
                onPress={() => setParticipantsVisible(false)}
              >
                <Ionicons name="close" size={24} color={DARK.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={participants}
              keyExtractor={(p) => String(p.id || p.studentId)}
              renderItem={renderParticipant}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={styles.emptyPanelText}>
                  {t('live.noActiveSessions')}
                </Text>
              }
            />
          </View>
        </View>
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
    padding: 6,
    marginRight: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.danger + '25',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: DARK.danger,
    marginRight: 4,
  },
  liveText: {
    ...typography.caption,
    color: DARK.danger,
    fontWeight: '700',
    fontSize: 11,
  },
  topBarTitle: {
    ...typography.body,
    color: DARK.text,
    fontWeight: '600',
    flex: 1,
  },
  participantCountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  participantCountText: {
    ...typography.caption,
    color: DARK.text,
    fontWeight: '600',
    marginLeft: 4,
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
    right: -2,
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
    fontWeight: '700',
  },

  // Chat Overlay
  chatOverlay: {
    position: 'absolute',
    left: 0,
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
    fontWeight: '700',
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
    padding: 6,
    marginLeft: 4,
  },

  // Participants Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  participantsPanel: {
    backgroundColor: DARK.surface,
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
    ...typography.h4,
    color: DARK.text,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DARK.surfaceLight,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DARK.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  participantName: {
    ...typography.body,
    color: DARK.text,
    flex: 1,
  },
  approveBtn: {
    padding: 4,
    marginLeft: 4,
  },
  removeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  emptyPanelText: {
    ...typography.body,
    color: DARK.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
});

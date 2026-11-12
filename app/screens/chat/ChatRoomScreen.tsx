import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { chatApi } from '../../services/api/chat.api';
import type { ChatStackParamList } from '../../types/navigation.types';
import type { ChatMessage, VoiceRoute } from '../../types/chat.types';
import { isOwnMessage as checkIsOwnMessage } from './isOwnMessage';
import { ChatComposer } from '../../components/chat/ChatComposer';
import { VoiceMessageBubble, type VoiceSendState } from '../../components/chat/voice/VoiceMessageBubble';
import { voicePlayback, type VoiceTrack } from '../../components/chat/voice/voicePlayback';
import { deleteRecording, type RecordedVoice } from '../../components/chat/voice/useVoiceRecorder';

import { BackButton } from '../../components/ui/BackButton';
import { appDateLocale, formatClockTime } from '../../utils/dateLocale';
type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoom'>;

const AVATAR_COLORS = [
  { bg: '#F0EDFF', color: '#7c63fd' },
  { bg: '#E8F8F0', color: '#34C38F' },
  { bg: '#E8F4FD', color: '#3B82F6' },
  { bg: '#FFF4E5', color: '#F5A623' },
];

interface PendingVoice extends RecordedVoice {
  localId: number;
  state: VoiceSendState;
  createdAt: string;
}

type ListItem =
  | { type: 'date'; label: string; key: string }
  | { type: 'msg'; data: ChatMessage; key: string }
  | { type: 'pending'; data: PendingVoice; key: string };

const messageKey = (id: number) => `voice-${id}`;
const pendingKey = (localId: number) => `voice-local-${localId}`;

export default function ChatRoomScreen({ navigation, route }: Props) {
  const { groupId, groupName, staffId, staffName, subGroupId, chatType, membersCount, studentId } =
    route.params;
  const { theme } = useTheme();
  const { user, isStudent } = useAuth();
  const { t } = useRTL();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const nextLocalId = useRef(1);
  const pendingRef = useRef<PendingVoice[]>([]);
  pendingRef.current = pending;

  const isStaffChat = chatType === 'staff' && !!staffId;
  const isSubGroupChat = chatType === 'subgroup' && !!subGroupId;
  const isStudentChat = chatType === 'student' && !!studentId && !isStudent;

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [groupId, staffId, subGroupId, studentId]);

  const loadMessages = async () => {
    try {
      let data: ChatMessage[];
      if (isStaffChat && staffId) {
        data = await chatApi.getMessagesWithStaff(groupId, staffId);
      } else if (isStudentChat && studentId) {
        data = await chatApi.getMessagesWithStudent(studentId, groupId);
      } else if (isSubGroupChat && subGroupId) {
        data = isStudent
          ? await chatApi.getMessagesForStudentSubGroup(subGroupId)
          : await chatApi.getMessagesForTeacherSubGroup(subGroupId);
      } else if (isStudent) {
        data = await chatApi.getMessagesForStudent(groupId);
      } else {
        data = await chatApi.getMessagesForTeacher(groupId);
      }
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[ChatRoom] Load messages failed:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const voiceTarget = useMemo((): { route: VoiceRoute; targetId: number; groupId?: number } => {
    if (isStaffChat && staffId) return { route: 'studentToStaff', targetId: staffId, groupId };
    if (isStudentChat && studentId) return { route: 'staffToStudent', targetId: studentId, groupId };
    if (isSubGroupChat && subGroupId) {
      return { route: isStudent ? 'studentToSubGroup' : 'staffToSubGroup', targetId: subGroupId };
    }
    return { route: isStudent ? 'studentToGroup' : 'staffToGroup', targetId: groupId };
  }, [isStaffChat, isStudentChat, isSubGroupChat, isStudent, staffId, studentId, subGroupId, groupId]);

  useFocusEffect(useCallback(() => () => voicePlayback.release(), []));

  useEffect(
    () => () => {
      pendingRef.current.forEach((item) => deleteRecording(item.uri));
    },
    [],
  );

  useEffect(() => {
    const tracks: VoiceTrack[] = [];
    messages.forEach((msg) => {
      if (msg.voice?.url) {
        tracks.push({ key: messageKey(msg.id), uri: msg.voice.url, durationMs: msg.voice.durationMs, messageId: msg.id });
      }
    });
    pending.forEach((item) => {
      tracks.push({ key: pendingKey(item.localId), uri: item.uri, durationMs: item.durationMs });
    });
    voicePlayback.setTracks(tracks);
  }, [messages, pending]);

  const uploadVoice = async (item: PendingVoice) => {
    setPending((list) => list.map((entry) => (entry.localId === item.localId ? { ...entry, state: 'sending' } : entry)));
    try {
      const sent = await chatApi.sendVoice({
        ...voiceTarget,
        uri: item.uri,
        durationMs: item.durationMs,
        waveform: item.waveform,
      });
      if (sent?.id) {
        voicePlayback.rekey(pendingKey(item.localId), messageKey(sent.id));
        setMessages((list) => (list.some((msg) => msg.id === sent.id) ? list : [...list, sent]));
      }
      setPending((list) => list.filter((entry) => entry.localId !== item.localId));
      deleteRecording(item.uri);
      loadMessages();
    } catch (err: any) {
      setPending((list) => list.map((entry) => (entry.localId === item.localId ? { ...entry, state: 'failed' } : entry)));
      if (err?.status === 400 && err?.userMessage) Alert.alert(t('common.error'), err.userMessage);
    }
  };

  const handleSendVoice = (voice: RecordedVoice) => {
    const item: PendingVoice = {
      ...voice,
      localId: nextLocalId.current++,
      state: 'sending',
      createdAt: new Date().toISOString(),
    };
    setPending((list) => [...list, item]);
    uploadVoice(item);
  };

  const handleSend = async (messageText: string): Promise<boolean> => {
    try {
      if (isStaffChat && staffId) {
        await chatApi.sendToStaffFromStudent({ content: messageText, groupId, staffId });
      } else if (isStudentChat && studentId) {
        await chatApi.sendToStudent({ content: messageText, studentId, groupId });
      } else if (isSubGroupChat && subGroupId) {
        if (isStudent) {
          await chatApi.sendToSubGroupFromStudent({ content: messageText, subGroupId });
        } else {
          await chatApi.sendToSubGroup({ content: messageText, subGroupId });
        }
      } else if (isStudent) {
        await chatApi.sendToGroupFromStudent({ content: messageText, groupId });
      } else {
        await chatApi.sendToGroup({ content: messageText, groupId });
      }
      await loadMessages();
      return true;
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('chat.failedToSend'));
      return false;
    }
  };

  const isOwnMessage = (message: ChatMessage) => {
    if (isStaffChat) return !!message.senderStudentId && !message.senderStaffId;
    if (isStudentChat) return !!(message.senderStaffId || message.senderStaff) && !message.senderStudentId && !message.senderStudent;
    return checkIsOwnMessage(message, user, isStudent);
  };

  const getSenderName = (message: ChatMessage): string => {
    if (message.senderName) return message.senderName;
    if (message.senderStaff)
      return `${message.senderStaff.firstName || ''} ${message.senderStaff.lastName || ''}`.trim();
    if (message.senderStudent)
      return `${message.senderStudent.firstName || ''} ${message.senderStudent.lastName || ''}`.trim();
    return '';
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return formatClockTime(dateStr);
    } catch {
      return '';
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const oneDay = 86400000;
      if (diff < oneDay && now.getDate() === d.getDate()) return t('chat.today');
      if (diff < 2 * oneDay && now.getDate() - d.getDate() === 1) return t('chat.yesterday');
      return d.toLocaleDateString(appDateLocale(), { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    } catch {
      return '';
    }
  };

  // Build list items with date separators
  const listItems: ListItem[] = useMemo(() => {
    if (!messages.length && !pending.length) return [];
    const items: ListItem[] = [];
    let lastDate = '';
    messages.forEach((msg, idx) => {
      const dateStr = msg.sentAt || msg.createdAt || '';
      let dateKey = '';
      try { dateKey = new Date(dateStr).toDateString(); } catch { dateKey = ''; }
      if (dateKey && dateKey !== lastDate) {
        lastDate = dateKey;
        items.push({ type: 'date', label: formatDateLabel(dateStr), key: `date-${dateKey}` });
      }
      items.push({ type: 'msg', data: msg, key: msg.id ? `msg-${msg.id}` : `msg-idx-${idx}` });
    });
    pending.forEach((item) => {
      const dateKey = new Date(item.createdAt).toDateString();
      if (dateKey !== lastDate) {
        lastDate = dateKey;
        items.push({ type: 'date', label: formatDateLabel(item.createdAt), key: `date-${dateKey}` });
      }
      items.push({ type: 'pending', data: item, key: pendingKey(item.localId) });
    });
    return items;
  }, [messages, pending]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={[styles.dateLine, { backgroundColor: theme.colors.divider }]} />
          <View style={[styles.datePill, { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.primaryLight }]}>
            <Text style={[styles.dateText, { color: theme.colors.primary }]}>{item.label}</Text>
          </View>
          <View style={[styles.dateLine, { backgroundColor: theme.colors.divider }]} />
        </View>
      );
    }

    if (item.type === 'pending') {
      const voice = item.data;
      return renderBubble({
        own: true,
        senderName: ownName,
        palette: AVATAR_COLORS[0],
        content: (
          <VoiceMessageBubble
            playbackKey={pendingKey(voice.localId)}
            durationMs={voice.durationMs}
            waveform={voice.waveform}
            own
            timeLabel={formatTime(voice.createdAt)}
            sendState={voice.state}
            onRetry={() => uploadVoice(voice)}
          />
        ),
      });
    }

    const msg = item.data;
    const own = isOwnMessage(msg);
    const senderName = getSenderName(msg);
    const timeStr = formatTime(msg.sentAt || msg.createdAt);
    const palette = AVATAR_COLORS[(msg.senderStaffId || msg.senderId || 0) % AVATAR_COLORS.length];

    if (msg.voice) {
      return renderBubble({
        own,
        senderName,
        palette,
        content: (
          <VoiceMessageBubble
            playbackKey={messageKey(msg.id)}
            durationMs={msg.voice.durationMs}
            waveform={msg.voice.waveform}
            own={own}
            timeLabel={timeStr}
          />
        ),
      });
    }

    return renderBubble({
      own,
      senderName,
      palette,
      content: (
        <>
          <Text style={[styles.bubbleText, own ? styles.bubbleTextOwn : { color: theme.colors.text }]}>
            {msg.content || ''}
          </Text>
          <Text style={[styles.timeInBubble, own ? styles.timeOwn : { color: theme.colors.textMuted }]}>
            {timeStr}
          </Text>
        </>
      ),
    });
  };

  const renderBubble = ({
    own,
    senderName,
    palette,
    content,
  }: {
    own: boolean;
    senderName: string;
    palette: (typeof AVATAR_COLORS)[number];
    content: React.ReactNode;
  }) => {
    const initial = (senderName?.[0] || '?').toUpperCase();
    return (
      <View style={[styles.msgRow, own ? styles.msgRowOwn : styles.msgRowOther]}>
        {/* Avatar for other's messages */}
        {!own && (
          <View style={[styles.msgAvatar, { backgroundColor: theme.dark ? palette.color + '26' : palette.bg }]}>
            <Text style={[styles.msgAvatarText, { color: palette.color }]}>{initial}</Text>
          </View>
        )}

        <View style={[styles.msgContent, own ? styles.msgContentOwn : styles.msgContentOther]}>
          {!own && senderName ? (
            <Text style={[styles.senderLabel, { color: palette.color }]}>{senderName}</Text>
          ) : null}
          <View
            style={[
              styles.bubble,
              own ? [styles.bubbleOwn, { backgroundColor: theme.colors.primary }] : [styles.bubbleOther, { backgroundColor: theme.colors.surface }],
            ]}
          >
            {content}
          </View>
        </View>
      </View>
    );
  };

  const ownName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  const headerTitle = isStaffChat ? (staffName || groupName) : groupName;
  const headerInitial = (headerTitle?.[0] || '?').toUpperCase();

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={[styles.headerAvatar, { backgroundColor: theme.colors.primaryLight }]}>
            {isStaffChat ? (
              <Text style={[styles.headerAvatarText, { color: theme.colors.primary }]}>{headerInitial}</Text>
            ) : (
              <Ionicons name={isSubGroupChat ? 'git-branch-outline' : 'people'} size={18} color={theme.colors.primary} />
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: theme.colors.text }]} numberOfLines={1}>
              {headerTitle}
            </Text>
            <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>
              {isStaffChat
                ? t('chat.staff')
                : isSubGroupChat
                  ? t('groups.subGroups')
                  : membersCount != null
                    ? t('home.membersCount', { count: membersCount })
                    : t('chat.groupChat')}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {loading ? (
            <Spinner />
          ) : listItems.length === 0 ? (
            <EmptyState title={t('chat.noMessages')} message={t('chat.sendFirstMessage')} />
          ) : (
            <FlatList
              ref={flatListRef}
              data={listItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.key}
              style={styles.messagesList}
              contentContainerStyle={{ paddingVertical: spacing.md, paddingHorizontal: spacing.lg }}
              inverted={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={Platform.OS === 'android'}
            />
          )}

          <ChatComposer onSendText={handleSend} onSendVoice={handleSendVoice} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 17,
    fontFamily: 'Cairo_700Bold',
    textAlign: 'left',
  },
  headerInfo: { flex: 1, gap: 1 },
  headerName: { ...typography.body, fontFamily: 'Cairo_700Bold' },
  headerSub: { fontSize: fontSize.xs, textAlign: 'left' },
  // Messages
  messagesList: { flex: 1 },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  dateLine: { flex: 1, height: 1 },
  datePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dateText: { fontSize: fontSize.xs, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  // Message rows
  msgRow: {
    flexDirection: 'row',
    marginVertical: 3,
    alignItems: 'flex-end',
  },
  msgRowOwn: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: spacing.xs,
  },
  msgAvatarText: { fontSize: 14, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  msgContent: { maxWidth: '78%' },
  msgContentOwn: { alignItems: 'flex-end' },
  msgContentOther: { alignItems: 'flex-start' },
  senderLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_700Bold',
    marginBottom: 2,
    marginStart: 4,
    textAlign: 'left',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
  },
  bubbleOwn: {
    borderBottomEndRadius: borderRadius.sm,
  },
  bubbleOther: {
    borderBottomStartRadius: borderRadius.sm,
  },
  bubbleText: {
    ...typography.body,
  },
  bubbleTextOwn: { color: '#fff' },
  timeInBubble: {
    fontSize: 14,
    fontFamily: 'Cairo_500Medium',
    marginTop: 4,
    alignSelf: 'flex-end',
    textAlign: 'left',
  },
  timeOwn: { color: 'rgba(255,255,255,0.7)' },
});

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  Alert,
  AppState,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { ErrorRetry } from '../ui/ErrorRetry';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { CHAT_PAGE_SIZE, chatApi } from '../../services/api/chat.api';
import type { ChatMessage, VoiceRoute } from '../../types/chat.types';
import { isOwnMessage as checkIsOwnMessage } from '../../screens/chat/isOwnMessage';
import { ChatComposer } from './ChatComposer';
import { VoiceMessageBubble, type VoiceSendState } from './voice/VoiceMessageBubble';
import { voicePlayback, type VoiceTrack } from './voice/voicePlayback';
import { deleteRecording, type RecordedVoice } from './voice/useVoiceRecorder';
import { appDateLocale, formatClockTime, parseServerDate } from '../../utils/dateLocale';

export type ChatKind = 'group' | 'staff' | 'subgroup' | 'student';

interface Props {
  groupId: number;
  chatType?: ChatKind;
  staffId?: number;
  subGroupId?: number;
  studentId?: number;
  bottomInset?: number;
}

interface PendingVoice extends RecordedVoice {
  localId: number;
  state: VoiceSendState;
  createdAt: string;
}

type ListItem =
  | { type: 'date'; label: string; key: string }
  | { type: 'msg'; data: ChatMessage; key: string }
  | { type: 'pending'; data: PendingVoice; key: string };

const POLL_INTERVAL_MS = 20000;

const sameMessage = (a: ChatMessage, b: ChatMessage) =>
  a.id === b.id && a.editedAt === b.editedAt && a.deletedAt === b.deletedAt;

function mergeLatestPage(current: ChatMessage[], latest: ChatMessage[]): ChatMessage[] {
  if (!latest.length) return current.length ? latest : current;
  const tail = current.slice(-latest.length);
  if (tail.length === latest.length && tail.every((message, index) => sameMessage(message, latest[index])))
    return current;
  const oldestId = latest[0].id;
  return [...current.filter((message) => message.id < oldestId), ...latest];
}

const missedMessages = (current: ChatMessage[], latest: ChatMessage[]) =>
  current.length > 0 && latest.length >= CHAT_PAGE_SIZE && latest[0].id > current[current.length - 1].id;

function isYesterday(date: Date, now: Date) {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

const messageKey = (id: number) => `voice-${id}`;
const pendingKey = (localId: number) => `voice-local-${localId}`;

export function ChatConversation({ groupId, chatType, staffId, subGroupId, studentId, bottomInset = 0 }: Props) {
  const { theme } = useTheme();
  const { user, isStudent, canModule } = useAuth();
  const { t } = useRTL();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const rootRef = useRef<View>(null);
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const [topOffset, setTopOffset] = useState(0);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const nextLocalId = useRef(1);
  const pendingRef = useRef<PendingVoice[]>([]);
  pendingRef.current = pending;

  const isStaffChat = chatType === 'staff' && !!staffId;
  const isSubGroupChat = chatType === 'subgroup' && !!subGroupId;
  const isStudentChat = chatType === 'student' && !!studentId && !isStudent;
  const isSharedChat = !isStaffChat && !isStudentChat;

  const fetchPage = (beforeId?: number): Promise<ChatMessage[]> => {
    if (isStaffChat && staffId) return chatApi.getMessagesWithStaff(groupId, staffId, beforeId);
    if (isStudentChat && studentId) return chatApi.getMessagesWithStudent(studentId, groupId, beforeId);
    if (isSubGroupChat && subGroupId) {
      return isStudent
        ? chatApi.getMessagesForStudentSubGroup(subGroupId, beforeId)
        : chatApi.getMessagesForTeacherSubGroup(subGroupId, beforeId);
    }
    return isStudent
      ? chatApi.getMessagesForStudent(groupId, beforeId)
      : chatApi.getMessagesForTeacher(groupId, beforeId);
  };

  const loadMessages = async () => {
    try {
      const data = await fetchPage();
      const latest = Array.isArray(data) ? data : [];
      setLoadError(false);
      setMessages((current) => {
        if (!current.length || missedMessages(current, latest)) {
          setHasOlder(latest.length >= CHAT_PAGE_SIZE);
          return latest;
        }
        return mergeLatestPage(current, latest);
      });
    } catch (err) {
      console.error('[Chat] Load messages failed:', err);
      if (!messagesRef.current.length) setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadOlder = async () => {
    const oldest = messagesRef.current[0];
    if (!hasOlder || loadingOlder || !oldest?.id) return;
    setLoadingOlder(true);
    try {
      const older = await fetchPage(oldest.id);
      setHasOlder(older.length >= CHAT_PAGE_SIZE);
      setMessages((current) => {
        const known = new Set(current.map((message) => message.id));
        return [...older.filter((message) => !known.has(message.id)), ...current];
      });
    } catch (err) {
      console.error('[Chat] Load older messages failed:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const scrollToNewest = () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

  useEffect(() => {
    setMessages([]);
    setHasOlder(false);
    setLoading(true);
  }, [groupId, staffId, subGroupId, studentId]);

  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setInterval> | undefined;
      const start = () => {
        if (timer) return;
        loadMessages();
        timer = setInterval(loadMessages, POLL_INTERVAL_MS);
      };
      const stop = () => {
        if (timer) clearInterval(timer);
        timer = undefined;
      };
      start();
      const subscription = AppState.addEventListener('change', (state) => (state === 'active' ? start() : stop()));
      return () => {
        stop();
        subscription.remove();
      };
    }, [groupId, staffId, subGroupId, studentId]),
  );

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
      voicePlayback.release();
      pendingRef.current.forEach((item) => deleteRecording(item.uri));
    },
    [],
  );

  useEffect(() => {
    const tracks: VoiceTrack[] = [];
    messages.forEach((msg) => {
      if (msg.voice?.url && !msg.deletedAt) {
        tracks.push({
          key: messageKey(msg.id),
          uri: msg.voice.url,
          durationMs: msg.voice.durationMs,
          messageId: msg.id,
        });
      }
    });
    pending.forEach((item) => {
      tracks.push({ key: pendingKey(item.localId), uri: item.uri, durationMs: item.durationMs });
    });
    voicePlayback.setTracks(tracks);
  }, [messages, pending]);

  const uploadVoice = async (item: PendingVoice) => {
    setPending((list) =>
      list.map((entry) => (entry.localId === item.localId ? { ...entry, state: 'sending' } : entry)),
    );
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
      scrollToNewest();
    } catch (err: any) {
      setPending((list) =>
        list.map((entry) => (entry.localId === item.localId ? { ...entry, state: 'failed' } : entry)),
      );
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
    scrollToNewest();
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
      scrollToNewest();
      return true;
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('chat.failedToSend'));
      return false;
    }
  };

  const isOwnMessage = (message: ChatMessage) => {
    if (isStaffChat) return !!message.senderStudentId && !message.senderStaffId;
    if (isStudentChat)
      return !!(message.senderStaffId || message.senderStaff) && !message.senderStudentId && !message.senderStudent;
    return checkIsOwnMessage(message, user, isStudent);
  };

  const canSend = isStudent || canModule('Chat', 'create');
  const canDelete = (message: ChatMessage, own: boolean) =>
    !message.deletedAt && (own || (!isStudent && isSharedChat && canModule('Chat', 'delete')));

  const confirmDelete = (message: ChatMessage, own: boolean) => {
    Alert.alert(t('common.confirm'), t('groups.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (own) await chatApi.deleteMyMessage(message.id);
            else await chatApi.deleteMessage(message.id);
            const deletedAt = new Date().toISOString();
            setMessages((list) => list.map((item) => (item.id === message.id ? { ...item, deletedAt } : item)));
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('chat.deleteFailed'));
          }
        },
      },
    ]);
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
      return formatClockTime(parseServerDate(dateStr));
    } catch {
      return '';
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = parseServerDate(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return t('chat.today');
      if (isYesterday(d, now)) return t('chat.yesterday');
      return d.toLocaleDateString(appDateLocale(), {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return '';
    }
  };

  const listItems: ListItem[] = useMemo(() => {
    if (!messages.length && !pending.length) return [];
    const items: ListItem[] = [];
    let lastDate = '';
    messages.forEach((msg, idx) => {
      const dateStr = msg.sentAt || msg.createdAt || '';
      let dateKey = '';
      try {
        dateKey = parseServerDate(dateStr).toDateString();
      } catch {
        dateKey = '';
      }
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

  const newestFirst = useMemo(() => [...listItems].reverse(), [listItems]);

  const ownName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  const renderBubble = ({
    own,
    senderName,
    content,
    onLongPress,
  }: {
    own: boolean;
    senderName: string;
    content: React.ReactNode;
    onLongPress?: () => void;
  }) => {
    const initial = (senderName?.[0] || '?').toUpperCase();
    return (
      <View style={[styles.msgRow, own ? styles.msgRowOwn : styles.msgRowOther]}>
        {!own && (
          <View style={[styles.msgAvatar, { backgroundColor: theme.colors.primaryLight }]}>
            <Text style={[styles.msgAvatarText, { color: theme.colors.primary }]}>{initial}</Text>
          </View>
        )}

        <View style={[styles.msgContent, own ? styles.msgContentOwn : styles.msgContentOther]}>
          {!own && senderName ? (
            <Text style={[styles.senderLabel, { color: theme.colors.primary }]}>{senderName}</Text>
          ) : null}
          <Pressable
            onLongPress={onLongPress}
            disabled={!onLongPress}
            delayLongPress={350}
            style={[
              styles.bubble,
              own
                ? [styles.bubbleOwn, { backgroundColor: theme.colors.chatBubbleOwn }]
                : [styles.bubbleOther, { backgroundColor: theme.colors.surface }],
            ]}
          >
            {content}
          </Pressable>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={[styles.dateLine, { backgroundColor: theme.colors.divider }]} />
          <View
            style={[
              styles.datePill,
              { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.primaryLight },
            ]}
          >
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
    const onLongPress = canDelete(msg, own) ? () => confirmDelete(msg, own) : undefined;

    if (msg.voice && !msg.deletedAt) {
      return renderBubble({
        own,
        senderName,
        onLongPress,
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
      onLongPress,
      content: (
        <>
          {msg.deletedAt ? (
            <Text
              style={[
                styles.bubbleText,
                styles.deletedText,
                { color: own ? theme.colors.onChatBubbleOwn : theme.colors.textMuted },
              ]}
            >
              {t('chat.messageDeleted')}
            </Text>
          ) : (
            <Text style={[styles.bubbleText, { color: own ? theme.colors.onChatBubbleOwn : theme.colors.text }]}>
              {msg.content || ''}
            </Text>
          )}
          <Text
            style={[styles.timeInBubble, { color: own ? theme.colors.onChatBubbleOwn + 'A6' : theme.colors.textMuted }]}
          >
            {timeStr}
            {msg.editedAt && !msg.deletedAt ? `  ·  ${t('chat.edited')}` : ''}
          </Text>
        </>
      ),
    });
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View
        ref={rootRef}
        style={styles.container}
        onLayout={() => rootRef.current?.measureInWindow((_x, y) => setTopOffset(y))}
      >
        <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={topOffset}>
          {loading ? (
            <Spinner />
          ) : loadError ? (
            <ErrorRetry
              message={t('chat.loadFailed')}
              onRetry={() => {
                setLoading(true);
                loadMessages();
              }}
            />
          ) : listItems.length === 0 ? (
            <EmptyState title={t('chat.noMessages')} message={t('chat.sendFirstMessage')} />
          ) : (
            <FlatList
              ref={flatListRef}
              data={newestFirst}
              renderItem={renderItem}
              keyExtractor={(item) => item.key}
              style={styles.container}
              contentContainerStyle={styles.listContent}
              inverted
              onEndReached={loadOlder}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                loadingOlder ? <ActivityIndicator style={styles.olderSpinner} color={theme.colors.primary} /> : null
              }
              initialNumToRender={CHAT_PAGE_SIZE}
              maxToRenderPerBatch={CHAT_PAGE_SIZE}
              windowSize={11}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={Platform.OS === 'android'}
            />
          )}

          {canSend ? (
            <View style={{ paddingBottom: keyboardVisible ? 0 : bottomInset, backgroundColor: theme.colors.card }}>
              <ChatComposer onSendText={handleSend} onSendVoice={handleSendVoice} />
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  olderSpinner: { paddingVertical: spacing.md },
  deletedText: { opacity: 0.75 },
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
  timeInBubble: {
    fontSize: 14,
    fontFamily: 'Cairo_500Medium',
    marginTop: 4,
    alignSelf: 'flex-end',
    textAlign: 'left',
  },
});

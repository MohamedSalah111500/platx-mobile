import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useSound } from '../../hooks/useSound';
import type { ChatStackParamList } from '../../types/navigation.types';
import type { ChatMessage } from '../../types/chat.types';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoom'>;

const ACCENT = '#7c63fd';

const AVATAR_COLORS = [
  { bg: '#F0EDFF', color: ACCENT },
  { bg: '#E8F8F0', color: '#34C38F' },
  { bg: '#E8F4FD', color: '#3B82F6' },
  { bg: '#FFF4E5', color: '#F5A623' },
];

// Turn messages into a list interleaved with date separator labels
type ListItem = { type: 'date'; label: string; key: string } | { type: 'msg'; data: ChatMessage; key: string };

export default function ChatRoomScreen({ navigation, route }: Props) {
  const { groupId, groupName, staffId, staffName, chatType } = route.params;
  const { theme } = useTheme();
  const { user, isStudent } = useAuth();
  const { t } = useRTL();
  const { play } = useSound();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isStaffChat = chatType === 'staff' && !!staffId;

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [groupId, staffId]);

  const loadMessages = async () => {
    try {
      let data: ChatMessage[];
      if (isStaffChat && staffId) {
        data = await chatApi.getMessagesWithStaff(groupId, staffId);
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

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    play('swoosh');
    const messageText = newMessage.trim();
    setSending(true);
    setNewMessage('');
    try {
      if (isStaffChat && staffId) {
        await chatApi.sendToStaffFromStudent({ content: messageText, groupId, staffId });
      } else if (isStudent) {
        await chatApi.sendToGroupFromStudent({ content: messageText, groupId });
      } else {
        await chatApi.sendToGroup({ content: messageText, groupId });
      }
      await loadMessages();
    } catch (err: any) {
      setNewMessage(messageText);
      Alert.alert(t('common.error'), err?.userMessage || t('chat.failedToSend'));
    } finally {
      setSending(false);
    }
  };

  const isOwnMessage = (message: ChatMessage) => {
    if (isStaffChat) return !!message.senderStudentId && !message.senderStaffId;
    return String(message.senderId ?? '') === String(user?.userId ?? '');
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
      return new Date(dateStr).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
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
      return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    } catch {
      return '';
    }
  };

  // Build list items with date separators
  const listItems: ListItem[] = useMemo(() => {
    if (!messages.length) return [];
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
    return items;
  }, [messages]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={[styles.dateLine, { backgroundColor: theme.colors.divider }]} />
          <View style={[styles.datePill, { backgroundColor: theme.dark ? theme.colors.surface : '#F0EDFF' }]}>
            <Text style={[styles.dateText, { color: theme.colors.textMuted }]}>{item.label}</Text>
          </View>
          <View style={[styles.dateLine, { backgroundColor: theme.colors.divider }]} />
        </View>
      );
    }

    const msg = item.data;
    const own = isOwnMessage(msg);
    const senderName = getSenderName(msg);
    const timeStr = formatTime(msg.sentAt || msg.createdAt);
    const initial = (senderName?.[0] || '?').toUpperCase();
    const palette = AVATAR_COLORS[(msg.senderStaffId || msg.senderId || 0) % AVATAR_COLORS.length];

    return (
      <View style={[styles.msgRow, own ? styles.msgRowOwn : styles.msgRowOther]}>
        {/* Avatar for other's messages */}
        {!own && (
          <View style={[styles.msgAvatar, { backgroundColor: palette.bg }]}>
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
              own ? styles.bubbleOwn : [styles.bubbleOther, { backgroundColor: theme.colors.surface }],
            ]}
          >
            <Text style={[styles.bubbleText, own ? styles.bubbleTextOwn : { color: theme.colors.text }]}>
              {msg.content || ''}
            </Text>
            <Text style={[styles.timeInBubble, own ? styles.timeOwn : { color: theme.colors.textMuted }]}>
              {timeStr}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const headerTitle = isStaffChat ? (staffName || groupName) : groupName;
  const headerInitial = (headerTitle?.[0] || '?').toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: '#F0EDFF' }]}>
          {isStaffChat ? (
            <Text style={styles.headerAvatarText}>{headerInitial}</Text>
          ) : (
            <Ionicons name="people" size={18} color={ACCENT} />
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: theme.colors.text }]} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>
            {isStaffChat ? t('chat.staff') : t('chat.members')}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
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
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.divider }]}>
          <View style={[styles.inputWrap, { backgroundColor: theme.colors.surface }]}>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={t('chat.typeMessage')}
              placeholderTextColor={theme.colors.inputPlaceholder}
              multiline
              maxLength={2000}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!newMessage.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <Ionicons name="hourglass-outline" size={20} color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    fontWeight: '800',
    color: ACCENT,
  },
  headerInfo: { flex: 1, gap: 1 },
  headerName: { ...typography.body, fontWeight: '700' },
  headerSub: { fontSize: fontSize.xs },
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
  dateText: { fontSize: fontSize.xs, fontWeight: '600' },
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
    marginRight: spacing.xs,
    marginBottom: 2,
  },
  msgAvatarText: { fontSize: 12, fontWeight: '800' },
  msgContent: { maxWidth: '78%' },
  msgContentOwn: { alignItems: 'flex-end' },
  msgContentOther: { alignItems: 'flex-start' },
  senderLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
  },
  bubbleOwn: {
    backgroundColor: ACCENT,
    borderBottomRightRadius: borderRadius.sm,
  },
  bubbleOther: {
    borderBottomLeftRadius: borderRadius.sm,
  },
  bubbleText: {
    ...typography.body,
    lineHeight: 22,
  },
  bubbleTextOwn: { color: '#fff' },
  timeInBubble: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeOwn: { color: 'rgba(255,255,255,0.7)' },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  inputWrap: {
    flex: 1,
    borderRadius: borderRadius['2xl'],
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
  },
  input: {
    fontSize: fontSize.base,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 6 : spacing.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 2 : 0,
    ...Platform.select({
      ios: {
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  sendBtnDisabled: {
    opacity: 0.4,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
});

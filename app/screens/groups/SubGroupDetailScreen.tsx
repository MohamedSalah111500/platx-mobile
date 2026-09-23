import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { subGroupsApi } from '../../services/api/subgroups.api';
import { groupsApi } from '../../services/api/groups.api';
import { chatApi } from '../../services/api/chat.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import type { ProfileStackParamList } from '../../types/navigation.types';
import type { GroupMember, SubGroup } from '../../types/group.types';
import type { ChatMessage } from '../../types/chat.types';
import { isOwnMessage } from '../chat/isOwnMessage';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SubGroupDetail'>;

type Tab = 'students' | 'chat';

export default function SubGroupDetailScreen({ navigation, route }: Props) {
  const { subGroupId, subGroupName, groupId } = route.params;
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const { isStaff, isAdmin, isStudent, user } = useAuth();
  const insets = useSafeAreaInsets();
  const isTeacher = isStaff || isAdmin;
  const chatListRef = useRef<FlatList>(null);

  const [activeTab, setActiveTab] = useState<Tab>('students');
  const [subGroup, setSubGroup] = useState<SubGroup | null>(null);
  const [students, setStudents] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [groupStudents, setGroupStudents] = useState<GroupMember[]>([]);
  const [addSearch, setAddSearch] = useState('');
  const [adding, setAdding] = useState<number | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [subGroupData, studentsData] = await Promise.all([
        subGroupsApi.getById(subGroupId).catch(() => null),
        subGroupsApi.getStudents(subGroupId),
      ]);
      setSubGroup(subGroupData);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (err) {
      console.error('[SubGroupDetail] Load failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subGroupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMessages = useCallback(async () => {
    setChatLoading(true);
    try {
      const data = isStudent
        ? await chatApi.getMessagesForStudentSubGroup(subGroupId)
        : await chatApi.getMessagesForTeacherSubGroup(subGroupId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[SubGroupDetail] Chat load failed:', err);
      setMessages([]);
    } finally {
      setChatLoading(false);
    }
  }, [subGroupId, isStudent]);

  useEffect(() => {
    if (activeTab === 'chat') {
      loadMessages();
      const interval = setInterval(loadMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadMessages]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    if (activeTab === 'chat') loadMessages();
  };

  const filteredStudents = students.filter((s) => {
    if (!searchTerm) return true;
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const getInitials = (first?: string, last?: string) =>
    `${(first?.[0] || '').toUpperCase()}${(last?.[0] || '').toUpperCase()}` || '?';

  const handleRemoveStudent = (student: GroupMember) => {
    Alert.alert(
      t('groups.removeStudent'),
      `${t('groups.confirmRemove')} ${student.firstName} ${student.lastName}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('groups.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await subGroupsApi.removeStudent(subGroupId, student.id);
              setStudents((prev) => prev.filter((s) => s.id !== student.id));
            } catch {
              Alert.alert(t('common.error'), t('groups.removeError'));
            }
          },
        },
      ]
    );
  };

  const openAddModal = async () => {
    setShowAddModal(true);
    setAddSearch('');
    try {
      const data = await groupsApi.getGroupStudents(groupId);
      setGroupStudents(Array.isArray(data) ? data : []);
    } catch {
      setGroupStudents([]);
    }
  };

  const availableToAdd = groupStudents.filter((gs) => {
    if (students.some((s) => s.id === gs.id)) return false;
    if (!addSearch) return true;
    const name = `${gs.firstName || ''} ${gs.lastName || ''}`.toLowerCase();
    return name.includes(addSearch.toLowerCase());
  });

  const handleAddStudent = async (student: GroupMember) => {
    setAdding(student.id);
    try {
      await subGroupsApi.addStudent(subGroupId, student.id);
      setStudents((prev) => [...prev, student]);
      setGroupStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('groups.addStudentFailed'));
    } finally {
      setAdding(null);
    }
  };

  // ─── Chat helpers ───

  const isMySender = (msg: ChatMessage) => isOwnMessage(msg, user, isStudent);

  const getSenderName = (msg: ChatMessage) => {
    if (msg.senderName) return msg.senderName;
    if (msg.senderStaff) return `${msg.senderStaff.firstName || ''} ${msg.senderStaff.lastName || ''}`.trim();
    if (msg.senderStudent) return `${msg.senderStudent.firstName || ''} ${msg.senderStudent.lastName || ''}`.trim();
    return '';
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendMessage = async () => {
    const text = messageText.trim();
    if (!text) return;
    setSending(true);
    try {
      if (isStudent) {
        await chatApi.sendToSubGroupFromStudent({ content: text, subGroupId });
      } else {
        await chatApi.sendToSubGroup({ content: text, subGroupId });
      }
      setMessageText('');
      await loadMessages();
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (err: any) {
      console.error('[SubGroupDetail] Send failed:', err);
      Alert.alert(t('common.error'), err?.userMessage || t('chat.failedToSend'));
    } finally {
      setSending(false);
    }
  };

  const renderStudentItem = ({ item }: { item: GroupMember }) => {
    const initials = getInitials(item.firstName, item.lastName);
    const imageUrl = getFullImageUrl(item.profileImage);

    return (
      <View style={[s.studentCard, { backgroundColor: theme.colors.card }]}>
        <View style={[s.avatar, { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.primaryLight }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={s.avatarImg} />
          ) : (
            <Text style={[s.avatarText, { color: theme.colors.primary }]}>{initials}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.studentName, { color: theme.colors.text }]}>
            {item.firstName} {item.lastName}
          </Text>
          {item.email ? (
            <Text style={[s.studentMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {item.email}
            </Text>
          ) : null}
        </View>
        {isTeacher && (
          <TouchableOpacity style={s.actionBtn} onPress={() => handleRemoveStudent(item)}>
            <Ionicons name="person-remove-outline" size={18} color={theme.colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStudentsTab = () => (
    <FlatList
      data={filteredStudents}
      keyExtractor={(item) => `substudent-${item.id}`}
      renderItem={renderStudentItem}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      ListHeaderComponent={
        <>
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="people" size={20} color={theme.colors.primary} />
              <Text style={[s.statValue, { color: theme.colors.text }]}>{students.length}</Text>
              <Text style={[s.statLabel, { color: theme.colors.textMuted }]}>{t('groups.students')}</Text>
            </View>
          </View>

          <View style={s.searchRow}>
            <View style={[s.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="search" size={18} color={theme.colors.textMuted} />
              <TextInput
                style={[s.searchInput, { color: theme.colors.text }]}
                placeholder={t('groups.searchStudents')}
                placeholderTextColor={theme.colors.textMuted}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
            {isTeacher && (
              <TouchableOpacity style={[s.addBtn, { backgroundColor: theme.colors.primary }]} onPress={openAddModal}>
                <Ionicons name="person-add" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </>
      }
      ListEmptyComponent={
        <EmptyState
          icon={<Ionicons name="people-outline" size={40} color={theme.colors.textMuted} />}
          title={t('groups.noMembers')}
          message=""
        />
      }
    />
  );

  // ─── Chat Tab ───

  const renderChatMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = isMySender(item);
    const senderName = getSenderName(item);
    const time = formatTime(item.sentAt || item.createdAt);

    return (
      <View style={[s.messageBubbleRow, isMine && { flexDirection: 'row-reverse' }]}>
        <View
          style={[
            s.messageBubble,
            {
              backgroundColor: isMine ? theme.colors.primary : (theme.dark ? theme.colors.surface : theme.colors.primaryLight),
              alignSelf: isMine ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          {!isMine && senderName ? (
            <Text style={[s.msgSender, { color: theme.colors.primary }]}>{senderName}</Text>
          ) : null}
          <Text style={[s.msgText, { color: isMine ? '#fff' : theme.colors.text }]}>
            {item.content}
          </Text>
          <Text style={[s.msgTime, { color: isMine ? 'rgba(255,255,255,0.6)' : theme.colors.textMuted }]}>
            {time}
          </Text>
        </View>
      </View>
    );
  };

  const renderChatTab = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 120 : 0}
    >
      {chatLoading && messages.length === 0 ? (
        <Spinner />
      ) : messages.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            icon={<Ionicons name="chatbubbles-outline" size={40} color={theme.colors.textMuted} />}
            title={t('groups.noMessages')}
            message=""
          />
        </View>
      ) : (
        <FlatList
          ref={chatListRef}
          data={messages}
          renderItem={renderChatMessage}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.sm }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: false })}
          style={{ flex: 1 }}
        />
      )}

      <View
        style={[
          s.chatInputRow,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
          },
        ]}
      >
        <TextInput
          style={[s.chatInput, { color: theme.colors.text }]}
          placeholder={t('groups.typeMessage')}
          placeholderTextColor={theme.colors.inputPlaceholder}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[s.sendBtn, { opacity: messageText.trim() ? 1 : 0.4, backgroundColor: theme.colors.primary }]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <Spinner size="small" color="#fff" style={{ padding: 0 }} />
          ) : (
            <Ionicons name="send" size={20} color="#fff" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const title = subGroup?.name || subGroupName || t('groups.subGroupDetails');

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'students', label: t('groups.students'), icon: 'people-outline' },
    { key: 'chat', label: t('groups.chats'), icon: 'chatbubbles-outline' },
  ];

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={[s.headerBg, { paddingTop: insets.top + spacing.sm, backgroundColor: theme.colors.primary }]}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, activeTab === tab.key && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.5)'}
              />
              <Text
                style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {activeTab === 'students' && renderStudentsTab()}
          {activeTab === 'chat' && renderChatTab()}
        </>
      )}

      {isTeacher && (
        <Modal visible={showAddModal} animationType="slide" transparent>
          <View style={ms.overlay}>
            <View style={[ms.sheet, { backgroundColor: theme.colors.card }]}>
              <View style={ms.sheetHeader}>
                <Text style={[ms.sheetTitle, { color: theme.colors.text }]}>
                  {t('groups.addToSubGroup')}
                </Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={[ms.searchRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <Ionicons name="search" size={18} color={theme.colors.textMuted} />
                <TextInput
                  style={[ms.searchInput, { color: theme.colors.text }]}
                  placeholder={t('groups.searchStudents')}
                  placeholderTextColor={theme.colors.textMuted}
                  value={addSearch}
                  onChangeText={setAddSearch}
                />
              </View>

              <FlatList
                data={availableToAdd}
                keyExtractor={(item) => `avail-${item.id}`}
                style={{ maxHeight: 340 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={ms.studentRow}
                    onPress={() => handleAddStudent(item)}
                    disabled={adding === item.id}
                  >
                    <View style={[ms.studentAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                      <Text style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold', fontSize: 13 }}>
                        {(item.firstName?.[0] || '?').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[ms.studentName, { color: theme.colors.text }]} numberOfLines={1}>
                      {item.firstName} {item.lastName}
                    </Text>
                    {adding === item.id ? (
                      <Spinner size="small" style={{ padding: 0 }} />
                    ) : (
                      <Ionicons name="add-circle-outline" size={22} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ color: theme.colors.textMuted, textAlign: 'center', padding: spacing.xl }}>
                    {t('common.noResults')}
                  </Text>
                }
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  // Header
  headerBg: {
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.headerTitle,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
    color: '#fff',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: 14,
    gap: 3,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: 'Cairo_600SemiBold',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#fff',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Cairo_700Bold',
  },
  statLabel: {
    fontSize: 11,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Student card
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 14,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'Cairo_700Bold',
  },
  studentName: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
  },
  studentMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Chat
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
  },
  msgSender: {
    fontSize: 11,
    fontFamily: 'Cairo_700Bold',
    marginBottom: 2,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    ...typography.headerTitle,
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  studentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
  },
});

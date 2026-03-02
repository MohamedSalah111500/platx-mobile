import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { groupsApi } from '../../services/api/groups.api';
import { chatApi } from '../../services/api/chat.api';
import { studentsApi, type TopStudent } from '../../services/api/students.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import type { ProfileStackParamList } from '../../types/navigation.types';
import type { Group, GroupMember, GroupFile } from '../../types/group.types';
import type { ChatMessage } from '../../types/chat.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'GroupDetail'>;

const ACCENT = '#7c63fd';
type Tab = 'students' | 'chat' | 'info';

export default function GroupDetailScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const { isStaff, isAdmin, isStudent, user } = useAuth();
  const insets = useSafeAreaInsets();
  const isTeacher = isStaff || isAdmin;
  const chatListRef = useRef<FlatList>(null);

  const [activeTab, setActiveTab] = useState<Tab>('students');
  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<GroupMember[]>([]);
  const [staff, setStaff] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<GroupFile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Student search
  const [searchTerm, setSearchTerm] = useState('');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // Invite student modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [allStudents, setAllStudents] = useState<TopStudent[]>([]);
  const [inviteSearch, setInviteSearch] = useState('');
  const [selectedInviteStudent, setSelectedInviteStudent] = useState<TopStudent | null>(null);
  const [inviting, setInviting] = useState(false);

  // ─── Data loading ───

  const loadGroupData = useCallback(async () => {
    try {
      const [groupData, studentsData, staffData, filesData] = await Promise.all([
        groupsApi.getGroup(groupId),
        groupsApi.getGroupStudents(groupId),
        groupsApi.getGroupStaff(groupId).catch(() => []),
        groupsApi.getGroupFiles(groupId).catch(() => []),
      ]);
      setGroup(groupData || null);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setStaff(Array.isArray(staffData) ? staffData : []);
      setFiles(Array.isArray(filesData) ? filesData : []);
    } catch (err) {
      console.error('[GroupDetail] Load failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  const loadMessages = useCallback(async () => {
    setChatLoading(true);
    try {
      const data = isStudent
        ? await chatApi.getMessagesForStudent(groupId)
        : await chatApi.getMessagesForTeacher(groupId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[GroupDetail] Chat load failed:', err);
      setMessages([]);
    } finally {
      setChatLoading(false);
    }
  }, [groupId, isStudent]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  useEffect(() => {
    if (activeTab === 'chat') {
      loadMessages();
      // Poll for new messages every 10s
      const interval = setInterval(loadMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadMessages]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGroupData();
    if (activeTab === 'chat') loadMessages();
  };

  // ─── Student actions ───

  const filteredStudents = students.filter((s) => {
    if (!searchTerm) return true;
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

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
              await groupsApi.removeStudent(String(groupId), student.id);
              setStudents((prev) => prev.filter((s) => s.id !== student.id));
            } catch {
              Alert.alert(t('common.error'), t('groups.removeError'));
            }
          },
        },
      ],
    );
  };

  const openInviteModal = async () => {
    setShowInviteModal(true);
    setSelectedInviteStudent(null);
    setInviteSearch('');
    try {
      const data = await studentsApi.getAll();
      setAllStudents(data);
    } catch {
      setAllStudents([]);
    }
  };

  const handleInviteStudent = async () => {
    if (!selectedInviteStudent) return;
    setInviting(true);
    try {
      await groupsApi.addStudent(String(groupId), selectedInviteStudent.id);
      setShowInviteModal(false);
      // Reload students
      const studentsData = await groupsApi.getGroupStudents(groupId);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || err?.message || 'Failed');
    } finally {
      setInviting(false);
    }
  };

  const filteredInviteStudents = allStudents.filter((s) => {
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    return name.includes(inviteSearch.toLowerCase());
  });

  // ─── Chat actions ───

  const handleSendMessage = async () => {
    const text = messageText.trim();
    if (!text) return;
    setSending(true);
    try {
      if (isStudent) {
        await chatApi.sendToGroupFromStudent({ content: text, groupId });
      } else {
        await chatApi.sendToGroup({ content: text, groupId });
      }
      setMessageText('');
      await loadMessages();
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (err) {
      console.error('[GroupDetail] Send failed:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = (msg: ChatMessage) => {
    Alert.alert(
      t('common.confirm'),
      t('groups.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await chatApi.deleteMessage(msg.id);
              setMessages((prev) => prev.filter((m) => m.id !== msg.id));
            } catch { /* silent */ }
          },
        },
      ],
    );
  };

  // ─── Helpers ───

  const getInitials = (first?: string, last?: string) =>
    `${(first?.[0] || '').toUpperCase()}${(last?.[0] || '').toUpperCase()}` || '?';

  const currentUserId = user?.id || user?.userId;

  const isMySender = (msg: ChatMessage) => {
    if (msg.senderId === currentUserId) return true;
    if (msg.senderStaffId && msg.senderStaffId === currentUserId) return true;
    if (msg.senderStudentId && msg.senderStudentId === currentUserId) return true;
    return false;
  };

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

  const getFileIcon = (file: GroupFile): string => {
    const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
    const type = file.attachmentType?.toLowerCase() || '';
    if (['pdf'].includes(ext) || type.includes('pdf')) return 'document-text-outline';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || type.includes('image')) return 'image-outline';
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext) || type.includes('video')) return 'videocam-outline';
    if (['mp3', 'wav', 'aac'].includes(ext) || type.includes('audio')) return 'musical-note-outline';
    if (['doc', 'docx'].includes(ext)) return 'document-outline';
    if (['xls', 'xlsx'].includes(ext)) return 'grid-outline';
    if (['ppt', 'pptx'].includes(ext)) return 'easel-outline';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive-outline';
    return 'document-outline';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOpenFile = (file: GroupFile) => {
    const url = file.url ? getFullImageUrl(file.url) : undefined;
    if (url) Linking.openURL(url).catch(() => {});
  };

  // ─── Tab rendering ───

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'students', label: t('groups.students'), icon: 'people-outline' },
    { key: 'chat', label: t('groups.chats'), icon: 'chatbubbles-outline' },
    { key: 'info', label: t('groups.info'), icon: 'information-circle-outline' },
  ];

  // ─── Students Tab ───

  const renderStudentItem = ({ item }: { item: GroupMember }) => {
    const initials = getInitials(item.firstName, item.lastName);
    const imageUrl = getFullImageUrl(item.profileImage);

    return (
      <View style={[s.studentCard, { backgroundColor: theme.colors.card }]}>
        <View style={[s.avatar, { backgroundColor: theme.dark ? theme.colors.surface : '#F0EDFF' }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={s.avatarImg} />
          ) : (
            <Text style={[s.avatarText, { color: ACCENT }]}>{initials}</Text>
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
          {item.phoneNumber ? (
            <Text style={[s.studentMeta, { color: theme.colors.textMuted }]}>{item.phoneNumber}</Text>
          ) : null}
        </View>
        {isTeacher && (
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => handleRemoveStudent(item)}
          >
            <Ionicons name="person-remove-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStudentsTab = () => (
    <View style={{ flex: 1 }}>
      {/* Search + Invite */}
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
          <TouchableOpacity style={s.inviteBtn} onPress={openInviteModal}>
            <Ionicons name="person-add" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Staff section */}
      {staff.length > 0 && (
        <View style={{ marginBottom: spacing.md }}>
          <Text style={[s.sectionLabel, { color: theme.colors.textMuted }]}>{t('groups.staff')}</Text>
          {staff.map((member) => {
            const initials = getInitials(member.firstName, member.lastName);
            const imageUrl = getFullImageUrl(member.profileImage);
            return (
              <View key={`staff-${member.id}`} style={[s.studentCard, { backgroundColor: theme.colors.card }]}>
                <View style={[s.avatar, { backgroundColor: '#E8F5E9' }]}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={s.avatarImg} />
                  ) : (
                    <Text style={[s.avatarText, { color: '#4CAF50' }]}>{initials}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.studentName, { color: theme.colors.text }]}>
                    {member.firstName} {member.lastName}
                  </Text>
                  <Text style={[s.studentMeta, { color: ACCENT }]}>{t('groups.staff')}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Student list */}
      <Text style={[s.sectionLabel, { color: theme.colors.textMuted }]}>
        {t('groups.students')} ({filteredStudents.length})
      </Text>
      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="people-outline" size={40} color={theme.colors.textMuted} />}
          title={t('groups.noMembers')}
          message=""
        />
      ) : (
        filteredStudents.map((item) => (
          <View key={`student-${item.id}`}>
            {renderStudentItem({ item })}
          </View>
        ))
      )}
    </View>
  );

  // ─── Chat Tab ───

  const renderChatMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = isMySender(item);
    const senderName = getSenderName(item);
    const time = formatTime(item.sentAt || item.createdAt);

    return (
      <View style={[s.messageBubbleRow, isMine && { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View
          style={[
            s.messageBubble,
            {
              backgroundColor: isMine ? ACCENT : (theme.dark ? theme.colors.surface : '#F0EDFF'),
              alignSelf: isMine ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          {!isMine && senderName ? (
            <Text style={[s.msgSender, { color: ACCENT }]}>{senderName}</Text>
          ) : null}
          <Text style={[s.msgText, { color: isMine ? '#fff' : theme.colors.text }]}>
            {item.content}
          </Text>
          <Text style={[s.msgTime, { color: isMine ? 'rgba(255,255,255,0.6)' : theme.colors.textMuted }]}>
            {time}
          </Text>
        </View>
        {isTeacher && (
          <TouchableOpacity
            style={s.msgDeleteBtn}
            onPress={() => handleDeleteMessage(item)}
          >
            <Ionicons name="trash-outline" size={14} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderChatTab = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 120}
    >
      {chatLoading && messages.length === 0 ? (
        <Spinner />
      ) : messages.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="chatbubbles-outline" size={40} color={theme.colors.textMuted} />}
          title={t('groups.noMessages')}
          message=""
        />
      ) : (
        <FlatList
          ref={chatListRef}
          data={messages}
          renderItem={renderChatMessage}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.sm }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Message input */}
      <View style={[s.chatInputRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <TextInput
          style={[s.chatInput, { color: theme.colors.text }]}
          placeholder={t('groups.typeMessage')}
          placeholderTextColor={theme.colors.textMuted}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[s.sendBtn, { opacity: messageText.trim() ? 1 : 0.4 }]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <Spinner size="small" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ─── Info Tab ───

  const renderInfoTab = () => (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
      {/* Group header card */}
      <View style={[s.infoCard, { backgroundColor: theme.colors.card }]}>
        <View style={[s.infoIcon, { backgroundColor: theme.dark ? theme.colors.surface : '#F0EDFF' }]}>
          <Ionicons name="people" size={32} color={ACCENT} />
        </View>
        <Text style={[s.infoGroupName, { color: theme.colors.text }]}>{group?.name}</Text>
        {group?.gradeName ? (
          <Text style={[s.infoGrade, { color: ACCENT }]}>{group.gradeName}</Text>
        ) : null}
        {group?.description ? (
          <Text style={[s.infoDesc, { color: theme.colors.textMuted }]}>{group.description}</Text>
        ) : null}
      </View>

      {/* Stats */}
      <View style={s.statsGrid}>
        <View style={[s.statCard, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="people" size={22} color={ACCENT} />
          <Text style={[s.statValue, { color: theme.colors.text }]}>{students.length}</Text>
          <Text style={[s.statLabel, { color: theme.colors.textMuted }]}>{t('groups.students')}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="school" size={22} color="#4CAF50" />
          <Text style={[s.statValue, { color: theme.colors.text }]}>{staff.length}</Text>
          <Text style={[s.statLabel, { color: theme.colors.textMuted }]}>{t('groups.staff')}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="checkmark-circle" size={22} color="#FF9800" />
          <Text style={[s.statValue, { color: theme.colors.text }]}>
            {group?.isActive ? t('groups.active') : t('groups.inactive')}
          </Text>
          <Text style={[s.statLabel, { color: theme.colors.textMuted }]}>{t('groups.status')}</Text>
        </View>
      </View>

      {/* Dates */}
      {group?.nextDueDate ? (
        <View style={[s.infoRow, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="calendar-outline" size={20} color={ACCENT} />
          <View style={{ marginLeft: spacing.md }}>
            <Text style={[s.infoRowLabel, { color: theme.colors.textMuted }]}>{t('groups.startDate')}</Text>
            <Text style={[s.infoRowValue, { color: theme.colors.text }]}>
              {group.nextDueDate} {group.nextDueTime || ''}
            </Text>
          </View>
        </View>
      ) : null}

      {group?.createdAt ? (
        <View style={[s.infoRow, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="time-outline" size={20} color={ACCENT} />
          <View style={{ marginLeft: spacing.md }}>
            <Text style={[s.infoRowLabel, { color: theme.colors.textMuted }]}>{t('groups.createdAt')}</Text>
            <Text style={[s.infoRowValue, { color: theme.colors.text }]}>{group.createdAt}</Text>
          </View>
        </View>
      ) : null}

      {/* Staff list */}
      {staff.length > 0 && (
        <>
          <Text style={[s.sectionLabel, { color: theme.colors.textMuted, marginTop: spacing.lg }]}>
            {t('groups.staff')}
          </Text>
          {staff.map((member) => {
            const initials = getInitials(member.firstName, member.lastName);
            const imageUrl = getFullImageUrl(member.profileImage);
            return (
              <View key={`info-staff-${member.id}`} style={[s.studentCard, { backgroundColor: theme.colors.card }]}>
                <View style={[s.avatar, { backgroundColor: '#E8F5E9' }]}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={s.avatarImg} />
                  ) : (
                    <Text style={[s.avatarText, { color: '#4CAF50' }]}>{initials}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.studentName, { color: theme.colors.text }]}>
                    {member.firstName} {member.lastName}
                  </Text>
                  {member.email ? (
                    <Text style={[s.studentMeta, { color: theme.colors.textMuted }]}>{member.email}</Text>
                  ) : null}
                  {member.phoneNumber ? (
                    <Text style={[s.studentMeta, { color: theme.colors.textMuted }]}>{member.phoneNumber}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* Files section */}
      <Text style={[s.sectionLabel, { color: theme.colors.textMuted, marginTop: spacing.lg }]}>
        {t('groups.files')} ({files.length})
      </Text>
      {files.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="folder-open-outline" size={40} color={theme.colors.textMuted} />}
          title={t('groups.noFiles')}
          message=""
        />
      ) : (
        files.map((file) => (
          <TouchableOpacity
            key={`file-${file.id}`}
            style={[s.fileCard, { backgroundColor: theme.colors.card }]}
            onPress={() => handleOpenFile(file)}
            activeOpacity={0.7}
          >
            <View style={[s.fileIconWrap, { backgroundColor: theme.dark ? theme.colors.surface : '#F0EDFF' }]}>
              <Ionicons name={getFileIcon(file) as any} size={22} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.fileName, { color: theme.colors.text }]} numberOfLines={1}>
                {file.name}
              </Text>
              {file.size ? (
                <Text style={[s.fileMeta, { color: theme.colors.textMuted }]}>
                  {formatFileSize(file.size)}
                </Text>
              ) : null}
            </View>
            {file.url ? (
              <Ionicons name="download-outline" size={20} color={ACCENT} />
            ) : null}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  // ─── Main render ───

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: theme.colors.background }]}>
        <View style={[s.headerBg, { paddingTop: insets.top + spacing.sm }]}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{t('groups.groupDetails')}</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <Spinner />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[s.headerBg, { paddingTop: insets.top + spacing.sm }]}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{group?.name || t('groups.groupDetails')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab bar */}
        <View style={s.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, activeTab === tab.key && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.5)'}
              />
              <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab content */}
      {activeTab === 'students' && (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />
          }
        >
          {renderStudentsTab()}
        </ScrollView>
      )}

      {activeTab === 'chat' && renderChatTab()}

      {activeTab === 'info' && renderInfoTab()}

      {/* ── Invite Student Modal ── */}
      {isTeacher && (
        <Modal visible={showInviteModal} animationType="slide" transparent>
          <View style={ms.overlay}>
            <View style={[ms.sheet, { backgroundColor: theme.colors.card }]}>
              <View style={ms.sheetHeader}>
                <Text style={[ms.sheetTitle, { color: theme.colors.text }]}>
                  {t('groups.inviteStudent')}
                </Text>
                <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Search */}
              <View style={[ms.searchRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <Ionicons name="search" size={18} color={theme.colors.textMuted} />
                <TextInput
                  style={[ms.searchInput, { color: theme.colors.text }]}
                  placeholder={t('groups.searchStudents')}
                  placeholderTextColor={theme.colors.textMuted}
                  value={inviteSearch}
                  onChangeText={setInviteSearch}
                />
              </View>

              {/* List */}
              <FlatList
                data={filteredInviteStudents}
                keyExtractor={(item) => item.id.toString()}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => {
                  const name = `${item.firstName || ''} ${item.lastName || ''}`.trim();
                  const isSelected = selectedInviteStudent?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[ms.studentRow, { backgroundColor: isSelected ? ACCENT + '15' : 'transparent' }]}
                      onPress={() => setSelectedInviteStudent(item)}
                    >
                      <View style={[ms.studentAvatar, { backgroundColor: '#F0EDFF' }]}>
                        <Text style={{ color: ACCENT, fontWeight: '700', fontSize: 13 }}>
                          {(item.firstName?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[ms.studentName, { color: theme.colors.text }]} numberOfLines={1}>
                        {name}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={ACCENT} />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={{ color: theme.colors.textMuted, textAlign: 'center', padding: spacing.xl }}>
                    {t('common.noResults')}
                  </Text>
                }
              />

              <TouchableOpacity
                style={[ms.addBtn, { opacity: selectedInviteStudent ? 1 : 0.5 }]}
                disabled={!selectedInviteStudent || inviting}
                onPress={handleInviteStudent}
              >
                {inviting ? (
                  <Spinner size="small" />
                ) : (
                  <Text style={ms.addBtnText}>{t('groups.inviteStudent')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── Styles ───

const s = StyleSheet.create({
  container: { flex: 1 },

  // Header
  headerBg: {
    backgroundColor: ACCENT,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 14,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  tabLabelActive: {
    color: '#fff',
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
  inviteBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section label
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  // Student card
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
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
    fontWeight: '700',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: '700',
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
  msgDeleteBtn: {
    padding: 4,
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
    maxHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },

  // Info tab
  infoCard: {
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  infoIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoGroupName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  infoGrade: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  infoDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  infoRowLabel: {
    fontSize: 12,
  },
  infoRowValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },

  // File card
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  fileIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});

// Modal styles
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
    fontSize: fontSize.lg,
    fontWeight: '700',
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
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addBtnText: {
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});

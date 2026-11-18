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
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize, typography, buttonLineHeight } from '../../theme/typography';
import { groupsApi } from '../../services/api/groups.api';
import { subGroupsApi } from '../../services/api/subgroups.api';
import { usePlatformAccess } from '../../store/platformAccess.store';
import { studentsApi, type TopStudent } from '../../services/api/students.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import type { ProfileStackParamList } from '../../types/navigation.types';
import type { Group, GroupMember, GroupFile, SubGroup } from '../../types/group.types';
import { ActionSheet, type SheetAction } from '../../components/ui/ActionSheet';
import { StudentActions } from '../../components/groups/StudentActions';
import { GroupProgressPanel } from '../../components/groups/GroupProgressPanel';
import { GroupFilesSection, GroupStaffSection } from '../../components/groups/GroupMembersSections';
import { GROUP_STATUS } from '../../types/group.types';

import { BackButton } from '../../components/ui/BackButton';
import { ChatConversation } from '../../components/chat/ChatConversation';
import { appDateLocale, parseServerDate } from '../../utils/dateLocale';
import { sheetFrame } from '../../utils/responsive';
type Props = NativeStackScreenProps<ProfileStackParamList, 'GroupDetail'>;

type Tab = 'students' | 'subgroups' | 'chat' | 'progress' | 'info';

export default function GroupDetailScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const { isStaff, isAdmin, isStudent, user, canModule } = useAuth();
  const insets = useSafeAreaInsets();
  const isTeacher = isStaff || isAdmin;
  const canEditGroup = canModule('Groups', 'edit');
  const canDeleteGroup = canModule('Groups', 'delete');
  const [manageOpen, setManageOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<GroupMember | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<SubGroup | null>(null);
  const focusedOnce = useRef(false);

  const [activeTab, setActiveTab] = useState<Tab>('students');
  const showChat = usePlatformAccess()('Chat');
  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<GroupMember[]>([]);
  const [staff, setStaff] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<GroupFile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Sub-groups
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [mySubGroup, setMySubGroup] = useState<SubGroup | null>(null);

  // Student search
  const [searchTerm, setSearchTerm] = useState('');


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

  const loadSubGroups = useCallback(async () => {
    if (isTeacher) {
      try {
        const res = await subGroupsApi.getByGroup(groupId);
        setSubGroups(Array.isArray(res?.items) ? res.items : []);
      } catch {
        setSubGroups([]);
      }
      return;
    }
    if (isStudent && user?.studentId) {
      try {
        const res = await subGroupsApi.getStudentSubGroups(user.studentId);
        const ids = Array.isArray(res?.subGroupIds) ? res.subGroupIds : [];
        const details = await Promise.all(ids.map((id) => subGroupsApi.getById(id).catch(() => null)));
        setMySubGroup(details.find((sg) => sg?.groupId === groupId) ?? null);
      } catch {
        setMySubGroup(null);
      }
    }
  }, [groupId, isTeacher, isStudent, user?.studentId]);

  useEffect(() => {
    loadSubGroups();
  }, [loadSubGroups]);

  useFocusEffect(
    useCallback(() => {
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        loadGroupData();
        return;
      }
      loadGroupData();
      loadSubGroups();
    }, [loadGroupData, loadSubGroups])
  );

  const reloadAll = () => {
    loadGroupData();
    loadSubGroups();
  };

  const confirmDeleteGroup = () =>
    Alert.alert(t('groupManage.deleteGroupTitle'), t('groupManage.deleteGroupConfirm', { name: group?.name ?? '' }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await groupsApi.delete(groupId);
            Alert.alert(t('common.success'), t('groupManage.deleted'));
            navigation.goBack();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('groupManage.deleteFailed'));
          }
        },
      },
    ]);

  const confirmDeleteSubGroup = (sg: SubGroup) =>
    Alert.alert(t('groupManage.deleteSubGroupTitle'), t('groupManage.deleteGroupConfirm', { name: sg.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await subGroupsApi.remove(sg.id);
            loadSubGroups();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('groupManage.deleteFailed'));
          }
        },
      },
    ]);

  const manageActions: SheetAction[] = [
    ...(canEditGroup
      ? [{ key: 'edit', label: t('groupManage.editGroup'), icon: 'create-outline' as const, onPress: () => navigation.navigate('GroupForm', { groupId }) }]
      : []),
    ...(isAdmin
      ? [{ key: 'addSub', label: t('groupManage.addSubGroup'), icon: 'git-branch-outline' as const, onPress: () => navigation.navigate('GroupForm', { parentGroupId: groupId }) }]
      : []),
    ...(canDeleteGroup
      ? [{ key: 'delete', label: t('groupManage.deleteGroup'), icon: 'trash-outline' as const, onPress: confirmDeleteGroup, danger: true }]
      : []),
  ];

  const subGroupActions: SheetAction[] = activeSubGroup
    ? [
        {
          key: 'open',
          label: t('groupManage.openSubGroup'),
          icon: 'open-outline',
          onPress: () => navigation.navigate('SubGroupDetail', { subGroupId: activeSubGroup.id, subGroupName: activeSubGroup.name, groupId }),
        },
        ...(canEditGroup
          ? [{ key: 'edit', label: t('groupManage.editSubGroup'), icon: 'create-outline' as const, onPress: () => navigation.navigate('GroupForm', { parentGroupId: groupId, subGroupId: activeSubGroup.id }) }]
          : []),
        ...(canDeleteGroup
          ? [{ key: 'delete', label: t('groupManage.deleteSubGroupTitle'), icon: 'trash-outline' as const, onPress: () => confirmDeleteSubGroup(activeSubGroup), danger: true }]
          : []),
      ]
    : [];

  const onRefresh = () => {
    setRefreshing(true);
    loadGroupData();
    loadSubGroups();
  };

  // ─── Student actions ───

  const filteredStudents = students.filter((s) => {
    if (!searchTerm) return true;
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });


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
      Alert.alert(t('common.error'), err?.userMessage || t('groups.addStudentFailed'));
    } finally {
      setInviting(false);
    }
  };

  const filteredInviteStudents = allStudents.filter((s) => {
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    return name.includes(inviteSearch.toLowerCase());
  });

  // ─── Helpers ───

  const getInitials = (first?: string, last?: string) =>
    `${(first?.[0] || '').toUpperCase()}${(last?.[0] || '').toUpperCase()}` || '?';


  // ─── Tab rendering ───

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'students', label: t('groups.students'), icon: 'people-outline' },
    ...(isTeacher
      ? [{ key: 'subgroups' as Tab, label: t('groups.subGroups'), icon: 'git-branch-outline' }]
      : []),
    ...(showChat ? [{ key: 'chat' as Tab, label: t('groups.chats'), icon: 'chatbubbles-outline' }] : []),
    ...(isTeacher
      ? [{ key: 'progress' as Tab, label: t('groupManage.progress.tab'), icon: 'book-outline' }]
      : []),
    { key: 'info', label: t('groups.info'), icon: 'information-circle-outline' },
  ];

  // ─── Students Tab ───

  const renderStudentItem = ({ item }: { item: GroupMember }) => {
    const initials = getInitials(item.firstName, item.lastName);
    const imageUrl = getFullImageUrl(item.profileImage);

    return (
      <View style={[s.studentCard, { backgroundColor: theme.colors.card }]}>
        <View style={[s.avatar, { backgroundColor: theme.colors.primary }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={s.avatarImg} />
          ) : (
            <Text style={[s.avatarText, { color: theme.colors.onPrimary }]}>{initials}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.studentName, { color: theme.colors.text }]}>
            {item.firstName} {item.lastName}
          </Text>
          {isTeacher && item.email ? (
            <Text style={[s.studentMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {item.email}
            </Text>
          ) : null}
          {isTeacher && item.phoneNumber ? (
            <Text style={[s.studentMeta, { color: theme.colors.textMuted }]}>{item.phoneNumber}</Text>
          ) : null}
        </View>
        {isTeacher && (
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => setActiveStudent(item)}
            accessibilityRole="button"
            accessibilityLabel={t('groupManage.studentActions')}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textMuted} />
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
          <TouchableOpacity style={[s.inviteBtn, { backgroundColor: theme.colors.primary }]} onPress={openInviteModal}>
            <Ionicons name="person-add" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

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

  // ─── Sub-Groups Tab ───

  const renderSubGroupsTab = () => (
    <View style={{ flex: 1 }}>
      <View style={s.labelRow}>
        <Text style={[s.sectionLabel, { color: theme.colors.textMuted, marginBottom: 0 }]}>
          {t('groups.subGroups')} ({subGroups.length})
        </Text>
        {isAdmin ? (
          <TouchableOpacity
            style={[s.inviteBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('GroupForm', { parentGroupId: groupId })}
            accessibilityRole="button"
            accessibilityLabel={t('groupManage.addSubGroup')}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>
      {subGroups.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="git-branch-outline" size={40} color={theme.colors.textMuted} />}
          title={t('groups.noSubGroups')}
          message=""
        />
      ) : (
        subGroups.map((sg) => (
          <TouchableOpacity
            key={`subgroup-${sg.id}`}
            style={[s.subGroupCard, { backgroundColor: theme.colors.card }]}
            onPress={() =>
              navigation.navigate('SubGroupDetail', { subGroupId: sg.id, subGroupName: sg.name, groupId })
            }
            activeOpacity={0.7}
          >
            <View style={[s.subGroupIcon, { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.primaryLight }]}>
              <Ionicons name="git-branch-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.studentName, { color: theme.colors.text }]}>{sg.name}</Text>
              {sg.studentsCount != null && (
                <Text style={[s.studentMeta, { color: theme.colors.textMuted }]}>
                  {t('home.studentsCount', { count: sg.studentsCount })}
                </Text>
              )}
            </View>
            {canEditGroup || canDeleteGroup ? (
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => setActiveSubGroup(sg)}
                accessibilityRole="button"
                accessibilityLabel={t('groupManage.subGroupActions')}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  // ─── Chat Tab ───

  const renderChatTab = () => (
    <ChatConversation groupId={groupId} bottomInset={insets.bottom} />
  );

  // ─── Info Tab ───

  const renderInfoTab = () => (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
      {/* Group header card */}
      <View style={[s.infoCard, { backgroundColor: theme.colors.card }]}>
        <View style={[s.infoIcon, { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.primaryLight }]}>
          <Ionicons name="people" size={32} color={theme.colors.primary} />
        </View>
        <Text style={[s.infoGroupName, { color: theme.colors.text }]}>{group?.name}</Text>
        {group?.gradeName ? (
          <Text style={[s.infoGrade, { color: theme.colors.primary }]}>{group.gradeName}</Text>
        ) : null}
        {group?.description ? (
          <Text style={[s.infoDesc, { color: theme.colors.textMuted }]}>{group.description}</Text>
        ) : null}
        {isStudent && mySubGroup ? (
          <TouchableOpacity
            style={[s.mySubGroupBadge, { backgroundColor: theme.colors.primaryLight }]}
            onPress={() =>
              navigation.navigate('SubGroupDetail', {
                subGroupId: mySubGroup.id,
                subGroupName: mySubGroup.name,
                groupId,
              })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="git-branch-outline" size={14} color={theme.colors.primary} />
            <Text style={[s.mySubGroupText, { color: theme.colors.primary }]}>
              {t('groups.yourSubGroup')}: {mySubGroup.name}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Stats */}
      <View style={s.statsGrid}>
        <View style={[s.statCard, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="people" size={22} color={theme.colors.primary} />
          <Text style={[s.statValue, { color: theme.colors.text }]}>{students.length}</Text>
          <Text style={[s.statLabel, { color: theme.colors.textMuted }]}>{t('groups.students')}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="school" size={22} color={theme.colors.success} />
          <Text style={[s.statValue, { color: theme.colors.text }]}>{staff.length}</Text>
          <Text style={[s.statLabel, { color: theme.colors.textMuted }]}>{t('groups.staff')}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.warning} />
          <Text style={[s.statValue, { color: theme.colors.text }]}>
            {group?.status === GROUP_STATUS.Inactive ? t('groups.inactive') : t('groups.active')}
          </Text>
          <Text style={[s.statLabel, { color: theme.colors.textMuted }]}>{t('groups.status')}</Text>
        </View>
      </View>

      {group?.createdAt ? (
        <View style={[s.infoRow, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.infoRowLabel, { color: theme.colors.textMuted }]}>{t('groups.createdAt')}</Text>
            <Text style={[s.infoRowValue, { color: theme.colors.text }]}>
              {parseServerDate(group.createdAt).toLocaleDateString(appDateLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>
      ) : null}

      <GroupStaffSection groupId={groupId} staff={staff} canManage={isAdmin} onChanged={loadGroupData} />
      <GroupFilesSection groupId={groupId} files={files} canManage={isTeacher} onChanged={loadGroupData} />
    </ScrollView>
  );

  // ─── Main render ───

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: theme.colors.background }]}>
        <View style={[s.headerBg, { paddingTop: insets.top + spacing.sm, backgroundColor: theme.colors.heroBackground }]}>
          <View style={s.headerRow}>
            <BackButton onPress={() => navigation.goBack()} tone="onColor" />
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
      <View style={[s.headerBg, { paddingTop: insets.top + spacing.sm, backgroundColor: theme.colors.heroBackground }]}>
        <View style={s.headerRow}>
          <BackButton onPress={() => navigation.goBack()} tone="onColor" />
          <Text style={s.headerTitle} numberOfLines={1}>{group?.name || t('groups.groupDetails')}</Text>
          {isTeacher && manageActions.length ? (
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => setManageOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('groupManage.manage')}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBar}>
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
        </ScrollView>
      </View>

      {/* Tab content */}
      {activeTab === 'students' && (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
          }
        >
          {renderStudentsTab()}
        </ScrollView>
      )}

      {activeTab === 'subgroups' && (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
          }
        >
          {renderSubGroupsTab()}
        </ScrollView>
      )}

      {activeTab === 'chat' && renderChatTab()}

      {activeTab === 'progress' && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing['3xl'] }} showsVerticalScrollIndicator={false}>
          <GroupProgressPanel groupId={groupId} canToggle={isTeacher} canAssign={isAdmin} />
        </ScrollView>
      )}

      {activeTab === 'info' && renderInfoTab()}

      <ActionSheet visible={manageOpen} title={group?.name} actions={manageActions} onClose={() => setManageOpen(false)} />
      <ActionSheet
        visible={!!activeSubGroup}
        title={activeSubGroup?.name}
        actions={subGroupActions}
        onClose={() => setActiveSubGroup(null)}
      />
      <StudentActions
        scope={{ kind: 'group', groupId, groupName: group?.name ?? '' }}
        student={activeStudent}
        canManage={isTeacher}
        onClose={() => setActiveStudent(null)}
        onChanged={reloadAll}
      />

      {/* ── Invite Student Modal ── */}
      {isTeacher && (
        <Modal visible={showInviteModal} animationType="slide" transparent onRequestClose={() => setShowInviteModal(false)} statusBarTranslucent>
          <View style={ms.overlay}>
            <View style={[ms.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.xl }]}>
              <View style={ms.sheetHeader}>
                <Text style={[ms.sheetTitle, { color: theme.colors.text }]}>
                  {t('groups.inviteStudent')}
                </Text>
                <TouchableOpacity onPress={() => setShowInviteModal(false)} hitSlop={8}>
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
                      style={[ms.studentRow, { backgroundColor: isSelected ? theme.colors.primary + '15' : 'transparent' }]}
                      onPress={() => setSelectedInviteStudent(item)}
                    >
                      <View style={[ms.studentAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                        <Text style={{ color: theme.colors.primary, fontFamily: 'Cairo_700Bold', fontSize: 14 }}>
                          {(item.firstName?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[ms.studentName, { color: theme.colors.text }]} numberOfLines={1}>
                        {name}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
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
                style={[ms.addBtn, { opacity: selectedInviteStudent ? 1 : 0.5, backgroundColor: theme.colors.primary }]}
                disabled={!selectedInviteStudent || inviting}
                onPress={handleInviteStudent}
              >
                {inviting ? (
                  <Spinner size="small" color="#fff" style={{ padding: 0 }} />
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
    ...typography.screenTitle,
    flex: 1,
    marginHorizontal: spacing.md,
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
    minWidth: 76,
    minHeight: 56,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    gap: 3,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabLabel: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Cairo_600SemiBold',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#fff',
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
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
    textAlign: 'left',
  },
  inviteBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section label
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textAlign: 'left',
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
    textAlign: 'left',
  },
  studentName: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'left',
  },
  studentMeta: {
    fontSize: 14,
    marginTop: 2,
    textAlign: 'left',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Sub-group card
  subGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  subGroupIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mySubGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  mySubGroupText: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'left',
    lineHeight: buttonLineHeight(14),
    includeFontPadding: false,
  },

  // Info tab
  infoCard: {
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    
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
    fontFamily: 'Cairo_700Bold',
    textAlign: 'left',
    lineHeight: buttonLineHeight(fontSize.lg),
    includeFontPadding: false,
  },
  infoGrade: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    marginTop: spacing.xs,
    textAlign: 'left',
  },
  infoDesc: {
    fontSize: 14,
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
    
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Cairo_700Bold',
    textAlign: 'left',
    lineHeight: buttonLineHeight(16),
    includeFontPadding: false,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'left',
    lineHeight: buttonLineHeight(14),
    includeFontPadding: false,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  infoRowLabel: {
    fontSize: 14,
    textAlign: 'left',
    lineHeight: buttonLineHeight(14),
    includeFontPadding: false,
  },
  infoRowValue: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    marginTop: 2,
    textAlign: 'left',
  },

  // File card
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
    gap: spacing.md,
    
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
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'left',
  },
  fileMeta: {
    fontSize: 14,
    marginTop: 2,
    textAlign: 'left',
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
    ...sheetFrame,
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
    textAlign: 'left',
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
    textAlign: 'left',
  },
  addBtn: {
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addBtnText: {
    color: '#fff',
    fontSize: fontSize.base,
    fontFamily: 'Cairo_700Bold',
    textAlign: 'left',
    lineHeight: buttonLineHeight(fontSize.base),
    includeFontPadding: false,
  },
});

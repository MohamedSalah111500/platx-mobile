import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarSpace } from '../../navigation/tabBar';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SearchBar } from '../../components/ui/SearchBar';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { spacing } from '../../theme/spacing';
import { typography, fontSize, buttonLineHeight } from '../../theme/typography';
import { groupsApi } from '../../services/api/groups.api';
import { subGroupsApi } from '../../services/api/subgroups.api';
import { chatApi } from '../../services/api/chat.api';
import type { ChatStackParamList } from '../../types/navigation.types';
import type { Group, SubGroupLookup } from '../../types/group.types';
import type { StaffChatContact, StudentChatContact } from '../../types/chat.types';

type ChatEntry =
  | { kind: 'group'; data: Group }
  | { kind: 'subgroup'; data: SubGroupLookup }
  | { kind: 'staff'; data: StaffChatContact }
  | { kind: 'student'; data: StudentChatContact };

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatList'>;

export default function ChatListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, isStudent } = useAuth();
  const { t, isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const [groups, setGroups] = useState<Group[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroupLookup[]>([]);
  const [staffContacts, setStaffContacts] = useState<StaffChatContact[]>([]);
  const [studentContacts, setStudentContacts] = useState<StudentChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadStudentChats = async (studentId: number) => {
    const [staffRes, contactsRes, groupIdsRes, subGroupIdsRes] = await Promise.allSettled([
      chatApi.getStaffHasMessages(),
      chatApi.getChatContacts(),
      groupsApi.getStudentGroups(studentId),
      subGroupsApi.getStudentSubGroups(studentId),
    ]);
    const groupIds = groupIdsRes.status === 'fulfilled' ? groupIdsRes.value?.groupIds ?? [] : [];
    const subGroupIds = subGroupIdsRes.status === 'fulfilled' ? subGroupIdsRes.value?.subGroupIds ?? [] : [];
    const [groupDetails, subGroupDetails] = await Promise.all([
      Promise.all(groupIds.map((id) => groupsApi.getGroup(id).catch(() => null))),
      Promise.all(subGroupIds.map((id) => subGroupsApi.getById(id).catch(() => null))),
    ]);
    const myGroups = groupDetails.filter((group): group is Group => !!group);
    setGroups(myGroups);
    setSubGroups(
      subGroupDetails
        .filter((subGroup): subGroup is NonNullable<typeof subGroup> => !!subGroup)
        .map((subGroup) => ({
          id: subGroup.id,
          name: subGroup.name,
          groupId: subGroup.groupId,
          groupName: myGroups.find((group) => group.id === subGroup.groupId)?.name ?? '',
        })),
    );
    const withMessages = staffRes.status === 'fulfilled' && Array.isArray(staffRes.value) ? staffRes.value : [];
    const contacts = contactsRes.status === 'fulfilled' && Array.isArray(contactsRes.value) ? contactsRes.value : [];
    const known = new Set(withMessages.map((staff) => staff.id));
    setStaffContacts([...withMessages, ...contacts.filter((staff) => !known.has(staff.id))]);
  };

  const loadStaffChats = async () => {
    const [groupsRes, subGroupsRes, studentsRes] = await Promise.allSettled([
      groupsApi.getAll(1, 50),
      subGroupsApi.getAllLookup(),
      chatApi.getStudentsHaveMessages(),
    ]);
    setGroups(groupsRes.status === 'fulfilled' ? groupsRes.value.items || [] : []);
    setSubGroups(subGroupsRes.status === 'fulfilled' ? subGroupsRes.value : []);
    setStudentContacts(studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value) ? studentsRes.value : []);
  };

  const loadData = async () => {
    try {
      if (isStudent) {
        if (user?.studentId) await loadStudentChats(user.studentId);
      } else {
        await loadStaffChats();
      }
    } catch {
      setGroups([]);
      setSubGroups([]);
      setStaffContacts([]);
      setStudentContacts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [isStudent, user?.studentId]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const bgColor = theme.colors.background;
  const searchTerm = search.toLowerCase().trim();

  const combinedEntries: ChatEntry[] = [];
  groups.forEach((g) => {
    combinedEntries.push({ kind: 'group', data: g });
    subGroups
      .filter((sg) => sg.groupId === g.id)
      .forEach((sg) => combinedEntries.push({ kind: 'subgroup', data: sg }));
  });
  staffContacts.forEach((staff) => combinedEntries.push({ kind: 'staff', data: staff }));
  studentContacts.forEach((student) => combinedEntries.push({ kind: 'student', data: student }));
  const entryName = (entry: ChatEntry) =>
    entry.kind === 'staff' || entry.kind === 'student'
      ? `${entry.data.firstName || ''} ${entry.data.lastName || ''}`
      : entry.data.name || '';
  const listData = combinedEntries.filter((entry) => !searchTerm || entryName(entry).toLowerCase().includes(searchTerm));
  const totalCount = combinedEntries.length;

  const renderPersonItem = (name: string, subtitle: string, onPress: () => void) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: theme.colors.card }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarWrap}>
        <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.avatarLetter, { color: theme.colors.onPrimary }]}>{(name[0] || '?').toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.cardSub, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  const renderStaffItem = ({ item }: { item: StaffChatContact }) => {
    const name = `${item.firstName || ''} ${item.lastName || ''}`.trim();
    return renderPersonItem(name, t('chat.staff'), () =>
      navigation.navigate('ChatRoom', {
        groupId: item.groupId,
        groupName: name,
        staffId: item.staffId || item.id,
        staffName: name,
        chatType: 'staff',
      }),
    );
  };

  const renderStudentItem = ({ item }: { item: StudentChatContact }) => {
    const name = `${item.firstName || ''} ${item.lastName || ''}`.trim();
    return renderPersonItem(name, t('chat.student'), () =>
      navigation.navigate('ChatRoom', {
        groupId: item.groupId ?? 0,
        groupName: name,
        studentId: item.id,
        chatType: 'student',
      }),
    );
  };

  const renderGroupItem = ({ item, index }: { item: Group; index: number }) => {
    const initial = item.name?.[0]?.toUpperCase() || 'G';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => {
          navigation.navigate('ChatRoom', {
            groupId: item.id,
            groupName: item.name,
            membersCount: item.studentsCount,
            chatType: 'group',
          });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="people" size={22} color={theme.colors.primary} />
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.cardSub, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {t('home.membersCount', { count: item.studentsCount || 0 })}
          </Text>
        </View>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={theme.colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const renderSubGroupItem = ({ item }: { item: SubGroupLookup }) => (
    <TouchableOpacity
      style={[
        styles.card,
        styles.subGroupCard,
        { backgroundColor: theme.colors.card },
      ]}
      onPress={() => {
        navigation.navigate('ChatRoom', {
          groupId: item.groupId,
          groupName: item.name,
          subGroupId: item.id,
          chatType: 'subgroup',
        });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        <View
          style={[
            styles.avatarCircle,
            styles.subGroupAvatar,
            { backgroundColor: theme.dark ? theme.colors.primary + '26' : theme.colors.primaryLight },
          ]}
        >
          <Ionicons name="git-branch-outline" size={19} color={theme.colors.primary} />
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.cardSub, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {t('groups.subGroups')} · {item.groupName}
        </Text>
      </View>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  const renderChatEntry = ({ item, index }: { item: ChatEntry; index: number }) => {
    if (item.kind === 'group') return renderGroupItem({ item: item.data, index });
    if (item.kind === 'subgroup') return renderSubGroupItem({ item: item.data });
    if (item.kind === 'student') return renderStudentItem({ item: item.data });
    return renderStaffItem({ item: item.data });
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('chat.title')}
          </Text>
          {totalCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.countBadgeText}>{totalCount}</Text>
            </View>
          )}
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder={t('common.search')} />
      </View>

      {/* List */}
      <FlatList
        data={listData}
        renderItem={renderChatEntry}
        keyExtractor={(item) =>
          item.kind === 'staff' ? `staff-${item.data.id}-${item.data.groupId || ''}` : `${item.kind}-${item.data.id}`
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={9}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          loading ? (
            <Spinner />
          ) : (
            <EmptyState
              title={t('chat.noConversations')}
              message={isStudent ? t('chat.noStaffAvailable') : t('chat.joinGroupToChat')}
            />
          )
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarSpace }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.screenTitle,
    flex: 1,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_700Bold',
    textAlign: 'left',
    lineHeight: buttonLineHeight(fontSize.xs),
    includeFontPadding: false,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingEnd: spacing.md,
    borderRadius: 22,
  },
  subGroupCard: {
    marginStart: spacing.xl,
  },
  subGroupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  avatarWrap: {
    position: 'relative',
    marginEnd: spacing.md,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 21,
    fontFamily: 'Cairo_700Bold',
    textAlign: 'left',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_700Bold',
    textAlign: 'left',
  },
  cardSub: {
    fontSize: fontSize.xs,
    textAlign: 'left',
  },
});

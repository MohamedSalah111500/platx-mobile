import React, { useEffect, useState, useCallback } from 'react';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SearchBar } from '../../components/ui/SearchBar';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { groupsApi } from '../../services/api/groups.api';
import { subGroupsApi } from '../../services/api/subgroups.api';
import { chatApi } from '../../services/api/chat.api';
import type { ChatStackParamList } from '../../types/navigation.types';
import { useSound } from '../../hooks/useSound';
import type { Group, SubGroupLookup } from '../../types/group.types';
import type { StaffChatContact } from '../../types/chat.types';

type ChatEntry =
  | { kind: 'group'; data: Group }
  | { kind: 'subgroup'; data: SubGroupLookup };

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatList'>;

const AVATAR_COLORS = [
  { bg: '#F0EDFF', color: '#7c63fd' },
  { bg: '#E8F8F0', color: '#34C38F' },
  { bg: '#E8F4FD', color: '#3B82F6' },
  { bg: '#FFF4E5', color: '#F5A623' },
  { bg: '#FFE8E8', color: '#F46A6A' },
];

export default function ChatListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, isStudent } = useAuth();
  const { t, isRTL } = useRTL();
  const { play } = useSound();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<Group[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroupLookup[]>([]);
  const [staffContacts, setStaffContacts] = useState<StaffChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      if (isStudent) {
        const staffList = await chatApi.getStaffHasMessages();
        setStaffContacts(Array.isArray(staffList) ? staffList : []);
      } else {
        const [groupsRes, subGroupsRes] = await Promise.allSettled([
          groupsApi.getAll(1, 50),
          subGroupsApi.getAllLookup(),
        ]);
        setGroups(groupsRes.status === 'fulfilled' ? groupsRes.value.items || [] : []);
        setSubGroups(subGroupsRes.status === 'fulfilled' ? subGroupsRes.value : []);
      }
    } catch (err) {
      if (isStudent) setStaffContacts([]);
      else {
        setGroups([]);
        setSubGroups([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const bgColor = theme.colors.background;
  const searchTerm = search.toLowerCase().trim();

  // Filter by search
  const filteredStaff = staffContacts.filter((s) => {
    if (!searchTerm) return true;
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    return name.includes(searchTerm);
  });
  const combinedEntries: ChatEntry[] = [];
  groups.forEach((g) => {
    combinedEntries.push({ kind: 'group', data: g });
    subGroups
      .filter((sg) => sg.groupId === g.id)
      .forEach((sg) => combinedEntries.push({ kind: 'subgroup', data: sg }));
  });
  const filteredEntries = combinedEntries.filter((entry) => {
    if (!searchTerm) return true;
    return entry.data.name?.toLowerCase().includes(searchTerm);
  });
  const listData: any[] = isStudent ? filteredStaff : filteredEntries;
  const totalCount = isStudent ? staffContacts.length : groups.length + subGroups.length;

  const renderStaffItem = ({ item, index }: { item: StaffChatContact; index: number }) => {
    const palette = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const name = `${item.firstName || ''} ${item.lastName || ''}`.trim();
    const initial = (item.firstName?.[0] || 'S').toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => {
          play('tap');
          navigation.navigate('ChatRoom', {
            groupId: item.groupId,
            groupName: name,
            staffId: item.staffId || item.id,
            staffName: name,
            chatType: 'staff',
          });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.dark ? palette.color + '26' : palette.bg }]}>
            <Text style={[styles.avatarLetter, { color: palette.color }]}>{initial}</Text>
          </View>
          <View style={[styles.onlineDot, { borderColor: theme.colors.card, backgroundColor: theme.colors.success }]} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.cardSub, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {t('chat.staff')}
          </Text>
        </View>
        <View style={[styles.arrowCircle, { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.primaryLight }]}>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupItem = ({ item, index }: { item: Group; index: number }) => {
    const palette = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const initial = item.name?.[0]?.toUpperCase() || 'G';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => {
          play('tap');
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
          <View style={[styles.avatarCircle, { backgroundColor: theme.dark ? palette.color + '26' : palette.bg }]}>
            <Ionicons name="people" size={22} color={palette.color} />
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.cardSub, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {item.studentsCount || 0} {t('chat.members')}
          </Text>
        </View>
        <View style={[styles.arrowCircle, { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.primaryLight }]}>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSubGroupItem = ({ item }: { item: SubGroupLookup }) => (
    <TouchableOpacity
      style={[
        styles.card,
        styles.subGroupCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider },
      ]}
      onPress={() => {
        play('tap');
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
      <View style={[styles.arrowCircle, { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.primaryLight }]}>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.primary} />
      </View>
    </TouchableOpacity>
  );

  const renderChatEntry = ({ item, index }: { item: ChatEntry; index: number }) =>
    item.kind === 'group'
      ? renderGroupItem({ item: item.data, index })
      : renderSubGroupItem({ item: item.data });

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
        renderItem={isStudent ? renderStaffItem as any : renderChatEntry as any}
        keyExtractor={(item: any) =>
          isStudent ? `${item.id}-${item.groupId || ''}` : `${item.kind}-${item.data.id}`
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
        contentContainerStyle={styles.listContent}
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
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 120,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 2,
    borderRadius: borderRadius.xl,
  },
  subGroupCard: {
    marginStart: spacing.xl,
    borderWidth: 1,
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
    width: 52,
    height: 52,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 21,
    fontFamily: 'Cairo_700Bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_700Bold',
  },
  cardSub: {
    fontSize: fontSize.xs,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

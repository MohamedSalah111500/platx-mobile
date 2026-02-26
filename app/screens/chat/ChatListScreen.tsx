import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { groupsApi } from '../../services/api/groups.api';
import { chatApi } from '../../services/api/chat.api';
import type { ChatStackParamList } from '../../types/navigation.types';
import { useSound } from '../../hooks/useSound';
import type { Group } from '../../types/group.types';
import type { StaffChatContact } from '../../types/chat.types';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatList'>;

const ACCENT = '#7c63fd';
const BG = '#FFFFFF';

const AVATAR_COLORS = [
  { bg: '#F0EDFF', color: ACCENT },
  { bg: '#E8F8F0', color: '#34C38F' },
  { bg: '#E8F4FD', color: '#3B82F6' },
  { bg: '#FFF4E5', color: '#F5A623' },
  { bg: '#FFE8E8', color: '#F46A6A' },
];

export default function ChatListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, isStudent } = useAuth();
  const { t } = useRTL();
  const { play } = useSound();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<Group[]>([]);
  const [staffContacts, setStaffContacts] = useState<StaffChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      if (isStudent) {
        const staffList = await chatApi.getStaffHasMessages();
        console.log('[ChatList] Staff contacts:', staffList?.length);
        setStaffContacts(Array.isArray(staffList) ? staffList : []);
      } else {
        const res = await groupsApi.getAll(1, 50);
        setGroups(Array.isArray(res?.items) ? res.items : []);
      }
    } catch (err) {
      console.error('[ChatList] Load failed:', err);
      if (isStudent) setStaffContacts([]);
      else setGroups([]);
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

  const bgColor = theme.dark ? theme.colors.background : BG;
  const searchTerm = search.toLowerCase().trim();

  // Filter by search
  const filteredStaff = staffContacts.filter((s) => {
    if (!searchTerm) return true;
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    return name.includes(searchTerm);
  });
  const filteredGroups = groups.filter((g) => {
    if (!searchTerm) return true;
    return g.name?.toLowerCase().includes(searchTerm);
  });
  const listData: any[] = isStudent ? filteredStaff : filteredGroups;
  const totalCount = isStudent ? staffContacts.length : groups.length;

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
          <View style={[styles.avatarCircle, { backgroundColor: palette.bg }]}>
            <Text style={[styles.avatarLetter, { color: palette.color }]}>{initial}</Text>
          </View>
          <View style={[styles.onlineDot, { borderColor: theme.colors.card }]} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.cardSub, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {t('chat.staff')}
          </Text>
        </View>
        <View style={[styles.arrowCircle, { backgroundColor: theme.dark ? theme.colors.surface : '#F0EDFF' }]}>
          <Ionicons name="chevron-forward" size={16} color={ACCENT} />
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
            chatType: 'group',
          });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarCircle, { backgroundColor: palette.bg }]}>
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
        <View style={[styles.arrowCircle, { backgroundColor: theme.dark ? theme.colors.surface : '#F0EDFF' }]}>
          <Ionicons name="chevron-forward" size={16} color={ACCENT} />
        </View>
      </TouchableOpacity>
    );
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
            <View style={[styles.countBadge, { backgroundColor: ACCENT }]}>
              <Text style={styles.countBadgeText}>{totalCount}</Text>
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={t('common.search')}
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={listData}
        renderItem={isStudent ? renderStaffItem as any : renderGroupItem as any}
        keyExtractor={(item: any) => `${item.id}-${item.groupId || ''}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
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
    ...typography.h2,
    fontWeight: '800',
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
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : 0,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    paddingVertical: Platform.OS === 'ios' ? 4 : spacing.sm,
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  avatarWrap: {
    position: 'relative',
    marginRight: spacing.md,
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
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C38F',
    borderWidth: 2.5,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    fontSize: fontSize.base,
    fontWeight: '700',
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

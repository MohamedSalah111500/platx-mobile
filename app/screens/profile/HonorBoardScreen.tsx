import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { honorBoardApi, type HonorBoardEntry } from '../../services/api/honor-board.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'HonorBoard'>;

const ACCENT = '#7c63fd';

const MEDAL_COLORS = [
  { bg: '#FFF8E1', border: '#FFD54F', icon: '#F5A623' }, // Gold  - Rank 1
  { bg: '#F5F5F5', border: '#BDBDBD', icon: '#9E9E9E' }, // Silver - Rank 2
  { bg: '#FFF3E0', border: '#FFB74D', icon: '#E65100' }, // Bronze - Rank 3
];

const RANK_COLORS = [
  '#F0EDFF', '#E8F8F0', '#E8F4FD', '#FFF4E5', '#FCE8EC',
  '#F0EDFF', '#E8F8F0', '#E8F4FD', '#FFF4E5', '#FCE8EC',
];

const PYRAMID_ROWS = [
  { ranks: [1], label: 'top' },
  { ranks: [2, 3], label: 'second' },
  { ranks: [4, 5, 6], label: 'third' },
  { ranks: [7, 8, 9, 10], label: 'fourth' },
];

export default function HonorBoardScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const insets = useSafeAreaInsets();

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [entries, setEntries] = useState<HonorBoardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (month: number, year: number) => {
    try {
      const data = await honorBoardApi.getRankings(month, year);
      setEntries(data);
    } catch (err) {
      console.error('[HonorBoard] Error:', err);
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData(currentMonth, currentYear);
  }, [currentMonth, currentYear, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(currentMonth, currentYear);
  };

  const navigateMonth = (direction: number) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const getMonthName = (): string => {
    return t(`months.m${currentMonth}`);
  };

  const getEntryForRank = (rank: number): HonorBoardEntry | undefined => {
    return entries.find((e) => e.rank === rank);
  };

  const getInitial = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => p[0] || '').join('').toUpperCase().slice(0, 2) || '?';
  };

  const renderRankCard = (rank: number) => {
    const entry = getEntryForRank(rank);
    const isTopThree = rank <= 3;
    const medal = isTopThree ? MEDAL_COLORS[rank - 1] : null;
    const bgColor = RANK_COLORS[(rank - 1) % RANK_COLORS.length];

    if (!entry) {
      // Empty slot
      return (
        <View
          key={`rank-${rank}`}
          style={[
            styles.rankCard,
            isTopThree && styles.rankCardTop,
            { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.card },
          ]}
        >
          <View style={[
            styles.emptyRankBadge,
            { backgroundColor: medal?.border || (theme.dark ? theme.colors.surface : bgColor) },
          ]}>
            <Text style={[styles.emptyRankText, { color: medal ? '#fff' : theme.colors.textMuted }]}>
              {rank}
            </Text>
          </View>
          <Ionicons
            name="person-add-outline"
            size={isTopThree ? 28 : 22}
            color={theme.colors.textMuted}
            style={{ marginTop: spacing.xs }}
          />
          <Text style={[styles.emptyLabel, { color: theme.colors.textMuted }]}>
            —
          </Text>
        </View>
      );
    }

    const imageUrl = getFullImageUrl(entry.studentProfileImage);
    const initial = getInitial(entry.studentName);

    if (isTopThree) {
      return (
        <View
          key={`rank-${rank}`}
          style={[styles.rankCard, styles.rankCardTop]}
        >
          {/* Avatar */}
          <View style={[styles.topAvatarWrap, { borderColor: medal!.border }]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.topAvatarImg} />
            ) : (
              <View style={[styles.topAvatarFallback, { backgroundColor: medal!.bg }]}>
                <Text style={[styles.topInitial, { color: medal!.icon }]}>{initial}</Text>
              </View>
            )}
            <View style={[styles.topRankBadge, { backgroundColor: medal!.border }]}>
              <Text style={styles.topRankBadgeText}>{rank}</Text>
            </View>
          </View>

          {/* Name */}
          <Text style={styles.topName} numberOfLines={1}>{entry.studentName}</Text>

          {/* Trophy for rank 1 */}
          {rank === 1 && (
            <Ionicons name="trophy" size={20} color="#FFD54F" style={{ marginTop: 2 }} />
          )}
        </View>
      );
    }

    // Ranks 4-10
    return (
      <View
        key={`rank-${rank}`}
        style={[
          styles.rankCard,
          { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.card },
        ]}
      >
        <View style={[styles.lowerRankBadge, { backgroundColor: theme.dark ? theme.colors.background : bgColor }]}>
          <Text style={[styles.lowerRankText, { color: theme.colors.text }]}>{rank}</Text>
        </View>
        <View style={styles.lowerAvatar}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.lowerAvatarImg} />
          ) : (
            <View style={[styles.lowerAvatarFallback, { backgroundColor: bgColor }]}>
              <Text style={[styles.lowerInitialText, { color: ACCENT }]}>{initial}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.lowerName, { color: theme.colors.text }]} numberOfLines={1}>
          {entry.studentName}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.headerBg, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('honorBoard.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Month Switcher */}
        <View style={styles.monthSwitcher}>
          <TouchableOpacity
            style={styles.monthBtn}
            onPress={() => navigateMonth(isRTL ? 1 : -1)}
          >
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.monthDisplay}>
            <Text style={styles.monthName}>{getMonthName()}</Text>
            <Text style={styles.monthYear}>{currentYear}</Text>
          </View>
          <TouchableOpacity
            style={styles.monthBtn}
            onPress={() => navigateMonth(isRTL ? -1 : 1)}
          >
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <Spinner />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ACCENT}
              colors={[ACCENT]}
            />
          }
        >
          {entries.length === 0 ? (
            <EmptyState
              icon="trophy-outline"
              title={t('honorBoard.noStudents')}
              message={t('honorBoard.noStudentsMessage')}
            />
          ) : (
            <View style={styles.pyramidContainer}>
              {PYRAMID_ROWS.map((row) => (
                <View key={row.label} style={styles.pyramidRow}>
                  {row.ranks.map((rank) => renderRankCard(rank))}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  headerBg: {
    backgroundColor: ACCENT,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: spacing.xl,
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

  // Month Switcher
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  monthBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthDisplay: {
    alignItems: 'center',
    minWidth: 120,
  },
  monthName: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
  monthYear: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Pyramid
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  pyramidContainer: {
    gap: spacing.md,
  },
  pyramidRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  // Rank Cards
  rankCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 18,
    minWidth: 80,
    flex: 1,
    maxWidth: 110,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  rankCardTop: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },

  // Top 3 styles
  topAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  topAvatarImg: {
    width: '100%',
    height: '100%',
  },
  topAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topInitial: {
    fontSize: 22,
    fontWeight: '800',
  },
  topRankBadge: {
    position: 'absolute',
    bottom: -2,
    alignSelf: 'center',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRankBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  topName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    maxWidth: 90,
    textAlign: 'center',
    marginTop: 2,
  },

  // Empty slot
  emptyRankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyRankText: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  // Lower ranks (4-10)
  lowerRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  lowerRankText: {
    fontSize: 12,
    fontWeight: '800',
  },
  lowerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  lowerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  lowerAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  lowerInitialText: {
    fontSize: 16,
    fontWeight: '700',
  },
  lowerName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 80,
  },
});
